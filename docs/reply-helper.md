# Reply helper — one-time setup

The Send tab has a **Reply helper**. It needs a small server function (`api/reply.js`) that holds
your Claude key. The key never goes in the app or in GitHub.

## 1. Create a Claude (Anthropic) account and key
1. Go to **console.anthropic.com** and sign up.
2. Add a small amount of credit under **Billing** (pay as you go).
3. Open **API Keys → Create key**. Copy it once (it starts with `sk-ant-`). Do not paste it in chats or in code.

## 2. Add two settings in Vercel
Vercel → your project → **Settings → Environment Variables**. Add both for Production and Preview:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the key from step 1 |
| `APP_PASSCODE` | a passcode you invent (12+ characters). Only you know it. |

Optional: `CLAUDE_MODEL` (default `claude-opus-5-5`). Use `claude-sonnet-5-5` for a cheaper model.

## 3. Redeploy
Vercel → **Deployments** → latest → **⋯ → Redeploy**.

## 4. Use it
Open the app → **Send** tab → **Reply helper** → type the same passcode once → paste a parent's message → **Suggest reply**.

## Notes
- The parent's message, the student's first name and this week's lesson times are sent to the Claude API. Phone numbers are never sent.
- The helper only suggests. You press Send in WhatsApp. It cannot message anyone by itself.
- Anyone without the passcode gets an error, so strangers cannot use your key.
- Automatic replies directly inside WhatsApp need the WhatsApp Business API (Meta) — a later step.
