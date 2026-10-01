# Daily Tech Pulse & Industry Intelligence Digest (n8n)

Production-ready, **zero-cost** workflow: RSS → cleanup → Google Gemini (free tier) → responsive HTML email → SMTP.

**Import file:** [`daily-tech-pulse.workflow.json`](daily-tech-pulse.workflow.json)

```
Daily 08:00 Trigger
  ├─ RSS - Hacker News      https://news.ycombinator.com/rss
  ├─ RSS - ArXiv AI         http://export.arxiv.org/rss/cs.AI
  └─ RSS - TechCrunch AI    https://techcrunch.com/category/artificial-intelligence/feed/
        ↓ Merge (append ×3)
  Clean & Aggregate Articles   → top 10, deduped, compact JSON payload
        ↓
  LLM Synthesis - Gemini       → Basic LLM Chain + gemini-3.5-flash-lite
        ↓
  Parse AI Output              → strict JSON { trend_summary, items[] }
        ↓
  Build HTML Email             → navy/off-white executive template
        ↓
  Send Digest Email            → SMTP subject with {{ $now.format('DD MMM YYYY') }}
```

---

## 1. Deploy n8n with Docker

### `docker-compose.yml`

```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/New_York   # local time for the 08:00 trigger
      - TZ=America/New_York
      # Digest recipients (read by the Send Email node via $env)
      - EMAIL_TO=you@example.com
      - FROM_EMAIL=you@gmail.com
      # Optional hardening: leave unset to allow $env in Code/Expression nodes
      # - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

### Commands

```powershell
docker compose up -d
# open http://localhost:5678 and complete the owner setup wizard
docker compose logs -f n8n     # verify startup
```

Update later: `docker compose pull; docker compose up -d`

---

## 2. Free credentials

### A. Google Gemini API key (LLM)

1. Open **https://aistudio.google.com/apikey** → sign in with a Google account → **Create API key**.
2. In n8n: **Credentials → New → Google Gemini (PaLM) API**  
   (older UI: “Google Gemini” / `googlePalmApi`).
3. Paste the key → **Save**.
4. Open node **Google Gemini Chat Model** → select this credential.
5. Model: set **`modelName`** to a model your key can use (checked 2026-09: `models/gemini-3.5-flash-lite` works; `gemini-1.5-flash`/`gemini-2.5-flash` → 404 for new users; `gemini-3.8-flash` works but often 503). If the node shows only a `model` dropdown (`typeVersion` ≥ 2), pick from that list.

### B. Gmail App Password (SMTP)

1. Enable **2-Step Verification** on the Google account (required).
2. Google Account → **Security → 2-Step Verification → App passwords** → create one for “Mail” (name: `n8n-digest`). Copy the **16-character** password (not your normal password).
3. In n8n: **Credentials → New → SMTP**:
   | Field | Value |
   |---|---|
   | Host | `smtp.gmail.com` |
   | Port | `587` (STARTTLS) or `465` (SSL) |
   | User | `you@gmail.com` |
   | Password | the 16-char App Password |
   | SSL / StartTLS | TLS for 587 · SSL for 465 |
4. Open node **Send Digest Email** → select this credential.
5. Hardcode addresses in the **Send Digest Email** node (`fromEmail` / `toEmail`) — newer n8n blocks `$env` in node expressions by default (`access to env vars denied`). The compose-file `EMAIL_TO`/`FROM_EMAIL` vars only work if `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.

> Works with any SMTP provider (Outlook, Fastmail, SES, Mailgun) — only host/port/user/password change.

---

## 3. Import & activate

1. n8n → **Workflows → ⋯ → Import from JSON** → select `daily-tech-pulse.workflow.json`.
2. Open **Google Gemini Chat Model** and **Send Digest Email** → attach your credentials (imported file ships with placeholder IDs that will show as broken until re-selected).
3. Confirm **Daily 08:00 Trigger**: cron `0 8 * * *`, timezone = workflow **Settings → Timezone** (defaults to `America/New_York` in this file; match `GENERIC_TIMEZONE`).
4. Toggle the workflow **Active**.

### Test manually (without waiting for 08:00)

1. Open the workflow → click **Execute workflow** (▶ / “Test workflow”). Each node shows data as it runs.
2. Or run step-by-step: select a node → **Execute node** (start with RSS → Clean → LLM → …).
3. Confirm the email arrives; check **Executions** tab for payloads/logs if not.
4. First LLM test: if Gemini returns non-JSON, the **Parse AI Output** node falls back to rendering cleaned RSS snippets so mail still sends.

---

## 4. Code nodes (exact JavaScript)

Standalone copies live in [`code/`](code/) — paste back into the matching Code node anytime:

