import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import * as path from "path";

import { scrapeAll as runScraper } from "trendiv-scraper-module";
import { runAnalysis } from "trendiv-analysis-module";
import { composeEmailHtml as generateNewsletterHtml } from "trendiv-result-module";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// 딜레이 함수 (API 과부하 방지용)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runPipeline = async () => {
  const startTime = Date.now();
  console.log("🔥 [Pipeline] Start processing ALL items...");

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
    console.log(" 1. 🕷️  Running Scraper...");

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

      const { error } = await supabase
        .from("trend")
        .upsert(dbRawData, { onConflict: "link", ignoreDuplicates: true });

      if (error) console.error("      ⚠️ 원본 저장 실패:", error.message);
      else console.log(`      -> Saved raw items to DB.`);
    }

    // ---------------------------------------------------------
    // 2️⃣ & 3️⃣ & 4️⃣ 반복 처리 루프 (Loop Process)
    // ---------------------------------------------------------
    console.log(" 2. 🔄 Starting Batch Analysis Loop...");

    let totalSuccessCount = 0;
    let allValidTrends: any[] = []; // 이메일에 보낼 데이터 누적용
    let loopCount = 0;

    // 🔥 무한 루프 시작: RAW 데이터가 없을 때까지 계속 돕니다.
    while (true) {
      loopCount++;

      // A. 데이터 가져오기
      const targetModel = process.env.GEMINI_MODEL || "gemini-3-pro-preview";

      const { data: targetItems, error } = await supabase.rpc(
        "get_analysis_targets",
        {
          target_model: targetModel,
          batch_size: 10,
        }
      );

      if (error) {
        console.error("❌ RPC 호출 에러:", error);
        throw error;
      }

      // B. 종료 조건: 더 이상 처리할 데이터가 없으면 루프 탈출
      if (!targetItems || targetItems.length === 0) {
        console.log("      ✅ 더 이상 분석할 데이터가 없습니다. 루프 종료.");
        break;
      }

      console.log(
        `      [Batch ${loopCount}] Analyzing ${targetItems.length} items...`
      );

      // C. 분석 데이터 정제
      const cleanData = targetItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        link: item.link,
        date: item.date,
        source: item.source,
        category: item.category || "Uncategorized",
      }));

      // D. 분석 실행
      let analysisResults: any[] = [];
      try {
        analysisResults = await runAnalysis(cleanData);
      } catch (e) {
        console.error(`      ⚠️ Batch ${loopCount} Analysis Failed:`, e);
        continue; // 이번 배치가 망해도 다음 배치를 위해 계속 진행
      }

      // E. DB 업데이트 (로직 유지)
      for (const result of analysisResults) {
        const { data: currentItem } = await supabase
          .from("trend")
          .select("analysis_results")
          .eq("id", result.id)
          .single();

        const existingHistory = (currentItem?.analysis_results as any[]) || [];

        const newAnalysis = {
          aiModel: result.aiModel,
          score: result.score,
          reason: result.reason,
          title_ko: result.title_ko,
          oneLineSummary: result.oneLineSummary,
          keyPoints: result.keyPoints,
          tags: result.tags,
          analyzedAt: new Date().toISOString(),
        };

        let updatedHistory = [...existingHistory];
        const existingIndex = existingHistory.findIndex(
          (r) => r.aiModel === result.aiModel
        );

        if (existingIndex !== -1) {
          const old = existingHistory[existingIndex];
          const isContentSame =
            old.score === newAnalysis.score &&
            old.oneLineSummary === newAnalysis.oneLineSummary &&
            JSON.stringify(old.keyPoints) ===
              JSON.stringify(newAnalysis.keyPoints);

          if (!isContentSame) {
            updatedHistory[existingIndex] = newAnalysis;
          }
        } else {
          updatedHistory.push(newAnalysis);
        }

        // 결과 저장
        if (result.score > 0) {
          await supabase
            .from("trend")
            .update({
              analysis_results: updatedHistory,
              status: "ANALYZED",
            })
            .eq("id", result.id);

          totalSuccessCount++;
          // 🔥 이메일 발송을 위해 결과 수집 (기존 result 객체에 DB 업데이트 정보 합쳐서)
          allValidTrends.push(result);
        } else {
          await supabase
            .from("trend")
            .update({
              status: "REJECTED",
              analysis_results: updatedHistory,
            })
            .eq("id", result.id);
          console.log(`      🗑️ Rejected (Score 0): ID ${result.id}`);
        }
      }

      // F. API 휴식 (Rate Limit 방지)
      console.log("      😴 Waiting 2s for Rate Limit...");
      await delay(2000); // 2초 대기
    }

    // ---------------------------------------------------------
    // 5️⃣ 이메일 발송 (모든 배치 결과 합산)
    // ---------------------------------------------------------
    console.log(` 5. 📧 Preparing Email for ${allValidTrends.length} items...`);

    if (allValidTrends.length > 0) {
      console.log("      Sending Email...");
      const emailPayload = {
        date: new Date().toISOString().split("T")[0],
        count: allValidTrends.length,
        articles: allValidTrends,
      };

      const newsletterHtml = await generateNewsletterHtml(emailPayload);

      if (resend) {
        await resend.emails.send({
          from: "Trendiv <chanwoochae@trendiv.org>",
          to: ["a238220@gmail.com"],
          subject: `🔥 Trendiv 통합 분석 알림 (${allValidTrends.length}건)`,
          html: newsletterHtml,
        });
        console.log("      ✅ Email Sent!");
      }
    } else {
      console.log("      📭 보낼 유효한 뉴스가 없습니다.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `🎉 [Pipeline] All Done! processed total ${totalSuccessCount} items in ${duration}s`
    );
    return { success: true, count: totalSuccessCount };
  } catch (error) {
    console.error("❌ [Pipeline] Critical Error:", error);
    return { success: false, error };
  }
};

