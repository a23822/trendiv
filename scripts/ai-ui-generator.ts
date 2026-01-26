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

// 🔴 AI 규칙 폴더 경로
const AI_RULES_DIR = process.env.AI_RULES_DIR
  ? path.join(process.cwd(), process.env.AI_RULES_DIR)
  : path.join(process.cwd(), ".github/ai-rules");

// ==========================================
// 💾 Figma 스펙 캐싱
// ==========================================
const CACHE_DIR = ".figma-cache";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

interface CacheEntry {
  timestamp: number;
  spec: string;
}

function getCachePath(fileKey: string, nodeId: string): string {
  const safeNodeId = nodeId.replace(/:/g, "-");
  return path.join(CACHE_DIR, `${fileKey}_${safeNodeId}.json`);
}

function readCache(fileKey: string, nodeId: string): string | null {
  const cachePath = getCachePath(fileKey, nodeId);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const cached: CacheEntry = JSON.parse(fs.readFileSync(cachePath, "utf-8"));

    // 만료 체크
    if (Date.now() - cached.timestamp > CACHE_MAX_AGE_MS) {
      console.log(`   💾 캐시 만료: ${path.basename(cachePath)}`);
      return null;
    }

    console.log(`   💾 캐시 hit: ${path.basename(cachePath)}`);
    return cached.spec;
  } catch {
    console.log(`   ⚠️ 캐시 파싱 실패: ${path.basename(cachePath)}`);
    return null;
  }
}

function writeCache(fileKey: string, nodeId: string, spec: string): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = getCachePath(fileKey, nodeId);
    const entry: CacheEntry = {
      timestamp: Date.now(),
      spec,
    };
    fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2));
    console.log(`   💾 캐시 저장: ${path.basename(cachePath)}`);
  } catch (e) {
    console.warn(`   ⚠️ 캐시 저장 실패: ${e}`);
  }
}

// GitHub Actions Output Helper
function setOutput(name: string, value: string) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
  console.log(`Output: ${name}=${value}`);
}

// ==========================================
// 🔴 규칙 로드 로직
// ==========================================
const rulesCache = new Map<string, string>();

function loadRuleFile(relativePath: string): string {
  const fullPath = path.join(AI_RULES_DIR, relativePath);

  if (rulesCache.has(fullPath)) {
    return rulesCache.get(fullPath)!;
  }

  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    rulesCache.set(fullPath, content);
    return content;
  }

  return "";
}

function loadGenerateRules(): string {
  const rules: string[] = [];

  // 프론트엔드 공통 규칙
  const baseRule = loadRuleFile("frontend/_base.md");
  if (baseRule) rules.push(baseRule);

  // 생성 전용 규칙
  const generateRule = loadRuleFile("frontend/generate.md");
  if (generateRule) rules.push(generateRule);

  // 컴포넌트 규칙
  const componentsRule = loadRuleFile("frontend/components.md");
  if (componentsRule) rules.push(componentsRule);

  return rules.join("\n\n---\n\n");
}

