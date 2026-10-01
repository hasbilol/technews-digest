// =============================================================
// Responsive HTML newsletter templating
// Palette: header #0d1b2a | bg #f8fafc | text #1e293b
// Table-based layout for Outlook/Gmail/Mobile compatibility
// =============================================================
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const u = String(value || '').trim();
  return /^https?:\/\//i.test(u) ? esc(u) : '#';
}

const data = $input.first().json;
const trendSummary = data.trendSummary || 'No trend summary available.';
const items = Array.isArray(data.items) ? data.items : [];

const displayDate = $now.setLocale('en-GB').toFormat('dd LLL yyyy');
const fullDate = $now.setLocale('en-GB').toFormat('cccc, dd LLLL yyyy');
const year = $now.toFormat('yyyy');

const storyCards = items
  .map((item, index) => {
    const n = String(index + 1).padStart(2, '0');
    const sourceLabel = item.source || safeHost(item.url);
    return `
      <tr>
        <td style="padding:0 0 16px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
            <tr>
              <td style="padding:20px 22px 8px 22px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                ${n} &nbsp;&middot;&nbsp; ${esc(sourceLabel)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 10px 22px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.35;font-weight:700;color:#0f172a;">
                <a href="${safeUrl(item.url)}" target="_blank" style="color:#0f172a;text-decoration:none;">
                  ${esc(item.headline)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 16px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
                ${esc(item.breakdown)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 20px 22px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px;background:#0d1b2a;">
                      <a href="${safeUrl(item.url)}" target="_blank"
                         style="display:inline-block;padding:10px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">
                        Read full article &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  })
  .join('');

function safeHost(url) {
  const m = String(url || '').match(/^(?:https?:\/\/)?([^\/?#:]+)/i);
  if (!m) return 'Source';
  return m[1].replace(/^www\./, '');
}

const storiesSection =
  items.length > 0
    ? storyCards
    : `<tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#475569;">No stories were generated for this run.</td></tr>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Daily Tech Pulse</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#f8fafc;border-radius:10px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0d1b2a;padding:32px 32px 28px 32px;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;font-weight:700;">
                Executive Intelligence Briefing
              </p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.25;font-weight:700;color:#ffffff;">
                Daily Tech Pulse
              </h1>
              <p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#cbd5e1;">
                AI &amp; Tech Briefing &middot; ${esc(displayDate)}
              </p>
            </td>
          </tr>

          <!-- Trend summary -->
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid #0b3c5d;border-radius:8px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0b3c5d;font-weight:700;">
                      Today&#8217;s Trend Line
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#1e293b;">
                      ${esc(trendSummary)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider label -->
          <tr>
            <td style="padding:24px 28px 4px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;font-weight:700;">
                Top Developments (${items.length})
              </p>
            </td>
          </tr>

          <!-- Story cards -->
          ${storiesSection}

          <!-- Footer -->
          <tr>
            <td style="padding:12px 8px 8px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d1b2a;border-radius:8px;">
                <tr>
                  <td style="padding:22px 24px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 6px 0;font-size:13px;color:#e2e8f0;font-weight:700;">
                      Daily Tech Pulse
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                      Sources: Hacker News &middot; ArXiv cs.AI &middot; TechCrunch AI. Curated by n8n + Google Gemini (free tier).<br />
                      You receive this because you configured the automated digest workflow.
                    </p>
                    <p style="margin:12px 0 0 0;font-size:11px;color:#64748b;">
                      &copy; ${esc(year)} &middot; Automated Executive Briefing &middot; ${esc(fullDate)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

return [
  {
    json: {
      html,
      subject: `Daily Tech Pulse | Executive AI & Tech Briefing - ${$now.toFormat('dd LLL yyyy')}`,
      trendSummary,
      items,
      generatedAt: data.generatedAt,
    },
  },
];