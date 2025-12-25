import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerativeModel } from "@google/generative-ai";
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import { minimatch } from "minimatch";
import * as path from "path";
import { glob } from "glob";
import * as dotenv from "dotenv";

dotenv.config();

// ==========================================
// ⚙️ 설정 (Configuration)
// ==========================================
const API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_PR_NUMBER = process.env.GITHUB_PR_NUMBER;

const MODEL_NAME = process.env.GEMINI_MODEL_LIGHT || "gemini-2.5-flash";

const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.svelte-kit/**",
  "**/pnpm-lock.yaml",
  "**/*.spec.ts",
  "**/*.test.ts",
  "**/*.md",
  "**/*.json",
  "**/*.yml",
  "**/*.yaml",
];

// 리뷰 결과 수집용
interface ReviewResult {
  file: string;
  status: "pass" | "issue" | "error";
  message?: string;
  relatedFile?: string;
}

const reviewResults: ReviewResult[] = [];

// ⚡ 성능 개선: 파일 내용을 메모리에 캐싱 (중복 읽기 방지)
const fileContentCache = new Map<string, string>();

// ==========================================
// 🚀 메인 로직
// ==========================================
async function main() {
  if (!API_KEY) {
    console.error("❌ GEMINI_API_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const changedFiles = process.argv.slice(2);

  if (changedFiles.length === 0) {
    console.log("✨ 검사할 변경 파일이 없습니다.");
    return;
  }

  // 무시할 파일 필터링
  const filesToReview = changedFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    const allowedExts = [
      ".ts",
      ".js",
      ".svelte",
      ".css",
      ".scss",
      ".html",
      ".tsx",
      ".jsx",
    ];
    const isIgnored = IGNORE_PATTERNS.some((pattern) =>
      minimatch(file, pattern)
    );
    return allowedExts.includes(ext) && !isIgnored;
  });

  if (filesToReview.length === 0) {
    console.log("✨ 리뷰 대상 코드 파일이 없습니다.");
    await postComment(
      "✨ **AI 코드 리뷰 완료**\n\n리뷰 대상 코드 파일이 없습니다."
    );
    return;
  }

  console.log(`📝 [${MODEL_NAME}] 리뷰 시작 (${filesToReview.length}개 파일)`);

  // 전체 프로젝트 파일 인덱싱
  const allFiles = await glob("**/*.{ts,js,svelte,css,scss,html,tsx,jsx}", {
    ignore: IGNORE_PATTERNS,
    nodir: true,
  });

  // 전체 파일을 한 번만 읽어서 캐싱합니다. (O(N) 읽기)
  console.log("📂 프로젝트 전체 파일 캐싱 중...");
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      fileContentCache.set(file, content);
    } catch (e) {
      // 읽기 실패 시 무시 (바이너리 파일 등)
    }
  }

  for (const file of filesToReview) {
    if (!fs.existsSync(file)) continue;

    console.log(`\n🔎 [Target: ${file}] 심층 분석 중...`);

    // 연관 파일 찾기 (캐시 활용)
    const relatedFiles = findRelatedFiles(file, allFiles);

    if (relatedFiles.length === 0) {
      console.log(`   - 연관 파일 없음. 단독 정밀 분석 수행.`);
      await checkSingleFile(model, file);
    } else {
      console.log(
        `   - 연관 파일 ${relatedFiles.length}개 발견. 1:1 교차 검증 수행.`
      );
      // 단독 분석도 수행
      await checkSingleFile(model, file);
      // 연관 파일과 호환성 검사
      for (const related of relatedFiles) {
        await checkPairCompatibility(model, file, related);
      }
    }
  }

  // PR 코멘트 작성
  await postReviewSummary();
}

