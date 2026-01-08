import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
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

// 🛠️ 쿼리 파라미터 안전 파싱 (배열 방지)
const parseStringQuery = (query: unknown): string => {
  if (Array.isArray(query)) return String(query[0] || "").trim();
  return String(query || "").trim();
};

// 🛠️ 헤더 값 안전 추출 (배열 방지)
const getHeaderValue = (header: string | string[] | undefined): string => {
  if (Array.isArray(header)) return header[0] || "";
  return header || "";
};

// 🛡️ 안전한 문자열 비교 (Timing Attack 방지)
const safeCompare = (a: string, b: string): boolean => {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // 길이가 다르면 바로 false지만, 타이밍 공격 방지를 위해 더미 비교 수행
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

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "구독 요청 제한 초과" },
});

// 관리자 API용 Rate Limit (DoS 방지)
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
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
      await sendEmailReport("SUCCESS", { ...result });
      console.log("👋 [Batch Mode] 성공 종료");
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
        const page = Math.max(
          1,
          parseInt(parseStringQuery(req.query.page)) || 1
        );
        const limit = Math.min(
          100,
          Math.max(1, parseInt(parseStringQuery(req.query.limit)) || 20)
        );

        const searchKeyword = parseStringQuery(req.query.searchKeyword);
        const tagFilter = parseStringQuery(req.query.tagFilter);

        const from = (page - 1) * limit;

        // 태그 파싱
        const tags = tagFilter
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t);

        let data: any[] = [];
        let count: number | null = 0;

        if (tags.length > 0) {
          // ✅ 태그 필터 있으면 RPC 사용
          const { data: rpcData, error } = await supabase.rpc(
            "search_trends_by_tags",
            {
              tag_names: tags,
              search_keyword: searchKeyword,
              page_limit: limit,
              page_offset: from,
            }
          );

          if (error) throw error;

          // ✅ total_count는 각 row에 포함되어 있음
          if (rpcData && rpcData.length > 0) {
            count = rpcData[0].total_count;
            // total_count 필드 제거 후 반환
            data = rpcData.map(({ total_count, ...rest }: any) => rest);
          } else {
            data = [];
            count = 0;
          }
        } else {
          // 기존 로직 유지
          let query = supabase
            .from("trend")
            .select(
              "id, title, link, date, source, analysis_results, category",
              { count: "exact" }
            )
            .eq("status", "ANALYZED")
            .order("date", { ascending: false });

          if (searchKeyword) {
            query = query.ilike("title", `%${searchKeyword}%`);
          }

          const {
            data: queryData,
            error,
            count: totalCount,
          } = await query.range(from, from + limit - 1);

          if (error) {
            if (page > 1) {
              return res
                .status(200)
                .json({ success: true, data: [], page, total: 0 });
            }
            throw error;
          }
          data = queryData || [];
          count = totalCount;
        }

        res.status(200).json({ success: true, data, page, total: count });
      } catch (error: unknown) {
        console.error("❌ 트렌드 조회 실패:", error);
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: "데이터 로드 실패", details: message });
      }
    }
  );

  // 🔒 파이프라인 수동 실행
  app.post(
    "/api/pipeline/run",
    adminLimiter,
    async (req: Request, res: Response) => {
      // ✅ 헤더 값 안전 추출
      const clientKey =
        getHeaderValue(req.headers["x-api-key"]) ||
        getHeaderValue(req.headers["authorization"]);

      // ✅ Timing-safe 비교
      const isValid =
        safeCompare(clientKey, PIPELINE_API_KEY || "") ||
        safeCompare(clientKey, `Bearer ${PIPELINE_API_KEY || ""}`);

      if (!PIPELINE_API_KEY || !isValid) {
        console.warn(`⛔ 미승인 접근 (IP: ${req.ip})`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("👆 [Manual] 실행 요청됨 (동기 실행 모드)");

      try {
        const result = await runPipeline();
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

        const { data, error } = await supabase
          .from("subscriber")
          .upsert([{ email }], { onConflict: "email", ignoreDuplicates: true })
          .select();

        if (error) throw error;

        // data가 빈 배열이면 이미 존재했던 것
        if (!data || data.length === 0) {
          return res.status(409).json({ message: "Already subscribed" });
        }

        // ✅ 중복 응답 제거 - 한 번만 응답
        return res.status(200).json({ success: true, data });
      } catch (error) {
        console.error("구독 에러:", error);
        return res.status(500).json({ error: "구독 처리 실패" });
      }
    }
  );

  const server = app.listen(PORT, () => {
    console.log(`📡 Server running on http://localhost:${PORT}`);
  });

  // Graceful Shutdown (종료 시그널 처리)
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
