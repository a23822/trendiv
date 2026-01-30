import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import * as path from "path";

import { scrapeAll as runScraper } from "trendiv-scraper-module";
import {
  runAnalysis,
  FailedAnalysisResult,
  isFailedResult,
} from "trendiv-analysis-module";
import { composeEmailHtml as generateNewsletterHtml } from "trendiv-result-module";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TrendItem {
  id: number;
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
  content?: string;
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
  content?: string;
}

interface TrendDbItem {
  id: number;
  analysis_results: AnalysisEntry[] | null;
}

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
  failedCount?: number;
  error?: unknown;
}

interface UpsertItem {
  id: number;
  title?: string;
  analysis_results: AnalysisEntry[];
  status: string;
  represent_result: AnalysisEntry | null;
  content?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MAX_LOOP_COUNT = 20;
const BATCH_DELAY_MS = 2000;
const MAX_RETRY_COUNT = 3; // 🆕 최대 재시도 횟수

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🆕 analysis_results에서 FAIL 재시도 횟수 계산
const getRetryCount = (analysisResults: AnalysisEntry[] | null): number => {
  if (!analysisResults) return 0;
  return analysisResults.filter(
    (h) => h.aiModel === "SYSTEM" && h.tags?.includes("_FAIL_RETRY"),
  ).length;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 메인 파이프라인 (AI API URL 직접 분석)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const runPipeline = async (
  mode: "daily" | "weekly" = "daily",
): Promise<PipelineResult> => {
  const startTime = Date.now();
  console.log("🔥 [Pipeline v2.0] Start processing (AI API Direct Mode)...");

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

    let customDays: number | undefined = undefined;
    if (count === 0) {
      customDays = 365;
      console.log("      ✨ Initial Sync detected: Fetching 365 days.");
    }

    const rawData = await runScraper(mode, customDays);

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
      else console.log(`      -> Saved ${rawData.length} raw items to DB.`);
    }

    // ---------------------------------------------------------
    // 2️⃣ 배치 분석 루프 (AI API Direct - Playwright 없음!)
    // ---------------------------------------------------------
    console.log(" 2. 🔄 Starting Batch Analysis Loop (AI API Direct)...");

    let totalSuccessCount = 0;
    let totalFailCount = 0;
    const allValidTrends: AnalyzedReport[] = [];
    let loopCount = 0;

    while (loopCount < MAX_LOOP_COUNT) {
      loopCount++;

      const targetModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

      const { data: targetItems, error } = await supabase.rpc(
        "get_analysis_targets",
        {
          target_model: targetModel,
          batch_size: 10,
        },
      );

      if (error) {
        console.error("❌ RPC 호출 에러:", error);
        throw error;
      }

      if (!targetItems || targetItems.length === 0) {
        console.log("      ✅ 더 이상 분석할 데이터가 없습니다. 루프 종료.");
        break;
      }

      console.log(
        `      [Batch ${loopCount}/${MAX_LOOP_COUNT}] Analyzing ${targetItems.length} items...`,
      );

      const cleanData: TrendItem[] = targetItems.map((item: TrendItem) => ({
        id: item.id,
        title: item.title,
        link: item.link,
        date: item.date,
        source: item.source,
        category: item.category || "Uncategorized",
        content: item.content,
      }));

      // 🆕 분석 실행 (Playwright 없이 AI API 직접 URL 분석)
      let rawResults: (AnalysisResult | FailedAnalysisResult)[] = [];

      try {
        const results = await runAnalysis(cleanData);

        if (!Array.isArray(results)) {
          console.error("runAnalysis returned invalid data");
        } else {
          rawResults = results;
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error(
          `      ⚠️ Batch ${loopCount} Analysis Failed:`,
          err.message,
        );
      }

      // 🆕 성공/실패 분리
      const successResults: AnalysisResult[] = [];
      const failedResults: FailedAnalysisResult[] = [];

      for (const result of rawResults) {
        if (isFailedResult(result)) {
          failedResults.push(result);
        } else if (result && typeof result.id === "number") {
          successResults.push(result as AnalysisResult);
        }
      }

      console.log(
        `      📊 Results: ${successResults.length} success, ${failedResults.length} failed`,
      );

      // ─────────────────────────────────────────────────────────
      // 🆕 FAIL 상태 저장 (Playwright 재시도 대상)
      // ─────────────────────────────────────────────────────────
      if (failedResults.length > 0) {
        console.log(`      💾 Saving ${failedResults.length} items as FAIL...`);

        const failUpdates = failedResults.map((failed) => {
          const originalItem = targetItems.find((t: any) => t.id === failed.id);
          const existingHistory = originalItem?.analysis_results || [];

          return {
            id: failed.id,
            link: originalItem?.link || "",
            title: originalItem?.title || "제목 없음",
            source: originalItem?.source,
            category: originalItem?.category,
            date: originalItem?.date,
            status: "FAIL",
            analysis_results: [
              ...existingHistory,
              {
                aiModel: "SYSTEM",
                score: 0,
                reason: `FAIL: ${failed.failType} - ${failed.failReason}`,
                title_ko: "",
                oneLineSummary: "",
                keyPoints: [],
                tags: ["_API_ACCESS_FAIL"],
                analyzedAt: new Date().toISOString(),
              },
            ],
          };
        });

        const { error: failError } = await supabase
          .from("trend")
          .upsert(failUpdates, { onConflict: "id" });

        if (failError) {
          console.error("      ❌ FAIL status save error:", failError.message);
        } else {
          totalFailCount += failedResults.length;
        }
      }

      // ─────────────────────────────────────────────────────────
      // 성공 결과 저장 (기존 로직 유지)
      // ─────────────────────────────────────────────────────────
      if (successResults.length === 0) {
        console.log("      ⚠️ 유효한 분석 결과 없음, 다음 배치로...");
        await delay(1000);
        continue;
      }

      const ids = successResults.map((r) => r.id);

      const { data: currentItems } = await supabase
        .from("trend")
        .select("*")
        .in("id", ids);

      if (!currentItems) {
        console.error("      ⚠️ DB 조회 실패, 이번 배치 스킵");
        continue;
      }

      const analyzedUpdates: UpsertItem[] = [];
      const rejectedUpdates: UpsertItem[] = [];

      for (const result of successResults) {
        const current = currentItems.find(
          (item: TrendDbItem) => item.id === result.id,
        );

        const originalItem = cleanData.find((item) => item.id === result.id);

        const existingHistory: AnalysisEntry[] =
          current?.analysis_results || [];

        const newAnalysis: AnalysisEntry = {
          aiModel: result.aiModel,
          score: result.score,
          reason: result.reason,
          title_ko: result.title_ko || originalItem?.title || "제목 없음",
          oneLineSummary: result.oneLineSummary || "",
          keyPoints: result.keyPoints || [],
          tags: result.tags || [],
          analyzedAt: new Date().toISOString(),
        };

        const updatedHistory = [...existingHistory];
        const existingIndex = existingHistory.findIndex(
          (r) => r.aiModel === result.aiModel,
        );

        if (existingIndex !== -1) {
          updatedHistory[existingIndex] = newAnalysis;
        } else {
          updatedHistory.push(newAnalysis);
        }

        const sortedHistory = [...updatedHistory].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (
            new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
          );
        });
        const representResult = sortedHistory[0];

        if (!originalItem) continue;

        const commonPayload = {
          ...originalItem,
          title: result.title_ko || originalItem?.title || "제목 없음",
          analysis_results: updatedHistory,
          represent_result: representResult || null,
        };

        if (result.score > 0) {
          analyzedUpdates.push({
            ...commonPayload,
            status: "ANALYZED",
            content: result.content || originalItem?.content,
          });

          allValidTrends.push({
            title: commonPayload.title,
            oneLineSummary: result.oneLineSummary,
            tags: result.tags,
            score: result.score,
            originalLink: originalItem?.link || "",
          });
          totalSuccessCount++;
        } else {
          rejectedUpdates.push({
            ...commonPayload,
            status: "REJECTED",
          });
          console.log(` 🗑️ Rejected (Score 0): ID ${result.id}`);
        }
      }

      const allUpdates = [...analyzedUpdates, ...rejectedUpdates];

      if (allUpdates.length > 0) {
        const { error } = await supabase
          .from("trend")
          .upsert(allUpdates, { onConflict: "id" });

        if (error) {
          console.error("      ⚠️ Batch upsert failed:", error.message);
        } else {
          console.log(
            `      💾 Saved: ${analyzedUpdates.length} analyzed, ${rejectedUpdates.length} rejected.`,
          );
        }
      }

      console.log("      😴 Waiting 2s for Rate Limit...");
      await delay(BATCH_DELAY_MS);
    }

