import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 먼저 로드 (모듈 임포트보다 우선 실행)
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });
console.log(`🔌 Loading .env from: ${envPath}`);

// 타입만 정적 import (런타임에 영향 없음)
import type { AnalysisResult, Trend } from "trendiv-analysis-module";

const runGrokAnalysisForX = async () => {
  console.log("🚀 X(Twitter) 트렌드 Grok 분석 시작...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const grokApiKey = process.env.GROK_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ Supabase 환경 변수가 없습니다.");
  }
  if (!grokApiKey) {
    throw new Error("❌ GROK_API_KEY 환경 변수가 없습니다.");
  }

  // 2. 동적 import 적용 (dotenv 로드 후 실행 보장)
  const { GrokService } = await import("trendiv-analysis-module");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const grokService = new GrokService(grokApiKey);

  // 1. 분석 대상 데이터 가져오기 (category: 'X', status: 'RAW')
  const targetCategory = "X";

  const { data: trends, error } = await supabase
    .from("trend")
    .select("*")
    .eq("category", targetCategory)
    .eq("status", "RAW");

  if (error) {
    throw new Error(`❌ 데이터 조회 실패: ${error.message}`);
  }

  if (!trends || trends.length === 0) {
    console.log("🏁 분석할 'RAW' 상태의 X 데이터가 없습니다.");
    return;
  }

  console.log(`📦 총 ${trends.length}개의 분석 대상 항목을 찾았습니다.`);

  let successCount = 0;
  let failCount = 0;

  // 2. 순차적으로 분석 실행
  for (const trend of trends) {
    try {
      console.log(`\nAnalyzing [${trend.id}] ${trend.title}...`);

      // X 데이터는 제목과 링크 위주로 분석하는 기본 analyze() 메서드 사용
      const analysisResponse = await grokService.analyze(trend as Trend);

      // DB에 저장할 형태로 변환
      const analysisResult: AnalysisResult = {
        aiModel: grokService.getModelName(),
        analyzedAt: new Date().toISOString(),
        score: analysisResponse.score,
        reason: analysisResponse.reason,
        title_ko: analysisResponse.title_ko,
        oneLineSummary: analysisResponse.oneLineSummary,
        keyPoints: analysisResponse.keyPoints,
        tags: analysisResponse.tags,
      };

      const newStatus = analysisResult.score > 0 ? "ANALYZED" : "REJECTED";

      // 3. DB 업데이트
      const { error: updateError } = await supabase
        .from("trend")
        .update({
          analysis_results: [analysisResult] as any, // jsonb[]
          status: newStatus,
        })
        .eq("id", trend.id);

      if (updateError) {
        console.error(`  ❌ DB 업데이트 실패: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ 분석 완료 (점수: ${analysisResult.score})`);
        successCount++;
      }

      // Rate Limit 방지를 위해 딜레이 적용
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e: any) {
      console.error(`  ❌ 분석 중 에러 발생: ${e.message}`);
      failCount++;
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`🎉 작업 완료! 성공: ${successCount}, 실패: ${failCount}`);
};

// 실행 및 에러 핸들링
runGrokAnalysisForX().catch((err) => {
  console.error("❌ 스크립트 실행 중 치명적 에러:", err);
  process.exit(1);
});
