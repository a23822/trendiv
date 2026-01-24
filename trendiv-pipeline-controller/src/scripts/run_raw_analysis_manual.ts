import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

console.log(`🔌 Loading .env from: ${envPath}`);
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { runAnalysis } from "trendiv-analysis-module";

/**
 * DB에 'RAW' 상태인 모든 데이터를 분석이 끝날 때까지 반복 처리하는 스크립트
 * (수집 X, 심층 분석 X)
 */
const main = async () => {
  console.log("\n========================================");
  console.log("🔄 [Manual] Analyze ALL RAW Data Start");
  console.log("========================================");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
  const targetModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview"; // 기본 모델

  let totalProcessed = 0;
  let batchCount = 0;

  try {
    while (true) {
      batchCount++;
      console.log(`\n📦 [Batch ${batchCount}] Fetching targets...`);

      // A. 분석 대상 가져오기 (RPC 사용)
      const { data: targetItems, error: fetchError } = await supabase.rpc(
        "get_analysis_targets",
        {
          target_model: targetModel,
          batch_size: 20, // 한 번에 처리할 양
        },
      );

      if (fetchError) throw fetchError;

      // B. 종료 조건: 더 이상 분석할 데이터가 없음
      if (!targetItems || targetItems.length === 0) {
        console.log("✅ 모든 RAW 데이터 분석 완료! 루프를 종료합니다.");
        break;
      }

      console.log(`🎯 Found ${targetItems.length} items. Starting analysis...`);

      // C. 분석 실행
      try {
        const analysisResults = await runAnalysis(targetItems);

        if (analysisResults && analysisResults.length > 0) {
          // D. 결과 저장 (pipeline.service.ts의 로직 참고)
          // 간단한 구현을 위해 여기서는 직접 업데이트 로직을 작성하거나
          // 필요 시 pipeline.service의 saveAnalysisResults를 export하여 사용할 수 있습니다.

          const updates = analysisResults.map((result) => {
            const original = targetItems.find((t: any) => t.id === result.id);
            const history = original?.analysis_results || [];

            // 신규 분석 결과 추가
            const newHistory = [
              ...history,
              {
                aiModel: result.aiModel,
                score: result.score,
                reason: result.reason,
                title_ko: result.title_ko,
                oneLineSummary: result.oneLineSummary,
                keyPoints: result.keyPoints,
                tags: result.tags,
                analyzedAt: new Date().toISOString(),
              },
            ];

            return {
              id: result.id,
              analysis_results: newHistory,
              status: result.score > 0 ? "ANALYZED" : "REJECTED",
              represent_result: newHistory.sort((a, b) => b.score - a.score)[0],
              content: result.content || original?.content,
            };
          });

          const { error: upsertError } = await supabase
            .from("trend")
            .upsert(updates, { onConflict: "id" });

          if (upsertError) {
            console.error(
              `⚠️ Batch ${batchCount} 저장 실패:`,
              upsertError.message,
            );
          } else {
            totalProcessed += updates.length;
            console.log(
              `💾 Batch ${batchCount} saved. (Total: ${totalProcessed})`,
            );
          }
        }
      } catch (analysisError) {
        console.error(
          `⚠️ Batch ${batchCount} 분석 중 오류 발생:`,
          analysisError,
        );
        // 에러 발생 시 해당 배치 아이템들을 REJECTED 처리하여 무한 루프 방지 로직 필요할 수 있음
      }

      // API Rate Limit 방지를 위한 짧은 대기
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("❌ 치명적 에러 발생:", error);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log(`✅ 작업 종료: 총 ${totalProcessed}개의 항목을 분석했습니다.`);
  process.exit(0);
};

main();
