import nodemailer from "nodemailer";

// 1. [수정] 발송 계정(Auth)과 수신 계정(To) 분리
// .env에 GMAIL_USER가 없으면 수신자 이메일을 발송자로 사용 (기존 호환성 유지)
const emailAuthUser =
  process.env.GMAIL_USER || process.env.TEST_EMAIL_RECIPIENT;
const emailPass = process.env.GMAIL_PASS;
const emailRecipient = process.env.TEST_EMAIL_RECIPIENT;
type PipelineStatus = "SUCCESS" | "FAILURE";

let transporter: nodemailer.Transporter | null = null;

if (emailAuthUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailAuthUser,
      pass: emailPass,
    },
  });
} else {
  console.warn("⚠️ 이메일 설정 누락 (GMAIL_USER/PASS)");
}

export async function sendEmailReport(status: PipelineStatus, details: any) {
  if (!transporter || !emailRecipient) {
    console.log("❌ 메일 전송 스킵: 설정 없음");
    return;
  }

  // 2. [수정] HTML 이스케이프 강화 (XSS 방지)
  const safeDetails = JSON.stringify(details, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const mailOptions = {
    from: `"Trendiv Bot" <${emailAuthUser}>`,
    to: emailRecipient,
    subject: `[Trendiv] 수집 결과 보고: ${status}`,
    html: `
      <h2>${status === "SUCCESS" ? "✅ 수집 성공" : "❌ 수집 실패"}</h2>
      <p>오늘의 트렌드 수집 작업 결과입니다.</p>
      <pre style="background:#f4f4f4; padding:10px; white-space: pre-wrap;">${safeDetails}</pre>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 이메일 발송 완료!");
  } catch (error) {
    console.error("❌ 이메일 발송 실패:", error);
  }
}
