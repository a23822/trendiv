import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { scrapeAll } from "trendiv-scraper-module"; // 스크래퍼 모듈 재사용

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const fixSources = async () => {
  console.log("🛠️  기존 데이터 Source 필드 복구 시작...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ Supabase 환경 변수가 없습니다.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 현재 RSS 피드에서 최신 데이터 다시 수집 (올바른 source가 들어있음)
  // fetchDays를 넉넉하게 30일 정도로 잡습니다.
  console.log("1. 📡 최신 RSS 데이터 수집 중...");
  const freshData = await scrapeAll(365);
  console.log(`   -> 총 ${freshData.length}개의 최신 항목을 찾았습니다.`);

  let updatedCount = 0;

  // 2. DB에 있는 항목과 매칭하여 업데이트
  for (const item of freshData) {
    // source가 없는 경우 방지
    const correctSource = item.source || "Unknown";

    const { data, error } = await supabase
      .from("trend")
      .update({ source: correctSource })
      .eq("link", item.link)
      .select(); // ✅ 인자를 모두 비워서 '업데이트된 행 정보'를 가져옵니다.

    if (error) {
      console.error(`❌ 업데이트 실패 (${item.title}):`, error.message);
    }
    // 2. data 배열의 길이로 성공 여부를 판단합니다.
    else if (data && data.length > 0) {
      // console.log(`✅ 수정됨: [${correctSource}] ${item.title}`);
      updatedCount++;
    }
  }

  console.log("------------------------------------------------");
  console.log(
    `🎉 복구 완료! 총 ${updatedCount}개의 게시물 출처를 수정했습니다.`
  );
};

// 실행
fixSources();
