import dotenv from "dotenv";
import path from "path";
import { runGrokAnalysis } from "../services/pipeline.service";

/**
 * Grok 분석(runGrokAnalysis)만 단독으로 실행하는 스크립트
 */

// 1. 환경 변수 로드
// .env 위치: 프로젝트 루트 (../../../.env)
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

console.log(`🔌 Loading .env from: ${envPath}`);

const main = async () => {
  console.log("\n========================================");
  console.log("🦅 Grok Analysis Only (X + Non-X Analyzed) Start");
  console.log("========================================");

  // 환경변수 체크
  if (!process.env.SUPABASE_URL) {
    console.error("❌ Error: SUPABASE_URL 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  try {
    if (process.env.GROK_API_KEY) {
      // 서비스 파일의 runGrokAnalysis 함수 호출
      await runGrokAnalysis();
    } else {
      console.warn("⚠️ GROK_API_KEY 환경변수가 없어 실행을 건너뜁니다.");
    }
  } catch (error) {
    console.error("❌ Grok 실행 중 에러 발생:", error);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("✅ Grok 분석 작업이 종료되었습니다.");
  process.exit(0);
};

// 실행
main();
