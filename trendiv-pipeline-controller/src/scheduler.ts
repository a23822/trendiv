import cron from "node-cron";
import { runPipeline, runDeepAnalysis } from "./services/pipeline.service";

// 중복 실행 방지 플래그
let isPipelineRunning = false;
let isDeepAnalysisRunning = false;

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

  // 2. 심층 분석 (매일 오전 10:30)
  cron.schedule(
    "30 10 * * *",
    async () => {
      if (isDeepAnalysisRunning) {
        console.log("⚠️ [Deep Analysis] Already running, skipping...");
        return;
      }

      isDeepAnalysisRunning = true;
      console.log("⏰ [Scheduler] Triggering Daily Deep Analysis...");

      try {
        await runDeepAnalysis();
        console.log("✅ Deep Analysis completed");
      } catch (error) {
        console.error("❌ Deep Analysis failed:", error);
      } finally {
        isDeepAnalysisRunning = false;
      }
    },
    { timezone: "Asia/Seoul" }
  );

  console.log("   ✔️  Deep Analysis scheduled (Every Day 10:30 KST)");
};
