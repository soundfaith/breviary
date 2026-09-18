import { Resend } from "resend";

type FeedbackBody = {
  name?: string;
  email?: string;
  message?: string;
};

export default async function handler(request: Request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await request.json() as FeedbackBody;
    const message = body.message?.trim();
    if (!message || message.length > 5000) return Response.json({ error: "A message is required." }, { status: 400 });
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return Response.json({ error: "Invalid email." }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return Response.json({ error: "RESEND_API_KEY is not configured in Vercel." }, { status: 503 });

    const sender = body.name?.trim() || "Anonymous visitor";
    const replyTo = body.email?.trim();
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: process.env.FEEDBACK_FROM_EMAIL || "onboarding@resend.dev",
      to: ["breviarysoundfaith@gmail.com"],
      replyTo: replyTo ? [replyTo] : undefined,
      subject: "Breviary feedback",
      text: `From: ${sender}${replyTo ? ` <${replyTo}>` : ""}\n\n${message}`,
    });
    if (result.error) {
      console.error("Resend feedback error", result.error);
      return Response.json({ error: result.error.message || "Resend rejected the message." }, { status: 502 });
    }
    return Response.json({ ok: true, id: result.data?.id });
  } catch (error) {
    console.error("Feedback function error", error);
    return Response.json({ error: "Feedback service failed." }, { status: 500 });
  }
}