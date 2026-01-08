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
        // 주의: analyzer.service 내부에서 X 카테고리는 Gemini가 분석 못하므로 Skip(null) 처리됨
        // Skip된 항목은 analysisResults에 포함되지 않으므로 DB 업데이트도 안 일어남 -> 계속 RAW 상태 유지 (정상)
        // 이후 runGrokAnalysis에서 처리됨
        analysisResults = await runAnalysis(cleanData);
      } catch (e) {
        console.error(`      ⚠️ Batch ${loopCount} Analysis Failed:`, e);
        continue;
      }

      // E. DB 업데이트 (벌크 처리)
      const ids = analysisResults.map((r) => r.id);

      // 🆕 결과가 없으면(전부 X라서 스킵되었거나 에러) 다음 배치로
      if (ids.length === 0) {
        console.log("      ⚠️ 유효한 분석 결과 없음 (X 항목일 수 있음), 스킵");
        await delay(1000);
        continue;
      }

      const { data: currentItems } = await supabase
        .from("trend")
        .select("id, analysis_results")
        .in("id", ids);

      if (!currentItems) {
        console.error("      ⚠️ DB 조회 실패, 이번 배치 스킵");
        continue;
      }

      const analyzedUpdates: any[] = [];
      const rejectedUpdates: any[] = [];

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
          updatedHistory[existingIndex] = newAnalysis;
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

      console.log("      😴 Waiting 2s for Rate Limit...");
      await delay(BATCH_DELAY_MS);
    }

    if (loopCount >= MAX_LOOP_COUNT) {
      console.warn(`      ⚠️ Max loop count (${MAX_LOOP_COUNT}) reached.`);
    }

    // ---------------------------------------------------------
    // 5️⃣ 이메일 발송
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

// ---------------------------------------------------------
// 1️⃣ Gemini Pro 심층 분석 (Non-X 전용)
// ---------------------------------------------------------
export const runGeminiProAnalysis = async (): Promise<void> => {
  console.log("✨ [Gemini Pro] Starting analysis for Non-X items...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  // .env에 GEMINI_MODEL_PRO가 없으면 undefined가 되어 에러 로그 출력됨 (정상)
  const modelName = process.env.GEMINI_MODEL_PRO;

  if (!supabaseUrl || !supabaseKey || !modelName) {
    console.error("❌ [Gemini Pro] 환경변수 누락 (GEMINI_MODEL_PRO 확인 필요)");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const BATCH_SIZE = 50;
  const MAX_PAGES = 10;
  const TARGET_COUNT = 10;

  let targets: TrendItem[] = [];
  let page = 0;

  while (targets.length < TARGET_COUNT && page < MAX_PAGES) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data: candidates } = await supabase
      .from("trend")
      .select("*")
      .eq("status", "ANALYZED")
      .neq("category", "X")
      .order("date", { ascending: false })
      .range(from, to);

    if (!candidates || candidates.length === 0) break;

    for (const item of candidates) {
      if (targets.length >= TARGET_COUNT) break;

      const history = (item.analysis_results as AnalysisEntry[]) || [];
      // ⚠️ 수정: 모델명 완전 일치 비교로 변경 (버전 업 시 재분석 가능하도록)
      const alreadyAnalyzed = history.some((h) => h.aiModel === modelName);

      if (!alreadyAnalyzed) {
        targets.push({
          id: item.id,
          title: item.title,
          link: item.link,
          date: item.date,
          source: item.source,
          category: item.category,
        });
      }
    }
    page++;
  }

  if (targets.length === 0) {
    console.log(
      `   ✅ [Gemini Pro] 최근 ${page * BATCH_SIZE}개 항목 모두 완료.`
    );
    return;
  }

  console.log(
    `   🎯 Gemini Pro Targets: ${targets.length} items (Model: ${modelName})`
  );

  try {
    const results = await runAnalysis(targets, {
      modelName: modelName,
      provider: "gemini",
    });
    await saveAnalysisResults(supabase, results);
    console.log(`   ✅ Gemini Pro Done: ${results.length} processed`);
  } catch (e) {
    console.error("   ❌ Gemini Pro Failed:", e);
  }
};