// ==========================================
// 🎨 스타일(CSS/SCSS) 컨텍스트 로더 (최적화)
// ==========================================
function readProjectStyles(): string {
  let context = "";
  const cwd = process.cwd();

  try {
    // ❌ 제거: variables_color.scss (generate.md에 매핑 테이블 있음)
    // ❌ 제거: @theme 블록 (generate.md에 매핑 테이블 있음)

    // ✅ 유지: @layer base (리셋 CSS, 기본 스타일)
    const appCssPath = path.resolve(cwd, "trendiv-web/src/app.css");
    if (fs.existsSync(appCssPath)) {
      const appCss = fs.readFileSync(appCssPath, "utf-8");

      // @layer base 블록 추출 (중첩 {} 처리)
      const layerBaseStart = appCss.indexOf("@layer base {");
      if (layerBaseStart !== -1) {
        let depth = 0;
        let endIndex = layerBaseStart;
        for (let i = layerBaseStart; i < appCss.length; i++) {
          if (appCss[i] === "{") depth++;
          if (appCss[i] === "}") depth--;
          if (depth === 0 && appCss[i] === "}") {
            endIndex = i + 1;
            break;
          }
        }
        const layerBase = appCss.slice(layerBaseStart, endIndex);
        context += `\n/* --- 기본 스타일 (@layer base) --- */\n${layerBase}`;
      }
    }

    // ✅ 유지: styles.ts (CommonStyles 객체)
    const stylesTsPath = path.resolve(
      cwd,
      "trendiv-web/src/lib/constants/styles.ts",
    );
    if (fs.existsSync(stylesTsPath)) {
      context += `\n/* --- 공통 스타일 객체 (styles.ts) --- */\n${fs.readFileSync(
        stylesTsPath,
        "utf-8",
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
  retries = 3,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);

    // 429 에러 발생 시 처리
    if (res.status === 429) {
      const retryAfterStr = res.headers.get("Retry-After");
      const rateLimitType = res.headers.get("X-Figma-Rate-Limit-Type");
      const planTier = res.headers.get("X-Figma-Plan-Tier");

      // 헤더에 있는 대기 시간(초)을 가져오거나, 없으면 기본값으로 점진적 대기 (3초, 6초...)
      const waitSeconds = retryAfterStr
        ? parseInt(retryAfterStr, 10)
        : 3 * (i + 1);
      const waitTimeMs = waitSeconds * 1000;

      console.warn(`   ⚠️ Figma API 제한(429) 발생.`);
      console.warn(
        `      - 사유: ${rateLimitType || "알 수 없음"} (Plan: ${
          planTier || "알 수 없음"
        })`,
      );
      console.warn(
        `      - 대기: ${waitSeconds}초 후 재시도합니다... (${
          i + 1
        }/${retries})`,
      );

      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
      continue;
    }

    // 429가 아니면 응답 반환 (성공이든 다른 에러든)
    return res;
  }

  // 최대 재시도 횟수 초과 시 마지막 시도 수행
  return fetch(url, options);
}

// Scaffold 파일에서 Figma URL 추출
function extractFigmaUrls(content: string): string[] {
  const matches = content.matchAll(
    /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s<>"]+/gi,
  );
  return Array.from(matches, (m) => m[0]);
}

// URL 파싱
function parseFigmaUrl(
  url: string,
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
  // 1. 캐시 먼저 확인
  const cached = readCache(fileKey, nodeId);
  if (cached) {
    return cached;
  }

  // 2. 토큰 없으면 스킵
  if (!FIGMA_TOKEN) {
    console.log("   ⚠️ FIGMA_ACCESS_TOKEN 없음. 스펙 조회 생략.");
    return "";
  }

  console.log(`   🎨 Figma Spec 조회 중... (${nodeId})`);

  try {
    const res = await fetchWithRetry(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(
        nodeId,
      )}`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } },
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
      cornerRadius: node.cornerRadius,
      children: node.children?.map((c: any) => ({
        name: c.name,
        type: c.type,
        layoutAlign: c.layoutAlign,
        layoutGrow: c.layoutGrow,
      })),
    };

    const specJson = JSON.stringify(summary, null, 2);

    // 캐시 저장
    writeCache(fileKey, nodeId, specJson);

    return specJson;
  } catch (e) {
    console.warn(`   ⚠️ Figma API 실패: ${e}`);
    return "";
  }
}