// ==========================================
// 🧠 헬퍼 함수: 연관 파일 찾기
// ==========================================
function findRelatedFiles(targetFile: string, allFiles: string[]): string[] {
  const dir = path.dirname(targetFile);
  const targetFileName = path.basename(targetFile);
  const targetNameNoExt = path.basename(targetFile, path.extname(targetFile));

  const related = new Set<string>();

  // 역방향 의존성 스캔
  for (const otherFile of allFiles) {
    if (otherFile === targetFile) continue;

    // fs.readFileSync 대신 캐시 사용
    const content = fileContentCache.get(otherFile) || "";

    // 내용이 없으면 건너뜀
    if (!content) continue;

    if (content.includes(targetFileName) || content.includes(targetNameNoExt)) {
      related.add(otherFile);
    }
  }

  // review_index.md 확인 (수동 매핑 파일이 있다면)
  const indexFile = path.join(dir, "review_index.md");
  if (fs.existsSync(indexFile)) {
    try {
      const content = fs.readFileSync(indexFile, "utf-8");
      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        const indexData = JSON.parse(jsonMatch[1]);
        if (Array.isArray(indexData[targetFileName])) {
          console.log(`   📌 review_index.md 규칙 추가 적용됨`);
          indexData[targetFileName].forEach((f: string) => related.add(f));
        }
      }
    } catch {
      console.warn("   ⚠️ review_index.md 파싱 실패, 무시합니다.");
    }
  }

  return Array.from(related);
}

// ==========================================
// 🤖 단일 파일 검사
// ==========================================
async function checkSingleFile(model: GenerativeModel, targetFile: string) {
  const content =
    fileContentCache.get(targetFile) || fs.readFileSync(targetFile, "utf-8");

  const prompt = `
당신은 시니어 개발자로서 코드 리뷰를 수행합니다.

[분석 대상: ${targetFile}]
\`\`\`
${content}
\`\`\`

[검사 항목]
1. 런타임 에러 가능성 (null/undefined 접근, 타입 에러 등)
2. 로직 오류 (잘못된 조건문, 무한 루프 가능성 등)
3. 보안 취약점 (XSS, injection 등)
4. 성능 이슈 (불필요한 리렌더링, 메모리 누수 등)
5. 타입 안전성 문제 (TypeScript인 경우)
6. 오탈자

[응답 규칙]
- 문제가 없으면 "PASS"라고만 답하세요.
- 문제가 있으면 아래 형식으로 답하세요:
  - 🔴 심각: (런타임 에러, 보안 취약점)
  - 🟡 주의: (로직 오류, 성능 이슈)
  - 💡 제안: (개선 사항)
- 단순 스타일 지적은 하지 마세요.
- 한국어로 핵심만 간결하게 마크다운 형식으로 작성하세요.
- 인사말은 필요없습니다.
`;

  const result = await callGemini(model, prompt, targetFile);

  if (result.status === "pass") {
    reviewResults.push({ file: targetFile, status: "pass" });
  } else if (result.status === "issue") {
    reviewResults.push({
      file: targetFile,
      status: "issue",
      message: result.message,
    });
  } else {
    reviewResults.push({
      file: targetFile,
      status: "error",
      message: result.message,
    });
  }
}

// ==========================================
// 🤖 1:1 호환성 검사
// ==========================================
async function checkPairCompatibility(
  model: any,
  targetFile: string,
  relatedFile: string
) {
  if (!fs.existsSync(relatedFile)) return;

  const targetContent = fs.readFileSync(targetFile, "utf-8");
  // 캐시가 있으면 캐시 사용, 없으면 읽기
  const relatedContent =
    fileContentCache.get(relatedFile) || fs.readFileSync(relatedFile, "utf-8");

  const prompt = `
당신은 코드 간의 호환성을 검증하는 시니어 개발자입니다.

[상황]
'${targetFile}'(수정됨)이 '${relatedFile}'에서 참조되고 있습니다.

[검사 항목]
- 함수/컴포넌트 시그니처 변경으로 인한 호환성 문제
- Props/인터페이스 변경으로 인한 타입 에러
- 삭제된 export를 참조하는 문제
- 리턴 타입 변경으로 인한 문제

--- [수정된 파일: ${targetFile}] ---
\`\`\`
${targetContent}
\`\`\`

--- [참조 중인 파일: ${relatedFile}] ---
\`\`\`
${relatedContent}
\`\`\`

[응답 규칙]
- 호환성 문제가 없으면 "PASS"라고만 출력하세요.
- 문제가 있으면 "🚨 호환성 경고:"로 시작하여 구체적으로 설명하세요.
- 한국어로 작성하세요.
`;

  process.stdout.write(
    `   👉 ${path.basename(relatedFile)} 호환성 검사 중... `
  );

  const result = await callGemini(
    model,
    prompt,
    `${targetFile} ↔ ${relatedFile}`
  );

  if (result.status === "issue") {
    reviewResults.push({
      file: targetFile,
      status: "issue",
      message: result.message,
      relatedFile,
    });
  }
}

