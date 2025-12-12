import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";

import { initScheduler } from "./scheduler";
import { runPipeline } from "./services/pipeline.service";

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ .env 파일 확인 필요!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const corsOriginEnv = process.env.FRONTEND_URL || "http://localhost:5173";

const corsOrigin = corsOriginEnv.includes(",")
  ? corsOriginEnv.split(",")
  : corsOriginEnv;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Web Dev Trend AI Pipeline is Running!");
});

// 트렌드 목록 조회 (검색 & 필터 & 페이지네이션)
app.get("/api/trends", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // 검색어와 태그 필터 파라미터 받기
    const searchKeyword = ((req.query.searchKeyword as string) || "").trim();
    const tagFilter = ((req.query.tagFilter as string) || "").trim();

    // 범위 계산 (1페이지: 0~19, 2페이지: 20~39)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. 기본 쿼리 (점수가 0보다 큰 것만)
    let query = supabase
      .from("trend")
      .select("id, title, link, date, source, analysis_results", {
        count: "exact",
      })
      .eq("status", "ANALYZED")
      .order("date", { ascending: false });

    // 2. 검색어 필터 (제목 또는 요약에 포함)
    if (searchKeyword) {
      query = query.ilike("title", `%${searchKeyword}%`);
    }

    // 3. 태그 필터 (배열에 포함)
    if (tagFilter) {
      // "React,CSS" -> ["React", "CSS"]
      const tags = tagFilter
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      if (tags.length > 0) {
        // PostgREST의 JSONB contains 연산자 활용
        // analysis_results 컬럼은 배열이므로, 배열 안의 객체 중 하나라도
        // 해당 태그들을 포함하고 있는지 검사합니다.
        // 문법: analysis_results.cs.[{"tags": ["React", "CSS"]}]

        // 주의: tags 배열 전체가 포함되어야 함 (Subset Check)
        query = query.contains(
          "analysis_results",
          JSON.stringify([{ tags: tags }])
        );
      }
    }

    // 4. 페이지네이션 및 실행
    const { data, error, count } = await query.range(from, to);

    if (error) {
      // 4-1. 페이지가 2페이지 이상인데 에러가 났다면? -> "데이터 없음(416)"일 확률 99%
      //    이때는 죽지 말고 "성공(빈 리스트)"으로 처리합니다.
      if (page > 1) {
        console.warn(
          `⚠️ Page ${page} fetching failed (likely 416 Range Not Satisfiable). Returning empty list.`
        );
        return res.status(200).json({
          success: true,
          data: [], // 빈 데이터 반환
          page: page,
          total: 0, // 카운트는 알 수 없거나 0 처리
        });
      }

      // 4-2. 그 외 진짜 DB 에러(1페이지부터 에러 등)는 로그 찍고 500 에러 발생
      console.error("🔍 DB Error Detail:", error);
      throw error;
    }
    res.status(200).json({
      success: true,
      data: data,
      page: page,
      total: count,
    });
  } catch (error: any) {
    console.error("❌ 트렌드 조회 실패 (Server Fault):", error);

    res.status(500).json({
      error: "데이터 로드 실패",
      details: error.message || "Unknown error",
    });
  }
});

// 수동 실행 API
app.post("/api/pipeline/run", async (req: Request, res: Response) => {
  console.log("👆 [Manual] Pipeline execution requested");
  const result = await runPipeline();
  res.json(result);
});

// 구독 API
app.post("/api/subscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "이메일 필요" });

    const { data, error } = await supabase
      .from("subscriber")
      .insert([{ email }])
      .select();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: "구독 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`📡 Pipeline Controller running on http://localhost:${PORT}`);
  initScheduler();
});