// import 업데이트 헬퍼
function updateImports(scaffoldPath: string, generatedPath: string): string[] {
  const updatedFiles: string[] = [];
  const dir = path.dirname(scaffoldPath);
  const componentName = path.basename(generatedPath, ".svelte");

  // 같은 디렉토리 내 파일들에서 import 업데이트
  const files = glob.sync(path.join(dir, "*.svelte"));
  for (const file of files) {
    if (file.endsWith(".scaffold.svelte")) continue;

    const content = fs.readFileSync(file, "utf-8");
    const scaffoldImportRegex = new RegExp(
      `from\\s+['"]\\.\\/${escapeRegex(componentName)}\\.scaffold\\.svelte['"]`,
      "g",
    );

    if (scaffoldImportRegex.test(content)) {
      const updated = content.replace(
        scaffoldImportRegex,
        `from './${componentName}.svelte'`,
      );
      fs.writeFileSync(file, updated);
      updatedFiles.push(path.relative(process.cwd(), file));
      console.log(`   📝 Import 수정: ${path.basename(file)}`);
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
  rules: string;
}): Promise<string> {
  const { svgCode, scaffoldCode, componentName, cssContext, figmaSpec, rules } =
    options;

  const prompt = `너는 Svelte 5 (Runes) & Tailwind CSS v4 전문가야.

## 적용 규칙
아래 규칙을 반드시 준수해:

${rules}

## 목표
제공된 **디자인 SVG 코드**와 **Figma 스펙(Data)**을 결합하여 완벽한 UI를 구현해.
SVG에서 **정확한 색상값, 그라데이션, 필터, 폰트**를 추출해서 Tailwind 클래스로 변환해.
내가 디자인한 요소에서 크게 벗어나지 말아줘

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
  - 예: \`bg-[#1ba896]\` ❌ → \`bg-primary\` ✅
  - 예: \`bg-[#1BA896]\` ❌ → \`bg-mint-500\` ✅
- **styles.ts**에 정의된 공통 스타일 객체(CommonStyles 등)가 있다면, 해당 객체 내부의 Tailwind 클래스 조합을 참고하여 디자인 일관성을 유지하세요.

\`\`\`css
${cssContext}
\`\`\`

### 4. Scaffold 코드 (구조 유지)
- 로직, $props, import는 유지하고 HTML/CSS 클래스만 작성하세요.
- 기존 scaffold의 Tailwind 클래스는 가능하면 유지

\`\`\`svelte
${scaffoldCode}
\`\`\`

완성된 ${componentName}.svelte:`;

  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  console.log(`   🤖 Gemini (${MODEL_NAME}) 생성 중...`);

  const result = await model.generateContent(prompt);

  if (!result.response?.candidates?.length) {
    throw new Error(
      `AI 응답 차단: ${
        result.response?.promptFeedback?.blockReason || "알 수 없음"
      }`,
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

  // 🔴 규칙 로드
  const rules = loadGenerateRules();
  if (rules) {
    console.log(`📜 AI 규칙 로드됨 (${rules.split("---").length}개 섹션)`);
  }

  const cssContext = readProjectStyles();

  // 변경된 파일에서 scaffold 파일 찾기
  // .scaffold.svelte 또는 .scaffold.svg 변경 감지
  const changedFiles = CHANGED_FILES.split(/[\s,]+/).filter(Boolean);

  // scaffold.svelte 파일 목록
  const scaffoldSvelteFiles = changedFiles.filter((f) =>
    f.endsWith(".scaffold.svelte"),
  );

  // scaffold.svg 파일이 변경된 경우, 해당하는 svelte 파일도 처리 대상에 추가
  const scaffoldSvgFiles = changedFiles.filter((f) =>
    f.endsWith(".scaffold.svg"),
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
      ".scaffold.svg",
    );
    let svgCode = "";

    if (fs.existsSync(svgPath)) {
      svgCode = fs.readFileSync(svgPath, "utf-8");
      console.log(
        `   ✅ SVG 파일 로드: ${path.basename(svgPath)} (${
          svgCode.length
        } chars)`,
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
        `${componentName}: 입력 데이터 없음 (${componentName}.scaffold.svg 파일 필요)`,
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
        rules,
      });
      console.log(`   ✅ 생성 완료 (${code.length} chars)`);

      const targetPath = absoluteScaffoldPath.replace(".scaffold", "");

      // 🔴 보안: Symlink 악용 방지
      const realTargetPath = fs.existsSync(targetPath)
        ? fs.realpathSync(targetPath)
        : targetPath;
      const realCwd = fs.realpathSync(process.cwd());

      if (!realTargetPath.startsWith(realCwd)) {
        throw new Error("보안 경고: 프로젝트 외부 경로 (Symlink 감지)");
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
