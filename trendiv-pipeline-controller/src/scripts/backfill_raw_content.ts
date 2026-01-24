import dotenv from "dotenv";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

import { ContentService } from "trendiv-analysis-module/src/services/content.service"; // 경로 확인 필요

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

console.log(`🔌 Loading .env from: ${envPath}`);
chromium.use(stealth());

const main = async () => {
  console.log("\n========================================");
  console.log("📝 [Backfill] Reddit & StackOverflow Content Start");
  console.log("========================================");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  // 브라우저 및 서비스 초기화
  const browser = await chromium.launch({ headless: true });
  const contentService = new ContentService(browser);

  let totalProcessed = 0;

  try {
    // 1️⃣ 대상 선정: Reddit/StackOverflow 이면서 content가 비어있는 RAW 데이터
    const { data: targets, error: fetchError } = await supabase
      .from("trend")
      .select("id, link, category, source, title")
      .eq("status", "RAW")
      .or("category.eq.Reddit,source.ilike.%stackoverflow%")
      .or("content.is.null,content.eq.''")
      .order("date", { ascending: false });

    if (fetchError) throw fetchError;

    if (!targets || targets.length === 0) {
      console.log("✅ 본문 수집이 필요한 데이터가 없습니다.");
    } else {
      console.log(`🎯 Found ${targets.length} items to backfill.`);

      for (const item of targets) {
        console.log(
          `\n🔍 [${item.category || item.source}] Fetching: ${item.title}`,
        );

        try {
          // fetchContent는 내부적으로 브라우저를 띄워 본문을 긁어옵니다.
          const result = await contentService.fetchContent(
            item.link,
            item.title,
          );

          // 결과 객체에서 content 텍스트만 추출
          const content = result?.content;

          if (content && content.length > 50) {
            const { error: updateError } = await supabase
              .from("trend")
              .update({ content: content })
              .eq("id", item.id);

            if (updateError) {
              console.error(
                `   ⚠️ 저장 실패 (ID: ${item.id}):`,
                updateError.message,
              );
            } else {
              console.log(`   ✅ 본문 저장 완료 (${content.length} 자)`);
              totalProcessed++;
            }
          } else {
            console.warn(`   ⚠️ 유효한 본문을 찾지 못함 (길이 부족)`);
          }
        } catch (e) {
          console.error(`   ❌ 수집 에러:`, e);
        }

        // 사이트 차단 방지를 위한 지연
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error("❌ 치명적 에러 발생:", error);
  } finally {
    await browser.close();
  }

  console.log("\n========================================");
  console.log(`✅ 작업 종료: 총 ${totalProcessed}개의 본문을 채웠습니다.`);
  process.exit(0);
};

main();
