// =============================================================
// Data Cleaning & Aggregation
// - Strip HTML, dedupe by title/URL, sort by recency
// - Keep top 10: { title, url, source, snippet, published }
// - Emit a compact JSON payload to minimize LLM tokens
// =============================================================
const LIMIT = 10;
const SNIPPET_MAX = 280;

function stripHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max) {
  const t = String(text || '');
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '\u2026' : t;
}

function hostOf(url) {
  const m = String(url || '').match(/^(?:https?:\/\/)?([^\/?#:]+)/i);
  if (!m) return 'unknown';
  return m[1].replace(/^www\./, '');
}

function titleKey(title) {
  return stripHtml(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function urlKey(url) {
  try {
    const u = new URL(String(url));
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch (e) {
    return String(url || '').replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
  }
}

const items = $input.all();
const seenTitles = new Set();
const seenUrls = new Set();
const articles = [];
let skipped = 0;

for (const item of items) {
  const json = item.json || {};
  // RSS Feed Read may nest fields under json.xml / json.meta in some versions
  const source = json.xml || json;

  const title = stripHtml(source.title || json.title || '');
  const url = String(
    source.link || source.guid || json.link || json.guid || json.url || ''
  ).trim();

  if (!title || !url || !/^https?:\/\//i.test(url)) {
    skipped += 1;
    continue;
  }

  const tKey = titleKey(title);
  const uKey = urlKey(url);
  if (seenTitles.has(tKey) || seenUrls.has(uKey)) {
    skipped += 1;
    continue;
  }
  seenTitles.add(tKey);
  seenUrls.add(uKey);

  const rawSnippet =
    source.contentSnippet ||
    source.content ||
    source.description ||
    json.contentSnippet ||
    json.content ||
    json.description ||
    '';

  const publishedRaw =
    source.pubDate ||
    source.isoDate ||
    json.pubDate ||
    json.isoDate ||
    source['dc:date'] ||
    '';

  articles.push({
    title,
    url,
    source: hostOf(url),
    snippet: truncate(stripHtml(rawSnippet), SNIPPET_MAX) || 'No summary available.',
    published: String(publishedRaw || ''),
    _ts: Date.parse(publishedRaw) || 0,
  });
}

// Most recent first; items without a parseable date keep merge order (stable sort)
articles.sort((a, b) => b._ts - a._ts);

const top = articles.slice(0, LIMIT).map(({ _ts, ...rest }) => rest);

if (top.length === 0) {
  throw new Error('No valid RSS articles after cleaning/deduplication. Check feed URLs and connectivity.');
}

// Compact JSON string -> predictable, low token usage for the LLM
const payload = JSON.stringify(top);

return [
  {
    json: {
      articles: top,
      payload,
      articleCount: top.length,
      skippedDuplicates: skipped,
      generatedAt: new Date().toISOString(),
    },
  },
];