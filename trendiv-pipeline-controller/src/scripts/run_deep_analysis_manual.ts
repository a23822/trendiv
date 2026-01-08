import dotenv from "dotenv";
import path from "path";
import {
  runGeminiProAnalysis,
  runGrokAnalysis,
} from "../services/pipeline.service";

// 1. 환경 변수 로드
// 현재 파일: src/scripts/run_deep_analysis_manual.ts
// .env 위치: 프로젝트 루트 (../../../.env)
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

console.log(`🔌 Loading .env from: ${envPath}`);

const main = async () => {
  console.log(
    "🚀 [Manual Trigger] 심층 분석(Deep Analysis) 통합 실행을 시작합니다..."
  );

  // 환경변수 체크
  if (!process.env.SUPABASE_URL) {
    console.error("❌ Error: SUPABASE_URL 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  // ---------------------------------------------------------
  // 1️⃣ Gemini Pro 분석 실행 (Non-X)
  // ---------------------------------------------------------
  console.log("\n========================================");
  console.log("✨ 1. Gemini Pro Analysis (Non-X)");
  console.log("========================================");
  try {
    if (process.env.GEMINI_MODEL_PRO) {
      await runGeminiProAnalysis();
    } else {
      console.warn("⚠️ GEMINI_MODEL_PRO 환경변수가 없어 실행을 건너뜁니다.");
    }
  } catch (error) {
    console.error("❌ Gemini Pro 실행 중 에러:", error);
  }

  // API Rate Limit 등을 고려한 잠시 대기 (선택 사항)
  console.log("\n⏳ Waiting 2 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // ---------------------------------------------------------
  // 2️⃣ Grok 분석 실행 (X + Non-X)
  // ---------------------------------------------------------
  console.log("\n========================================");
  console.log("🦅 2. Grok Analysis (X + Non-X)");
  console.log("========================================");
  try {
    if (process.env.GROK_API_KEY) {
      await runGrokAnalysis();
    } else {
      console.warn("⚠️ GROK_API_KEY 환경변수가 없어 실행을 건너뜁니다.");
    }
  } catch (error) {
    console.error("❌ Grok 실행 중 에러:", error);
  }

  console.log("\n========================================");
  console.log("✅ [Manual Trigger] 모든 수동 분석 작업이 종료되었습니다.");
  process.exit(0);
};

// 실행
main();