/**
 * 🕵️‍♀️ 심층 분석 (Deep Analysis)
 * 이미 분석된 최신 글 10개를 가져와 Pro 모델과 Grok으로 재분석합니다.
 */
export const runDeepAnalysis = async () => {
  console.log("🚀 [Deep Analysis] Starting daily re-analysis...");
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 대상 조회 (최신 ANALYZED 10개)
  const { data: targets } = await supabase
    .from("trend")
    .select("*")
    .eq("status", "ANALYZED")
    .order("date", { ascending: false })
    .limit(10);

  if (!targets || targets.length === 0) {
    console.log("   🤷‍♂️ No analyzed items found.");
    return;
  }

  console.log(`   🎯 Targets: ${targets.length} items`);

  // 데이터 정제
  const cleanData = targets.map((item) => ({
    id: item.id,
    title: item.title,
    link: item.link,
    date: item.date,
    source: item.source,
    category: item.category,
  }));

  // 🆕 카테고리별 분리
  const xItems = cleanData.filter((item) => item.category === "X");
  const nonXItems = cleanData.filter((item) => item.category !== "X");

  console.log(`   📊 X: ${xItems.length}, non-X: ${nonXItems.length}`);

  // -------------------------------------------------
  // 1. X 카테고리 → Grok만
  // -------------------------------------------------
  if (xItems.length > 0 && process.env.GROK_API_KEY) {
    console.log(`   🦅 Running Grok for X items (${xItems.length})...`);
    try {
      const grokResults = await runAnalysis(xItems, {
        provider: "grok",
      });
      await saveAnalysisResults(supabase, grokResults);
      console.log(`      ✅ Grok (X): ${grokResults.length} done`);
    } catch (e) {
      console.error("   ❌ Grok (X) Failed:", e);
    }
  }

  // -------------------------------------------------
  // 2. non-X → Gemini Pro
  // -------------------------------------------------
  if (nonXItems.length > 0 && process.env.GEMINI_MODEL_PRO) {
    console.log(`   ✨ Running Gemini Pro for non-X (${nonXItems.length})...`);
    try {
      const proResults = await runAnalysis(nonXItems, {
        modelName: process.env.GEMINI_MODEL_PRO,
        provider: "gemini",
      });
      await saveAnalysisResults(supabase, proResults);
      console.log(`      ✅ Gemini Pro: ${proResults.length} done`);
    } catch (e) {
      console.error("   ❌ Gemini Pro Failed:", e);
    }

    // API 휴식
    await delay(2000);
  }

  // -------------------------------------------------
  // 3. non-X → Grok도 (앙상블)
  // -------------------------------------------------
  if (nonXItems.length > 0 && process.env.GROK_API_KEY) {
    console.log(`   🦅 Running Grok for non-X (${nonXItems.length})...`);
    try {
      const grokResults = await runAnalysis(nonXItems, {
        modelName: process.env.GROK_MODEL,
        provider: "grok",
      });
      await saveAnalysisResults(supabase, grokResults);
      console.log(`      ✅ Grok (non-X): ${grokResults.length} done`);
    } catch (e) {
      console.error("   ❌ Grok (non-X) Failed:", e);
    }
  }

  console.log("✅ [Deep Analysis] Finished.");
};

// 💾 결과 저장 헬퍼 함수 (기존 runPipeline 내부 로직을 함수로 분리 추천)
async function saveAnalysisResults(supabase: any, results: any[]) {
  for (const result of results) {
    const { data: currentItem } = await supabase
      .from("trend")
      .select("analysis_results")
      .eq("id", result.id)
      .single();

    const history = currentItem?.analysis_results || [];

    // AI 모델명이 같으면 덮어쓰고, 다르면 추가 (Ensemble)
    const newEntry = {
      aiModel: result.aiModel,
      score: result.score,
      reason: result.reason,
      title_ko: result.title_ko,
      oneLineSummary: result.oneLineSummary,
      keyPoints: result.keyPoints,
      tags: result.tags,
      analyzedAt: new Date().toISOString(),
    };

    const idx = history.findIndex((h: any) => h.aiModel === result.aiModel);
    if (idx >= 0) history[idx] = newEntry;
    else history.push(newEntry);

    await supabase
      .from("trend")
      .update({ analysis_results: history }) // status는 이미 ANALYZED이므로 유지
      .eq("id", result.id);
  }
}
