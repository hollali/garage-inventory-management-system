import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const appName = process.env.APP_NAME ?? "Garage Inventory";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = Number(process.env.SMTP_PORT ?? (smtpHost ? 587 : 0));
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const smtpSecure = process.env.SMTP_SECURE === "true";
const fromAddress =
  process.env.SMTP_FROM ?? `Garage Inventory <no-reply@localhost>`;

const isConfigured = Boolean(smtpHost);

export function isEmailConfigured() {
  return isConfigured;
}

export function logDevEmail(message: string) {
  console.info(`\n[${appName}] ${message}\n(Configure SMTP_HOST/SMTP_USER to send real emails.)\n`);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost!,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    });
  }
  return transporter;
}

type SendOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(
  { to, subject, html, text }: SendOptions,
  devLog: string,
): Promise<{ sent: boolean }> {
  const mailer = getTransporter();

  if (!mailer) {
    logDevEmail(devLog);
    return { sent: false };
  }

  try {
    await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
    return { sent: true };
  } catch (error) {
    console.error("Failed to send email", error);
    return { sent: false };
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const devLog = `Password reset requested for ${to}\nReset link: ${resetLink}`;
  await sendEmail(
    {
      to,
      subject: `Reset your ${appName} password`,
      html: `
        <p>Hi,</p>
        <p>We received a request to reset your ${appName} password.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `,
      text: `We received a request to reset your ${appName} password.\n\nOpen this link to reset it (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    },
    devLog,
  );
}

export { appName, appUrl };
