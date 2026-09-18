type FeedbackBody = {
  name?: string;
  email?: string;
  message?: string;
};

export default async function handler(request: Request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await request.json() as FeedbackBody;
  const message = body.message?.trim();
  if (!message || message.length > 5000) return Response.json({ error: "A message is required." }, { status: 400 });
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return Response.json({ error: "Invalid email." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  if (!apiKey || !from) return Response.json({ error: "Email service is not configured." }, { status: 503 });

  const sender = body.name?.trim() || "Anonymous visitor";
  const replyTo = body.email?.trim();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: ["breviarysoundfaith@gmail.com"],
      reply_to: replyTo ? [replyTo] : undefined,
      subject: "Breviary feedback",
      text: `From: ${sender}${replyTo ? ` <${replyTo}>` : ""}\n\n${message}`,
    }),
  });
  if (!response.ok) return Response.json({ error: "Email provider rejected the message." }, { status: 502 });
  return Response.json({ ok: true });
}