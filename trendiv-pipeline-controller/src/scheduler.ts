import cron from "node-cron";
import { runPipeline } from "./services/pipeline.service";

/**
 * ⏰ 스케줄러 초기화 함수
 */
export const initScheduler = () => {
  // 환경 변수로 스케줄링 활성화 여부 제어 (개발 중 중복 실행 방지)
  // .env 파일에 ENABLE_SCHEDULE="true" 라고 적혀있을 때만 자동 실행됩니다.
  const isScheduleEnabled = process.env.ENABLE_SCHEDULE === "true";

  if (!isScheduleEnabled) {
    console.log("⏸️  [Scheduler] Scheduling is disabled via ENV (Check .env).");
    return;
  }

  console.log("🕒 [Scheduler] Initialized.");

  // 1. 주간 뉴스레터 파이프라인 (매주 월요일 오전 9:00)
  // Cron 표현식: 분 시 일 월 요일 (0 9 * * 1 => 월요일 09:00)
  cron.schedule("0 9 * * 1", async () => {
    console.log("⏰ [Scheduler] Triggering Weekly Pipeline...");
    await runPipeline();
  });

  console.log("   ✔️  Weekly Pipeline scheduled (Every Mon 09:00)");
};
