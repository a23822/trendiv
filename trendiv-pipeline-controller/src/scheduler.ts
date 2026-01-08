import cron from "node-cron";
import {
  runPipeline,
  runGeminiProAnalysis,
  runGrokAnalysis,
} from "./services/pipeline.service";
// 중복 실행 방지 플래그
let isPipelineRunning = false;
let isGrokRunning = false;
let isGeminiProRunning = false;

export const initScheduler = () => {
  const isScheduleEnabled = process.env.ENABLE_SCHEDULE === "true";

  if (!isScheduleEnabled) {
    console.log("⏸️  [Scheduler] Scheduling is disabled via ENV (Check .env).");
    return;
  }

  console.log("🕒 [Scheduler] Initialized.");

  // 1. 주간 뉴스레터 파이프라인 (매일 오전 9:00)
  cron.schedule(
    "0 9 * * *",
    async () => {
      if (isPipelineRunning) {
        console.log("⚠️ [Pipeline] Already running, skipping...");
        return;
      }

      isPipelineRunning = true;
      console.log("🚀 [Scheduler] Triggering Pipeline...");

      try {
        const result = await runPipeline();

        // 🆕 리턴값 체크
        if (result.success) {
          console.log(
            `✅ Pipeline completed (${result.count} items processed)`
          );
        } else {
          console.error("❌ Pipeline failed:", result.error);
        }
      } catch (error) {
        console.error("❌ Pipeline unexpected error:", error);
      } finally {
        isPipelineRunning = false;
      }
    },
    { timezone: "Asia/Seoul" }
  );

  console.log("   ✔️  Daily Pipeline scheduled (Every Day 09:00 KST)");

  // 2. Gemini Pro 심층 분석 (매일 10:30)
  cron.schedule(
    "30 10 * * *",
    async () => {
      // 플래그 체크
      if (isGeminiProRunning) {
        console.log("⚠️ [Gemini Pro] Already running, skipping...");
        return;
      }

      isGeminiProRunning = true;
      console.log("⏰ [Scheduler] Triggering Gemini Pro Analysis...");

      try {
        await runGeminiProAnalysis();
      } catch (error) {
        console.error("❌ Gemini Pro Scheduler Error:", error);
      } finally {
        isGeminiProRunning = false;
      }
    },
    { timezone: "Asia/Seoul" }
  );

  console.log("   ✔️  Gemini Pro Analysis scheduled (Every Day 10:30 KST)");

  // 3. Grok 심층 분석 (매일 10:45) - X + 일반글 모두 포함
  cron.schedule(
    "45 10 * * *",
    async () => {
      if (isGrokRunning) return;
      isGrokRunning = true;
      try {
        await runGrokAnalysis();
      } catch (error) {
        console.error("❌ Grok Analysis Error:", error);
      } finally {
        isGrokRunning = false;
      }
    },
    { timezone: "Asia/Seoul" }
  );

  console.log("   ✔️  Grok Analysis scheduled (Every Day 10:45 KST)");
};
