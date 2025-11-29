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
        summary: item.summary || "",
        source: "scraped",
        status: "RAW",
        score: 0,
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
      summary: item.summary,
      source: item.source,
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
      const { error } = await supabase
        .from("trend")
        .update({
          oneLineSummary: result.oneLineSummary,
          tags: result.tags,
          score: result.score,
          reason: result.reason,
          keyPoints: result.keyPoints,
          status: "ANALYZED",
          source: "AI_Analysis",
        })
        .eq("id", result.id);

      if (!error) successCount++;
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
