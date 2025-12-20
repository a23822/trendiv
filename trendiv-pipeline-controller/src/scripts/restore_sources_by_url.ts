import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// 🛠️ URL 패턴 매핑 규칙 정의 (targets.ts 기반)
const SOURCE_RULES = [
  // 1. Official Frameworks & Web
  { keyword: "react.dev", source: "React Blog" },
  { keyword: "vercel.com", source: "Vercel Blog" },
  { keyword: "developer.mozilla.org", source: "MDN Web Docs Blog" },
  { keyword: "css-tricks.com", source: "CSS-Tricks" },
  { keyword: "smashingmagazine.com", source: "Smashing Magazine" },

  // 2. iOS & Swift
  { keyword: "developer.apple.com", source: "Apple Developer News" },
  { keyword: "iosdevweekly.com", source: "iOS Dev Weekly" },
  { keyword: "swift.org", source: "Swift.org" },
  { keyword: "stackoverflow.com", source: "StackOverflow (iOS/Swift)" },

  // 3. Android & Kotlin
  {
    keyword: "android-developers.googleblog.com",
    source: "Android Developers Blog",
  },
  {
    keyword: "blog.google/products/android",
    source: "Android Developers Blog",
  },
  { keyword: "androidweekly.net", source: "Android Weekly" },
  { keyword: "blog.jetbrains.com/kotlin", source: "Kotlin Blog" },
  { keyword: "reddit.com", source: "Reddit r/androiddev" },
  { keyword: "xda-developers.com", source: "XDA Developers" },
];

const runRestore = async () => {
  console.log("🚑 [Restore] URL 기반 Source 복구 시작...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ Supabase 환경 변수가 없습니다.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 복구 대상 가져오기 (source가 잘못된 것들만)
  const { data: targets, error } = await supabase
    .from("trend")
    .select("id, link, title, source")
    .in("source", ["AI_Analysis", "scraped", "Unknown Source"]);

  if (error) throw error;
  if (!targets || targets.length === 0) {
    console.log("✨ 복구할 대상이 없습니다. (모두 정상)");
    return;
  }

  console.log(
    `🔍 총 ${targets.length}개의 'scraped/AI_Analysis' 항목을 검사합니다.`
  );

  let updatedCount = 0;
  let skippedCount = 0;

  // 2. 하나씩 검사해서 업데이트
  for (const item of targets) {
    let matchedSource = null;

    // URL 검사
    for (const rule of SOURCE_RULES) {
      if (item.link.includes(rule.keyword)) {
        matchedSource = rule.source;
        break;
      }
    }

    // 매칭된 게 있다면 DB 업데이트
    if (matchedSource && matchedSource !== item.source) {
      const { error: updateError } = await supabase
        .from("trend")
        .update({ source: matchedSource })
        .eq("id", item.id);

      if (updateError) {
        console.error(`❌ 실패 [ID:${item.id}]: ${updateError.message}`);
      } else {
        console.log(
          `✅ 복구됨: ${matchedSource} -> ${item.title.substring(0, 30)}...`
        );
        updatedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log("------------------------------------------------");
  console.log(`🎉 작업 완료!`);
  console.log(`   - 복구 성공: ${updatedCount}건`);
  console.log(`   - 복구 불가(패턴 미일치): ${skippedCount}건`);
};

runRestore();
