import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// 환경 변수 로드
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ----------------------------------------------------------------------
// 1. 마이그레이션 규칙 정의 (우선순위: URL 매칭 -> 기존 Source 매칭)
// ----------------------------------------------------------------------

// A. URL로 확실하게 식별 가능한 공식 블로그 & 사이트
const URL_RULES = [
  // 1. Social
  { keyword: "x.com", source: "X (Twitter)", category: "X" },
  { keyword: "twitter.com", source: "X (Twitter)", category: "X" },

  // 2. Official Blogs (각각의 이름이 곧 Category)
  { keyword: "react.dev", source: "React Blog", category: "React Blog" },
  { keyword: "vercel.com", source: "Vercel Blog", category: "Vercel Blog" },
  {
    keyword: "developer.mozilla.org",
    source: "MDN Web Docs",
    category: "MDN Web Docs",
  },
  { keyword: "css-tricks.com", source: "CSS-Tricks", category: "CSS-Tricks" },
  {
    keyword: "smashingmagazine.com",
    source: "Smashing Magazine",
    category: "Smashing Magazine",
  },
  {
    keyword: "developer.apple.com",
    source: "Apple Developer",
    category: "Apple Developer",
  },
  {
    keyword: "iosdevweekly.com",
    source: "iOS Dev Weekly",
    category: "iOS Dev Weekly",
  },
  { keyword: "swift.org", source: "Swift.org", category: "Swift.org" },
  {
    keyword: "android-developers.googleblog.com",
    source: "Android Developers",
    category: "Android Developers",
  },
  {
    keyword: "blog.google/products/android",
    source: "Android Developers",
    category: "Android Developers",
  }, // 구글 블로그 패턴
  {
    keyword: "androidweekly.net",
    source: "Android Weekly",
    category: "Android Weekly",
  },
  {
    keyword: "blog.jetbrains.com/kotlin",
    source: "Kotlin Blog",
    category: "Kotlin Blog",
  },
  {
    keyword: "xda-developers.com",
    source: "XDA Developers",
    category: "XDA Developers",
  },

  // 3. YouTube (영상 링크인 경우)
  {
    keyword: "youtube.com/watch",
    source: "YouTube Channel",
    category: "YouTube",
  },
  { keyword: "youtu.be", source: "YouTube Channel", category: "YouTube" },
];

// B. URL로는 알 수 없지만, 기존 Source에 힌트가 있는 경우 (Aggregators)
const SOURCE_KEYWORD_RULES = [
  // Reddit 계열 통합
  { keyword: "Reddit", newSource: "Reddit", newCategory: "Reddit" },
  { keyword: "androiddev", newSource: "Reddit", newCategory: "Reddit" }, // "Reddit r/androiddev" 대응

  // StackOverflow 계열 통합
  {
    keyword: "StackOverflow",
    newSource: "StackOverflow",
    newCategory: "StackOverflow",
  },
  {
    keyword: "Stack Exchange",
    newSource: "StackOverflow",
    newCategory: "StackOverflow",
  },

  // Hacker News 계열 통합
  {
    keyword: "Hacker News",
    newSource: "Hacker News",
    newCategory: "Hacker News",
  },

  // YouTube 채널명 보정 (기존에 수집된 이름이 있다면 Category만 붙여줌)
  {
    keyword: "Kevin Powell",
    newSource: "Kevin Powell",
    newCategory: "YouTube",
  },
  {
    keyword: "Google Chrome Developers",
    newSource: "Google Chrome Developers",
    newCategory: "YouTube",
  },
  { keyword: "Hyperplexed", newSource: "Hyperplexed", newCategory: "YouTube" },
  {
    keyword: "Deque Systems",
    newSource: "Deque Systems",
    newCategory: "YouTube",
  },
  { keyword: "TPGi", newSource: "TPGi", newCategory: "YouTube" },
];

// ----------------------------------------------------------------------
// 2. 실행 로직
// ----------------------------------------------------------------------
const runMigration = async () => {
  console.log("🚀 [Migration] 데이터 Source & Category 일괄 정리 시작...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("❌ Supabase 환경 변수가 없습니다.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. 모든 데이터 가져오기 (양이 많으면 pagination 필요하지만, 일단 전체 로드 가정)
  const { data: allItems, error } = await supabase
    .from("trend")
    .select("id, link, source, category, title");

  if (error) throw error;
  if (!allItems || allItems.length === 0) {
    console.log("🤷 데이터가 없습니다.");
    return;
  }

  console.log(`📊 총 ${allItems.length}개의 데이터를 검사합니다.`);

  let updatedCount = 0;

  for (const item of allItems) {
    let newSource = item.source;
    let newCategory = item.category;
    let matched = false;

    // -------------------------------------------------
    // 전략 1: URL 패턴 매칭 (가장 강력함)
    // -------------------------------------------------
    for (const rule of URL_RULES) {
      if (item.link && item.link.includes(rule.keyword)) {
        newSource = rule.source;
        newCategory = rule.category;
        matched = true;
        // YouTube의 경우, 만약 기존 Source가 채널명(예: Kevin Powell)으로 잘 되어 있다면 굳이 "YouTube Channel"로 덮어쓰지 않음
        if (
          rule.category === "YouTube" &&
          item.source &&
          item.source !== "scraped" &&
          item.source !== "Unknown Source"
        ) {
          newSource = item.source;
        }
        break;
      }
    }

    // -------------------------------------------------
    // 전략 2: 기존 Source 텍스트 분석 (URL 매칭 실패 시)
    // -------------------------------------------------
    if (!matched && item.source) {
      for (const rule of SOURCE_KEYWORD_RULES) {
        if (item.source.toLowerCase().includes(rule.keyword.toLowerCase())) {
          newSource = rule.newSource;
          newCategory = rule.newCategory;
          matched = true;
          break;
        }
      }
    }

    // 변경사항이 있으면 업데이트
    if (newSource !== item.source || newCategory !== item.category) {
      // category가 null인 경우도 포함해서 업데이트해야 함

      const { error: updateError } = await supabase
        .from("trend")
        .update({
          source: newSource,
          category: newCategory,
        })
        .eq("id", item.id);

      if (updateError) {
        console.error(`❌ 업데이트 실패 [ID:${item.id}]:`, updateError.message);
      } else {
        // console.log(`✅ 수정됨: ${item.source} -> [${newCategory}] ${newSource}`);
        updatedCount++;
      }
    }
  }

  console.log("------------------------------------------------");
  console.log(`🎉 마이그레이션 완료!`);
  console.log(`   - 총 검사: ${allItems.length}건`);
  console.log(`   - 업데이트됨: ${updatedCount}건`);
};

runMigration();
