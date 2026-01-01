/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// ==========================================
// ⚙️ 설정 & 환경변수
// ==========================================
const API_KEY = process.env.GEMINI_API_KEY;
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN; // ✅ 복구
const MODEL_NAME = process.env.GEMINI_MODEL_PRO || "gemini-2.0-pro-exp-02-05"; // 최신 모델 권장
const CHANGED_FILES = process.env.CHANGED_FILES || "";
const PR_BODY = process.env.PR_BODY || "";

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
// 🛠️ Figma 관련 유틸리티 (✅ 복구됨)
// ==========================================

// 0. API 재시도 헬퍼
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

// 1. Scaffold 파일에서 Figma URL 추출
function extractFigmaUrls(content: string): string[] {
  const matches = content.matchAll(
    /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s<>"]+/gi
  );
  return Array.from(matches, (m) => m[0]);
}

// 2. URL 파싱
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

    // 스타일 메타데이터 매핑
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
      sharedStyles: mappedStyles, // ✨ 스타일 변수명 (Shadow/lg 등)
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
      padding: {
        top: node.paddingTop,
        bottom: node.paddingBottom,
        left: node.paddingLeft,
        right: node.paddingRight,
      },
      itemSpacing: node.itemSpacing,
    };

    return JSON.stringify(summary, null, 2);
  } catch (e) {
    console.warn(`   ⚠️ Figma Spec 조회 실패: ${e}`);
    return "";
  }
}

// ==========================================
// 📝 PR Description에서 이미지 추출
// ==========================================
interface ImageMap {
  [componentName: string]: string[];
}

