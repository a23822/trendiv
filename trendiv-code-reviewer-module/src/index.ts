import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import axios, { AxiosError } from "axios";
import * as fs from "fs/promises";
import * as path from "path";
import simpleGit from "simple-git";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ----------------------------------------------------
// 타입 정의
// ----------------------------------------------------
interface KnowledgeEntry {
  keyword: string;
  firstSeen: string; // ISO 8601 날짜 문자열
  lastSeen: string; // ISO 8601 날짜 문자열
  mentionCount: number;
}
type KnowledgeBase = KnowledgeEntry[];

const app = express();
const PORT: number = parseInt(process.env.REVIEWER_PORT || "3004", 10);
app.use(express.json({ limit: "5mb" })); // HTML 코드가 클 수 있으므로 limit 설정

const KNOWLEDGE_BASE_PATH = path.join(__dirname, "knowledge-base.json");
const KIMI_API_ENDPOINT = process.env.KIMI_API_ENDPOINT;
const KIMI_API_KEY = process.env.KIMI_API_KEY;

// ----------------------------------------------------
// Kimi API 헬퍼 함수
// ----------------------------------------------------
async function callKimiApi(
  prompt: string,
  model: string = "kimi-k2-thinking"
): Promise<string> {
  if (!KIMI_API_ENDPOINT) {
    throw new Error("KIMI_API_ENDPOINT가 .env에 설정되지 않았습니다.");
  }

  try {
    const response = await axios.post(
      KIMI_API_ENDPOINT,
      {
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // 코드 리뷰는 일관성이 중요
      },
      {
        headers: {
          Authorization: `Bearer ${KIMI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Kimi API 응답 구조에 따라 정확한 텍스트 경로를 사용해야 합니다.
    // (OpenAI 호환 형식을 따른다고 가정)
    const kimiResponseText = response.data.choices[0].message.content;
    return kimiResponseText;
  } catch (error) {
    console.error("[Kimi API 오류]", (error as AxiosError).message);
    throw new Error("Kimi 리뷰 서버 호출에 실패했습니다.");
  }
}

// ----------------------------------------------------
// 엔드포인트 1: HTML 리뷰
// ----------------------------------------------------
app.post("/review-html", async (req: Request, res: Response) => {
  console.log("--- HTML 리뷰 요청 수신 ---");
  try {
    const { html } = req.body;
    if (!html) {
      return res
        .status(400)
        .json({ success: false, message: "HTML 내용이 없습니다." });
    }

    const prompt = `
        당신은 25년 경력의 이메일 HTML 전문가입니다.
        다음은 Gemini가 생성한 뉴스레터 HTML입니다. 이 코드를 **엄격하게** 검토하고 수정해 주세요.

        [검토 및 수정 규칙]
        1.  **인라인 CSS:** 모든 스타일이 \`<style>\` 태그가 아닌, \`style="..."\` 속성으로 완벽하게 인라인화되었는지 확인하고, 누락된 부분이 있다면 수정하세요.
        2.  **테이블 레이아웃:** 레이아웃이 \`<table>\`, \`<tr>\`, \`<td>\` 기반으로 작성되었는지 확인하세요. (div 기반 레이아웃은 Outlook에서 깨질 수 있습니다.)
        3.  **호환성:** 구형 Outlook, Gmail, Apple Mail에서 모두 안전하게 렌더링될 수 있도록 코드를 최적화하세요.
        4.  **어두운 모드:** 어두운 모드에서도 텍스트 가독성이 확보되는지 확인하고 필요시 \`meta\` 태그나 스타일을 보강하세요.
        5.  **출력:** **오직 수정이 완료된 최종 HTML 코드만** 반환하세요. (다른 설명이나 \`\`\`html\`\`\` 래핑 없이 순수한 HTML 코드)

        --- 검토할 HTML 시작 ---
        ${html}
        --- 검토할 HTML 끝 ---
        `;

    const finalHtml = await callKimiApi(prompt);
    console.log("✅ Kimi HTML 리뷰 및 수정 완료.");
    res.status(200).json({ success: true, finalHtml });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ----------------------------------------------------
// 엔드포인트 2: 지식 기반 업데이트
// ----------------------------------------------------
app.post("/update-knowledge", async (req: Request, res: Response) => {
  console.log("--- 지식 기반 업데이트 요청 수신 ---");
  try {
    const { keywords }: { keywords: string[] } = req.body;
    if (!keywords || keywords.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "업데이트할 키워드가 없습니다." });
    }

    // 1. 기존 지식 기반 로드 (파일이 없으면 빈 배열로 시작)
    let knowledgeBase: KnowledgeBase = [];
    try {
      // __dirname은 dist/index.js 기준이므로, 상위 폴더를 참조해야 할 수 있습니다.
      // 간단하게 현재 폴더(루트)에 저장하도록 경로 수정
      const dbPath = path.join(process.cwd(), "knowledge-base.json");
      const fileData = await fs.readFile(dbPath, "utf-8");
      knowledgeBase = JSON.parse(fileData);
    } catch (e) {
      console.log("knowledge-base.json 파일이 없어 새로 생성합니다.");
    }

    const today = new Date();
    const oneYearAgo = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate()
    );
    const todayISO = today.toISOString();

    // 2. 키워드 업데이트
    for (const kw of keywords) {
      const existingEntry = knowledgeBase.find(
        (entry) => entry.keyword.toLowerCase() === kw.toLowerCase()
      );
      if (existingEntry) {
        existingEntry.lastSeen = todayISO;
        existingEntry.mentionCount++;
      } else {
        knowledgeBase.push({
          keyword: kw,
          firstSeen: todayISO,
          lastSeen: todayISO,
          mentionCount: 1,
        });
      }
    }

    // 3. 1년 이상 언급되지 않은 키워드 제거
    const updatedKnowledgeBase = knowledgeBase.filter((entry) => {
      const lastSeenDate = new Date(entry.lastSeen);
      return lastSeenDate >= oneYearAgo;
    });

    // 4. 파일 저장
    const dbPath = path.join(process.cwd(), "knowledge-base.json");
    await fs.writeFile(
      dbPath,
      JSON.stringify(updatedKnowledgeBase, null, 2),
      "utf-8"
    );

    console.log(
      `✅ 지식 기반 업데이트 완료. (총 ${updatedKnowledgeBase.length}개 키워드)`
    );
    res.status(200).json({ success: true, status: "Knowledge base updated." });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// ----------------------------------------------------
// 엔드포인트 3: PR 생성 (TODO)
// ----------------------------------------------------
app.post("/create-pr-request", async (req: Request, res: Response) => {
  console.log("--- PR 생성 요청 수신 (구현 대기) ---");
  // TODO:
  // 1. KNOWLEDGE_BASE_PATH 로드
  // 2. Kimi API 호출하여 "이 키워드 기반으로 ai-scraper-module의 TARGET_URLS를 어떻게 개선해야 할까?" 프롬프트 전송
  // 3. Kimi가 반환한 수정된 코드를 simple-git을 사용하여 대상 레포에 PR 생성
  res.status(501).json({
    success: false,
    message: "PR 생성 기능은 아직 구현되지 않았습니다.",
  });
});

// ----------------------------------------------------
// 서버 시작
// ----------------------------------------------------

app.listen(PORT, () => {
  console.log(`✨ 코드 리뷰 AI 서버 (TS)가 포트 ${PORT}에서 실행 중입니다.`);
});
