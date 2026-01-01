import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";
import rateLimit from "express-rate-limit";

import { runPipeline } from "./services/pipeline.service";
import { sendEmailReport } from "./services/email.service";

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ [보안] Cloudflare + Google Cloud Run 환경을 위해 신뢰할 프록시 개수 지정
// 1로 설정하면 바로 앞단(Cloudflare 등)의 IP를 신뢰하지 못할 수 있으므로,
// 루프백이 아닌 모든 프록시를 신뢰하거나(true), 환경에 맞춰 숫자를 늘려야 합니다.
app.set("trust proxy", true);

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY;

// 💡 [안정성] 필수 환경변수 사전 검증
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 필수 환경변수 누락: SUPABASE_URL 또는 SUPABASE_KEY");
  process.exit(1);
}
if (!PIPELINE_API_KEY) {
  console.warn("⚠️ 경고: PIPELINE_API_KEY가 없습니다. 보안이 취약합니다.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "구독 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});

// ==========================================
// 1. 배치 모드 (GitHub Actions / Cron)
// ==========================================
if (process.env.BATCH_MODE === "true") {
  (async () => {
    console.log("🚀 [Batch Mode] 파이프라인 즉시 실행...");

    try {
      const result = await runPipeline();
      await sendEmailReport("SUCCESS", result);
      console.log("👋 [Batch Mode] 성공적으로 종료합니다.");
      process.exit(0);
    } catch (error) {
      console.error("🔥 [Batch Mode] 실패:", error);
      await sendEmailReport("FAILURE", { error: String(error) });

      // 🔴 [심각 수정] 에러 발생 시 exit code 1을 반환해야 CI가 실패를 감지함
      process.exit(1);
    }
  })();
} else {
  // ==========================================
  // 2. 웹 서버 모드 (API Server)
  // ==========================================
  const corsOriginEnv = process.env.FRONTEND_URL || "http://localhost:5173";
  const corsOrigin = corsOriginEnv.includes(",")
    ? corsOriginEnv.split(",")
    : corsOriginEnv;

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());

  app.get("/", (req: Request, res: Response) => {
    res.send("🚀 Web Dev Trend AI Pipeline is Running!");
  });

  // 트렌드 목록 조회
  app.get(
    "/api/trends",
    generalLimiter,
    async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const searchKeyword = (
          (req.query.searchKeyword as string) || ""
        ).trim();
        const tagFilter = ((req.query.tagFilter as string) || "").trim();
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
          .from("trend")
          .select("id, title, link, date, source, analysis_results, category", {
            count: "exact",
          })
          .eq("status", "ANALYZED")
          .order("date", { ascending: false });

        if (searchKeyword) query = query.ilike("title", `%${searchKeyword}%`);

        if (tagFilter) {
          const tags = tagFilter
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t);
          if (tags.length > 0) {
            // 🟡 JSONB 구조가 정확히 일치해야 함을 유의
            query = query.contains(
              "analysis_results",
              JSON.stringify([{ tags: tags }])
            );
          }
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
          if (page > 1)
            return res
              .status(200)
              .json({ success: true, data: [], page, total: 0 });
          throw error;
        }
        res.status(200).json({ success: true, data, page, total: count });
      } catch (error: any) {
        console.error("❌ 트렌드 조회 실패:", error);
        res
          .status(500)
          .json({ error: "데이터 로드 실패", details: error.message });
      }
    }
  );

  // 🔒 파이프라인 수동 실행 (API Key + Async)
  app.post("/api/pipeline/run", async (req: Request, res: Response) => {
    const clientKey = req.headers["x-api-key"] || req.headers["authorization"];
    const isValid =
      clientKey === PIPELINE_API_KEY ||
      clientKey === `Bearer ${PIPELINE_API_KEY}`;

    if (!PIPELINE_API_KEY || !isValid) {
      console.warn(`⛔ 승인되지 않은 실행 시도 (IP: ${req.ip})`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("👆 [Manual] 백그라운드 실행 요청됨");

    // 🔴 [Cloud Run 주의사항]
    // Cloud Run은 응답을 보낸 후 CPU를 할당하지 않을 수 있습니다.
    // 확실한 실행을 위해서는 'CPU always allocated' 옵션을 켜거나 Cloud Tasks를 써야 합니다.
    // 현재는 사용자 의도대로 비동기 실행 유지.
    runPipeline()
      .then(() => console.log("✅ [Manual] 실행 완료"))
      .catch((err) => console.error("❌ [Manual] 실행 실패:", err));

    res
      .status(202)
      .json({ success: true, message: "Pipeline started (Background)" });
  });

  // 구독 API
  app.post(
    "/api/subscribe",
    subscribeLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: "유효하지 않은 이메일" });
        }
        const { data, error } = await supabase
          .from("subscriber")
          .insert([{ email }])
          .select();
        if (error) throw error;
        res.status(200).json({ success: true, data });
      } catch (error) {
        res.status(500).json({ error: "구독 실패" });
      }
    }
  );

  app.listen(PORT, () => {
    console.log(`📡 Server running on http://localhost:${PORT}`);
  });
}
