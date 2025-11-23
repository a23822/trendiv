import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = 3000;

// 1. Supabase 클라이언트 초기화 (HTTPS 접속용)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ .env 파일에 SUPABASE_URL과 SUPABASE_KEY가 없습니다!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. 미들웨어 설정
app.use(cors());
app.use(express.json());

// 3. 기본 라우트
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Web Dev Trend AI Pipeline (HTTPS Mode) is Running!");
});

// 4. 구독자 등록 API
app.post("/api/subscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "유효한 이메일 주소를 입력해주세요." });
      return;
    }

    const { data, error } = await supabase
      .from("subscriber") // table 'subscriber'
      .insert([{ email: email }])
      .select();

    if (error) {
      // 이미 존재하는 이메일 등 DB 에러 처리
      if (error.code === "23505") {
        // Unique key violation code
        res.status(409).json({ error: "이미 구독 중인 이메일입니다." });
      } else {
        console.error("Supabase Error:", error);
        throw error;
      }
      return;
    }

    console.log(`🆕 새로운 개발자 구독: ${email}`);
    res.status(200).json({
      success: true,
      message: "성공적으로 구독되었습니다.",
      data: data,
    });
  } catch (error: any) {
    console.error("❌ 구독 저장 실패:", error);
    res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
  }
});

// 5. 서버 시작
app.listen(PORT, () => {
  console.log(`📡 Pipeline Controller running on http://localhost:${PORT}`);
});