function parseImagesFromPR(body: string): ImageMap {
  const imageMap: ImageMap = {};
  if (!body) return imageMap;

  const sections = body.split(/###\s+/);
  for (const section of sections) {
    if (!section.trim()) continue;
    const lines = section.split("\n");
    const componentName = lines[0].trim();
    if (!componentName) continue;

    const sectionContent = lines.slice(1).join("\n");
    const images: string[] = [];

    // 1. Markdown
    for (const match of sectionContent.matchAll(
      /!\[.*?\]\((https?:\/\/[^)]+)\)/g
    )) {
      if (!images.includes(match[1])) images.push(match[1]);
    }
    // 2. HTML
    for (const match of sectionContent.matchAll(
      /<img\s[^>]*?src=["']([^"']+)["']/gi
    )) {
      if (!images.includes(match[1])) images.push(match[1]);
    }
    // 3. Raw URL
    for (const match of sectionContent.matchAll(
      /(https:\/\/(?:github\.com|user-images\.githubusercontent\.com|private-user-images\.githubusercontent\.com)\/(?:[^\s)\]"']+\.(?:png|jpg|jpeg|gif|webp)|user-attachments\/assets\/[a-zA-Z0-9-]+)[^\s)\]"']*)/gi
    )) {
      if (!images.includes(match[1])) images.push(match[1]);
    }

    if (images.length > 0) imageMap[componentName] = images;
  }
  return imageMap;
}

// ==========================================
// 🖼️ 이미지 다운로드
// ==========================================
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (e) {
    return null;
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
// 🤖 Gemini AI 코드 생성
// ==========================================
async function generateCode(options: {
  imagesBase64: string[];
  scaffoldCode: string;
  componentName: string;
  cssContext: string;
  figmaSpec?: string; // ✅ 추가됨
}): Promise<string> {
  const { imagesBase64, scaffoldCode, componentName, cssContext, figmaSpec } =
    options;

  const prompt = `너는 Svelte 5 (Runes) & Tailwind CSS v4 전문가야.

## 목표
제공된 **디자인 이미지(Visual)**와 **Figma 스펙(Data)**을 결합하여 완벽한 UI를 구현해.

## 입력 데이터
1. **Figma 스펙 (수치/구조)**:
   - 정확한 Padding, Font Size, Color, Layout 구조는 이 데이터를 따르세요.
   - \`sharedStyles\`가 있다면 해당 스타일 변수를 Tailwind 클래스로 매핑하세요 (예: Shadow/lg -> shadow-lg).
   \`\`\`json
${figmaSpec || "스펙 데이터 없음 (이미지만 참고)"}
   \`\`\`

2. **프로젝트 스타일 (CSS/SCSS)**:
   - Figma의 색상(#Hex)이 아래 변수와 일치하면 반드시 **CSS 변수**를 사용하세요.
   \`\`\`css
${cssContext}
   \`\`\`

3. **Scaffold 코드**:
   - 로직, $props, import는 유지하고 HTML/CSS 클래스만 작성하세요.
   \`\`\`svelte
${scaffoldCode}
   \`\`\`

## 작성 규칙
- **Tailwind v4**: \`bg-(--color-primary)\` 처럼 괄호 구문 사용.
- **이미지 + 스펙 결합**: 이미지는 전체적인 배치를, 스펙은 정확한 수치를 참고할 것.
- **출력**: 마크다운 코드 블록 안에 **완성된 Svelte 코드만** 출력.

완성된 ${componentName}.svelte:`;

  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  console.log(`   🤖 Gemini (${MODEL_NAME}) 생성 중...`);

  const contents: any[] = [prompt];
  for (const base64 of imagesBase64) {
    contents.push({ inlineData: { data: base64, mimeType: "image/png" } });
  }

  const result = await model.generateContent(contents);
  if (!result.response?.candidates?.length) throw new Error("AI 응답 없음");

  const text = result.response.text();
  const match = text.match(/```(?:svelte|html)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.replace(/```/g, "").trim();
}

// ==========================================
// 🚀 메인 실행 로직
// ==========================================
async function main() {
  console.log("🎨 AI UI Generator 시작\n");

  if (!API_KEY) throw new Error("GEMINI_API_KEY 없음");
  if (!CHANGED_FILES) throw new Error("변경된 파일 없음");
  // FIGMA_TOKEN은 없어도 스펙만 못 가져올 뿐, 이미지로 진행 가능하므로 에러 처리 안 함

  const cssContext = readProjectStyles();
  const prImageMap = parseImagesFromPR(PR_BODY);

  const scaffoldFiles = CHANGED_FILES.split(" ").filter((f) =>
    f.endsWith(".scaffold.svelte")
  );
  console.log(`📁 Scaffold 파일: ${scaffoldFiles.length}개`);

  const generatedFiles: string[] = [];
  const updatedImportFiles: string[] = [];
  const errors: string[] = [];

  for (const scaffoldPath of scaffoldFiles) {
    const componentName = path.basename(scaffoldPath, ".scaffold.svelte");
    console.log(`\n📦 처리 중: ${componentName}`);

    const absoluteScaffoldPath = path.resolve(scaffoldPath);
    if (!fs.existsSync(absoluteScaffoldPath)) continue;
    const scaffoldCode = fs.readFileSync(absoluteScaffoldPath, "utf-8");

    // 1. PR 이미지 확보
    const prImageUrls = prImageMap[componentName] || [];
    const imagesBase64: string[] = [];
    for (const url of prImageUrls) {
      const base64 = await fetchImageAsBase64(url);
      if (base64) imagesBase64.push(base64);
    }

    // 2. Figma 스펙 확보 (✅ 추가된 로직)
    let figmaSpec = "";
    const figmaUrls = extractFigmaUrls(scaffoldCode);
    if (figmaUrls.length > 0) {
      console.log(`   🔗 Figma URL 감지: ${figmaUrls[0]}`);
      const parsed = parseFigmaUrl(figmaUrls[0]);
      if (parsed) {
        figmaSpec = await getFigmaSpec(parsed.fileKey, parsed.nodeId);
      }
    } else {
      console.log("   ℹ️ Figma URL 없음 (이미지만 사용)");
    }

    if (imagesBase64.length === 0 && !figmaSpec) {
      console.log(`   ❌ 정보 부족: PR 이미지도 없고 Figma URL도 없음`);
      errors.push(`${componentName}: 입력 데이터 없음`);
      continue;
    }

    // 3. 생성
    try {
      const code = await generateCode({
        imagesBase64,
        scaffoldCode,
        componentName,
        cssContext,
        figmaSpec, // ✅ 전달
      });

      const targetPath = absoluteScaffoldPath.replace(".scaffold", "");
      if (!targetPath.startsWith(process.cwd()))
        throw new Error("Invalid path");

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, code, "utf-8");
      console.log(`   💾 저장 완료`);

      const relativePath = path.relative(process.cwd(), targetPath);
      generatedFiles.push(relativePath);

      const updated = updateImports(scaffoldPath, relativePath);
      updatedImportFiles.push(...updated);
    } catch (e: any) {
      console.error(`   ❌ 실패: ${e.message}`);
      errors.push(`${componentName}: ${e.message}`);
    }
  }

  // 결과 처리
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
  process.exit(1);
});
