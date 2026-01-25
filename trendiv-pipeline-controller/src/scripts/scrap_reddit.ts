import dotenv from "dotenv";
import path from "path";
import { RedditScraper } from "trendiv-scraper-module/src/scrapers/RedditScraper";
import { ScraperConfig } from "trendiv-scraper-module/src/scrapers/interface";

// 1. .env 로드 (루트 경로 기준)
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

async function testReddit() {
  console.log("🧪 Reddit API 수집 테스트 시작...");
  console.log("------------------------------------");
  console.log(
    "CLIENT_ID:",
    process.env.REDDIT_CLIENT_ID ? "✅ 설정됨" : "❌ 누락",
  );
  console.log(
    "CLIENT_SECRET:",
    process.env.REDDIT_CLIENT_SECRET ? "✅ 설정됨" : "❌ 누락",
  );
  console.log("------------------------------------");

  const scraper = new RedditScraper();

  // 테스트용 타겟 설정
  const testTarget: ScraperConfig = {
    name: "Reddit Test (Web Markup)",
    category: "Test",
    type: "reddit",
    // 실제 사용하실 멀티레딧 URL
    url: "https://www.reddit.com/r/css+html+accessibility+a11y+web_design/hot",
  };

  try {
    const results = await scraper.scrape(testTarget);

    if (results.length > 0) {
      console.log(
        `✅ 수집 성공! 총 ${results.length}개의 포스트를 가져왔습니다.\n`,
      );

      results.forEach((item, index) => {
        console.log(`[${index + 1}] ${item.title}`);
        console.log(`🔗 링크: ${item.link}`);
        console.log(`📅 날짜: ${item.date}`);
        console.log(`📝 본문 요약: ${item.content?.substring(0, 100)}...`);
        console.log("------------------------------------");
      });
    } else {
      console.log("⚠️ 수집된 결과가 없습니다. API 설정을 다시 확인해주세요.");
    }
  } catch (error) {
    console.error("❌ 테스트 중 치명적 오류 발생:", error);
  }
}

testReddit();
