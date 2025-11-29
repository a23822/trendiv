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
    const searchKeyword = (req.query.searchKeyword as string) || "";
    const tagFilter = (req.query.tagFilter as string) || "";

    // 범위 계산 (1페이지: 0~19, 2페이지: 20~39)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. 기본 쿼리 (점수가 0보다 큰 것만)
    let query = supabase
      .from("trend")
      .select("*", { count: "exact" })
      .gt("score", 0)
      .order("date", { ascending: false });

    // 2. 검색어 필터 (제목 또는 요약에 포함)
    if (searchKeyword) {
      query = query.or(
        `title.ilike.%${searchKeyword}%,summary.ilike.%${searchKeyword}%`
      );
    }

    // 3. 태그 필터 (배열에 포함)
    if (tagFilter) {
      query = query.contains("tags", [tagFilter]);
    }

    // 4. 페이지네이션 및 실행
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: data,
      page: page,
      total: count,
    });
  } catch (error: any) {
    console.error("❌ 트렌드 조회 실패:", error);
    res.status(500).json({ error: "데이터 로드 실패" });
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
