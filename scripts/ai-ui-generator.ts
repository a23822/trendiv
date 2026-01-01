/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// ==========================================
// ⚙️ 설정 & 환경변수
// ==========================================
const API_KEY = process.env.GEMINI_API_KEY;
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const MODEL_NAME = process.env.GEMINI_MODEL_PRO || "gemini-2.0-pro-exp-02-05";
const CHANGED_FILES = process.env.CHANGED_FILES || "";

// GitHub Actions Output Helper
function setOutput(name: string, value: string) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`Output: ${name}=${value}`);
}

// ==========================================
// 🎨 스타일(CSS/SCSS) 컨텍스트 로더
// ==========================================
function readProjectStyles(): string {
  let context = "";
  const cwd = process.cwd();

  try {
    const colorVarsPath = path.resolve(
      cwd,
      "trendiv-web/src/lib/constants/variables_color.scss"
    );
    if (fs.existsSync(colorVarsPath)) {
      context += `\n/* --- variables_color.scss --- */\n${fs.readFileSync(
        colorVarsPath,
        "utf-8"
      )}`;
    }

    const appCssPath = path.resolve(cwd, "trendiv-web/src/app.css");
    if (fs.existsSync(appCssPath)) {
      context += `\n/* --- app.css --- */\n${fs.readFileSync(
        appCssPath,
        "utf-8"
      )}`;
    }
    return context;
  } catch (e) {
    return "";
  }
}

// ==========================================
// 🛠️ Figma 관련 유틸리티
// ==========================================

// API 재시도 헬퍼
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter
        ? parseInt(retryAfter, 10) * 1000 + 1000
        : 3000 * (i + 1);
      console.log(`   ⏳ Figma API 제한(429). ${waitTime / 1000}초 대기...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

// Scaffold 파일에서 Figma URL 추출
function extractFigmaUrls(content: string): string[] {
  const matches = content.matchAll(
    /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s<>"]+/gi
  );
  return Array.from(matches, (m) => m[0]);
}

// URL 파싱
function parseFigmaUrl(
  url: string
): { fileKey: string; nodeId: string } | null {
  try {
    const fileKeyMatch = url.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
    const nodeIdMatch = url.match(/node-id=([0-9%3A:-]+)/);
    if (!fileKeyMatch || !nodeIdMatch) return null;
    return {
      fileKey: fileKeyMatch[1],
      nodeId: nodeIdMatch[1].replace(/%3A/g, ":").replace(/-/g, ":"),
    };
  } catch {
    return null;
  }
}

// Figma API: 노드 정보(Spec) 가져오기
async function getFigmaSpec(fileKey: string, nodeId: string): Promise<string> {
  if (!FIGMA_TOKEN) {
    console.log("   ⚠️ FIGMA_ACCESS_TOKEN 없음. 스펙 조회 생략.");
    return "";
  }
  console.log(`   🎨 Figma Spec 조회 중... (${nodeId})`);

  try {
    const res = await fetchWithRetry(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(
        nodeId
      )}`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } }
    );

    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();

    const stylesMetadata = data.styles || {};
    const node =
      data.nodes?.[nodeId]?.document ||
      data.nodes?.[nodeId.replace(":", "-")]?.document;
    if (!node) return "";

    const mappedStyles: Record<string, string> = {};
    if (node.styles) {
      for (const [key, styleId] of Object.entries(node.styles)) {
        if (typeof styleId === "string" && stylesMetadata[styleId]) {
          mappedStyles[key] = stylesMetadata[styleId].name;
        }
      }
    }

    const summary = {
      name: node.name,
      type: node.type,
      sharedStyles: mappedStyles,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
      fills: node.fills,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight,
      effects: node.effects,
      opacity: node.opacity,
      style: node.style,
      layoutMode: node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      layoutAlign: node.layoutAlign,
      layoutGrow: node.layoutGrow,
      padding: {
        top: node.paddingTop,
        bottom: node.paddingBottom,
        left: node.paddingLeft,
        right: node.paddingRight,
      },
      itemSpacing: node.itemSpacing,
    };

    console.log("   ✅ Figma Spec 로드 완료");
    return JSON.stringify(summary, null, 2);
  } catch (e) {
    console.warn(`   ⚠️ Figma Spec 조회 실패: ${e}`);
    return "";
  }
}

