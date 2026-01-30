import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";
import rateLimit from "express-rate-limit";

import { runPipeline, runRetryPipeline } from "./services/pipeline.service";
import { sendEmailReport } from "./services/email.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

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

let isPipelineRunning = false;
let isRetryRunning = false; // 🆕 재시도 파이프라인 Lock

// 유틸리티 함수들
const parseStringQuery = (query: unknown): string => {
  if (Array.isArray(query)) return String(query[0] || "").trim();
  return String(query || "").trim();
};

const getHeaderValue = (header: string | string[] | undefined): string => {
  if (Array.isArray(header)) return header[0] || "";
  return header || "";
};

const safeCompare = (a: string, b: string): boolean => {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
};

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "요청이 너무 많습니다." },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: "관리자 요청 제한 초과" },
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "구독 요청 제한 초과" },
});

// ==========================================
// 1. 배치 모드 (GitHub Actions / Cron)
// ==========================================
if (process.env.BATCH_MODE === "true") {
  (async () => {
    const batchType = process.env.BATCH_TYPE || "pipeline"; // 🆕 pipeline | retry

    console.log(`🚀 [Batch Mode] Starting ${batchType.toUpperCase()}...`);

    try {
      if (batchType === "retry") {
        // 🆕 FAIL 재시도 배치
        const result = await runRetryPipeline();
        await sendEmailReport("RETRY_SUCCESS", { ...result });
        console.log("👋 [Batch Mode] Retry 완료");
      } else {
        // 기존 파이프라인
        const result = await runPipeline();
        await sendEmailReport("SUCCESS", { ...result });
        console.log("👋 [Batch Mode] Pipeline 완료");
      }
      process.exit(0);
    } catch (error) {
      console.error("🔥 [Batch Mode] 실패:", error);
      await sendEmailReport("FAILURE", { error: String(error) });
      process.exit(1);
    }
  })();
} else {
  // ==========================================
  // 2. 웹 서버 모드
  // ==========================================
  const corsOriginEnv = process.env.FRONTEND_URL || "http://localhost:5173";
  const corsOrigin = corsOriginEnv.includes(",")
    ? corsOriginEnv.split(",").map((s) => s.trim())
    : corsOriginEnv;

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json());

  app.get("/", (req: Request, res: Response) => {
    res.send("🚀 Trendiv Pipeline v2.0 - AI API Direct Mode");
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 트렌드 목록 조회
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.get(
    "/api/trends",
    generalLimiter,
    async (req: Request, res: Response) => {
      try {
        const page = Math.max(
          1,
          parseInt(parseStringQuery(req.query.page)) || 1,
        );
        const limit = Math.min(
          100,
          Math.max(1, parseInt(parseStringQuery(req.query.limit)) || 20),
        );

        const searchKeyword = parseStringQuery(req.query.searchKeyword) || null;
        const startDate = parseStringQuery(req.query.startDate) || null;
        const endDate = parseStringQuery(req.query.endDate) || null;

        const categoryStr = parseStringQuery(req.query.category);
        const categories = categoryStr
          ? categoryStr
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : null;

        const tagFilterStr = parseStringQuery(req.query.tagFilter);
        const tags = tagFilterStr
          ? tagFilterStr
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null;

        const sortBy = parseStringQuery(req.query.sortBy) || "latest";
        const minScore = parseInt(parseStringQuery(req.query.minScore)) || 0;

        const userId = parseStringQuery(req.query.userId) || null;
        const statusFilter = parseStringQuery(req.query.statusFilter) || "all";

        const { data: rpcData, error } = await supabase.rpc(
          "search_trends_by_filter",
          {
            p_search_keyword: searchKeyword,
            p_categories: categories,
            p_tags: tags && tags.length > 0 ? tags : null,
            p_start_date: startDate,
            p_end_date: endDate,
            p_min_score: minScore,
            p_sort_by: sortBy,
            p_page: page,
            p_limit: limit,
            p_user_id: userId,
            p_status_filter: statusFilter,
          },
        );

        if (error) throw error;

        let trends = [];
        let totalCount = 0;

        if (rpcData && rpcData.length > 0) {
          totalCount = rpcData[0].total_count;
          trends = rpcData.map(({ total_count, ...rest }: any) => rest);
        }

        res
          .status(200)
          .json({ success: true, data: trends, page, total: totalCount });
      } catch (error: unknown) {
        console.error("❌ 트렌드 조회 실패:", error);
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "데이터 로드 실패", details: message });
      }
    },
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 FAIL 상태 조회 API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.get(
    "/api/trends/failed",
    generalLimiter,
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(
          100,
          Math.max(1, parseInt(parseStringQuery(req.query.limit)) || 50),
        );

        const { data, error } = await supabase
          .from("trend")
          .select("*")
          .eq("status", "FAIL")
          .order("date", { ascending: false })
          .limit(limit);

        if (error) throw error;

        res.status(200).json({
          success: true,
          data: data || [],
          count: data?.length || 0,
        });
      } catch (error: unknown) {
        console.error("❌ FAIL 항목 조회 실패:", error);
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "데이터 로드 실패", details: message });
      }
    },
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔒 파이프라인 수동 실행 (기존)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.post(
    "/api/pipeline/run",
    adminLimiter,
    async (req: Request, res: Response) => {
      if (isPipelineRunning) {
        console.warn("⚠️ 파이프라인이 이미 실행 중입니다.");
        return res.status(429).json({ error: "Pipeline is already running" });
      }

      const clientKey =
        getHeaderValue(req.headers["x-api-key"]) ||
        getHeaderValue(req.headers["authorization"]);

      const isValid =
        safeCompare(clientKey, PIPELINE_API_KEY || "") ||
        safeCompare(clientKey, `Bearer ${PIPELINE_API_KEY || ""}`);

      if (!PIPELINE_API_KEY || !isValid) {
        console.warn(`⛔ 미승인 접근 (IP: ${req.ip})`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      const mode = req.body.mode === "weekly" ? "weekly" : "daily";

      console.log(
        `👆 [Manual] 실행 요청됨 (${mode.toUpperCase()}) -> 즉시 Lock 설정`,
      );
      isPipelineRunning = true;

      try {
        res.status(202).json({
          success: true,
          message: "Pipeline triggered successfully. Running in background.",
          jobId: Date.now(),
        });
      } catch (err) {
        isPipelineRunning = false;
        console.error("❌ 응답 전송 실패:", err);
        return;
      }

      console.log("👆 [Manual] 백그라운드 작업 시작");

      (async () => {
        try {
          const result = await runPipeline(mode);

          if (result.success) {
            console.log(
              `✅ [Background] 파이프라인 성공: ${result.count}건 처리, ${result.failedCount || 0}건 FAIL`,
            );
          } else {
            console.error("❌ [Background] 파이프라인 실패:", result.error);
          }
        } catch (err) {
          console.error("❌ [Background] 파이프라인 예외 발생:", err);
        } finally {
          isPipelineRunning = false;
          console.log("🏁 [Background] 실행 종료 (Lock 해제)");
        }
      })();
    },
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 FAIL 재시도 수동 실행
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.post(
    "/api/pipeline/retry",
    adminLimiter,
    async (req: Request, res: Response) => {
      if (isRetryRunning) {
        console.warn("⚠️ 재시도 파이프라인이 이미 실행 중입니다.");
        return res
          .status(429)
          .json({ error: "Retry pipeline is already running" });
      }

      const clientKey =
        getHeaderValue(req.headers["x-api-key"]) ||
        getHeaderValue(req.headers["authorization"]);

      const isValid =
        safeCompare(clientKey, PIPELINE_API_KEY || "") ||
        safeCompare(clientKey, `Bearer ${PIPELINE_API_KEY || ""}`);

      if (!PIPELINE_API_KEY || !isValid) {
        console.warn(`⛔ 미승인 접근 (IP: ${req.ip})`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("🔄 [Retry] 실행 요청됨 -> 즉시 Lock 설정");
      isRetryRunning = true;

      try {
        res.status(202).json({
          success: true,
          message:
            "Retry pipeline triggered successfully. Running in background.",
          jobId: Date.now(),
        });
      } catch (err) {
        isRetryRunning = false;
        console.error("❌ 응답 전송 실패:", err);
        return;
      }

      console.log("🔄 [Retry] 백그라운드 작업 시작 (Playwright 사용)");

      (async () => {
        try {
          const result = await runRetryPipeline();

          if (result.success) {
            console.log(
              `✅ [Retry Background] 성공: ${result.count}건 복구, ${result.failedCount || 0}건 최종 실패`,
            );
          } else {
            console.error("❌ [Retry Background] 실패:", result.error);
          }
        } catch (err) {
          console.error("❌ [Retry Background] 예외 발생:", err);
        } finally {
          isRetryRunning = false;
          console.log("🏁 [Retry Background] 실행 종료 (Lock 해제)");
        }
      })();
    },
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 구독 API (기존)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
          .upsert([{ email }], { onConflict: "email", ignoreDuplicates: true })
          .select();

        if (error) throw error;

        if (!data || data.length === 0) {
          return res.status(409).json({ message: "Already subscribed" });
        }

        return res.status(200).json({ success: true, data });
      } catch (error) {
        console.error("구독 에러:", error);
        return res.status(500).json({ error: "구독 처리 실패" });
      }
    },
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🆕 상태 대시보드 API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.get(
    "/api/status",
    generalLimiter,
    async (req: Request, res: Response) => {
      try {
        // 각 상태별 카운트 조회
        const [rawCount, analyzedCount, rejectedCount, failCount] =
          await Promise.all([
            supabase
              .from("trend")
              .select("*", { count: "exact", head: true })
              .eq("status", "RAW"),
            supabase
              .from("trend")
              .select("*", { count: "exact", head: true })
              .eq("status", "ANALYZED"),
            supabase
              .from("trend")
              .select("*", { count: "exact", head: true })
              .eq("status", "REJECTED"),
            supabase
              .from("trend")
              .select("*", { count: "exact", head: true })
              .eq("status", "FAIL"),
          ]);

        res.status(200).json({
          success: true,
          data: {
            RAW: rawCount.count || 0,
            ANALYZED: analyzedCount.count || 0,
            REJECTED: rejectedCount.count || 0,
            FAIL: failCount.count || 0,
          },
          isPipelineRunning,
          isRetryRunning,
        });
      } catch (error: unknown) {
        console.error("❌ 상태 조회 실패:", error);
        res.status(500).json({ error: "상태 조회 실패" });
      }
    },
  );

  const server = app.listen(PORT, () => {
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🚀 Mode: AI API Direct (Playwright only for retries)`);
  });

  // Graceful Shutdown
  const shutdown = () => {
    console.log("Shutdown signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
