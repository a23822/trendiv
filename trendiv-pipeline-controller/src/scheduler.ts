import cron from "node-cron";
import {
  runPipeline,
  runGeminiProAnalysis,
  runGrokAnalysis,
} from "./services/pipeline.service";

let isPipelineRunning = false;
let isGrokRunning = false;
let isGeminiProRunning = false;

export const initScheduler = () => {
  const isScheduleEnabled = process.env.ENABLE_SCHEDULE === "true";

  if (!isScheduleEnabled) {
    console.log("⏸️  [Scheduler] Scheduling is disabled via ENV (Check .env).");
    return;
  }

  console.log("🕒 [Scheduler] Initialized (Env: 4GB RAM/2CPU Optimized).");

  // 1-A. Bi-Weekly 파이프라인 (월/목 새벽 04:00 KST)
  // Weekly 모드 전달 -> 스크래퍼가 '나머지 소스'를 4일치 수집
  cron.schedule(
    "0 4 * * 1,4",
    async () => {
      if (isPipelineRunning) {
        console.log("⚠️ [Pipeline-BiWeekly] Already running, skipping...");
        return;
      }
      isPipelineRunning = true;
      console.log(
        "🚀 [Scheduler] Triggering Bi-Weekly Pipeline (General Sources)...",
      );

      try {
        const result = await runPipeline("weekly");
        if (result.success)
          console.log(
            `✅ Bi-Weekly Pipeline completed (${result.count} items)`,
          );
        else console.error("❌ Bi-Weekly Pipeline failed:", result.error);
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("❌ Bi-Weekly Pipeline error:", error.message);
      } finally {
        isPipelineRunning = false;
        console.log("   ✔️  Bi-Weekly Pipeline scheduled (Mon, Thu 04:00 KST)");
      }
    },
    { timezone: "Asia/Seoul" },
  );

  // 1-B. Daily 파이프라인 (매일 오전 9:00)
  // Daily 모드 전달 -> 스크래퍼가 'X, YouTube'만 3일치 수집
  cron.schedule(
    "0 9 * * *",
    async () => {
      if (isPipelineRunning) {
        console.log("⚠️ [Pipeline-Daily] Already running, skipping...");
        return;
      }
      isPipelineRunning = true;
      console.log("🚀 [Scheduler] Triggering Daily Pipeline (X/YouTube)...");

      try {
        const result = await runPipeline("daily");
        if (result.success)
          console.log(`✅ Daily Pipeline completed (${result.count} items)`);
        else console.error("❌ Daily Pipeline failed:", result.error);
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("❌ Daily Pipeline error:", error.message);
      } finally {
        isPipelineRunning = false;
        console.log("   ✔️  Daily Pipeline scheduled (Daily 09:00 KST)");
      }
    },
    { timezone: "Asia/Seoul" },
  );

  // 2. Gemini Pro 심층 분석 (매일 10:30)
  cron.schedule(
    "30 10 * * *",
    async () => {
      if (isGeminiProRunning) {
        console.log("⚠️ [Gemini Pro] Already running, skipping...");
        return;
      }
      isGeminiProRunning = true;
      try {
        await runGeminiProAnalysis();
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("❌ Gemini Pro Scheduler Error:", error);
      } finally {
        isGeminiProRunning = false;
        console.log("   ✔️  Gemini Pro Analysis scheduled (Daily 10:30 KST)");
      }
    },
    { timezone: "Asia/Seoul" },
  );

  // 3. Grok 심층 분석 (매일 10:45)
  cron.schedule(
    "45 10 * * *",
    async () => {
      if (isGrokRunning) return;
      isGrokRunning = true;
      try {
        await runGrokAnalysis();
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error("❌ Grok Analysis Error:", error);
      } finally {
        isGrokRunning = false;
        console.log("   ✔️  Grok Analysis scheduled (Daily 10:45 KST)");
      }
    },
    { timezone: "Asia/Seoul" },
  );
};
