import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as path from "path";

// 환경 변수 로드 (이 파일이 독립적으로 쓰일 때를 대비)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// 🟡 [Nodemailer 최적화] Transporter를 전역에서 한 번만 생성 (재사용)
const emailUser = process.env.TEST_EMAIL_RECIPIENT;
const emailPass = process.env.GMAIL_PASS;

let transporter: nodemailer.Transporter | null = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
} else {
  console.warn("⚠️ 이메일 설정이 없어 메일 기능을 사용할 수 없습니다.");
}

export async function sendEmailReport(status: string, details: any) {
  if (!transporter || !emailUser) {
    console.log("❌ 메일 전송 실패: 설정 누락");
    return;
  }

  const mailOptions = {
    from: `"Trendiv Bot" <${emailUser}>`,
    to: emailUser,
    subject: `[Trendiv] 수집 결과 보고: ${status}`,
    html: `
      <h2>${status === "SUCCESS" ? "✅ 수집 성공" : "❌ 수집 실패"}</h2>
      <p>오늘의 트렌드 수집 작업 결과입니다.</p>
      <pre style="background:#f4f4f4; padding:10px; white-space: pre-wrap;">${JSON.stringify(
        details,
        null,
        2
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 이메일 발송 완료!");
  } catch (error) {
    console.error("❌ 이메일 발송 실패:", error);
  }
}
