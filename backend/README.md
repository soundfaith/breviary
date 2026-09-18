# Backend boundary

Feedback email uses the Vercel serverless function at `/api/feedback`.

Configure these Vercel environment variables before deploying:

- `RESEND_API_KEY`: API key from Resend.
- `FEEDBACK_FROM_EMAIL`: a verified sender such as `Breviary <feedback@your-domain.com>`.

The function sends feedback to `breviarysoundfaith@gmail.com` and uses the visitor email as `reply_to` when provided. Without these variables, the form returns a configuration error and does not expose credentials in the browser.