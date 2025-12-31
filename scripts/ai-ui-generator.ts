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
const MODEL_NAME = process.env.GEMINI_MODEL_PRO || "gemini-3-pro-preview";
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
    // 1. variables_color.scss (색상 팔레트 정의)
    const colorVarsPath = path.resolve(
      cwd,
      "trendiv-web/src/lib/constants/variables_color.scss"
    );
    if (fs.existsSync(colorVarsPath)) {
      context += `\n/* --- variables_color.scss (Color Palette) --- */\n${fs.readFileSync(
        colorVarsPath,
        "utf-8"
      )}`;
    }

    // 2. app.css (Tailwind 테마 설정 & 시맨틱 컬러 매핑)
    const appCssPath = path.resolve(cwd, "trendiv-web/src/app.css");
    if (fs.existsSync(appCssPath)) {
      context += `\n/* --- app.css (Theme & Semantic Colors) --- */\n${fs.readFileSync(
        appCssPath,
        "utf-8"
      )}`;
    }

    console.log(`   🎨 디자인 토큰 로드 완료 (${context.length} chars)`);
    return context;
  } catch (e) {
    console.warn("   ⚠️ 스타일 파일 읽기 실패:", e);
    return "";
  }
}

// ==========================================
// 🛠️ Figma 관련 유틸리티
// ==========================================

// 1. Scaffold 파일에서 Figma URL 추출 (여러 개 지원)
function extractFigmaUrls(content: string): string[] {
  const urls: string[] = [];

  // HTML 주석 안의 모든 Figma URL 추출
  const matches = content.matchAll(
    /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s<>"]+/gi
  );

  for (const match of matches) {
    urls.push(match[0]);
  }

  return urls;
}

// 2. URL에서 fileKey와 nodeId 파싱
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

// 3. Figma API: 노드 정보(Spec) 가져오기
async function getFigmaSpec(fileKey: string, nodeId: string): Promise<string> {
  if (!FIGMA_TOKEN) {
    console.log("   ⚠️ FIGMA_ACCESS_TOKEN 없음, 스펙 생략");
    return "";
  }
  console.log(`   🎨 Figma Spec 조회 중... (${nodeId})`);

  try {
    const encodedNodeId = encodeURIComponent(nodeId);
    const res = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodedNodeId}`,
      {
        headers: { "X-Figma-Token": FIGMA_TOKEN },
      }
    );

    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data: any = await res.json();
    const node =
      data.nodes?.[nodeId]?.document ||
      data.nodes?.[nodeId.replace(":", "-")]?.document;

    if (!node) return "";

    // AI에게 줄 핵심 정보 요약
    const summary = {
      name: node.name,
      type: node.type,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
      fills: node.fills,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight,
      effects: node.effects,
      style: node.style,
      layoutMode: node.layoutMode,
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
    console.error(`   ⚠️ Figma Spec 조회 실패: ${e}`);
    return "";
  }
}

// 4. Figma API: 이미지 렌더링 URL (무료!)
async function getFigmaImageUrl(
  fileKey: string,
  nodeId: string
): Promise<string | null> {
  if (!FIGMA_TOKEN) {
    console.log("   ⚠️ FIGMA_ACCESS_TOKEN 없음");
    return null;
  }

  try {
    const encodedNodeId = encodeURIComponent(nodeId);
    const res = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${encodedNodeId}&format=png&scale=2`,
      {
        headers: { "X-Figma-Token": FIGMA_TOKEN },
      }
    );

    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data: any = await res.json();
    const imageUrl =
      data.images?.[nodeId] || data.images?.[nodeId.replace(":", "-")];

    if (imageUrl) {
      console.log("   ✅ Figma 이미지 URL 획득");
    }
    return imageUrl || null;
  } catch (e) {
    console.error(`   ⚠️ Figma 이미지 렌더링 실패: ${e}`);
    return null;
  }
}

