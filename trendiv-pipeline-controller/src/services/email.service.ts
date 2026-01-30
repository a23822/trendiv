import nodemailer from "nodemailer";

// 1. [수정] 발송 계정(Auth)과 수신 계정(To) 분리
const emailAuthUser =
  process.env.GMAIL_USER || process.env.TEST_EMAIL_RECIPIENT;
const emailPass = process.env.GMAIL_PASS;
const emailRecipient = process.env.TEST_EMAIL_RECIPIENT;

type PipelineStatus = "SUCCESS" | "FAILURE" | "RETRY_SUCCESS";

// ✅ 타입 개선: any 대신 Record 사용
type PipelineDetails = Record<string, unknown>;

let transporter: nodemailer.Transporter | null = null;

if (emailAuthUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailAuthUser,
      pass: emailPass,
    },
    // ✅ 타임아웃 설정 추가 (네트워크 지연 방지)
    connectionTimeout: 10000, // 10초
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
} else {
  console.warn("⚠️ 이메일 설정 누락 (GMAIL_USER/PASS)");
}

// ✅ 안전한 JSON 직렬화 (순환 참조 방지)
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]";
          }
          seen.add(value);
        }
        // Error 객체 처리
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        return value;
      },
      2,
    );
  } catch (e) {
    return `[Serialization Failed: ${String(e)}]`;
  }
}

export async function sendEmailReport(
  status: PipelineStatus,
  details: PipelineDetails,
) {
  if (!transporter || !emailRecipient) {
    console.log("❌ 메일 전송 스킵: 설정 없음");
    return;
  }

  // ✅ 안전한 직렬화 사용 + HTML 이스케이프
  const safeDetails = safeStringify(details)
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
