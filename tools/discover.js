/*
 * Research helper (saves nothing): looks at public UNNC pages and lists the
 * links that look like news, notices or events, plus any data feeds the pages
 * load. Used to find new sources for tools/crawl.js.
 *
 *   node tools/discover.js [url ...]        (no urls = a default set of seeds)
 *   node tools/discover.js --raw <url>      (prints the start of the raw reply)
 */
const UA = "OMNI-UNNC student prototype crawler (+https://github.com/ReikenZ7-Coding/OMNI-UNNC)";
const BASE = "https://www.nottingham.edu.cn";
const SEEDS = [
  "/robots.txt", "/sitemap.xml", "/en/index.aspx", "/cn/index.aspx",
  "/en/press-release/news-listing.aspx", "/cn/press-release/news-listing.aspx",
  "/en/events/event-listing.aspx", "/cn/events/event-listing.aspx",
  "/en/university-life/news/index.aspx", "/cn/university-life/news/index.aspx",
  "/en/library/index.aspx", "/en/business/index.aspx", "/en/humanities-and-social-sciences/index.aspx", "/en/science-engineering/index.aspx"
].map((p) => BASE + p);

const WORDS = /(news|event|notice|announce|bulletin|listing|lecture|seminar|talk|calendar|feed|rss|ical|\.ics|whats-on|新闻|活动|通知|公告|讲座|动态|资讯|日历)/i;

async function get(url, lang) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": lang || (url.includes("/cn/") ? "zh-CN,zh;q=0.9" : "en-GB,en;q=0.9") }, signal: ctrl.signal, redirect: "follow" });
    return { status: r.status, url: r.url, type: r.headers.get("content-type") || "", text: await r.text() };
  } catch (e) {
    return { error: String(e.message || e) + (e.cause ? " / " + (e.cause.code || "") + " " + (e.cause.message || "") : "") };
  } finally { clearTimeout(t); }
}

function decode(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function links(html, from) {
  const out = new Map();
  const re = /<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let u;
    try { u = new URL(m[1].replace(/&amp;/g, "&"), from); } catch (e) { continue; }
    if (!/nottingham\.edu\.cn$/.test(u.hostname)) continue;
    const text = decode(m[2]).slice(0, 60);
    const key = u.origin + u.pathname.toLowerCase();
    if (!out.has(key) && (WORDS.test(u.pathname) || WORDS.test(text))) out.set(key, text);
  }
  return out;
}

async function look(url) {
  const r = await get(url);
  console.log("\n===== " + url);
  if (r.error) { console.log("ERROR " + r.error); return; }
  console.log("status " + r.status + (r.url !== url ? " → " + r.url : "") + " · " + r.type + " · " + r.text.length + " chars");
  const h = r.text;
  if (/robots\.txt$/.test(url)) { console.log(h.slice(0, 1500)); return; }
  if (/xml/.test(r.type) || /^\s*<\?xml/.test(h)) {
    const locs = (h.match(/<loc>[^<]+<\/loc>/g) || []).map((x) => x.slice(5, -6));
    console.log(locs.length + " <loc> entries; matching:");
    locs.filter((l) => WORDS.test(l)).slice(0, 120).forEach((l) => console.log("  " + l));
    return;
  }
  const count = (k) => h.split(k).length - 1;
  console.log("items: event-details " + count("event-details.aspx") + ", Event.aspx " + count("Event.aspx") + ", News-Article " + count("News-Article.aspx") + ", Article.aspx " + count("Article.aspx") +
    ", tiles " + count("mainsite-newslisting-tile\"") + ", event-listing__item " + count("event-listing__item") + ", pageIndex " + (h.match(/PageIndex=\d+/gi) || []).length);
  const apis = new Set((h.match(/["'(][^"'()\s]*(?:\.ashx|\.asmx|\/api\/|\.json|rss|ical|\.ics|ajax|webservice|Rest\/)[^"'()\s]*["')]/gi) || []).map((s) => s.slice(1, -1)));
  if (apis.size) console.log("data endpoints seen: " + [...apis].slice(0, 25).join("  "));
  const l = links(h, r.url || url);
  console.log(l.size + " news/event/notice links:");
  for (const [k, v] of l) console.log("  " + k.replace(BASE, "") + "  | " + v);
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === "--raw") { const r = await get(args[1]); console.log(r.error || (r.status + " " + r.type + "\n" + r.text.slice(0, 4000))); return; }
  for (const u of args.length ? args : SEEDS) { await look(u.startsWith("http") ? u : BASE + u); await new Promise((r) => setTimeout(r, 1200)); }
})();