// ==========================================
// 📡 API 호출 (재시도 로직 포함)
// ==========================================
async function callGemini(
  model: any,
  prompt: string,
  contextLabel: string,
  retries = 3
): Promise<{ status: "pass" | "issue" | "error"; message?: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();

      if (response === "PASS" || response.toUpperCase() === "PASS") {
        console.log("✅ PASS");
        return { status: "pass" };
      } else {
        console.log("⚠️ 이슈 발견");
        console.log("---------------------------------------------------");
        console.log(`[AI Review: ${contextLabel}]`);
        console.log(response);
        console.log("---------------------------------------------------");
        return { status: "issue", message: response };
      }
    } catch (e) {
      if (i === retries - 1) {
        console.log("❌ API Error (재시도 실패)");
        console.error(`   (상세: ${e})`);
        return { status: "error", message: String(e) };
      } else {
        console.log(`   ⏳ 재시도 중... (${i + 1}/${retries})`);
        await sleep(2000 * (i + 1));
      }
    }
  }
  return { status: "error", message: "Unknown error" };
}

// ==========================================
// 💬 PR 코멘트 작성
// ==========================================
async function postComment(body: string) {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_PR_NUMBER) {
    console.log("📝 PR 코멘트 (로컬 환경):");
    console.log(body);
    return;
  }

  // 👇 [보안] Repository 형식 검증 추가
  const repoParts = GITHUB_REPOSITORY.split("/");
  if (repoParts.length !== 2) {
    console.error(
      "❌ GITHUB_REPOSITORY 형식이 올바르지 않습니다 (예: owner/repo)"
    );
    return;
  }
  const [owner, repo] = repoParts;

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const prNumber = parseInt(GITHUB_PR_NUMBER, 10);

    if (prNumber > 0) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      console.log("✅ PR 코멘트 작성 완료");
    }
  } catch (e) {
    console.error("❌ PR 코멘트 작성 실패:", e);
  }
}

async function postReviewSummary() {
  const issues = reviewResults.filter((r) => r.status === "issue");
  const passes = reviewResults.filter((r) => r.status === "pass");
  const errors = reviewResults.filter((r) => r.status === "error");

  let body = `## 🤖 AI 코드 리뷰 결과\n\n`;
  body += `| 상태 | 개수 |\n|:---:|:---:|\n`;
  body += `| ✅ Pass | ${passes.length} |\n`;
  body += `| ⚠️ Issues | ${issues.length} |\n`;
  body += `| ❌ Errors | ${errors.length} |\n\n`;

  if (issues.length > 0) {
    body += `### ⚠️ 발견된 이슈\n\n`;
    for (const issue of issues) {
      const fileLabel = issue.relatedFile
        ? `\`${issue.file}\` ↔ \`${issue.relatedFile}\``
        : `\`${issue.file}\``;
      body += `<details>\n<summary>${fileLabel}</summary>\n\n`;
      body += `${issue.message}\n\n`;
      body += `</details>\n\n`;
    }
  }

  if (errors.length > 0) {
    body += `### ❌ 분석 실패\n\n`;
    for (const error of errors) {
      body += `- \`${error.file}\`: ${error.message}\n`;
    }
  }

  if (issues.length === 0 && errors.length === 0) {
    body += `### ✨ 모든 검사 통과!\n\n코드에서 특별한 이슈가 발견되지 않았습니다.`;
  }

  body += `\n\n---\n*Powered by ${MODEL_NAME}*`;

  await postComment(body);
}

// ==========================================
// 🔧 유틸리티
// ==========================================
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
