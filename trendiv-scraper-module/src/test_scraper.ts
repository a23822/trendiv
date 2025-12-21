import { scrapeAll } from './index';

async function runTest() {
  console.log('🔍 [Test] 스크래핑 테스트를 시작합니다...');

  // 1. 전체 수집 (최근 1일치)
  const allResults = await scrapeAll(1);

  // 2. 🧹 필터링: 링크에 'x.com' 또는 'twitter.com'이 있는 것만 남김
  const xResults = allResults.filter(
    (item) =>
      (item.link && item.link.includes('x.com')) ||
      (item.link && item.link.includes('twitter.com')),
  );

  console.log('\n============================================');
  console.log(
    `📊 전체 ${allResults.length}개 중 X(Twitter) 결과: ${xResults.length}개`,
  );
  console.log('============================================\n');

  if (xResults.length === 0) {
    console.log('⚠️ 검색된 X 데이터가 없습니다.');
    console.log(
      "   👉 targets.ts에 'site:x.com ...' 설정이 추가되었는지 확인해 주세요.",
    );
  } else {
    xResults.forEach((item, index) => {
      console.log(`[${index + 1}] [${item.category}] ${item.source}`);
      console.log(`    제목: ${item.title}`);
      console.log(`    링크: ${item.link}`);
      console.log(`    날짜: ${item.date}`);
      console.log('--------------------------------------------');
    });
  }
}

runTest().catch(console.error);
