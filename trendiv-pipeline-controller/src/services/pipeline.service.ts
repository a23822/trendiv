import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import * as path from "path";

import { scrapeAll as runScraper } from "trendiv-scraper-module";
import { runAnalysis } from "trendiv-analysis-module";
import { composeEmailHtml as generateNewsletterHtml } from "trendiv-result-module";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const runPipeline = async () => {
  const startTime = Date.now();
  console.log("🔥 [Pipeline] Start processing...");

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
      throw new Error("❌ 유효한 SUPABASE_URL/KEY가 없습니다.");
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
    const resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    // ---------------------------------------------------------
    // 1️⃣ 수집 & 원본 저장 (Scrape & Save RAW)
    // ---------------------------------------------------------
    console.log("   1. 🕷️  Running Scraper...");

    // 초기 구축 시엔 365일, 운영 시엔 7일치 수집 (DB 확인)
    const { count } = await supabase
      .from("trend")
      .select("*", { count: "exact", head: true });
    const fetchDays = count === 0 ? 365 : 7;

    const rawData = await runScraper(fetchDays);

    if (rawData.length > 0) {
      const dbRawData = rawData.map((item) => ({
        title: item.title,
        link: item.link,
        date: item.date || new Date().toISOString(),
        status: "RAW",
        source: item.source,
        category: item.category,
      }));

      // 이미 있는 건 건너뛰고(ignoreDuplicates), 새것만 저장
      const { error } = await supabase
        .from("trend")
        .upsert(dbRawData, { onConflict: "link", ignoreDuplicates: true });

      if (error) console.error("      ⚠️ 원본 저장 실패:", error.message);
      else console.log(`      -> Saved raw items to DB.`);
    }

    // ---------------------------------------------------------
    // 2️⃣ 미분석 데이터 로드 (Fetch Target Items)
    // ---------------------------------------------------------
    console.log("   2. 🔍  Fetching 'RAW' items to analyze...");

    // 아직 분석 안 된('RAW')거나 실패한('FAILED') 데이터 10개만 가져오기
    const { data: targetItems, error: fetchError } = await supabase
      .from("trend")
      .select("*")
      .in("status", ["RAW", "FAILED"])
      .limit(10); // 한 번에 10개씩만 처리 (과부하 방지)

    if (fetchError) throw fetchError;

    if (!targetItems || targetItems.length === 0) {
      console.log("      ✅ 모든 데이터 분석 완료! (No RAW items left)");
      return { success: true, message: "All analyzed" };
    }

    console.log(`      -> Found ${targetItems.length} items to analyze.`);

    // ---------------------------------------------------------
    // 3️⃣ 분석 수행 (Analyze)
    // ---------------------------------------------------------
    const cleanData = targetItems.map((item) => ({
      id: item.id,
      title: item.title,
      link: item.link,
      date: item.date,
      source: item.source,
      category: item.category || "Uncategorized",
    }));

    let analysisResults: any[] = [];
    try {
      // 분석 수행 (503 에러가 나도 여기서 재시도 로직이 방어함)
      analysisResults = await runAnalysis(cleanData);
    } catch (e) {
      console.error("      ⚠️ Analysis incomplete:", e);
    }

    // ---------------------------------------------------------
    // 4️⃣ 결과 업데이트 (Update DB)
    // ---------------------------------------------------------
    console.log(`   4. 💾  Saving ${analysisResults.length} analyzed items...`);

    let successCount = 0;
    for (const result of analysisResults) {
      // 1. 기존 데이터 조회 (기존에 저장된 분석 결과가 있는지 확인)
      const { data: currentItem } = await supabase
        .from("trend")
        .select("analysis_results")
        .eq("id", result.id)
        .single();

      const existingHistory = (currentItem?.analysis_results as any[]) || [];

      // 2. 새로운 분석 결과 객체 생성
      const newAnalysis = {
        aiModel: result.aiModel, // 예: 'gemini-2.5-flash'
        score: result.score,
        reason: result.reason,
        title_ko: result.title_ko,
        oneLineSummary: result.oneLineSummary,
        keyPoints: result.keyPoints,
        tags: result.tags,
        analyzedAt: new Date().toISOString(),
      };

      // 3. 배열에 추가
      let updatedHistory = [...existingHistory];
      const existingIndex = existingHistory.findIndex(
        (r) => r.aiModel === result.aiModel
      );

      if (existingIndex !== -1) {
        // ♻️ 기존에 같은 모델의 결과가 있음 -> 내용 비교
        const old = existingHistory[existingIndex];

        // ✨ 핵심: 내용이 같은지 비교 (점수, 한줄요약, 키포인트)
        // JSON.stringify로 배열/객체를 간단히 비교합니다.
        const isContentSame =
          old.score === newAnalysis.score &&
          old.oneLineSummary === newAnalysis.oneLineSummary &&
          JSON.stringify(old.keyPoints) ===
            JSON.stringify(newAnalysis.keyPoints);

        if (isContentSame) {
          console.log(`      SKIP: 변동 사항 없음 (${result.aiModel})`);
          // 내용이 같으면 굳이 업데이트 안 하고 기존 거 유지 (DB 요청 절약)
          // 단, analyzedAt만 갱신하고 싶다면 아래처럼 덮어쓰세요.
          // updatedHistory[existingIndex] = newAnalysis;
        } else {
          // 내용이 다르면 최신 정보로 덮어쓰기
          updatedHistory[existingIndex] = newAnalysis;
        }
      } else {
        // 🆕 새로운 모델의 결과 -> 추가
        updatedHistory.push(newAnalysis);
      }

      // 🟢 Case A: 유의미한 정보 (점수 > 0)
      if (result.score > 0) {
        const { error } = await supabase
          .from("trend")
          .update({
            analysis_results: updatedHistory,
            status: "ANALYZED",
          })
          .eq("id", result.id);

        if (!error) successCount++;
      }
      // 🔴 Case B: 가치 없는 정보 (점수 0) -> 비용 절약!
      else {
        // 내용은 저장하지 않고, 상태만 'REJECTED'로 바꿔서
        // 다음번에 다시 분석하지 않도록 막습니다.
        const { error } = await supabase
          .from("trend")
          .update({
            status: "REJECTED", // 거절됨 상태로 변경
            analysis_results: updatedHistory,
          })
          .eq("id", result.id);

        if (!error) console.log(`      🗑️ Rejected (Score 0): ID ${result.id}`);
      }
    }

    // ---------------------------------------------------------
    // 5️⃣ 이메일 발송 (유효한 것만)
    // ---------------------------------------------------------
    const validTrends = analysisResults.filter((item: any) => item.score > 0);

    if (validTrends.length > 0) {
      console.log("   5. 📧  Sending Email...");
      const emailPayload = {
        date: new Date().toISOString().split("T")[0],
        count: validTrends.length,
        articles: validTrends,
      };
      const newsletterHtml = await generateNewsletterHtml(emailPayload);

      if (resend) {
        await resend.emails.send({
          from: "Trendiv <chanwoochae@trendiv.org>",
          to: ["chanwoochae@trendiv.org"], //테스트용
          subject: `🔥 Trendiv 분석 알림 (${successCount}건 처리)`,
          html: newsletterHtml,
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 [Pipeline] Batch Done! (${duration}s)`);
    return { success: true, count: successCount };
  } catch (error) {
    console.error("❌ [Pipeline] Critical Error:", error);
    return { success: false, error };
  }
};
