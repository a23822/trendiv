import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import * as path from "path";

import { scrapeAll as runScraper } from "trendiv-scraper-module";
import { runAnalysis } from "trendiv-analysis-module";
import { composeEmailHtml as generateNewsletterHtml } from "trendiv-result-module";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// 🆕 타입 정의
interface TrendItem {
  id: number;
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
}

interface AnalysisEntry {
  aiModel: string;
  score: number;
  reason: string;
  title_ko: string;
  oneLineSummary: string;
  keyPoints: string[];
  tags: string[];
  analyzedAt: string;
}

interface AnalysisResult extends AnalysisEntry {
  id: number;
}

interface TrendDbItem {
  id: number;
  analysis_results: AnalysisEntry[] | null;
}

// 🆕 이메일용 타입 (trendiv-result-module과 동일)
interface AnalyzedReport {
  title: string;
  oneLineSummary: string;
  tags: string[];
  score: number;
  techStack?: string[];
  originalLink: string;
}

interface PipelineResult {
  success: boolean;
  count?: number;
  error?: unknown;
}

// 🆕 상수
const MAX_LOOP_COUNT = 100; // 무한루프 방지
const BATCH_DELAY_MS = 2000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runPipeline = async (): Promise<PipelineResult> => {
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
    const allValidTrends: AnalyzedReport[] = [];
    let loopCount = 0;

    // 🆕 무한루프 방지: MAX_LOOP_COUNT 제한
    while (loopCount < MAX_LOOP_COUNT) {
      loopCount++;

      // A. 데이터 가져오기
      const targetModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

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

      // B. 종료 조건
      if (!targetItems || targetItems.length === 0) {
        console.log("      ✅ 더 이상 분석할 데이터가 없습니다. 루프 종료.");
        break;
      }

      console.log(
        `      [Batch ${loopCount}/${MAX_LOOP_COUNT}] Analyzing ${targetItems.length} items...`
      );

      // C. 분석 데이터 정제
      const cleanData: TrendItem[] = targetItems.map((item: TrendItem) => ({
        id: item.id,
        title: item.title,
        link: item.link,
        date: item.date,
        source: item.source,
        category: item.category || "Uncategorized",
      }));

      // D. 분석 실행
      let analysisResults: AnalysisResult[] = [];
      try {
        analysisResults = await runAnalysis(cleanData);
      } catch (e) {
        console.error(`      ⚠️ Batch ${loopCount} Analysis Failed:`, e);
        continue;
      }

      // E. DB 업데이트 (벌크 처리)
      const ids = analysisResults.map((r) => r.id);
      const { data: currentItems } = await supabase
        .from("trend")
        .select("id, analysis_results")
        .in("id", ids);

      // 🆕 DB 조회 실패 시 방어
      if (!currentItems) {
        console.error("      ⚠️ DB 조회 실패, 이번 배치 스킵");
        continue;
      }

      const analyzedUpdates: {
        id: number;
        analysis_results: AnalysisEntry[];
        status: string;
      }[] = [];
      const rejectedUpdates: {
        id: number;
        analysis_results: AnalysisEntry[];
        status: string;
      }[] = [];

      for (const result of analysisResults) {
        const current = currentItems.find(
          (item: TrendDbItem) => item.id === result.id
        );
        const existingHistory: AnalysisEntry[] =
          current?.analysis_results || [];

        const newAnalysis: AnalysisEntry = {
          aiModel: result.aiModel,
          score: result.score,
          reason: result.reason,
          title_ko: result.title_ko,
          oneLineSummary: result.oneLineSummary,
          keyPoints: result.keyPoints,
          tags: result.tags,
          analyzedAt: new Date().toISOString(),
        };

        const updatedHistory = [...existingHistory];
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

        if (result.score > 0) {
          analyzedUpdates.push({
            id: result.id,
            analysis_results: updatedHistory,
            status: "ANALYZED",
          });
          const originalItem = cleanData.find((item) => item.id === result.id);
          allValidTrends.push({
            title: result.title_ko || originalItem?.title || "",
            oneLineSummary: result.oneLineSummary,
            tags: result.tags,
            score: result.score,
            originalLink: originalItem?.link || "",
          });
          totalSuccessCount++;
        } else {
          rejectedUpdates.push({
            id: result.id,
            analysis_results: updatedHistory,
            status: "REJECTED",
          });
          console.log(`      🗑️ Rejected (Score 0): ID ${result.id}`);
        }
      }

      // 벌크 업데이트 실행
      if (analyzedUpdates.length > 0) {
        const { error } = await supabase
          .from("trend")
          .upsert(analyzedUpdates, { onConflict: "id" });
        if (error)
          console.error("      ⚠️ Analyzed upsert failed:", error.message);
      }
      if (rejectedUpdates.length > 0) {
        const { error } = await supabase
          .from("trend")
          .upsert(rejectedUpdates, { onConflict: "id" });
        if (error)
          console.error("      ⚠️ Rejected upsert failed:", error.message);
      }

      // F. API 휴식 (Rate Limit 방지)
      console.log("      😴 Waiting 2s for Rate Limit...");
      await delay(BATCH_DELAY_MS);
    }

    // 🆕 maxLoop 도달 경고
    if (loopCount >= MAX_LOOP_COUNT) {
      console.warn(
        `      ⚠️ Max loop count (${MAX_LOOP_COUNT}) reached. 강제 종료.`
      );
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
 */
export const runDeepAnalysis = async (): Promise<void> => {
  console.log("🚀 [Deep Analysis] Starting daily re-analysis...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  // 🆕 환경변수 검증
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ [Deep Analysis] SUPABASE_URL/KEY가 없습니다.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

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

  const cleanData: TrendItem[] = targets.map((item) => ({
    id: item.id,
    title: item.title,
    link: item.link,
    date: item.date,
    source: item.source,
    category: item.category,
  }));

  const xItems = cleanData.filter((item) => item.category === "X");
  const nonXItems = cleanData.filter((item) => item.category !== "X");

  console.log(`   📊 X: ${xItems.length}, non-X: ${nonXItems.length}`);

  // 1. X 카테고리 → Grok만
  if (xItems.length > 0 && process.env.GROK_API_KEY) {
    console.log(`   🦅 Running Grok for X items (${xItems.length})...`);
    try {
      const grokResults = await runAnalysis(xItems, { provider: "grok" });
      await saveAnalysisResults(supabase, grokResults);
      console.log(`      ✅ Grok (X): ${grokResults.length} done`);
    } catch (e) {
      console.error("   ❌ Grok (X) Failed:", e);
    }
  }

  // 2. non-X → Gemini Pro
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
    await delay(BATCH_DELAY_MS);
  }

  // 3. non-X → Grok도 (앙상블)
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

// 💾 결과 저장 헬퍼 함수 (벌크 처리)
async function saveAnalysisResults(
  supabase: SupabaseClient,
  results: AnalysisResult[]
): Promise<void> {
  if (results.length === 0) return;

  // 1. 한 번에 모든 기존 데이터 조회
  const ids = results.map((r) => r.id);
  const { data: currentItems } = await supabase
    .from("trend")
    .select("id, analysis_results")
    .in("id", ids);

  // 🆕 DB 조회 실패 시 방어
  if (!currentItems) {
    console.error("❌ saveAnalysisResults: DB 조회 실패");
    return;
  }

  // 2. 메모리에서 업데이트 계산
  const updates = results.map((result) => {
    const current = currentItems.find(
      (item: TrendDbItem) => item.id === result.id
    );
    const history: AnalysisEntry[] = current?.analysis_results || [];

    const newEntry: AnalysisEntry = {
      aiModel: result.aiModel,
      score: result.score,
      reason: result.reason,
      title_ko: result.title_ko,
      oneLineSummary: result.oneLineSummary,
      keyPoints: result.keyPoints,
      tags: result.tags,
      analyzedAt: new Date().toISOString(),
    };

    const idx = history.findIndex((h) => h.aiModel === result.aiModel);
    if (idx >= 0) history[idx] = newEntry;
    else history.push(newEntry);

    return {
      id: result.id,
      analysis_results: history,
    };
  });

  // 3. 한 번에 벌크 업데이트
  const { error } = await supabase
    .from("trend")
    .upsert(updates, { onConflict: "id" });

  if (error) console.error("❌ Bulk update failed:", error.message);
}