// ==========================================
// 🖼️ 이미지 다운로드
// ==========================================
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log(`   📥 이미지 다운로드: ${url.slice(0, 60)}...`);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`   ⚠️ 이미지 응답 실패: ${res.status}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    console.log(
      `   ✅ 이미지 로드 완료 (${Math.round(buffer.byteLength / 1024)}KB)`
    );
    return Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.log(`   ⚠️ 이미지 다운로드 실패: ${e}`);
    return null;
  }
}

// ==========================================
// 📝 Import 자동 수정
// ==========================================
function updateImports(scaffoldPath: string, outputPath: string): string[] {
  const updatedFiles: string[] = [];

  // 상대 경로에서 import 경로 추출
  // trendiv-web/src/lib/components/contents/ArticleCard.scaffold.svelte
  // → $lib/components/contents/ArticleCard.scaffold.svelte
  const scaffoldImportPath = scaffoldPath
    .replace("trendiv-web/src/", "$")
    .replace(".svelte", "");

  const outputImportPath = outputPath
    .replace("trendiv-web/src/", "$")
    .replace(".svelte", "");

  // 컴포넌트명 추출 (ArticleCard.scaffold → ArticleCard)
  const scaffoldName = path.basename(scaffoldPath, ".svelte");
  const outputName = path.basename(outputPath, ".svelte");

  console.log(`\n   📝 Import 업데이트 검색...`);
  console.log(`      Scaffold: ${scaffoldImportPath}`);
  console.log(`      Output: ${outputImportPath}`);

  // trendiv-web/src 내 모든 .svelte 파일 검색
  const svelteFiles = glob.sync("trendiv-web/src/**/*.svelte", {
    ignore: ["**/*.scaffold.svelte"],
  });

  for (const file of svelteFiles) {
    const absolutePath = path.resolve(file);
    let content = fs.readFileSync(absolutePath, "utf-8");
    let modified = false;

    // 패턴 1: $lib/... 형태의 import
    // import ArticleCard from '$lib/components/contents/ArticleCard.scaffold.svelte';
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

    // 패턴 2: 상대 경로 import
    // import ArticleCard from './ArticleCard.scaffold.svelte';
    // import ArticleCard from '../contents/ArticleCard.scaffold.svelte';
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
      const relativePath = path.relative(process.cwd(), absolutePath);
      updatedFiles.push(relativePath);
      console.log(`      ✅ 수정됨: ${relativePath}`);
    }
  }

  if (updatedFiles.length === 0) {
    console.log(`      ℹ️ 수정할 import 없음`);
  }

  return updatedFiles;
}

// 정규식 이스케이프 헬퍼
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// 🤖 Gemini AI 코드 생성
// ==========================================
async function generateCode(options: {
  imageBase64: string;
  scaffoldCode: string;
  componentName: string;
  figmaSpec?: string;
  cssContext: string;
}): Promise<string> {
  const { imageBase64, scaffoldCode, componentName, figmaSpec, cssContext } =
    options;

  const prompt = `너는 Svelte 5 (Runes) & Tailwind CSS v4 전문가야.

## 목표
Figma 디자인을 구현하되, **제공된 [프로젝트 스타일] 변수를 최우선으로 사용**해서 코드를 작성해.

