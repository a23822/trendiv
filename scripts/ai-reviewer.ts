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

// 룰 파일 경로 (환경변수로 오버라이드 가능)
const RULES_FILE_PATH = process.env.AI_REVIEW_RULES_PATH
  ? path.join(process.cwd(), process.env.AI_REVIEW_RULES_PATH)
  : path.join(process.cwd(), ".github/ai-review-rules.md");

// 🟡 동시 처리 개수 (CI 타임아웃 방지)
const CONCURRENCY_LIMIT = parseInt(
  process.env.AI_REVIEW_CONCURRENCY || "3",
  10
);

// GitHub 코멘트 글자수 제한 (여유 있게 60000자로 설정)
const MAX_COMMENT_LENGTH = 60000;

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

  // 1. 규칙 파일 로드
  let customRules = "";
  if (fs.existsSync(RULES_FILE_PATH)) {
    try {
      customRules = fs.readFileSync(RULES_FILE_PATH, "utf-8");
      console.log(`📜 커스텀 리뷰 규칙 적용됨: ${RULES_FILE_PATH}`);
    } catch (e) {
      console.warn("⚠️ 규칙 파일 읽기 실패:", e);
    }
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const changedFiles = process.argv.slice(2);

  if (changedFiles.length === 0) {
    console.log("✨ 검사할 변경 파일이 없습니다.");
    return;
  }

  // 2. 리뷰 대상 필터링
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

  // 3. 프로젝트 전체 파일 인덱싱 및 캐싱
  console.log("📂 프로젝트 파일 인덱싱 중...");
  const allFiles = await glob("**/*.{ts,js,svelte,css,scss,html,tsx,jsx}", {
    ignore: IGNORE_PATTERNS,
    nodir: true,
  });

  // 🟡 메모리 관리: 50KB 미만, 최대 500개 파일만 캐싱
  let cachedCount = 0;
  const MAX_CACHED_FILES = 500;
  const MAX_FILE_SIZE = 50 * 1024; // 50KB

  for (const file of allFiles) {
    if (cachedCount >= MAX_CACHED_FILES) break;
    try {
      const stats = fs.statSync(file);
      if (stats.size < MAX_FILE_SIZE) {
        fileContentCache.set(file, fs.readFileSync(file, "utf-8"));
        cachedCount++;
      }
    } catch {
      // 읽기 실패 시 무시
    }
  }

  console.log(
    `📝 [${MODEL_NAME}] 리뷰 시작 (${filesToReview.length}개 파일, 동시성: ${CONCURRENCY_LIMIT})`
  );

  // 4. 🟡 병렬 처리로 성능 개선 (p-limit 대신 직접 구현)
  const tasks: Array<() => Promise<void>> = [];

  for (const file of filesToReview) {
    if (!fs.existsSync(file)) continue;

    tasks.push(async () => {
      console.log(`\n🔎 [Target: ${file}] 심층 분석 중...`);

      let relatedFiles = findRelatedFiles(file, allFiles);
      if (relatedFiles.length > 3) {
        relatedFiles = relatedFiles.slice(0, 3);
      }

      if (relatedFiles.length === 0) {
        console.log(`   - 연관 파일 없음. 단독 분석 수행.`);
        await checkSingleFile(model, file, customRules);
      } else {
        console.log(
          `   - 연관 파일 ${relatedFiles.length}개 발견. 교차 검증 수행.`
        );
        await checkSingleFile(model, file, customRules);
        for (const related of relatedFiles) {
          await checkPairCompatibility(model, file, related, customRules);
        }
      }
    });
  }

  // 동시성 제한 병렬 실행
  await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

  // 5. PR 코멘트 작성
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

  // 역방향 의존성 스캔 (캐시 활용)
  for (const otherFile of allFiles) {
    if (otherFile === targetFile) continue;

    const content = fileContentCache.get(otherFile);
    if (!content) continue;

    if (content.includes(targetFileName) || content.includes(targetNameNoExt)) {
      related.add(otherFile);
    }
  }

  // 💡 review_index.md 파싱 강화
  const indexFile = path.join(dir, "review_index.md");
  if (fs.existsSync(indexFile)) {
    try {
      const content = fs.readFileSync(indexFile, "utf-8");
      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        const indexData = JSON.parse(jsonMatch[1]);
        // 키 존재 여부 및 배열 타입 검증 강화
        if (
          indexData &&
          typeof indexData === "object" &&
          targetFileName in indexData &&
          Array.isArray(indexData[targetFileName])
        ) {
          console.log(`   📌 review_index.md 규칙 추가 적용됨`);
          indexData[targetFileName].forEach((f: unknown) => {
            if (typeof f === "string") {
              related.add(f);
            }
          });
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
async function checkSingleFile(
  model: GenerativeModel,
  targetFile: string,
  rules: string = ""
) {
  const content =
    fileContentCache.get(targetFile) || fs.readFileSync(targetFile, "utf-8");

  const prompt = `
당신은 시니어 개발자로서 코드 리뷰를 수행합니다.

${rules ? `[🚨 프로젝트 필수 규칙]\n${rules}\n` : ""}

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
  model: GenerativeModel,
  targetFile: string,
  relatedFile: string,
  rules: string = ""
) {
  if (!fs.existsSync(relatedFile)) return;

  const targetContent =
    fileContentCache.get(targetFile) || fs.readFileSync(targetFile, "utf-8");
  const relatedContent =
    fileContentCache.get(relatedFile) || fs.readFileSync(relatedFile, "utf-8");

  const prompt = `
당신은 코드 간의 호환성을 검증하는 시니어 개발자입니다.

${rules ? `[🚨 프로젝트 필수 규칙]\n${rules}\n` : ""}

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
  model: GenerativeModel,
  prompt: string,
  contextLabel: string,
  retries = 3
): Promise<{ status: "pass" | "issue" | "error"; message?: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);

      // 🔴 응답 객체 상태 체크 강화
      const response = result.response;
      if (!response) {
        throw new Error("AI 응답이 비어있습니다.");
      }

      // Safety ratings 체크
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        const blockReason = response.promptFeedback?.blockReason;
        throw new Error(
          `AI 응답이 차단되었습니다. 사유: ${blockReason || "알 수 없음"}`
        );
      }

      const responseText = response.text();
      if (!responseText) {
        throw new Error("AI 응답 텍스트가 비어있습니다.");
      }

      const trimmedResponse = responseText.trim();

      // 🟡 PASS 판정 로직 개선: 정규식 사용
      // "PASS", "PASS ", "PASS\n", "PASS." 등 다양한 형태 허용
      if (/^PASS\b/i.test(trimmedResponse)) {
        console.log("✅ PASS");
        return { status: "pass" };
      } else {
        console.log("⚠️ 이슈 발견");
        console.log("---------------------------------------------------");
        console.log(`[AI Review: ${contextLabel}]`);
        console.log(trimmedResponse);
        console.log("---------------------------------------------------");
        return { status: "issue", message: trimmedResponse };
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

    if (isNaN(prNumber) || prNumber <= 0) {
      console.error("❌ PR_NUMBER가 유효하지 않습니다.");
      return;
    }

    // 💡 코멘트 길이 제한
    let finalBody = body;
    if (finalBody.length > MAX_COMMENT_LENGTH) {
      finalBody = finalBody.slice(0, MAX_COMMENT_LENGTH - 100);
      finalBody += "\n\n... (리뷰 내용이 너무 길어 일부가 생략되었습니다)";
    }

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: finalBody,
    });
    console.log("✅ PR 코멘트 작성 완료");
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

// 🟡 동시성 제한 병렬 실행 (p-limit 대체)
async function runWithConcurrency(
  tasks: Array<() => Promise<void>>,
  limit: number
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

main().catch(console.error);
