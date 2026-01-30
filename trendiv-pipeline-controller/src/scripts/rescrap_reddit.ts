import dotenv from "dotenv";
import path from "path";

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });
console.log(`🔌 Loading .env from: ${envPath}`);

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RedditScraper } from "trendiv-scraper-module/src/scrapers/RedditScraper";
import { ScraperConfig } from "trendiv-scraper-module/src/scrapers/interface";

// ============================================================
// CLI 옵션 파싱 (reanalyze_x_trends.ts 참고)
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
🧹 Reddit Content Refill Script (빈 content 채우기)

사용법:
  npx tsx src/scripts/rescrap_reddit.ts [옵션]

옵션:
  --dry-run     실제 DB 업데이트 없이 시뮬레이션만 실행
  --limit=N     처리할 최대 개수 지정 (테스트용)
  --verbose     상세 로그 출력
  --help, -h    이 도움말 출력

예시:
  npx tsx src/scripts/rescrap_reddit.ts --dry-run --limit=5   # 5개만 시뮬레이션
  npx tsx src/scripts/rescrap_reddit.ts --limit=20            # 20개 실제 업데이트
`);
  process.exit(0);
}

// 배치 설정 (analyze_x_trends.ts 참고)
const BATCH_SIZE = 10; // 한 번에 처리할 양 (API rate limit 고려)
const BATCH_DELAY_MS = 2000; // 배치 간 딜레이 (초 단위)

/**
 * 딜레이 유틸리티
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reddit 아이템 중 content가 빈 데이터를 API로 재수집해서 업데이트
 */
const refillRedditContent = async () => {
  console.log("\n" + "=".repeat(60));
  console.log("🧹 [Reddit] Empty Content Refill Start");
  console.log("=".repeat(60));
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`📦 배치 크기: ${BATCH_SIZE}개`);
  if (DRY_RUN) console.log(`🧪 DRY-RUN 모드: 실제 업데이트 안 함`);
  if (LIMIT) console.log(`🚫 처리 제한: 최대 ${LIMIT}개`);
  console.log("=".repeat(60) + "\n");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const redditClientId = process.env.REDDIT_CLIENT_ID;
  const redditClientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }
  if (!redditClientId || !redditClientSecret) {
    console.error("❌ Error: Reddit API Credentials (CLIENT_ID/SECRET) 누락.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
  const scraper = new RedditScraper();

  // 통계
  let totalFound = 0;
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let batchNumber = 0;

  try {
    let hasMore = true;
    let offset = 0;

    while (hasMore && (!LIMIT || totalProcessed < LIMIT)) {
      batchNumber++;
      console.log(`\n📦 [Batch ${batchNumber}] Fetching targets...`);

      // 빈 content 아이템 쿼리 (SQL 기반 – category Reddit, content NULL or '')
      const { data: targetItems, error: fetchError } = await supabase
        .from("trend")
        .select("*") // 모든 필드 가져오기
        .eq("category", "Reddit")
        .or("content.is.null,content.eq.") // NULL or 빈 문자열
        .range(offset, offset + BATCH_SIZE - 1)
        .order("id", { ascending: true });

      if (fetchError) throw fetchError;
      if (!targetItems || targetItems.length === 0) {
        hasMore = false;
        console.log("✅ 모든 빈 content 아이템 처리 완료.");
        break;
      }

      totalFound += targetItems.length;
      offset += BATCH_SIZE;

      let successInBatch = 0;
      let failedInBatch = 0;

      // 배치 처리
      const updates: any[] = []; // 전체 필드 업데이트용

      for (const item of targetItems) {
        try {
          console.log(
            `\n🔍 Processing ID: ${item.id} | Title: ${item.title?.substring(0, 30) || "Unknown"}...`,
          );

          // ScraperConfig 생성 (url에서 subreddit 추출 – permalink 기반)
          const urlParts = new URL(item.link);
          const subredditMatch = urlParts.pathname.match(/\/r\/([^/]+)/);
          const subreddit = subredditMatch ? subredditMatch[1] : "unknown";

          const config: ScraperConfig = {
            name: `Reddit Refill - ${subreddit}`,
            category: "Reddit",
            type: "reddit",
            url: item.link, // permalink 직접 사용
          };

          // scrape 호출 (포스트 단일? – scraper.scrape는 멀티지만, 단일 permalink로 호출 가정)
          const results = await scraper.scrape(config);
          if (!results || results.length === 0) {
            console.warn(`  ⚠️ No data fetched for ${item.link}`);
            failedInBatch++;
            continue;
          }

          // 첫 번째 결과의 content (selftext) 사용
          const newContent = results[0].content || "";
          if (VERBOSE) {
            console.log(
              `  📝 Fetched content (snippet): ${newContent.substring(0, 100)}...`,
            );
          }

          if (newContent.length < 50) {
            // 너무 짧으면 스킵 (MIN_CONTENT_LENGTH 참고)
            console.warn(
              `  ⚠️ Content too short (${newContent.length} chars) - Skipping.`,
            );
            failedInBatch++;
            continue;
          }

          // 전체 기존 데이터 복사 + content만 업데이트 (필수 필드 유지)
          const updateData = {
            ...item, // 모든 기존 필드 복사
            content: newContent,
          };

          updates.push(updateData);

          successInBatch++;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Error for ID ${item.id}: ${msg}`);
          failedInBatch++;
        }
      }

      totalProcessed += targetItems.length;
      totalSuccess += successInBatch;
      totalFailed += failedInBatch;

      // DB 업데이트 (bulk upsert)
      if (!DRY_RUN && updates.length > 0) {
        const { error: updateError } = await supabase
          .from("trend")
          .upsert(updates, { onConflict: "id" });

        if (updateError) {
          console.error(
            `  ❌ Batch ${batchNumber} DB update failed: ${updateError.message}`,
          );
        } else {
          console.log(
            `  ✅ Batch ${batchNumber} saved: ${updates.length} items updated.`,
          );
        }
      } else if (DRY_RUN) {
        console.log(`  🧪 [DRY-RUN] Would update ${updates.length} items.`);
      }

      console.log("\n📈 배치 요약:");
      console.log(`   - 처리: ${targetItems.length}개`);
      console.log(`   - 성공: ${successInBatch}개`);
      console.log(`   - 실패: ${failedInBatch}개`);

      // 다음 배치 전 딜레이
      if (targetItems.length === BATCH_SIZE) {
        console.log(`\n⏳ 다음 배치까지 ${BATCH_DELAY_MS / 1000}초 대기...`);
        await delay(BATCH_DELAY_MS);
      } else {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error("\n❌ 치명적 에러 발생:", error);
    process.exit(1);
  }

  // 최종 리포트
  console.log("\n" + "=".repeat(60));
  console.log("📊 [최종 리포트]");
  console.log("=".repeat(60));
  console.log(`⏰ 종료 시간: ${new Date().toLocaleString("ko-KR")}`);
  console.log(`📦 총 배치 수: ${batchNumber}개`);
  console.log(`🎯 발견된 총 데이터: ${totalFound}개`);
  console.log(`✅ 처리 완료: ${totalProcessed}개`);
  console.log(`   - 성공: ${totalSuccess}개`);
  console.log(`   - 실패: ${totalFailed}개`);
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log(
      "\n💡 실제 적용하려면 --dry-run 옵션을 제거하고 다시 실행하세요.",
    );
  }

  process.exit(0);
};

// 실행
refillRedditContent();
