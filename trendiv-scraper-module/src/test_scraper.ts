import { scrapeAll } from './index';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

// [디버깅] 경로와 키 확인
console.log(`🔑 .env 찾는 위치: ${envPath}`);
const key = process.env.GOOGLE_SEARCH_API_KEY;
console.log(
  `🔑 로드된 Key 확인: ${key ? '✅ 성공 (' + key.substring(0, 5) + '...)' : '❌ 실패 (NULL)'}`,
);

async function runTest() {
  console.log('🔍 [Test] 전체 스크래핑 테스트를 시작합니다...');

  // 1. 전체 수집 (최근 1일치)
  const allResults = await scrapeAll(1);

  console.log('\n============================================');
  console.log(`📊 총 수집된 데이터: ${allResults.length}개`);
  console.log('============================================\n');

  if (allResults.length === 0) {
    console.log('⚠️ 수집된 데이터가 하나도 없습니다.');
    console.log('   👉 .env 설정(API KEY 등)이나 타겟 URL을 확인해주세요.');
  } else {
    // 결과가 너무 많을 수 있으니 카테고리별로 몇 개씩만 보여주거나 전체 요약 출력
    const categories = [...new Set(allResults.map((r) => r.category))];
    console.log('📁 카테고리별 수집 현황:');
    categories.forEach((cat) => {
      const count = allResults.filter((r) => r.category === cat).length;
      console.log(`   - ${cat}: ${count}개`);
    });

    allResults.forEach((item, index) => {
      console.log(`[${index + 1}] [${item.category}] ${item.title}`);
      console.log(`    링크: ${item.link}`);
      console.log(item);
      console.log('--------------------------------------------');
    });
  }
}

runTest().catch(console.error);
