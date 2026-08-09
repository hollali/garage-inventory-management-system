import "server-only";

const appName = process.env.APP_NAME ?? "Garage Inventory";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Garage Inventory <onboarding@resend.dev>",
      to,
      subject: `Reset your ${appName} password`,
      html: `
        <p>Hi,</p>
        <p>We received a request to reset your ${appName} password.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `,
    });
    if (res.error) {
      console.error("Failed to send password reset email", res.error);
    }
    return;
  }

  console.info(
    `\n[${appName}] Password reset requested for ${to}\nReset link: ${resetLink}\n(Set RESEND_API_KEY to send real emails.)\n`,
  );
}

export { appName, appUrl };