// ---------------------------------------------------------
// 2️⃣ Grok 심층 분석 (X "RAW" + 모든 "ANALYZED")
// ---------------------------------------------------------
export const runGrokAnalysis = async (): Promise<void> => {
  console.log(
    "🦅 [Grok Analysis] Starting analysis (X: Raw/Analyzed, Others: Analyzed)..."
  );

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const grokKey = process.env.GROK_API_KEY;
  const modelName = process.env.GROK_MODEL || "grok-4-1-fast-reasoning";

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ [Grok] Supabase 환경변수 누락");
    return;
  }
  if (!grokKey) {
    console.log("   ⚠️ GROK_API_KEY 없음. 분석 스킵.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const BATCH_SIZE = 50;
  const MAX_PAGES = 10;
  const TARGET_COUNT = 10;

  let targets: TrendItem[] = [];
  let page = 0;

  while (targets.length < TARGET_COUNT && page < MAX_PAGES) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    // ⚠️ 수정: X 카테고리의 'RAW' 상태인 것도 가져와야 함 (1차 분석 누락 방지)
    // Supabase 쿼리 한계상 status를 OR로 가져오기보다는, 일단 'ANALYZED'와 'RAW'를 모두 포함해서 가져옴
    // 그리고 코드 레벨에서 필터링
    const { data: candidates } = await supabase
      .from("trend")
      .select("*")
      .in("status", ["ANALYZED", "RAW"])
      .order("date", { ascending: false })
      .range(from, to);

    if (!candidates || candidates.length === 0) break;

    for (const item of candidates) {
      if (targets.length >= TARGET_COUNT) break;

      // 필터 로직 강화
      // 1. X가 아닌데 RAW 상태면 -> 아직 Gemini 1차 분석도 안 된 것 -> Grok 대상 아님 (Skip)
      if (item.category !== "X" && item.status === "RAW") {
        continue;
      }
      // 2. REJECTED 상태는 쿼리에서 이미 제외됨

      const history = (item.analysis_results as AnalysisEntry[]) || [];

      // ⚠️ 수정: 모델명 완전 일치 비교로 변경 (strict equality)
      const alreadyAnalyzed = history.some((h) => h.aiModel === modelName);

      if (!alreadyAnalyzed) {
        targets.push({
          id: item.id,
          title: item.title,
          link: item.link,
          date: item.date,
          source: item.source,
          category: item.category,
        });
      }
    }
    page++;
  }

  if (targets.length === 0) {
    console.log(`   ✅ [Grok] 최근 항목 분석 완료.`);
    return;
  }

  console.log(
    `   🎯 Grok Targets: ${targets.length} items (Model: ${modelName})`
  );

  try {
    const results = await runAnalysis(targets, {
      modelName: modelName,
      provider: "grok",
    });
    await saveAnalysisResults(supabase, results);
    console.log(`   ✅ Grok Done: ${results.length} processed`);
  } catch (e) {
    console.error("   ❌ Grok Failed:", e);
  }
};

// 💾 결과 저장 헬퍼 (벌크 처리)
async function saveAnalysisResults(
  supabase: SupabaseClient,
  results: AnalysisResult[]
): Promise<void> {
  if (results.length === 0) return;

  const ids = results.map((r) => r.id);
  const { data: currentItems } = await supabase
    .from("trend")
    .select("id, analysis_results")
    .in("id", ids);

  if (!currentItems) {
    console.error("❌ saveAnalysisResults: DB 조회 실패");
    return;
  }

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

    // 1. 히스토리 업데이트 (덮어쓰기 or 추가)
    const idx = history.findIndex((h) => h.aiModel === result.aiModel);
    if (idx >= 0) history[idx] = newEntry;
    else history.push(newEntry);

    // 2. ⚠️ 상태 결정 로직 수정 (하나라도 0점보다 크면 ANALYZED 유지)
    // - 기존: 이번 결과가 0이면 무조건 REJECTED
    // - 수정: 전체 히스토리 중 긍정 평가가 하나라도 있으면 ANALYZED
    const hasPositiveReview = history.some((h) => h.score > 0);
    const newStatus = hasPositiveReview ? "ANALYZED" : "REJECTED";

    // 로그 (상태가 REJECTED로 확정되는 경우만 출력)
    if (!hasPositiveReview) {
      console.log(
        `      🗑️ [Deep Analysis] 모든 모델이 0점 부여 -> REJECTED (ID: ${result.id})`
      );
    }

    return {
      id: result.id,
      analysis_results: history,
      status: newStatus,
    };
  });

  const { error } = await supabase
    .from("trend")
    .upsert(updates, { onConflict: "id" });

  if (error) console.error("❌ Bulk update failed:", error.message);
}
