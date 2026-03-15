import nodemailer from "nodemailer";
import { APP_CONFIG } from "@/config";

// Gmail SMTP via App Password
function getTransporter() {
  return nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   587,
    secure: false,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? "noreply@quiznex.com";

export async function sendVerificationEmail(
  to: string,
  otp: string
): Promise<void> {
  await getTransporter().sendMail({
    from:    `"QuizNex" <${FROM}>`,
    to,
    subject: `${otp} is your QuizNex verification code`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#05050f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px;">⚡ QuizNex</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 8px;">Verify your email</h2>
          <p style="color:#94a3b8;margin:0 0 28px;font-size:14px;">
            Enter this 6-digit code to activate your account. It expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
          </p>
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#60a5fa;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#475569;font-size:12px;margin:0;">
            If you didn't create a QuizNex account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const url = `${APP_CONFIG.url}/reset-password?token=${token}`;
  await getTransporter().sendMail({
    from:    `"QuizNex" <${FROM}>`,
    to,
    subject: "Reset your QuizNex password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#05050f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:-0.5px;">⚡ QuizNex</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 8px;">Reset your password</h2>
          <p style="color:#94a3b8;margin:0 0 28px;font-size:14px;">
            Click the button below to reset your password. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.
          </p>
          <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
            Reset Password
          </a>
          <p style="color:#475569;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendClassroomInviteEmail(
  to: string,
  classroomName: string,
  teacherName: string,
  joinKey: string,
  token: string
): Promise<void> {
  const url = `${APP_CONFIG.url}/api/invitations/${token}`;
  await getTransporter().sendMail({
    from:    `"QuizNex" <${FROM}>`,
    to,
    subject: `You've been invited to join "${classroomName}" on QuizNex`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2>Classroom Invitation</h2>
        <p><strong>${teacherName}</strong> has invited you to join the classroom <strong>${classroomName}</strong> on QuizNex.</p>
        <p>Your join key: <strong style="font-size:1.2em;letter-spacing:2px;">${joinKey}</strong></p>
        <a href="${url}" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Accept Invitation
        </a>
        <p>This invitation expires in ${APP_CONFIG.invitationExpiryDays} days.</p>
      </div>
    `,
  });
}
