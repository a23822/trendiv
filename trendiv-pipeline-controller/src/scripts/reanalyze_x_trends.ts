import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 먼저 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });
console.log(`🔌 Loading .env from: ${envPath}`);

// 타입만 정적 import (타입은 런타임에 영향 없음)
import type { AnalysisResult, Trend } from "trendiv-analysis-module";

// ============================================================
// CLI 옵션 파싱
// ============================================================
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const LIMIT = (() => {
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (limitArg) {
    const value = parseInt(limitArg.split("=")[1], 10);
    return isNaN(value) ? undefined : value;
  }
  return undefined;
})();

// 사용법 출력
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🦅 X(Twitter) 카테고리 'ANALYZED' 데이터 재심사 스크립트

사용법:
  npx tsx reevaluate_x_trends.ts [옵션]

옵션:
  --dry-run     실제 DB 업데이트 없이 시뮬레이션만 실행
  --limit=N     처리할 최대 개수 지정 (테스트용)
  --verbose     상세 로그 출력
  --help, -h    이 도움말 출력

예시:
  npx tsx reevaluate_x_trends.ts --dry-run --limit=5   # 5개만 시뮬레이션
  npx tsx reevaluate_x_trends.ts --limit=10            # 10개만 실제 실행
  npx tsx reevaluate_x_trends.ts                       # 전체 실행