## 입력 데이터
1. **프로젝트 스타일 (CSS/SCSS)**:
   - \`variables_color.scss\`: 기본 색상 팔레트 정의 (예: --mint-500, --gray-100)
   - \`app.css\`: Tailwind 테마 설정 및 시맨틱 변수 매핑 (예: --color-primary, --font-sans)
   - **중요**: Figma의 색상(#Hex)이 이 파일의 변수와 일치하면, 반드시 **CSS 변수 기반 클래스**를 사용해.
     - 예: \`bg-[#1ba896]\` (X) -> \`bg-(--color-primary)\` 또는 \`bg-(--mint-500)\` (O)
     - 예: \`font-['Pretendard']\` (X) -> \`font-(--font-sans)\` (O)
   \`\`\`css
${cssContext}
   \`\`\`

2. **Scaffold 코드 (변경 금지 구역)**:
   - HTML 구조, 로직, $props 등은 그대로 유지하고 \`class="..."\`만 작성해.
   - scaffold 에 있는 tailwind css 는 가능하면 유지해.
   \`\`\`svelte
${scaffoldCode}
   \`\`\`

3. **Figma 스펙 & 이미지**:
   - 디자인 수치(px)와 시각적 배치를 참고해.
   \`\`\`json
${figmaSpec || "스펙 데이터 없음 (이미지 참고)"}
   \`\`\`

## 작성 규칙
- **Tailwind v4 문법**: \`bg-(--color-bg-surface)\`, \`shadow-(--shadow-sm)\` 처럼 괄호 구문 적극 사용.
- **주석 확인**: 반응형이나 애니메이션은 주석으로 처리하니 주석내용들은 꼭 확인할것
- **출력**: 마크다운 코드 블록 안에 **완성된 Svelte 코드만** 출력.

완성된 ${componentName}.svelte:`;

  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  console.log(`   🤖 Gemini (${MODEL_NAME}) 생성 중...`);

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType: "image/png" } },
  ]);

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
  console.log("🎨 AI UI Generator 시작\n");

  // 환경변수 검증
  if (!API_KEY) {
    setOutput("generated", "false");
    setOutput("error", "GEMINI_API_KEY 없음");
    throw new Error("GEMINI_API_KEY가 없습니다.");
  }

  if (!FIGMA_TOKEN) {
    setOutput("generated", "false");
    setOutput("error", "FIGMA_ACCESS_TOKEN 없음");
    throw new Error("FIGMA_ACCESS_TOKEN이 없습니다.");
  }

  if (!CHANGED_FILES) {
    setOutput("generated", "false");
    setOutput("error", "변경된 파일 없음");
    throw new Error("변경된 파일이 없습니다.");
  }

  // 1. CSS 스타일 파일 로드 (한 번만 읽음)
  console.log("📚 프로젝트 스타일 로드...");
  const cssContext = readProjectStyles();

  // 2. 변경된 scaffold 파일 목록
  const scaffoldFiles = CHANGED_FILES.split(" ").filter((f) =>
    f.endsWith(".scaffold.svelte")
  );
  console.log(`📁 Scaffold 파일: ${scaffoldFiles.length}개`);
  scaffoldFiles.forEach((f) => console.log(`   - ${f}`));

  const generatedFiles: string[] = [];
  const updatedImportFiles: string[] = [];
  const errors: string[] = [];

  // 3. 각 scaffold 파일 처리
  for (const scaffoldPath of scaffoldFiles) {
    const componentName = path.basename(scaffoldPath, ".scaffold.svelte");
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📦 처리 중: ${componentName}`);
    console.log(`${"=".repeat(50)}`);

    // Scaffold 읽기
    const absoluteScaffoldPath = path.resolve(scaffoldPath);
    if (!fs.existsSync(absoluteScaffoldPath)) {
      console.log(`   ⚠️ 파일 없음: ${scaffoldPath}`);
      errors.push(`${componentName}: 파일 없음`);
      continue;
    }
    const scaffoldCode = fs.readFileSync(absoluteScaffoldPath, "utf-8");

    // Figma URL 추출
    const figmaUrls = extractFigmaUrls(scaffoldCode);
    if (figmaUrls.length === 0) {
      console.log(
        "   ❌ Figma URL 없음 - scaffold 파일 상단에 Figma URL 주석 필요"
      );
      errors.push(`${componentName}: Figma URL 없음`);
      continue;
    }

    console.log(`   🔗 Figma URL ${figmaUrls.length}개 감지`);

    // Figma에서 이미지 & 스펙 가져오기
    let imageBase64: string | null = null;
    let figmaSpec = "";

    for (const figmaUrl of figmaUrls) {
      const parsed = parseFigmaUrl(figmaUrl);
      if (!parsed) {
        console.log(`   ⚠️ URL 파싱 실패: ${figmaUrl.slice(0, 50)}...`);
        continue;
      }

      console.log(`   📐 Figma: ${parsed.fileKey}/${parsed.nodeId}`);

      // Figma 이미지 다운로드
      const figmaImageUrl = await getFigmaImageUrl(
        parsed.fileKey,
        parsed.nodeId
      );
      if (figmaImageUrl) {
        imageBase64 = await fetchImageAsBase64(figmaImageUrl);
      }

      // Figma 스펙 가져오기
      if (!figmaSpec) {
        figmaSpec = await getFigmaSpec(parsed.fileKey, parsed.nodeId);
      }

      // 이미지 성공하면 루프 종료
      if (imageBase64) break;
    }

    // 이미지 없으면 스킵
    if (!imageBase64) {
      console.log(`   ❌ Figma 이미지 로드 실패`);
      errors.push(`${componentName}: Figma 이미지 로드 실패`);
      continue;
    }

    // AI 코드 생성
    try {
      const code = await generateCode({
        imageBase64,
        scaffoldCode,
        componentName,
        figmaSpec,
        cssContext,
      });
      console.log(`   ✅ 생성 완료 (${code.length} chars)`);

      // 파일 저장
      const targetPath = absoluteScaffoldPath.replace(".scaffold", "");

      // 보안 체크
      if (!targetPath.startsWith(process.cwd())) {
        throw new Error("보안 경고: 프로젝트 외부 경로");
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, code, "utf-8");
      console.log(`   💾 저장: ${targetPath}`);

      const relativeTargetPath = path.relative(process.cwd(), targetPath);
      generatedFiles.push(relativeTargetPath);

      // Import 자동 수정
      const updated = updateImports(scaffoldPath, relativeTargetPath);
      updatedImportFiles.push(...updated);
    } catch (e: any) {
      console.error(`   ❌ 생성 실패: ${e.message}`);
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
