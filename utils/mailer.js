import nodemailer from 'nodemailer';
import crypto from 'crypto';

export function generateOtp6() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

export async function sendResetEmail(toEmail, code) {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || 2525);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM = process.env.SMTP_FROM;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error(
      `Missing SMTP env: host=${SMTP_HOST || 'missing'}, user=${SMTP_USER ? 'set' : 'missing'}, pass=${SMTP_PASS ? 'set' : 'missing'}, from=${SMTP_FROM || 'missing'}`
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `Your Password Reset Code: ${code}`,
    text: `Your password reset code is: ${code}\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:10px;">
        <h2>Your password reset code</h2>
        <p>Use the code below to reset your password. This code expires in 10 minutes.</p>
        <div style="font-size:24px;font-weight:bold;letter-spacing:2px;background:#f3f4f6;display:inline-block;padding:10px 14px;border-radius:6px;">
          ${code}
        </div>
      </div>
    `
  });

  console.log('✅ Email sent:', info.messageId);
  console.log('Accepted:', info.accepted);
  console.log('Rejected:', info.rejected);

  return info;
}