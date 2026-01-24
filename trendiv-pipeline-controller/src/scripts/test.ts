import { StackOverflowScraper } from "trendiv-scraper-module/src/scrapers/StackOverflowScraper";
import { ScraperConfig } from "trendiv-scraper-module/src/scrapers/interface";

async function testStackOverflow() {
  const scraper = new StackOverflowScraper();

  const testConfig: ScraperConfig = {
    name: "StackOverflow Test",
    category: "StackOverflow",
    type: "stackoverflow",
    url: "css;html",
  };

  console.log("🚀 StackOverflow API 본문 수집 테스트 시작...");

  try {
    const results = await scraper.scrape(testConfig);
    if (results.length === 0) {
      console.log("⚠️ 수집된 데이터가 없습니다.");
      return;
    }

    const firstItem = results[0];
    console.log("\n----------------------------------------");
    console.log(`📌 제목: ${firstItem.title}`);
    console.log(
      `📝 본문 (앞 200자): ${firstItem.content?.substring(0, 200)}...`,
    );
    console.log("----------------------------------------\n");

    if (firstItem.content) {
      console.log(
        `✅ 성공: ${results.length}개의 데이터를 가져왔으며 본문이 포함되어 있습니다.`,
      );
    }
  } catch (error) {
    console.error("❌ 테스트 중 에러 발생:", error);
  }
}

testStackOverflow();
