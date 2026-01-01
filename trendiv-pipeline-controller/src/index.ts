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

// 🛡️ Cloudflare/Load Balancer 환경 프록시 신뢰 설정
app.set("trust proxy", true);

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const PIPELINE_API_KEY = process.env.PIPELINE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 필수 환경변수 누락: SUPABASE_URL 또는 SUPABASE_KEY");
  process.exit(1);
}
if (!PIPELINE_API_KEY) {
  console.warn("⚠️ 경고: PIPELINE_API_KEY 미설정. 보안 취약.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🛠️ 쿼리 파라미터 안전 파싱 (배열 방지)
const parseStringQuery = (query: any): string => {
  if (Array.isArray(query)) return String(query[0] || "").trim();
  return String(query || "").trim();
};

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "요청이 너무 많습니다." },
  standardHeaders: true,
  legacyHeaders: false,
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "구독 요청 제한 초과" },
});

// [추가] 관리자 API용 Rate Limit (DoS 방지)
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // 1분에 5번 이상 실행 금지
  message: { error: "관리자 요청 제한 초과" },
});

// ==========================================
// 1. 배치 모드 (GitHub Actions / Cron)
// ==========================================
if (process.env.BATCH_MODE === "true") {
  (async () => {
    console.log("🚀 [Batch Mode] 파이프라인 시작...");
    try {
      const result = await runPipeline();
      await sendEmailReport("SUCCESS", result);
      console.log("👋 [Batch Mode] 성공 종료");
      process.exit(0);
    } catch (error) {
      console.error("🔥 [Batch Mode] 실패:", error);
      await sendEmailReport("FAILURE", { error: String(error) });
      process.exit(1); // 🔴 실패 시 Exit Code 1 (CI 감지용)
    }
  })();
} else {
  // ==========================================
  // 2. 웹 서버 모드
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

        // 배열 에러 방지 유틸 사용
        const searchKeyword = parseStringQuery(req.query.searchKeyword);
        const tagFilter = parseStringQuery(req.query.tagFilter);

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
            // 🟡 [참고] JSONB 구조에 따라 검색이 안 될 수 있음.
            // 정확도를 위해선 Postgres Function을 쓰는 게 좋지만 현재 구조 유지.
            query = query.contains(
              "analysis_results",
              JSON.stringify([{ tags: tags }])
            );
          }
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
          // 416 에러(범위 초과)는 빈 배열 반환으로 처리
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

  // 🔒 파이프라인 수동 실행
  app.post(
    "/api/pipeline/run",
    adminLimiter,
    async (req: Request, res: Response) => {
      const clientKey =
        req.headers["x-api-key"] || req.headers["authorization"];
      const isValid =
        clientKey === PIPELINE_API_KEY ||
        clientKey === `Bearer ${PIPELINE_API_KEY}`;

      if (!PIPELINE_API_KEY || !isValid) {
        console.warn(`⛔ 미승인 접근 (IP: ${req.ip})`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("👆 [Manual] 실행 요청됨 (동기 실행 모드)");

      try {
        // 🔴 [중요 변경] Cloud Run에서는 응답을 보내면 CPU가 꺼집니다.
        // 따라서 작업을 await로 기다려야 파이프라인이 끝까지 돕니다.
        // (단, HTTP 타임아웃 60초~300초 주의 필요)
        const result = await runPipeline();

        // 실행 완료 후 응답
        res.json({
          success: true,
          message: "Pipeline executed successfully",
          result,
        });
      } catch (err) {
        console.error("❌ 실행 실패:", err);
        res
          .status(500)
          .json({ error: "Pipeline execution failed", details: String(err) });
      }
    }
  );

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

        // 1. 중복 체크 먼저 수행
        const { data: existing } = await supabase
          .from("subscriber")
          .select("id")
          .eq("email", email)
          .single();

        if (existing) {
          // 🟡 [수정] 이미 있으면 409 Conflict 반환 (에러 아님)
          return res.status(409).json({ message: "Already subscribed" });
        }

        const { data, error } = await supabase
          .from("subscriber")
          .insert([{ email }])
          .select();
        if (error) throw error;
        res.status(200).json({ success: true, data });
      } catch (error) {
        console.error("구독 에러:", error);
        res.status(500).json({ error: "구독 처리 실패" });
      }
    }
  );

  const server = app.listen(PORT, () => {
    console.log(`📡 Server running on http://localhost:${PORT}`);
  });

  // Graceful Shutdown (종료 시그널 처리)
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });
}