| File | Code node | Responsibility |
|---|---|---|
| `code/01-clean-aggregate.js` | **Clean & Aggregate Articles** | HTML strip, title/URL dedupe, recency sort, top 10, compact `payload` JSON |
| `code/02-parse-ai-output.js` | **Parse AI Output** | Fence/brace-tolerant JSON extract, schema normalize, RSS fallback |
| `code/03-build-html-email.js` | **Build HTML Email** | Escaped, table-based responsive newsletter (`#0d1b2a` / `#f8fafc` / `#1e293b`) |

These files are the full source of the `jsCode` fields inside the workflow JSON.

### LLM system prompt (Basic LLM Chain → Chat Messages → add Type: **System**)

> Note: **Options → System Message is IGNORED** by newer n8n chain versions (`typeVersion` 1.3+ has no such option — the text would be silently dropped). The instructions must live in **Chat Messages** as a message with Type `System`.

```text
You are an Executive Technology Intelligence Analyst.
Review the provided raw list of tech headlines and articles.
Select the top 3 to 4 most impactful developments relevant to software engineers, AI developers, and tech managers.
For each selected item:
1. Create a clear, punchy headline.
2. Write a 2-sentence breakdown explaining the development and its operational/industry significance.
3. Retain the exact source link.
Also provide a brief 2-sentence overarching trend summary at the top.

Respond with STRICT JSON only (no markdown fences, no commentary) using this exact schema:
{
  "trend_summary": "2-sentence overarching trend summary",
  "items": [
    {
      "headline": "Punchy headline",
      "breakdown": "Exactly 2 sentences of operational/industry significance.",
      "url": "Exact source URL copied verbatim from input",
      "source": "Domain name"
    }
  ]
}
Rules: Use only facts from the provided payload. Never invent URLs. Keep total response under 900 words.
```

**User prompt (`prompt` field — must start with `=`):**

```text
=Raw article payload (JSON array of { title, url, source, snippet, published }):

{{ $json.payload }}
```

> **Critical:** this n8n version only evaluates strings that **start with `=`**. A bare `{{ $json.payload }}` is sent to the model literally (Gemini will reply *"you provided a template expression"*).

### Email subject (Send Email node)

```text
=Daily Tech Pulse | Executive AI & Tech Briefing - {{ $now.toFormat('dd LLL yyyy') }}
```

Recipients (hardcode — `$env` is blocked by default):

```text
toEmail:  hfz.aiman0307@gmail.com
fromEmail: hfz.aiman0307@gmail.com
```

---

## 5. Costs & limits

| Item | Cost |
|---|---|
| n8n self-hosted (Docker) | Free |
| Gemini free tier (`gemini-3.5-flash-lite`) | Free (rate-limited) |
| Gmail App Password SMTP | Free |
| RSS feeds | Free, no key |
| **Total** | **$0** |

ArXiv/TechCrunch occasionally hiccup — RSS nodes use **OnError: Continue**, so one bad feed does not kill the digest.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| No email / SMTP auth error | Use **App Password**, not account password; port 587 + TLS or 465 + SSL |
| Trigger fires at wrong hour | Align `GENERIC_TIMEZONE`, container `TZ`, and workflow Timezone |
| Gemini 429 / quota | Free-tier rate limit — retry later or switch model in the Gemini node |
| Empty LLM JSON | Check **Parse AI Output** execution data; fallback still emails top RSS items |
| `$env` blocked | Newer n8n blocks `$env` in expressions — hardcode addresses in the Send Email node |
| Import shows red credentials | Re-select Gemini + SMTP credentials on the two nodes (IDs are placeholders by design) |
| `access to env vars denied` | Same as above — hardcode `fromEmail`/`toEmail` |
| The 'prompt' parameter is empty | Basic LLM Chain `typeVersion` ≤ 1.3 reads parameter **`prompt`**, not `text` — keep both |
| Gemini replies *"you provided a template expression"* | Expression lacks the `=` prefix — value must be `=...text... {{ $json.payload }}` |
| Gemini replies with markdown/summary instead of JSON | System instructions were in Options → System Message (ignored) — move them to **Chat Messages → Type: System** |
| Sources show `unknown` | Code nodes must not rely on `new URL` in the runner — use the regex-based `hostOf`/`safeHost` from `code/01`/`code/03` |
| SMTP `ECONNECTION` / auth fail | Leave **hostName empty** in the SMTP credential; use an App Password; port 587 + `secure: false` |
| `$now.format is not a function` | n8n Code nodes use Luxon: `$now.toFormat('dd LLL yyyy')`, not `.format()` |
| Gemini 404 / model retired | Update `modelName` (e.g. `models/gemini-3.5-flash-lite`) |
| Gemini 503 high demand | Retry later; the LLM node has `retryOnFail` (6 tries) enabled |
| SMTP `ECONNECTION` / auth fail | Leave `hostName` empty in the SMTP credential; use an App Password; port 587 + `secure: false` |
