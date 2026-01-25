import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { runAnalysis } from "trendiv-analysis-module";

// 배치 설정
const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 3000; // 배치 간 딜레이 (API 제한 방지)

/**
 * 딜레이 유틸리티
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * YouTube 카테고리의 'RAW' 데이터를 배치로 분석하는 스크립트
 */
const main = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("📺 [YouTube Only] Deep Analysis Start");
  console.log("=".repeat(60));
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`📦 배치 크기: ${BATCH_SIZE}개`);
  console.log("=".repeat(60) + "\n");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  // 통계
  let totalFound = 0;
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let batchNumber = 0;

  // 분석 방식별 카운트
  const analysisMethodCount = {
    transcript: 0,
    videoUnderstanding: 0,
    unknown: 0,
  };

  try {
    // 1. 전체 개수 먼저 확인
    const { count, error: countError } = await supabase
      .from("trend")
      .select("*", { count: "exact", head: true })
      .ilike("category", "youtube")
      .eq("status", "RAW");

    if (countError) throw countError;

    totalFound = count || 0;

    if (totalFound === 0) {
      console.log("✅ 분석할 YouTube 데이터가 없습니다.");
      return;
    }

    console.log(`🎯 총 ${totalFound}개의 YouTube 영상 발견!`);
    console.log(`📊 예상 배치 수: ${Math.ceil(totalFound / BATCH_SIZE)}개\n`);

    // 2. 배치 루프
    let hasMore = true;
    let lastId = 0;

    while (hasMore) {
      batchNumber++;
      console.log("\n" + "-".repeat(60));
      console.log(`🔄 [배치 #${batchNumber}] 처리 중...`);
      console.log("-".repeat(60));

      // 페이지네이션: id 기준 커서 방식
      const { data: targetItems, error: fetchError } = await supabase
        .from("trend")
        .select("*")
        .ilike("category", "youtube")
        .eq("status", "RAW")
        .gt("id", lastId)
        .order("id", { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) throw fetchError;

      if (!targetItems || targetItems.length === 0) {
        hasMore = false;
        console.log("📭 더 이상 처리할 데이터가 없습니다.");
        break;
      }

      // 마지막 id 업데이트
      lastId = targetItems[targetItems.length - 1].id;

      console.log(
        `📥 ${targetItems.length}개 로드 완료 (ID: ${targetItems[0].id} ~ ${lastId})`,
      );

      // 각 아이템 정보 출력
      console.log("\n📋 분석 대상 목록:");
      targetItems.forEach((item, idx) => {
        const title = item.title?.substring(0, 50) || "No Title";
        console.log(`   ${idx + 1}. [ID: ${item.id}] ${title}...`);
      });

      // 3. 분석 실행
      console.log("\n🚀 Gemini 분석 시작...\n");
      console.log("아이템 예시:", targetItems[0].category);
      const analysisResults = await runAnalysis(targetItems);

      if (!analysisResults || analysisResults.length === 0) {
        console.log("⚠️ 이 배치에서 분석 결과가 없습니다.");
        totalSkipped += targetItems.length;

        if (targetItems.length < BATCH_SIZE) {
          hasMore = false;
        }
        continue;
      }

      // 4. 결과 분석 및 로그
      console.log("\n📊 분석 결과 상세:");
      console.log("-".repeat(60));

      // O(1) 접근을 위한 Map 생성
      const targetMap = new Map(targetItems.map((t) => [t.id, t]));

      const updates = analysisResults.map((result) => {
        const original = targetMap.get(result.id);
        const finalTitle = result.title_ko || original?.title || "제목 없음";

        // 분석 방식 추정 (content 유무로 판단)
        let analysisMethod = "unknown";
        if (result.content && result.content.length > 100) {
          analysisMethod = "transcript";
          analysisMethodCount.transcript++;
        } else {
          analysisMethod = "videoUnderstanding";
          analysisMethodCount.videoUnderstanding++;
        }

        // 결과 로그
        const scoreEmoji =
          result.score >= 7 ? "🔥" : result.score >= 4 ? "👍" : "💤";
        console.log(
          `\n   ${scoreEmoji} [ID: ${result.id}] Score: ${result.score}/10`,
        );
        console.log(`      📌 제목: ${finalTitle}`);
        console.log(`      🤖 모델: ${result.aiModel}`);
        console.log(
          `      🎬 분석방식: ${analysisMethod === "transcript" ? "자막(Transcript)" : "영상직접분석(Video Understanding)"}`,
        );
        console.log(`      💬 사유: ${result.reason?.substring(0, 80)}...`);
        console.log(`      🏷️ 태그: ${result.tags?.join(", ") || "N/A"}`);

        if (result.content) {
          console.log(`      📝 콘텐츠 길이: ${result.content.length}자`);
        }

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
          title: finalTitle,
          link: original?.link,
          date: original?.date,
          source: original?.source,
          category: original?.category,
          status: result.score > 0 ? "ANALYZED" : "REJECTED",
          represent_result: newHistoryItem,
          // 기존 이력 유지 + 새 결과 추가
          analysis_results: [
            ...(original?.analysis_results || []),
            newHistoryItem,
          ],
          content: result.content || original?.content,
        };
      });

      // 5. Supabase에 일괄 업데이트
      console.log("\n💾 DB 저장 중...");
      const { error: upsertError } = await supabase
        .from("trend")
        .upsert(updates, { onConflict: "id" });

      if (upsertError) {
        console.error(`❌ DB 저장 실패:`, upsertError.message);
        totalFailed += updates.length;
      } else {
        totalSuccess += updates.length;
        console.log(`✅ ${updates.length}개 저장 완료!`);
      }

      totalProcessed += targetItems.length;

      // 배치 요약
      const successInBatch = updates.length;
      const skippedInBatch = targetItems.length - analysisResults.length;
      totalSkipped += skippedInBatch;

      console.log("\n📈 배치 요약:");
      console.log(`   - 처리: ${targetItems.length}개`);
      console.log(`   - 성공: ${successInBatch}개`);
      console.log(`   - 스킵: ${skippedInBatch}개`);

      // 다음 배치 전 딜레이
      if (targetItems.length === BATCH_SIZE) {
        console.log(`\n⏳ 다음 배치까지 ${BATCH_DELAY_MS / 1000}초 대기...`);
        await delay(BATCH_DELAY_MS);
      } else {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error("\n❌ 치명적 에러 발생:", error);
    process.exit(1);
  }

  // 최종 리포트
  console.log("\n" + "=".repeat(60));
  console.log("📊 [최종 리포트]");
  console.log("=".repeat(60));
  console.log(`⏰ 종료 시간: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`📦 총 배치 수: ${batchNumber}개`);
  console.log(`🎯 발견된 총 데이터: ${totalFound}개`);
  console.log(`✅ 처리 완료: ${totalProcessed}개`);
  console.log(`   - 성공: ${totalSuccess}개`);
  console.log(`   - 실패: ${totalFailed}개`);
  console.log(`   - 스킵: ${totalSkipped}개`);
  console.log("\n🎬 분석 방식별 통계:");
  console.log(
    `   - 자막(Transcript) 기반: ${analysisMethodCount.transcript}개`,
  );
  console.log(
    `   - 영상직접분석(Video Understanding): ${analysisMethodCount.videoUnderstanding}개`,
  );
  console.log("=".repeat(60));

  process.exit(0);
};

main();