`);
  process.exit(0);
}

// ============================================================
// 메인 함수
// ============================================================
const reevaluateXTrends = async () => {
  console.log("🦅 X(Twitter) 카테고리 'ANALYZED' 데이터 재심사 시작...");

  if (DRY_RUN) {
    console.log("🔸 DRY-RUN 모드: 실제 DB 업데이트 없이 시뮬레이션합니다.\n");
  }
  if (LIMIT) {
    console.log(`🔸 LIMIT 모드: 최대 ${LIMIT}개만 처리합니다.\n`);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const grokApiKey = process.env.GROK_API_KEY;

  if (!supabaseUrl || !supabaseKey || !grokApiKey) {
    throw new Error(
      "❌ 환경 변수(SUPABASE_URL, SUPABASE_KEY, GROK_API_KEY) 누락",
    );
  }

  // 2. 동적 import (dotenv 로드 후 실행됨)
  const { GrokService } = await import("trendiv-analysis-module");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const grokService = new GrokService(grokApiKey);

  // 1. 재평가 대상 가져오기
  let query = supabase
    .from("trend")
    .select("*")
    .eq("status", "ANALYZED")
    .eq("category", "X")
    .order("id", { ascending: true });

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: trends, error } = await query;

  if (error) {
    throw new Error(`❌ 데이터 조회 실패: ${error.message}`);
  }

  if (!trends || trends.length === 0) {
    console.log("🏁 재심사할 X 카테고리의 'ANALYZED' 데이터가 없습니다.");
    return;
  }

  console.log(
    `📦 총 ${trends.length}개의 X 트렌드를 더 엄격하게 재평가합니다.\n`,
  );

  let downgradedCount = 0;
  let keptCount = 0;
  let failCount = 0;

  // 결과 요약용 배열
  const results: Array<{
    id: number;
    title: string;
    oldScore: number;
    newScore: number;
    status: "KEPT" | "DOWNGRADED" | "FAILED";
  }> = [];

  // 2. 순차적 재분석
  for (let i = 0; i < trends.length; i++) {
    const trend = trends[i] as Trend;
    const progress = `[${i + 1}/${trends.length}]`;

    try {
      const oldResult = trend.analysis_results?.[0];
      const oldScore = oldResult?.score ?? 0;
      const shortTitle = trend.title
        ? trend.title.substring(0, 40) + (trend.title.length > 40 ? "..." : "")
        : "No Title";

      process.stdout.write(
        `${progress} 🔍 [ID:${trend.id}] "${shortTitle}"... `,
      );

      // Grok에게 다시 분석 요청
      const analysisResponse = await grokService.analyze(trend);
      const newScore = analysisResponse.score;

      // 새 결과 객체 생성
      const analysisResult: AnalysisResult = {
        aiModel: grokService.getModelName(),
        analyzedAt: new Date().toISOString(),
        score: newScore,
        reason: analysisResponse.reason,
        title_ko: analysisResponse.title_ko,
        oneLineSummary: analysisResponse.oneLineSummary,
        keyPoints: analysisResponse.keyPoints,
        tags: analysisResponse.tags,
      };

      // 점수가 0보다 커야만 살아남음
      const newStatus = newScore > 0 ? "ANALYZED" : "REJECTED";
      const diff = newScore - oldScore;
      const sign = diff >= 0 ? "+" : "";

      // 기존 히스토리에서 같은 모델 결과 교체 또는 추가
      const existingHistory = trend.analysis_results || [];
      const modelName = grokService.getModelName();
      const historyIdx = existingHistory.findIndex(
        (h: AnalysisResult) => h.aiModel === modelName,
      );

      if (historyIdx >= 0) {
        existingHistory[historyIdx] = analysisResult;
      } else {
        existingHistory.push(analysisResult);
      }

      // 대표 결과 선정 (점수 높은 순 → 최신 순)
      const sortedHistory = [...existingHistory].sort(
        (a: AnalysisResult, b: AnalysisResult) => {
          if (b.score !== a.score) return b.score - a.score;
          return (
            new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
          );
        },
      );
      const representResult = sortedHistory[0] || null;

      if (DRY_RUN) {
        // DRY-RUN: 실제 업데이트 스킵
        if (newStatus === "REJECTED") {
          console.log(`-> [DRY-RUN] 📉 강등 예정 (${oldScore} -> ${newScore})`);
          downgradedCount++;
          results.push({
            id: trend.id,
            title: shortTitle,
            oldScore,
            newScore,
            status: "DOWNGRADED",
          });
        } else {
          console.log(
            `-> [DRY-RUN] ✅ 유지 예정 (${oldScore} -> ${newScore} [${sign}${diff}])`,
          );
          keptCount++;
          results.push({
            id: trend.id,
            title: shortTitle,
            oldScore,
            newScore,
            status: "KEPT",
          });
        }
      } else {
        // 실제 DB 업데이트 (pipeline_service.ts 방식 - upsert with 필수 필드)
        const updateData = {
          ...trend, // 기존 데이터 유지 (link, source, category, date 등 필수 필드)
          id: trend.id,
          title: analysisResult.title_ko || trend.title, // 한글 제목으로 업데이트
          status: newStatus,
          analysis_results: existingHistory,
          represent_result: representResult,
        };

        const { error: updateError } = await supabase
          .from("trend")
          .upsert(updateData, { onConflict: "id" });

        if (updateError) {
          console.log(`-> ❌ 업데이트 실패: ${updateError.message}`);
          failCount++;
          results.push({
            id: trend.id,
            title: shortTitle,
            oldScore,
            newScore,
            status: "FAILED",
          });
        } else {
          if (newStatus === "REJECTED") {
            console.log(`-> 📉 강등 (${oldScore} -> ${newScore})`);
            downgradedCount++;
            results.push({
              id: trend.id,
              title: shortTitle,
              oldScore,
              newScore,
              status: "DOWNGRADED",
            });
          } else {
            console.log(
              `-> ✅ 유지 (${oldScore} -> ${newScore} [${sign}${diff}])`,
            );
            keptCount++;
            results.push({
              id: trend.id,
              title: shortTitle,
              oldScore,
              newScore,
              status: "KEPT",
            });
          }
        }
      }

      // 상세 로그 (verbose 모드)
      if (VERBOSE) {
        console.log(`     Reason: ${analysisResponse.reason}`);
        console.log(`     Tags: ${analysisResponse.tags.join(", ")}`);
      }

      // API Rate Limit 고려 (1초 대기 - 안전하게)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log(`-> ❌ 에러: ${errorMessage}`);
      failCount++;
      results.push({
        id: trend.id,
        title: trend.title?.substring(0, 40) || "Unknown",
        oldScore: trend.analysis_results?.[0]?.score ?? 0,
        newScore: -1,
        status: "FAILED",
      });
    }
  }

  // 3. 결과 요약 출력
  console.log("\n================================================");
  console.log(
    DRY_RUN
      ? "🎉 X 데이터 재심사 시뮬레이션 완료!"
      : "🎉 X 데이터 재심사 완료!",
  );
  console.log("================================================");
  console.log(`📉 REJECTED (탈락) : ${downgradedCount}건`);
  console.log(`✅ ANALYZED (생존) : ${keptCount}건`);
  console.log(`❌ Error           : ${failCount}건`);
  console.log("================================================");

  // 강등된 항목 상세 출력
  const downgraded = results.filter((r) => r.status === "DOWNGRADED");
  if (downgraded.length > 0) {
    console.log("\n📉 강등된 항목 목록:");
    console.log("─".repeat(60));
    downgraded.forEach((r) => {
      console.log(`  ID:${r.id} | ${r.oldScore} -> ${r.newScore} | ${r.title}`);
    });
  }

  // DRY-RUN 안내
  if (DRY_RUN) {
    console.log(
      "\n💡 실제 적용하려면 --dry-run 옵션을 제거하고 다시 실행하세요.",
    );
  }
};

// 실행
reevaluateXTrends().catch((err) => {
  console.error("❌ 스크립트 실행 중 치명적 에러:", err);
  process.exit(1);
});