    if (loopCount >= MAX_LOOP_COUNT) {
      console.warn(`      ⚠️ Max loop count (${MAX_LOOP_COUNT}) reached.`);
    }

    // ---------------------------------------------------------
    // 3️⃣ 이메일 발송
    // ---------------------------------------------------------
    console.log(` 3. 📧 Preparing Email for ${allValidTrends.length} items...`);

    if (allValidTrends.length > 0 && resend) {
      const emailPayload = {
        date: new Date().toISOString().split("T")[0],
        count: allValidTrends.length,
        articles: allValidTrends,
      };

      const newsletterHtml = await generateNewsletterHtml(emailPayload);

      await resend.emails.send({
        from: "Trendiv <chanwoochae@trendiv.org>",
        to: ["a238220@gmail.com"],
        subject: `🔥 Trendiv 분석 알림 (${mode.toUpperCase()} - ${allValidTrends.length}건, FAIL: ${totalFailCount}건)`,
        html: newsletterHtml,
      });
      console.log("      ✅ Email Sent!");
    } else {
      console.log("      📭 보낼 유효한 뉴스가 없습니다.");
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `🎉 [Pipeline] Done! ${totalSuccessCount} success, ${totalFailCount} failed in ${duration}s`,
    );

    return {
      success: true,
      count: totalSuccessCount,
      failedCount: totalFailCount,
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("❌ [Pipeline] Critical Error:", error.message);
    return { success: false, error };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🆕 FAIL 재시도 파이프라인 (Playwright 사용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const runRetryPipeline = async (): Promise<PipelineResult> => {
  const startTime = Date.now();
  console.log(
    "🔄 [Retry Pipeline] Starting FAIL items retry with Playwright...",
  );

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("❌ Supabase 환경변수 누락");
    }

    if (!geminiKey) {
      throw new Error("❌ GEMINI_API_KEY 누락");
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    // FAIL 상태 항목 조회
    const { data: failedItems, error } = await supabase
      .from("trend")
      .select("*")
      .eq("status", "FAIL")
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    if (!failedItems || failedItems.length === 0) {
      console.log("      ✅ 재시도할 FAIL 항목이 없습니다.");
      return { success: true, count: 0 };
    }

    // 🆕 재시도 횟수 필터링 (analysis_results에서 계산)
    const retryTargets = failedItems.filter((item) => {
      const retryCount = getRetryCount(item.analysis_results);
      return retryCount < MAX_RETRY_COUNT;
    });

    if (retryTargets.length === 0) {
      console.log(
        `      ✅ 모든 FAIL 항목이 최대 재시도 횟수(${MAX_RETRY_COUNT})에 도달했습니다.`,
      );

      // 최대 재시도 도달 항목들 REJECTED로 변경
      const maxRetryItems = failedItems.filter((item) => {
        const retryCount = getRetryCount(item.analysis_results);
        return retryCount >= MAX_RETRY_COUNT;
      });

      if (maxRetryItems.length > 0) {
        const rejectUpdates = maxRetryItems.map((item) => ({
          id: item.id,
          status: "REJECTED",
          analysis_results: [
            ...(item.analysis_results || []),
            {
              aiModel: "SYSTEM",
              score: 0,
              reason: `MAX_RETRY_EXCEEDED: ${MAX_RETRY_COUNT}회 재시도 후 최종 실패`,
              title_ko: "",
              oneLineSummary: "",
              keyPoints: [],
              tags: ["_MAX_RETRY_EXCEEDED"],
              analyzedAt: new Date().toISOString(),
            },
          ],
        }));

        await supabase
          .from("trend")
          .upsert(rejectUpdates, { onConflict: "id" });

        console.log(
          `      🗑️ ${maxRetryItems.length}건 REJECTED로 변경 (최대 재시도 초과)`,
        );
      }

      return { success: true, count: 0, failedCount: maxRetryItems.length };
    }

    console.log(
      `      📋 Found ${retryTargets.length} FAIL items to retry (filtered from ${failedItems.length})`,
    );

    // RetryService 동적 import (Playwright 의존성 분리)
    const { RetryService } = await import(
      "trendiv-analysis-module/src/services/retry.service"
    );

    const retryService = new RetryService(geminiKey, process.env.GROK_API_KEY);

    // 재시도 실행
    const retryResults = await retryService.retryFailedItems(
      retryTargets as TrendItem[],
    );

    // 결과 DB 업데이트
    let recoveredCount = 0;
    let finalFailCount = 0;

    for (const result of retryResults) {
      const originalItem = retryTargets.find((item) => item.id === result.id);
      const existingHistory = originalItem?.analysis_results || [];

      if (result.success && result.analysis) {
        // 성공 → ANALYZED/REJECTED로 업데이트
        const newEntry: AnalysisEntry = {
          aiModel: result.analysis.aiModel,
          score: result.analysis.score,
          reason: result.analysis.reason,
          title_ko: result.analysis.title_ko,
          oneLineSummary: result.analysis.oneLineSummary,
          keyPoints: result.analysis.keyPoints,
          tags: result.analysis.tags,
          analyzedAt: new Date().toISOString(),
        };

        // SYSTEM 실패 기록은 유지하고 새 결과 추가
        const updatedHistory = [...existingHistory, newEntry];

        const sortedHistory = [...updatedHistory]
          .filter((h) => h.aiModel !== "SYSTEM")
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (
              new Date(b.analyzedAt).getTime() -
              new Date(a.analyzedAt).getTime()
            );
          });

        const updateData: any = {
          id: result.id,
          status: result.analysis.score > 0 ? "ANALYZED" : "REJECTED",
          analysis_results: updatedHistory,
          represent_result: sortedHistory[0] || null,
        };

        if (result.analysis.content) {
          updateData.content = result.analysis.content;
        }

        await supabase.from("trend").upsert(updateData, { onConflict: "id" });
        recoveredCount++;
        console.log(
          `      ✅ Recovered ID ${result.id} (Score: ${result.analysis.score})`,
        );
      } else {
        // 실패 → FAIL 유지 + 재시도 기록 추가
        const currentRetryCount = getRetryCount(existingHistory) + 1;
        const isMaxRetry = currentRetryCount >= MAX_RETRY_COUNT;

        const retryEntry: AnalysisEntry = {
          aiModel: "SYSTEM",
          score: 0,
          reason: `RETRY_FAIL (${currentRetryCount}/${MAX_RETRY_COUNT}): ${result.error || "Unknown error"}`,
          title_ko: "",
          oneLineSummary: "",
          keyPoints: [],
          tags: isMaxRetry ? ["_MAX_RETRY_EXCEEDED"] : ["_FAIL_RETRY"],
          analyzedAt: new Date().toISOString(),
        };

        await supabase.from("trend").upsert(
          {
            id: result.id,
            status: isMaxRetry ? "REJECTED" : "FAIL",
            analysis_results: [...existingHistory, retryEntry],
          },
          { onConflict: "id" },
        );

        if (isMaxRetry) {
          finalFailCount++;
          console.log(`      🗑️ ID ${result.id} → REJECTED (최대 재시도 초과)`);
        } else {
          console.log(
            `      ⚠️ ID ${result.id} retry failed (${currentRetryCount}/${MAX_RETRY_COUNT})`,
          );
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `🎉 [Retry Pipeline] Done! Recovered: ${recoveredCount}, Final Failed: ${finalFailCount} in ${duration}s`,
    );

    return {
      success: true,
      count: recoveredCount,
      failedCount: finalFailCount,
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("❌ [Retry Pipeline] Critical Error:", error.message);
    return { success: false, error };
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ Gemini Pro 심층 분석 (Non-X 전용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const runGeminiProAnalysis = async (): Promise<void> => {
  console.log("✨ [Gemini Pro] Starting analysis for Non-X items...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
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
      const alreadyAnalyzed = history.some((h) => h.aiModel === modelName);

      if (!alreadyAnalyzed) {
        targets.push({
          id: item.id,
          title: item.title,
          link: item.link,
          date: item.date,
          source: item.source,
          category: item.category,
          content: item.content,
        });
      }
    }
    page++;
  }

  if (targets.length === 0) {
    console.log(
      `   ✅ [Gemini Pro] 최근 ${page * BATCH_SIZE}개 항목 모두 완료.`,
    );
    return;
  }

  console.log(
    `   🎯 Gemini Pro Targets: ${targets.length} items (Model: ${modelName})`,
  );

  try {
    const results = await runAnalysis(targets, {
      modelName: modelName,
      provider: "gemini",
    });
    await saveAnalysisResults(supabase, results as AnalysisResult[]);
    console.log(`   ✅ Gemini Pro Done: ${results.length} processed`);
  } catch (e) {
    console.error("   ❌ Gemini Pro Failed:", e);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ Grok 심층 분석 (X "RAW" + 모든 "ANALYZED")
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const runGrokAnalysis = async (): Promise<void> => {
  console.log(
    "🦅 [Grok Analysis] Starting analysis (X: Raw/Analyzed, Others: Analyzed)...",
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

    const { data: candidates } = await supabase
      .from("trend")
      .select("*")
      .in("status", ["ANALYZED", "RAW"])
      .neq("category", "YouTube")
      .order("date", { ascending: false })
      .range(from, to);

    if (!candidates || candidates.length === 0) break;

    for (const item of candidates) {
      if (targets.length >= TARGET_COUNT) break;

      if (item.category !== "X" && item.status === "RAW") {
        continue;
      }

      const history = (item.analysis_results as AnalysisEntry[]) || [];
      const alreadyAnalyzed = history.some((h) => h.aiModel === modelName);

      if (!alreadyAnalyzed) {
        targets.push({
          id: item.id,
          title: item.title,
          link: item.link,
          date: item.date,
          source: item.source,
          category: item.category,
          content: item.content,
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
    `   🎯 Grok Targets: ${targets.length} items (Model: ${modelName})`,
  );

  try {
    const results = await runAnalysis(targets, {
      modelName: modelName,
      provider: "grok",
    });
    await saveAnalysisResults(supabase, results as AnalysisResult[]);
    console.log(`   ✅ Grok Done: ${results.length} processed`);
  } catch (e) {
    console.error("   ❌ Grok Failed:", e);
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 결과 저장 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function saveAnalysisResults(
  supabase: SupabaseClient,
  results: AnalysisResult[],
): Promise<void> {
  if (!Array.isArray(results) || results.length === 0) {
    console.warn(
      "      ⚠️ saveAnalysisResults: 유효하지 않은 결과값, 저장 건너뜀.",
    );
    return;
  }

  const ids = results.map((r) => r.id);

  const { data: currentItems } = await supabase
    .from("trend")
    .select("*")
    .in("id", ids);

  if (!currentItems) {
    console.error("❌ saveAnalysisResults: DB 조회 실패");
    return;
  }

  console.log(`      💾 Saving results for ${results.length} items (Bulk)...`);

  const updates: UpsertItem[] = [];

  for (const result of results) {
    const current = currentItems.find(
      (item: TrendDbItem) => item.id === result.id,
    );

    if (!current) {
      console.warn(
        `⚠️ ID ${result.id}에 해당하는 원본 데이터를 찾을 수 없어 스킵합니다.`,
      );
      continue;
    }

    const existingHistory: AnalysisEntry[] = current.analysis_results || [];

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

    const updatedHistory = [...existingHistory];
    const idx = existingHistory.findIndex((h) => h.aiModel === result.aiModel);

    if (idx >= 0) updatedHistory[idx] = newEntry;
    else updatedHistory.push(newEntry);

    const isHighQuality = updatedHistory.every((h) => h.score > 0);
    if (!isHighQuality) {
      const zeroModel = updatedHistory.find((h) => h.score === 0)?.aiModel;
      console.log(
        `      🗑️ [Quality Control] 0점 발생 (ID: ${result.id}, Model: ${zeroModel})`,
      );
    }

    const sortedHistory = [...updatedHistory].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
      );
    });

    const updateData: UpsertItem = {
      id: result.id,
      title: result.title_ko || "제목 없음",
      analysis_results: updatedHistory,
      status: result.score > 0 ? "ANALYZED" : "REJECTED",
      represent_result: sortedHistory[0] || null,
    };

    if (result.content) {
      updateData.content = result.content;
    }

    updates.push(updateData);
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from("trend")
      .upsert(updates, { onConflict: "id" });

    if (error) {
      console.error("      ❌ Bulk Save Failed:", error.message);
    } else {
      console.log(
        `      ✅ Bulk Save Success: ${updates.length} items updated.`,
      );
    }
  }
}
