import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { runAnalysis } from "trendiv-analysis-module";

/**
 * YouTube 카테고리의 'RAW' 데이터를 집중 분석하는 스크립트
 */
const main = async () => {
  console.log("\n========================================");
  console.log("📺 [YouTube Only] Deep Analysis Start");
  console.log("========================================");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
  let totalProcessed = 0;

  try {
    // 1. 분석 대상 가져오기 (Youtube 카테고리 & RAW 상태)
    // RPC 대신 직접 셀렉트문을 써서 YouTube만 필터링합니다.
    const { data: targetItems, error: fetchError } = await supabase
      .from("trend")
      .select("*")
      .eq("category", "Youtube")
      .eq("status", "RAW");

    if (fetchError) throw fetchError;

    if (!targetItems || targetItems.length === 0) {
      console.log("✅ 분석할 YouTube 데이터가 없습니다.");
      return;
    }

    console.log(
      `🎯 총 ${targetItems.length}개의 영상을 발견했습니다. 분석 시작...`,
    );

    // 2. 분석 실행 (모듈 내부에서 YouTubeService를 호출함)
    const analysisResults = await runAnalysis(targetItems);

    if (analysisResults && analysisResults.length > 0) {
      // 3. 결과 데이터 가공 및 저장
      const updates = analysisResults.map((result) => {
        const original = targetItems.find((t: any) => t.id === result.id);

        const newHistoryItem = {
          aiModel: result.aiModel,
          score: result.score,
          reason: result.reason,
          title_ko: result.title_ko,
          oneLineSummary: result.oneLineSummary,
          keyPoints: result.keyPoints,
          tags: result.tags,
          analyzedAt: new Date().toISOString(),
        };

        return {
          id: result.id,
          status: result.score > 0 ? "ANALYZED" : "REJECTED",
          represent_result: newHistoryItem,
          analysis_results: [newHistoryItem],
          content: result.content || original?.content,
        };
      });

      // 4. Supabase에 일괄 업데이트 (Upsert)
      const { error: upsertError } = await supabase
        .from("trend")
        .upsert(updates, { onConflict: "id" });

      if (upsertError) {
        console.error(`❌ DB 저장 실패:`, upsertError.message);
      } else {
        totalProcessed = updates.length;
        console.log(
          `💾 ${totalProcessed}개의 결과가 성공적으로 저장되었습니다.`,
        );
      }
    }
  } catch (error) {
    console.error("❌ 치명적 에러 발생:", error);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log(`✅ YouTube 분석 완료! (처리건수: ${totalProcessed})`);
  process.exit(0);
};

main();
