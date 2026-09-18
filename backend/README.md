# Backend boundary

Feedback email uses the Vercel serverless function at `/api/feedback`.

Configure these Vercel environment variables before deploying:

- `RESEND_API_KEY`: API key from Resend.
- `FEEDBACK_FROM_EMAIL`: a verified sender such as `Breviary <feedback@your-domain.com>`. For a first Resend test, omit it to use `onboarding@resend.dev`.

The function sends feedback to `breviarysoundfaith@gmail.com` and uses the visitor email as `reply_to` when provided. Resend may restrict `onboarding@resend.dev` to the email address associated with your Resend account; to send to the Gmail destination reliably, verify a domain in Resend and set `FEEDBACK_FROM_EMAIL` to that domain. Without `RESEND_API_KEY`, the form returns a configuration error and does not expose credentials in the browser.