// ==========================================
// 📝 Import 자동 수정
// ==========================================
function updateImports(scaffoldPath: string, outputPath: string): string[] {
  const updatedFiles: string[] = [];
  const scaffoldImportPath = scaffoldPath
    .replace("trendiv-web/src/", "$")
    .replace(".svelte", "");
  const outputImportPath = outputPath
    .replace("trendiv-web/src/", "$")
    .replace(".svelte", "");
  const scaffoldName = path.basename(scaffoldPath, ".svelte");
  const outputName = path.basename(outputPath, ".svelte");

  const svelteFiles = glob.sync("trendiv-web/src/**/*.svelte", {
    ignore: ["**/*.scaffold.svelte"],
  });

  for (const file of svelteFiles) {
    const absolutePath = path.resolve(file);
    let content = fs.readFileSync(absolutePath, "utf-8");
    let modified = false;

    const libImportRegex = new RegExp(
      `(import\\s+\\w+\\s+from\\s+['"])${escapeRegex(
        scaffoldImportPath
      )}(\\.svelte)?(['"];?)`,
      "g"
    );
    if (libImportRegex.test(content)) {
      content = content.replace(
        libImportRegex,
        `$1${outputImportPath}.svelte$3`
      );
      modified = true;
    }

    const relativeImportRegex = new RegExp(
      `(import\\s+\\w+\\s+from\\s+['"][./]+[^'"]*?)${escapeRegex(
        scaffoldName
      )}(\\.svelte)?(['"];?)`,
      "g"
    );
    if (relativeImportRegex.test(content)) {
      content = content.replace(
        relativeImportRegex,
        `$1${outputName}.svelte$3`
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(absolutePath, content, "utf-8");
      updatedFiles.push(path.relative(process.cwd(), absolutePath));
    }
  }
  return updatedFiles;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// 🤖 Gemini AI 코드 생성 (SVG + Figma Spec)
// ==========================================
async function generateCode(options: {
  svgCode: string;
  scaffoldCode: string;
  componentName: string;
  cssContext: string;
  figmaSpec?: string;
}): Promise<string> {
  const { svgCode, scaffoldCode, componentName, cssContext, figmaSpec } =
    options;

  const prompt = `너는 Svelte 5 (Runes) & Tailwind CSS v4 전문가야.

## 목표
제공된 **디자인 SVG 코드**와 **Figma 스펙(Data)**을 결합하여 완벽한 UI를 구현해.
SVG에서 **정확한 색상값, 그라데이션, 필터, 폰트**를 추출해서 Tailwind 클래스로 변환해.

## 입력 데이터

### 1. 디자인 SVG
아래 SVG 코드에서 다음을 추출해:
- 색상: fill, stroke 속성의 hex/rgb 값
- 그라데이션: linearGradient, radialGradient 정의
- 그림자: filter, feDropShadow 등
- 폰트: font-family, font-size, font-weight
- 레이아웃: width, height, 각 요소의 위치
- 참고용이지 실제 컴포넌트에 svg 태그를 넣지 말 것

\`\`\`svg
${svgCode}
\`\`\`

### 2. Figma 스펙 (수치/구조)
- 정확한 Padding, Font Size, Color, Layout 구조는 이 데이터를 따르세요.
- \`sharedStyles\`가 있다면 해당 스타일 변수를 Tailwind 클래스로 매핑하세요 (예: Shadow/lg -> shadow-lg).

\`\`\`json
${figmaSpec || "스펙 데이터 없음 (SVG만 참고)"}
\`\`\`

### 3. 프로젝트 스타일 (CSS/SCSS)
- SVG/Figma의 색상(#Hex)이 아래 변수와 일치하면 반드시 **CSS 변수**를 사용하세요.
  - 예: \`bg-[#1ba896]\` ❌ → \`bg-(--color-primary)\` ✅
  - 예: \`bg-[#1BA896]\` ❌ → \`bg-(--mint-500)\` ✅

\`\`\`css
${cssContext}
\`\`\`

### 4. Scaffold 코드 (구조 유지)
- 로직, $props, import는 유지하고 HTML/CSS 클래스만 작성하세요.
- 기존 scaffold의 Tailwind 클래스는 가능하면 유지

\`\`\`svelte
${scaffoldCode}
\`\`\`

## 작성 규칙
1. **Tailwind v4 문법**: \`bg-(--color-primary)\`, \`shadow-(--shadow-md)\` 형태
2. **기본 클래스 우선**: \`text-[12px]\` → \`text-xs\`, \`p-[16px]\` → \`p-4\`
3. **그라데이션**: SVG의 linearGradient를 \`bg-gradient-to-b from-[색상] to-[색상]\`으로
4. **그림자**: SVG filter 또는 Figma effects를 \`shadow-sm\`, \`shadow-md\` 등으로 매핑
5. **SVG + 스펙 결합**: SVG는 시각적 스타일을, 스펙은 정확한 수치를 참고할 것
6. **출력**: 마크다운 코드 블록 안에 **완성된 Svelte 코드만** 출력
7. 구현을 위해 과하게 css 를 많이 사용하지 말 것.
8. z-index 는 오로지 개발자의 판단에 따라 주어질 것이므로 절대 사용하지 말 것
  사용해야한다면 relative 단독으로만 사용


완성된 ${componentName}.svelte:`;

  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  console.log(`   🤖 Gemini (${MODEL_NAME}) 생성 중...`);

  const result = await model.generateContent(prompt);

  if (!result.response?.candidates?.length) {
    throw new Error(
      `AI 응답 차단: ${
        result.response?.promptFeedback?.blockReason || "알 수 없음"
      }`
    );
  }

  const text = result.response.text();
  const match = text.match(/```(?:svelte|html)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.replace(/```/g, "").trim();
}

// ==========================================
// 🚀 메인 실행 로직
// ==========================================
async function main() {
  console.log("🎨 AI UI Generator 시작 (SVG 파일 + Figma Spec 모드)\n");

  if (!API_KEY) throw new Error("GEMINI_API_KEY 없음");
  if (!CHANGED_FILES) throw new Error("변경된 파일 없음");

  const cssContext = readProjectStyles();

  // 변경된 파일에서 scaffold 파일 찾기
  // .scaffold.svelte 또는 .scaffold.svg 변경 감지
  const changedFiles = CHANGED_FILES.split(" ");

  // scaffold.svelte 파일 목록
  const scaffoldSvelteFiles = changedFiles.filter((f) =>
    f.endsWith(".scaffold.svelte")
  );

  // scaffold.svg 파일이 변경된 경우, 해당하는 svelte 파일도 처리 대상에 추가
  const scaffoldSvgFiles = changedFiles.filter((f) =>
    f.endsWith(".scaffold.svg")
  );

  // SVG 변경으로 인해 추가될 svelte 파일들
  for (const svgFile of scaffoldSvgFiles) {
    const svelteFile = svgFile.replace(".scaffold.svg", ".scaffold.svelte");
    if (!scaffoldSvelteFiles.includes(svelteFile)) {
      // svelte 파일이 존재하는지 확인
      if (fs.existsSync(path.resolve(svelteFile))) {
        scaffoldSvelteFiles.push(svelteFile);
      }
    }
  }

  console.log(`📁 Scaffold 파일: ${scaffoldSvelteFiles.length}개`);
  scaffoldSvelteFiles.forEach((f) => console.log(`   - ${f}`));

  const generatedFiles: string[] = [];
  const updatedImportFiles: string[] = [];
  const errors: string[] = [];

  for (const scaffoldPath of scaffoldSvelteFiles) {
    const componentName = path.basename(scaffoldPath, ".scaffold.svelte");
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📦 처리 중: ${componentName}`);
    console.log(`${"=".repeat(50)}`);

    const absoluteScaffoldPath = path.resolve(scaffoldPath);
    if (!fs.existsSync(absoluteScaffoldPath)) {
      console.log(`   ⚠️ 파일 없음: ${scaffoldPath}`);
      errors.push(`${componentName}: scaffold.svelte 파일 없음`);
      continue;
    }
    const scaffoldCode = fs.readFileSync(absoluteScaffoldPath, "utf-8");

    // 1. 같은 이름의 .scaffold.svg 파일 찾기
    const svgPath = absoluteScaffoldPath.replace(
      ".scaffold.svelte",
      ".scaffold.svg"
    );
    let svgCode = "";

    if (fs.existsSync(svgPath)) {
      svgCode = fs.readFileSync(svgPath, "utf-8");
      console.log(
        `   ✅ SVG 파일 로드: ${path.basename(svgPath)} (${
          svgCode.length
        } chars)`
      );
    } else {
      console.log(`   ⚠️ SVG 파일 없음: ${path.basename(svgPath)}`);
    }

    // 2. Figma 스펙 확보 (scaffold에 URL 있으면)
    let figmaSpec = "";
    const figmaUrls = extractFigmaUrls(scaffoldCode);
    if (figmaUrls.length > 0) {
      console.log(`   🔗 Figma URL 감지: ${figmaUrls[0].slice(0, 60)}...`);
      const parsed = parseFigmaUrl(figmaUrls[0]);
      if (parsed) {
        figmaSpec = await getFigmaSpec(parsed.fileKey, parsed.nodeId);
      }
    } else {
      console.log("   ℹ️ Figma URL 없음");
    }

    // 3. 입력 데이터 검증
    if (!svgCode && !figmaSpec) {
      console.log(`   ❌ 정보 부족: SVG 파일 없고 Figma URL도 없음`);
      errors.push(
        `${componentName}: 입력 데이터 없음 (${componentName}.scaffold.svg 파일 필요)`
      );
      continue;
    }

    // 4. AI 코드 생성
    try {
      const code = await generateCode({
        svgCode,
        scaffoldCode,
        componentName,
        cssContext,
        figmaSpec,
      });
      console.log(`   ✅ 생성 완료 (${code.length} chars)`);

      const targetPath = absoluteScaffoldPath.replace(".scaffold", "");
      if (!targetPath.startsWith(process.cwd())) {
        throw new Error("보안 경고: 프로젝트 외부 경로");
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, code, "utf-8");
      console.log(`   💾 저장: ${targetPath}`);

      const relativePath = path.relative(process.cwd(), targetPath);
      generatedFiles.push(relativePath);

      const updated = updateImports(scaffoldPath, relativePath);
      updatedImportFiles.push(...updated);
    } catch (e: any) {
      console.error(`   ❌ 실패: ${e.message}`);
      errors.push(`${componentName}: ${e.message}`);
    }
  }

  // 결과 출력
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 결과");
  console.log(`${"=".repeat(50)}`);
  console.log(`   ✅ 생성: ${generatedFiles.length}개`);
  console.log(`   📝 Import 수정: ${updatedImportFiles.length}개`);
  console.log(`   ❌ 실패: ${errors.length}개`);

  if (generatedFiles.length > 0) {
    const allFiles = [...generatedFiles, ...updatedImportFiles];
    setOutput("generated", "true");
    setOutput("files", allFiles.join(", "));
  } else {
    setOutput("generated", "false");
    setOutput("error", errors.join("; ") || "생성된 파일 없음");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ 치명적 오류:", err);
  setOutput("generated", "false");
  setOutput("error", err.message || String(err));
  process.exit(1);
});
