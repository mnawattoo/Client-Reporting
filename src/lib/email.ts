import { Resend } from "resend";

// RESEND_API_KEY is optional in dev — if it's not set, we log instead of
// sending so the monthly sync job still completes without an email provider.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Reportly <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}
