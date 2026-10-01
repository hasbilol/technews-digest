# 📰 Daily Tech Pulse

**An automated AI tech-news digest that lands in your inbox every morning at 8 AM — built on n8n + Google Gemini, running on AWS free tier. Total cost: $0/day.**

Every day it scans top tech RSS feeds, lets Gemini pick and summarize the 3–4 most important stories, and emails you a clean, mobile-friendly HTML briefing:

> **Daily Tech Pulse | Executive AI & Tech Briefing**
> *Today's Trend Line* — one-paragraph market overview
> *Top Developments* — headline, 2-sentence breakdown, source link per story

## How it works

```
08:00 MYT ──▶ ┌──────────────────────────── n8n ────────────────────────────┐
              │ RSS: Hacker News / ArXiv cs.AI / TechCrunch AI              │
              │        └──▶ Merge ──▶ Clean & Dedupe (top 10, compact JSON) │
              │                        └──▶ Gemini (flash-lite, strict JSON)│
              │                               └──▶ Parse (fallback: RSS)    │
              │                                      └──▶ Build HTML email  │
              │                                             └──▶ SMTP ──────┼──▶ 📬 inbox
              └─────────────────────────────────────────────────────────────┘
```

- **LLM**: Google Gemini free tier (`gemini-3.5-flash-lite`), strict-JSON output with retry + RSS fallback, so a bad LLM day never skips the email
- **Delivery**: Gmail SMTP with an App Password (STARTTLS, port 587)
- **Hosting**: Dockerized n8n on an AWS EC2 t2.micro (free tier)
- **Scheduling**: cron `0 8 * * *`, timezone `Asia/Kuala_Lumpur`

## Repository contents

| File | Purpose |
|---|---|
| [`daily-tech-pulse.workflow.json`](daily-tech-pulse.workflow.json) | The complete n8n workflow — import it directly into your n8n |
| [`code/01-clean-aggregate.js`](code/01-clean-aggregate.js) | RSS cleaning: HTML strip, title/URL dedupe, recency sort |
| [`code/02-parse-ai-output.js`](code/02-parse-ai-output.js) | Tolerant JSON extraction from LLM output + normalization |
| [`code/03-build-html-email.js`](code/03-build-html-email.js) | Responsive HTML newsletter template |
| [`docker-compose.yml`](docker-compose.yml) | One-file n8n deployment |
| [`SETUP.md`](SETUP.md) | **Full step-by-step setup guide** + troubleshooting table |

## Quick start

1. **Run n8n** (or use [n8n.cloud](https://n8n.io/cloud/)):
   ```bash
   docker compose up -d
   ```
2. **Import the workflow**: n8n → *Workflows* → *Import from file* → `daily-tech-pulse.workflow.json`
3. **Attach two credentials** (the JSON ships with placeholders):
   - **Google Gemini** — paste a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
   - **SMTP** — your email + an [App Password](https://support.google.com/accounts/answer/185833), port 587, `secure: off`, leave *hostName* empty
4. **Activate** the workflow — then **deactivate & re-activate after any edit** (n8n pins the timer to the version active at activation time)

For feed lists, model choices, timezone, and every gotcha we hit, see **[SETUP.md](SETUP.md)**.

## Why it's resilient

| Failure | What happens |
|---|---|
| One RSS feed down | `OnError: Continue` — other feeds still run |
| Gemini 503 / quota | Node retries ×6 with backoff |
| LLM returns non-JSON | Parser extracts what it can, falls back to raw RSS items |
| All else fails | Email still goes out — with a note, never silently skipped |

## Cost

| Item | Cost |
|---|---|
| n8n (self-hosted) | free |
| Gemini free tier | free |
| Gmail App Password SMTP | free |
| RSS feeds | free |
| **Total** | **$0** |

*(+ ~$0 if you're on an AWS free-tier/hobby box like we are)*

## Gotchas we learned the hard way

Short version — the long version lives in [SETUP.md](SETUP.md)'s troubleshooting table:

- n8n expressions must **start with `=`** — bare `{{ $json.payload }}` is sent to the LLM literally
- Chain system prompts go in **Chat Messages → Type: System**, not *Options → System Message* (silently ignored)
- Code nodes use **Luxon**: `$now.toFormat('dd LLL yyyy')`, not `.format()`
- After editing an active workflow: **deactivate → re-activate** so the schedule picks up the new version
- Don't rely on `new URL()` in Code nodes — use regex parsing

---

*Built with n8n, Google Gemini, and far too many execution logs.* 🛠️
