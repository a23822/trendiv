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

// Supabase 설정 확인
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ .env 파일에 SUPABASE_URL과 SUPABASE_KEY가 없습니다!");
  process.exit(1);
}

// 전역 클라이언트 (구독 등 간단한 작업용)
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Web Dev Trend AI Pipeline is Running!");
});

app.post("/api/pipeline/run", async (req: Request, res: Response) => {
  console.log("👆 [Manual] Pipeline execution requested");
  const result = await runPipeline();
  res.json(result);
});

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
    console.error("❌ 구독 실패:", error.message);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

// 트렌드 목록 조회 API
app.get("/api/trends", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log(`🔍 [API] 조회 요청: Page ${page} (${from}~${to})`);

    let query = supabase
      .from("trend")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .range(from, to);

    // 2. 점수 필터링 적용 (옵션)
    query = query.gt("score", 0);

    const { data, error, count } = await query;

    if (error) {
      console.error(
        "❌ [Supabase Error Detail]:",
        JSON.stringify(error, null, 2)
      );
      throw error;
    }

    console.log(
      `✅ [API] 조회 성공: ${data?.length}개 가져옴 (Total: ${count})`
    );

    res.status(200).json({
      success: true,
      data: data,
      page: page,
      total: count,
    });
  } catch (error: any) {
    console.error("❌ 트렌드 조회 최종 실패:", error);
    res
      .status(500)
      .json({ error: "데이터를 가져오지 못했습니다.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`📡 Pipeline Controller running on http://localhost:${PORT}`);
  initScheduler();
});
