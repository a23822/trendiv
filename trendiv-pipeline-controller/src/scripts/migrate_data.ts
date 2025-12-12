import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";
import { translateTitleOnly } from "trendiv-analysis-module";

// 환경변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_MODEL = "gemini-2.5-flash";

async function main() {
  console.log("🚀 [전체 데이터 마이그레이션 시작] (스키마 변경 없이 진행)");

  // ---------------------------------------------------------
  // 1️⃣ 0점 데이터 정리 (ANALYZED -> REJECTED)
  // ---------------------------------------------------------
  console.log("🧹 1. 0점 데이터 정리 (REJECTED 처리)...");

  const { data: rejectedData, error: rejectError } = await supabase
    .from("trend")
    .update({ status: "REJECTED" })
    .eq("score", 0)
    .eq("status", "ANALYZED")
    .select("id");

  if (rejectError) {
    console.error("❌ 정리 실패:", rejectError.message);
  } else {
    console.log(
      `   ✅ ${rejectedData?.length || 0}개의 0점 데이터를 정리했습니다.`
    );
  }

  // ❌ [삭제] 2단계: ai_model 컬럼 채우기 단계는 건너뜁니다. (컬럼이 없으므로)

  // ---------------------------------------------------------
  // 3️⃣ [핵심] 레거시 데이터 -> analysis_results 리스트로 변환
  // ---------------------------------------------------------
  console.log("📦 3. 레거시 데이터 -> analysis_results 리스트로 변환 중...");

  // 1. 아직 analysis_results가 비어있는 분석 완료 데이터 조회
  const { data: legacyItems, error: fetchError } = await supabase
    .from("trend")
    .select("*") // ai_model 컬럼이 없어도 *로 가져오면 무시되므로 안전합니다.
    .eq("status", "ANALYZED")
    .or("analysis_results.is.null,analysis_results.eq.[]");

  if (fetchError) {
    console.error("❌ 데이터 조회 실패:", fetchError.message);
  } else if (legacyItems && legacyItems.length > 0) {
    console.log(`   🔍 변환 대상: ${legacyItems.length}개`);

    let successCount = 0;
    for (const item of legacyItems) {
      // ✨ [수정] item.ai_model이 없으므로 무조건 DEFAULT_MODEL을 사용합니다.
      const legacyResult = {
        aiModel: item.ai_model || DEFAULT_MODEL, // 여기서 바로 주입!
        score: item.score,
        reason: item.reason || "",
        title_ko: item.title_ko || item.title,
        oneLineSummary: item.oneLineSummary || item.summary,
        keyPoints: item.keyPoints || [],
        tags: item.tags || [],
        analyzedAt: item.created_at || new Date().toISOString(),
      };

      // 배열에 담아서 업데이트
      const { error: updateError } = await supabase
        .from("trend")
        .update({
          analysis_results: [legacyResult],
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(
          `      ❌ ID ${item.id} 업데이트 실패:`,
          updateError.message
        );
      } else {
        successCount++;
        if (successCount % 10 === 0) process.stdout.write(".");
      }
    }
    console.log(`\n   ✅ ${successCount}개 데이터 구조 변환 완료!`);
  } else {
    console.log("   ✨ 변환할 대상이 없습니다.");
  }

  // ---------------------------------------------------------
  // 4️⃣ 한글 제목 번역 (title_ko 누락 데이터)
  // ---------------------------------------------------------
  console.log("🇰🇷 4. 한글 제목 번역 (title_ko 누락 데이터)...");

  // title_ko 컬럼은 존재하는 것으로 보이므로 그대로 진행
  const { data: targets } = await supabase
    .from("trend")
    .select("id, title")
    .gt("score", 0)
    .is("title_ko", null);

  if (targets && targets.length > 0) {
    console.log(`   🔍 번역 대상: ${targets.length}개`);

    for (const item of targets) {
      console.log(
        `   Translating: [${item.id}] ${item.title.substring(0, 30)}...`
      );

      const titleKo = await translateTitleOnly(item.title);

      // title_ko 컬럼 업데이트 (analysis_results 내부 업데이트는 생략했지만, 필요시 추가 가능)
      await supabase
        .from("trend")
        .update({ title_ko: titleKo })
        .eq("id", item.id);

      await new Promise((r) => setTimeout(r, 1000));
    }
  } else {
    console.log("   ✨ 번역할 대상이 없습니다.");
  }

  console.log("🎉 모든 마이그레이션 작업 완료!");
}

main();
