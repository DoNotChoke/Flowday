type Mail = { to: string; subject: string; text: string };

export async function sendMail({ to, subject, text }: Mail) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // FLOWDAY_DEV_MAIL is for CI, which tests a production build with no mail account.
    if (process.env.NODE_ENV === "production" && process.env.FLOWDAY_DEV_MAIL !== "1") {
      throw new Error("RESEND_API_KEY is not set.");
    }
    console.log(`Mail to ${to}: ${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Flowday <onboarding@resend.dev>", to, subject, text }),
  });
  if (!response.ok) throw new Error(`Resend rejected the mail with status ${response.status}.`);
}
