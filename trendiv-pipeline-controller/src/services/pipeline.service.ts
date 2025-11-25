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
      throw new Error(
        "❌ 유효한 SUPABASE_URL 또는 SUPABASE_KEY가 없습니다. .env를 확인하세요."
      );
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    const resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    // ---------------------------------------------------------
    // 1️⃣ 수집 및 원본 저장 (Scraping & Save Raw)
    // ---------------------------------------------------------
    console.log("   1. 🕷️  Running Scraper...");
    const rawData = await runScraper();
    console.log(`      -> Raw scraped data: ${rawData.length} items.`);

    if (rawData.length > 0) {
      // 데이터 정제 (Type Mismatch 해결) 및 초기 상태 설정
      const dbRawData = rawData
        .filter((item) => item.title && item.link) // 제목 없으면 탈락
        .map((item) => ({
          title: item.title!,
          link: item.link!,
          date: item.date || new Date().toISOString(),
          summary: item.summary || "",
          source: "scraped",
          status: "RAW",
          score: 0, // 기본 점수
        }));

      // 원본 데이터 저장 (이미 있으면 무시하거나 업데이트)
      const { error } = await supabase
        .from("trend")
        .upsert(dbRawData, { onConflict: "link", ignoreDuplicates: true });

      if (error) console.error("      ⚠️ 원본 저장 중 에러:", error.message);
      else console.log(`      -> Saved ${dbRawData.length} raw items to DB.`);
    } else {
      console.log("      ⚠️ No new articles found from scraper.");
    }

    // ---------------------------------------------------------
    // 2️⃣ 미분석 데이터 로드 (Fetch RAW Data)
    // ---------------------------------------------------------
    console.log("   2. 🔍  Fetching 'RAW' or 'FAILED' items from DB...");

    // DB에서 아직 분석 안 된('RAW')거나 실패했던('FAILED') 것들을 가져옵니다.
    const { data: targetItems, error: fetchError } = await supabase
      .from("trend")
      .select("*")
      .in("status", ["RAW", "FAILED"])
      .limit(10); // 한 번에 10개씩만 처리 (API 과부하 방지)

    if (fetchError) throw fetchError;

    if (!targetItems || targetItems.length === 0) {
      console.log(
        "      ✅ 모든 데이터가 이미 분석되었습니다. (No items to analyze)"
      );
      return { success: true, message: "No items to analyze" };
    }

    console.log(`      -> Found ${targetItems.length} items to analyze.`);

    // ---------------------------------------------------------
    // 3️⃣ 분석 (AI Analysis)
    // ---------------------------------------------------------
    console.log("   3. 🧠  Running AI Analysis...");

    const cleanData = targetItems.map((item) => ({
      title: item.title,
      link: item.link,
      date: item.date,
      summary: item.summary,
      source: item.source,
    }));

    // Gemini 503 에러 대비: 분석 결과가 비어있어도 죽지 않도록 처리
    let analysisResults: any[] = [];
    try {
      analysisResults = await runAnalysis(cleanData);
    } catch (e) {
      console.error("      ⚠️ AI Analysis partially failed or overloaded:", e);
      // 여기서 멈추지 않고, 분석된 게 하나라도 있으면 계속 진행
    }
    console.log(`      -> Analyzed ${analysisResults.length} insights.`);

    // ---------------------------------------------------------
    // 4️⃣ 결과 업데이트 (Update Results)
    // ---------------------------------------------------------
    console.log("   4. 💾  Updating Analysis Results in DB...");

    let successCount = 0;
    // 성공적으로 분석된 항목들만 DB에 업데이트 (상태를 'ANALYZED'로 변경)
    for (const result of analysisResults) {
      const { error } = await supabase
        .from("trend")
        .update({
          oneLineSummary: result.oneLineSummary,
          tags: result.tags,
          score: result.score,
          reason: result.reason,
          keyPoints: result.keyPoints,
          status: "ANALYZED", // 👈 분석 완료 상태로 변경!
          source: "AI_Analysis",
        })
        .eq("link", result.originalLink); // 링크로 대상을 찾아서 업데이트

      if (!error) successCount++;
    }
    console.log(`      -> Successfully updated ${successCount} items.`);

    // ---------------------------------------------------------
    // 5️⃣ 결과 생성 (Generate HTML)
    // ---------------------------------------------------------
    console.log("   5. 🎨  Generating Newsletter HTML...");

    // 점수가 0보다 큰 유효한 트렌드만 필터링 (메일 발송용)
    const validTrends = analysisResults.filter((item: any) => item.score > 0);

    // 이메일 본문용 데이터 객체 생성
    const emailPayload = {
      date: new Date().toISOString().split("T")[0],
      count: validTrends.length,
      articles: validTrends,
    };

    const newsletterHtml = await generateNewsletterHtml(emailPayload);

    // =========================================================
    // 6️⃣ 이메일 발송 (Sending Email)
    // =========================================================
    console.log("   6. 📧  Sending Email via Resend...");

    let emailResult = null;
    if (validTrends.length > 0) {
      if (!resend) {
        console.log("      ⚠️ RESEND_API_KEY missing. Skipping email send.");
      } else {
        const recipient =
          process.env.TEST_EMAIL_RECIPIENT || "onboarding@resend.dev";

        const { data, error } = await resend.emails.send({
          from: "Trendiv <onboarding@resend.dev>",
          to: [recipient],
          subject: `🔥 Trendiv 분석 완료 (${successCount}건 성공)`,
          html: newsletterHtml,
        });

        if (error) {
          console.error("      ❌ Email sending failed:", error);
        } else {
          console.log(`      ✅ Email sent to ${recipient}! ID: ${data?.id}`);
          emailResult = data;
        }
      }
    } else {
      console.log("      ⚠️ No valid trends (Score > 0) to email this time.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 [Pipeline] All Done! (Time: ${duration}s)`);

    return {
      success: true,
      count: successCount,
      emailSent: !!emailResult,
    };
  } catch (error) {
    console.error("❌ [Pipeline] Error occurred:", error);
    return { success: false, error };
  }
};
