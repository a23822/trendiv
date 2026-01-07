import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
// trendiv-analysis-module의 소스 코드를 상대 경로로 직접 import 합니다.
// (monorepo 설정에 따라 패키지명 import가 안될 경우를 대비한 안전한 방식)
import { GrokService } from "../../../trendiv-analysis-module/src/services/grok.service";
import {
  AnalysisResult,
  Trend,
} from "../../../trendiv-analysis-module/src/types";

// 환경 변수 로드 (fix_sources.ts와 동일한 경로 참조)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const runGrokAnalysisForX = async () => {
  console.log("🚀 X(Twitter) 트렌드 Grok 분석 시작...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const grokApiKey = process.env.GROK_API_KEY; // .env에 이 키가 정의되어 있어야 합니다.

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ Supabase 환경 변수가 없습니다.");
  }
  if (!grokApiKey) {
    throw new Error("❌ GROK_API_KEY 환경 변수가 없습니다.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const grokService = new GrokService(grokApiKey);

  // 1. 분석 대상 데이터 가져오기 (category: 'x', status: 'RAW')
  // 대소문자 구분이 필요할 수 있으니 실제 DB 값에 맞춰 'x' 또는 'X'로 조정하세요.
  const targetCategory = "X";

  const { data: trends, error } = await supabase
    .from("trend")
    .select("*")
    .eq("category", targetCategory)
    .eq("status", "RAW")
    .limit(5); // 테스트 시에는 주석 해제하여 소량만 먼저 돌려보세요.

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
      console.log(
        `\nAnalyzing [${trend.id}] ${trend.title.substring(0, 30)}...`
      );

      // X 데이터는 내용(content)이 빈약하므로 analyzeWithContent 대신
      // 제목과 링크 위주로 분석하는 기본 analyze() 메서드 사용
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

      // 3. DB 업데이트 (analysis_results 추가 및 status 변경)
      // 기존 analysis_results가 null일 수 있으므로 배열로 덮어씁니다.
      const { error: updateError } = await supabase
        .from("trend")
        .update({
          analysis_results: [analysisResult] as any, // jsonb[] 타입 캐스팅
          status: "ANALYZED",
        })
        .eq("id", trend.id);

      if (updateError) {
        console.error(`  ❌ DB 업데이트 실패: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ 분석 완료 (점수: ${analysisResult.score})`);
        successCount++;
      }

      // Rate Limit 방지를 위해 약간의 딜레이 (필요 시 조정)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e: any) {
      console.error(`  ❌ 분석 중 에러 발생: ${e.message}`);
      failCount++;
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`🎉 작업 완료! 성공: ${successCount}, 실패: ${failCount}`);
};

// 실행
runGrokAnalysisForX();
