import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { YouTubeService } from "trendiv-analysis-module/src/services/youtube.service"; // 경로 확인 필요
// 만약 모듈 경로가 안 맞으면 상대 경로로 조정 (예: ../../../trendiv-analysis-module/...)
// 또는 아래에 YouTubeService 클래스 코드를 직접 붙여넣으셔도 됩니다.

const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL/KEY가 없습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const youtubeService = new YouTubeService();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillYoutubeContent() {
  console.log("🚀 [Backfill] 유튜브 자막 채우기 작업을 시작합니다...");

  // 1. 대상 조회: ANALYZED 상태이면서, content가 비어있고, 링크가 유튜브인 것
  // (OR 조건을 쓰기 까다로울 수 있으므로, 일단 NULL인 것만 가져와서 코드단에서 필터링 가능)
  const { data: targets, error } = await supabase
    .from("trend")
    .select("id, link, title, source")
    .eq("status", "ANALYZED")
    .is("content", null) // content가 비어있는 것
    .eq("category", "YouTube");

  if (error) {
    console.error("❌ DB 조회 실패:", error);
    return;
  }

  if (!targets || targets.length === 0) {
    console.log(
      "✅ 채울 내용이 없습니다 (모든 YouTube 데이터에 content가 있습니다)."
    );
    return;
  }

  console.log(`🎯 총 ${targets.length}개의 빈 YouTube 데이터를 발견했습니다.`);

  let successCount = 0;
  let failCount = 0;

  // 2. 하나씩 순회하며 자막 가져오기
  for (const [index, item] of targets.entries()) {
    console.log(
      `\n[${index + 1}/${targets.length}] Processing: ${item.title.substring(0, 30)}...`
    );

    try {
      // A. 자막 가져오기 시도
      const transcript = await youtubeService.fetchTranscript(item.link);

      if (transcript && transcript.length > 50) {
        // B. 성공 시 DB 업데이트
        const { error: updateError } = await supabase
          .from("trend")
          .update({ content: transcript }) // content 필드만 업데이트
          .eq("id", item.id);

        if (updateError) {
          console.error(`   ❌ DB Update Failed: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`   ✅ Saved (${transcript.length} chars)`);
          successCount++;
        }
      } else {
        console.log(`   ⚠️ 자막 없음/실패 (Skipping)`);
        failCount++;
      }
    } catch (e) {
      console.error(`   ❌ Error fetching transcript:`, e);
      failCount++;
    }

    // 🚨 중요: 유튜브 API 차단 방지를 위한 딜레이 (2~5초 권장)
    const randomDelay = Math.floor(Math.random() * 3000) + 2000;
    console.log(`   ⏳ Waiting ${randomDelay}ms...`);
    await delay(randomDelay);
  }

  console.log("\n========================================");
  console.log(
    `🎉 완료! 성공: ${successCount}, 실패(자막없음 등): ${failCount}`
  );
}

backfillYoutubeContent();
