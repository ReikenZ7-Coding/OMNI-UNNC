/*
 * OMNI crawler: reads UNNC's PUBLIC news and events pages and saves what it
 * finds to data/live.json, which the app loads.
 *
 * GitHub runs this every 30 minutes (see .github/workflows/crawl.yml).
 * Run it yourself with: npm run crawl
 *
 * Be polite: it fetches only a handful of public listing pages per run,
 * identifies itself, and links every item back to the original page.
 */
const fs = require("fs");
const path = require("path");

const BASE = "https://www.nottingham.edu.cn";
const OUT = path.join(__dirname, "..", "data", "live.json");
const FEEDS = path.join(__dirname, "..", "data", "feeds.json");
const UA = "OMNI-UNNC student prototype crawler (+https://github.com/ReikenZ7-Coding/OMNI-UNNC)";

const SOURCES = [
  { id: "uni-events-1", type: "uniEvents", organiser: "UNNC", url: BASE + "/en/events/event-listing.aspx" },
  { id: "uni-events-2", type: "uniEvents", organiser: "UNNC", url: BASE + "/en/events/event-listing.aspx?EVTPageIndex=2" },
  { id: "fse-events", type: "facultyEvents", organiser: "Faculty of Science and Engineering", url: BASE + "/en/science-engineering/events/listing.aspx" },
  { id: "news", type: "news", organiser: "UNNC News", url: BASE + "/en/press-release/news-listing.aspx" },
  { id: "campus-news", type: "news", pattern: "Article\\.aspx", organiser: "UNNC Faculty news", url: BASE + "/en/university-life/news/index.aspx" },
  { id: "key-dates", type: "keyDates", organiser: "UNNC Key Dates", url: BASE + "/en/about/key-dates/key-dates.aspx" },
  // Chinese versions. Items that also exist in English get their Chinese title added;
  // Chinese-only items are kept in Chinese.
  { id: "cn-uni-events-1", lang: "zh", type: "uniEvents", organiser: "宁波诺丁汉大学", url: BASE + "/cn/events/event-listing.aspx" },
  { id: "cn-uni-events-2", lang: "zh", type: "uniEvents", organiser: "宁波诺丁汉大学", url: BASE + "/cn/events/event-listing.aspx?EVTPageIndex=2" },
  { id: "cn-news", lang: "zh", type: "news", organiser: "宁诺新闻", url: BASE + "/cn/press-release/news-listing.aspx" },
  { id: "cn-campus-news", lang: "zh", type: "news", pattern: "Article\\.aspx", organiser: "宁诺校园新闻", url: BASE + "/cn/university-life/news/index.aspx" },
  // Faculty news lists (English and Chinese share ids, so they merge).
  { id: "fse-news", type: "list", item: "news/article\\.aspx.id=", organiser: "Faculty of Science and Engineering", url: BASE + "/en/science-engineering/news/home.aspx" },
  { id: "cn-fse-news", lang: "zh", type: "list", item: "news/article\\.aspx.id=", organiser: "理工学院", url: BASE + "/cn/science-engineering/news/home.aspx" },
  { id: "fhss-news", type: "list", item: "News/Article\\.aspx.id=", organiser: "Faculty of Humanities and Social Sciences", url: BASE + "/en/humanities-and-social-sciences/news/" },
  // UNNC's Chinese account on NetEase (网易号), which republishes its WeChat articles as public web pages.
  { id: "netease-unnc", lang: "zh", type: "list", item: "/dy/article/[A-Z0-9]+\\.html", organiser: "宁波诺丁汉大学 · 网易号", max: 25, url: "https://www.163.com/dy/media/T1562640267479.html" }
];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ").trim();
}
function abs(href) {
  const h = decode(href);
  return /^https?:/i.test(h) ? h : BASE + (h.startsWith("/") ? "" : "/") + h;
}
function ymd(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }

// "15/11/2026 09:30:00" or "2026-07-18T08:00" -> "2026-11-15T09:30"
function parseStamp(s) {
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s || "");
  if (m) return ymd(m[3], m[2], m[1]) + "T" + pad(m[4] || 0) + ":" + (m[5] || "00");
  m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || "");
  if (m) return ymd(m[1], m[2], m[3]) + "T" + (m[4] || "00") + ":" + (m[5] || "00");
  return null;
}

// "04 - 06 Dec 2026, UNNC" / "05 Nov 2026 - 31 May 2027, Online" / "08 May 2026, IEB122, UNNC"
function parseRange(text) {
  const t = decode(text);
  let m = /^(\d{1,2})\s*([A-Za-z]{3})?\s*(\d{4})?\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\s*,?\s*(.*)$/.exec(t);
  if (m) {
    const em = MONTHS[m[5].toLowerCase()], ey = +m[6];
    const sm = m[2] ? MONTHS[m[2].toLowerCase()] : em, sy = m[3] ? +m[3] : ey;
    if (!sm || !em) return null;
    return { start: ymd(sy, sm, m[1]) + "T00:00", end: ymd(ey, em, m[4]) + "T23:59", location: m[7] };
  }
  m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\s*,?\s*(.*)$/.exec(t);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const d = ymd(m[3], MONTHS[m[2].toLowerCase()], m[1]);
    return { start: d + "T00:00", end: d + "T23:59", location: m[4] };
  }
  return null;
}

function parseUniEvents(html, src) {
  return html.split(/<li class="event-listing__item/).slice(1).map((chunk) => {
    const link = /<a href="([^"]*event-details\.aspx\?id=([0-9a-f-]{36})[^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(chunk);
    if (!link) return null;
    const start = parseStamp((/itemprop="startDate" content="([^"]+)"/.exec(chunk) || [])[1]);
    let end = parseStamp((/itemprop="endDate" content="([^"]+)"/.exec(chunk) || [])[1]);
    const time = decode((/event-listing__info--time">([^<]*)</.exec(chunk) || [])[1]);
    const tm = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(time);
    if (!end && start) end = start.slice(0, 11) + (tm ? pad(tm[2].split(":")[0]) + ":" + tm[2].split(":")[1] : "23:59");
    if (!start) return null;
    return {
      id: link[2], title: decode(link[3]), start, end,
      location: decode((/itemprop="location">([\s\S]*?)<\/p>/.exec(chunk) || [])[1]) || "UNNC",
      organiser: src.organiser, url: abs(link[1]),
      image: abs((/<img src="([^"]+)"/.exec(chunk) || [, ""])[1] || "") || "", source: src.id
    };
  }).filter(Boolean);
}

function parseTiles(html, pattern) {
  return html.split(/mainsite-newslisting-tile"/).slice(1).map((chunk) => {
    const link = new RegExp('<a [^>]*href="([^"]*' + pattern + '\\?id=([0-9a-f-]{36})[^"]*)"[^>]*title="([^"]*)"', "i").exec(chunk);
    if (!link) return null;
    return {
      id: link[2], title: decode(link[3]), url: abs(link[1]),
      desc: decode((/class="article-text-desc">([\s\S]*?)<\/div>/.exec(chunk) || [])[1]),
      image: (/<img class="article-img" src="([^"]+)"/.exec(chunk) || [])[1]
    };
  }).filter(Boolean);
}

function parseFacultyEvents(html, src) {
  return parseTiles(html, "Event\\.aspx").map((t) => {
    const r = parseRange(t.desc);
    if (!r) return null;
    return { id: t.id, title: t.title, start: r.start, end: r.end, location: r.location || "UNNC", organiser: src.organiser, url: t.url, image: t.image ? abs(t.image) : "", source: src.id };
  }).filter(Boolean);
}

function parseNews(html, src) {
  return parseTiles(html, src.pattern || "News-Article\\.aspx").map((t) => {
    const r = parseRange(t.desc);
    const date = r ? r.start.slice(0, 10) : findDate(t.desc) || findDate(t.title);
    if (!date) return null;
    return { id: t.id, kind: "news", title: t.title, date, organiser: src.organiser, url: t.url, image: t.image ? abs(t.image) : "", source: src.id };
  }).filter(Boolean);
}

/*
 * RSS / Atom feeds (for example a public feed of a UNNC WeChat official account).
 * OMNI keeps only the title, date and link, never the article itself, so students
 * still read the full post on WeChat or the original site.
 */
function tag(xml, name) {
  const m = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1") : "";
}
function feedDate(s) {
  const d = new Date(String(s || "").trim());
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "feed"; }
function hashId(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
function parseFeed(xml, feed) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const max = Math.min(+feed.max || 10, 20);
  return blocks.map((b) => {
    const title = decode(tag(b, "title"));
    let link = decode(tag(b, "link"));
    if (!/^https?:/i.test(link)) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? decode(m[1]) : ""; }
    const date = feedDate(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    if (!title || !/^https?:\/\//i.test(link) || !date) return null;
    return {
      id: "f" + hashId(link), kind: feed.kind === "notice" ? "notice" : "news", title: title.slice(0, 200), date, url: link,
      organiser: String(feed.name || "").slice(0, 60), topic: feed.topic || "", via: /weixin\.qq\.com|wechat/i.test(link) ? "wechat" : "web",
      source: "feed-" + slug(feed.name || feed.url)
    };
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);
}
function readFeeds() {
  try {
    const list = JSON.parse(fs.readFileSync(FEEDS, "utf8")).feeds || [];
    return list.filter((f) => f && f.name && /^https:\/\//i.test(f.url || "") && f.enabled !== false).slice(0, 20);
  } catch (e) { return []; }
}

/*
 * Key Dates page: semesters, registration, exams, graduation and holidays, written as
 * "<p>Examination</p><ul><li>Autumn Semester: Monday 4 - Saturday 23 January 2027</li>...".
 */
const WEEKDAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
function parseDatePhrase(text, firstYear) {
  // "Monday 4 - Saturday 23 January 2027" -> {start:"2027-01-04", end:"2027-01-23"}
  const main = String(text).split(/,|\bas weekend\b/i)[0].replace(WEEKDAYS, " ");
  const toks = [];
  const re = /(\d{1,2})(?:\s+([A-Za-z]{3,9}))?(?:\s+(\d{4}))?/g;
  let m;
  while ((m = re.exec(main))) {
    const mon = m[2] && MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (m[2] && !mon) { toks.push({ d: +m[1], m: 0, y: 0 }); re.lastIndex = m.index + m[1].length; continue; }
    toks.push({ d: +m[1], m: mon || 0, y: m[3] ? +m[3] : 0 });
  }
  if (!toks.length) return null;
  for (let i = toks.length - 2; i >= 0; i--) { if (!toks[i].m) toks[i].m = toks[i + 1].m; if (!toks[i].y && toks[i].m === toks[i + 1].m) toks[i].y = toks[i + 1].y; }
  for (const t of toks) { if (!t.m) return null; if (!t.y) t.y = t.m >= 8 ? firstYear : firstYear + 1; }
  const a = toks[0], b = toks[toks.length - 1];
  if (a.y > b.y || (a.y === b.y && (a.m > b.m || (a.m === b.m && a.d > b.d)))) a.y = b.y - (a.m > b.m ? 1 : 0);
  return { start: ymd(a.y, a.m, a.d), end: ymd(b.y, b.m, b.d) };
}
const KEY_SECTIONS = { semesters: "", registration: "Registration", examination: "Exams", "graduation ceremonies": "Graduation", holidays: "Holiday" };
function parseKeyDates(html, src) {
  const out = [];
  html.split(/accordion__panel__title">/).slice(1).forEach((panel) => {
    const yr = /Academic Year\s+(\d{4})/i.exec(panel);
    if (!yr) return;
    const firstYear = +yr[1];
    let section = "", buf = null;
    const prefixes = [];
    const tags = /<(\/?)(p|ul|li)\b[^>]*>|([^<]+)/gi;
    let t, inP = false, pText = "";
    while ((t = tags.exec(panel))) {
      if (t[3] != null) { if (inP) pText += t[3]; else if (buf != null) buf += t[3]; continue; }
      const close = t[1] === "/", name = t[2].toLowerCase();
      if (name === "p") { if (!close) { inP = true; pText = ""; } else { inP = false; const s = decode(pText).toLowerCase(); if (s in KEY_SECTIONS) section = s; } }
      else if (name === "li" && !close) buf = "";
      else if (name === "ul" && !close && buf != null) { prefixes.push(decode(buf).replace(/:\s*$/, "")); buf = null; }
      else if (name === "ul" && close && buf == null && prefixes.length) { /* end of a nested list */ }
      else if (name === "li" && close) {
        if (buf != null) {
          const txt = decode(buf);
          const i = txt.indexOf(":");
          if (i > 0) {
            const label = txt.slice(0, i).trim();
            txt.slice(i + 1).split(";").forEach((part, n) => {
              const r = parseDatePhrase(part, firstYear);
              if (!r) return;
              const head = [KEY_SECTIONS[section], ...prefixes].filter(Boolean).join(" · ");
              out.push({
                id: "kd-" + r.start + "-" + slug(label) + (n ? "-" + n : ""), title: (head ? head + " · " : "") + label,
                start: r.start + "T00:00", end: r.end + "T23:59", location: "UNNC", organiser: src.organiser, url: src.url, image: "", source: src.id,
                topic: "academic"
              });
            });
          }
        } else if (prefixes.length) prefixes.pop();
        buf = null;
      }
    }
  });
  return out;
}

// Follows redirects like a browser does, keeping any cookie the site sets on the
// way (some UNNC folder pages set one and redirect to themselves). No log-ins.
async function getPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  const jar = new Map();
  try {
    let at = url;
    for (let hop = 0; hop < 8; hop++) {
      const headers = { "User-Agent": UA, "Accept-Language": /\/cn\//.test(at) ? "zh-CN,zh;q=0.9,en;q=0.5" : "en-GB,en;q=0.9" };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + "=" + v).join("; ");
      const r = await fetch(at, { headers, signal: ctrl.signal, redirect: "manual" });
      const set = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
      for (const c of set) { const m = /^([^=;\s]+)=([^;]*)/.exec(c); if (m) jar.set(m[1], m[2]); }
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        const next = new URL(r.headers.get("location"), at).href;
        if (/login|signin|sso|cas\/|oauth|authorize/i.test(next) && !/login|signin/i.test(url)) throw new Error("needs a log-in (" + new URL(next).hostname + ")");
        at = next; continue;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    }
    throw new Error("too many redirects");
  } finally { clearTimeout(timer); }
}

function readPrevious() {
  try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { return { events: [], news: [], feeds: [] }; }
}

// The English and Chinese UNNC pages share item ids: keep one item, with both titles.
const CJK = /[\u3400-\u9fff]/;
function mergeLanguages(list) {
  const byId = new Map(), out = [];
  for (const x of list) {
    const y = byId.get(x.id);
    if (!y) { byId.set(x.id, x); out.push(x); continue; }
    if (x.lang === "zh" && y.lang !== "zh") { if (CJK.test(x.title) && x.title !== y.title) y.titleZh = x.title; }
    else if (y.lang === "zh" && x.lang !== "zh") { const zh = y.title; Object.assign(y, x); if (CJK.test(zh) && zh !== x.title) y.titleZh = zh; }
  }
  return out;
}

function parse(html, src) {
  return src.type === "uniEvents" ? parseUniEvents(html, src) : src.type === "facultyEvents" ? parseFacultyEvents(html, src)
    : src.type === "keyDates" ? parseKeyDates(html, src) : src.type === "list" ? parseLinkList(html, src) : parseNews(html, src);
}

async function main() {
  const prev = readPrevious();
  const today = new Date().toISOString().slice(0, 10);
  let events = [], news = [], dates = [];
  const report = {};
  for (const src of SOURCES) {
    try {
      const html = await getPage(src.url);
      const items = parse(html, src).map((x) => Object.assign(x, { lang: src.lang || "en" }))
        .sort((a, b) => String(b.date || b.start).localeCompare(String(a.date || a.start))).slice(0, src.max || 100);
      report[src.id] = { ok: true, items: items.length };
      (src.type === "news" ? news : src.type === "keyDates" ? dates : events).push(...items);
    } catch (e) {
      // Keep what we had from this source last time, so one bad page doesn't empty the app.
      report[src.id] = { ok: false, error: String(e.message || e) };
      const keep = (list) => (list || []).filter((x) => x.source === src.id);
      if (src.type === "news") news.push(...keep(prev.news)); else if (src.type === "keyDates") dates.push(...keep(prev.dates)); else events.push(...keep(prev.events));
    }
    await new Promise((r) => setTimeout(r, 1500)); // a pause between pages
  }
  // Feeds listed in data/feeds.json
  let feeds = [];
  const oldest = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  for (const feed of readFeeds()) {
    const id = "feed-" + slug(feed.name || feed.url);
    try {
      const items = parseFeed(await getPage(feed.url), feed);
      report[id] = { ok: true, items: items.length };
      feeds.push(...items);
    } catch (e) {
      report[id] = { ok: false, error: String(e.message || e) };
      feeds.push(...(prev.feeds || []).filter((x) => x.source === id));
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  const seen = new Set();
  const dedupe = (x) => (seen.has(x.id) ? false : (seen.add(x.id), true));
  events = mergeLanguages(events).filter((e) => e.end.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 60);
  news = mergeLanguages(news).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  dates = dates.filter(dedupe).filter((e) => e.end.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 30);
  feeds = feeds.filter(dedupe).filter((f) => f.date >= oldest).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);

  const changed = JSON.stringify({ events, news, feeds, dates }) !== JSON.stringify({ events: prev.events, news: prev.news, feeds: prev.feeds || [], dates: prev.dates || [] });
  const out = { updatedAt: changed || !prev.updatedAt ? new Date().toISOString() : prev.updatedAt, from: BASE, events, news, dates, feeds };
  console.log(JSON.stringify(report, null, 1));
  console.log(events.length + " upcoming events, " + news.length + " news items, " + dates.length + " key dates, " + feeds.length + " feed items" + (changed ? " (changed)" : " (no change)"));
  if (changed || !fs.existsSync(OUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  }
  if (!events.length && !news.length) process.exitCode = 1;
}

// Try a feed without saving anything: node tools/crawl.js --test-feed <url>
async function testFeed(url) {
  if (!/^https:\/\//i.test(url || "")) { console.log("Give a feed link that starts with https://"); process.exitCode = 1; return; }
  let xml;
  try { xml = await getPage(url); } catch (e) { console.log("Couldn't open the feed: " + (e.message || e)); process.exitCode = 1; return; }
  const name = decode(tag(xml, "title")) || "Test feed";
  const items = parseFeed(xml, { name, max: 20 });
  console.log("Feed: " + name);
  console.log(items.length ? items.length + " posts OMNI would show (headline, date, link only):" : "No posts found. Is this an RSS or Atom feed link?");
  items.forEach((i) => console.log("- " + i.date + "  " + i.title + "\n    " + i.url + (i.via === "wechat" ? "  [Read on WeChat]" : "")));
  if (!items.length) process.exitCode = 1;
}

/*
 * A simple list of links, for pages without a special layout (for example a
 * faculty news list, or UNNC's Chinese articles mirrored on NetEase).
 * src.item is the pattern every item link matches. The date is the first one
 * found next to the link, in English ("12 Nov 2026") or Chinese / ISO style
 * ("2026-11-12", "2026年11月12日").
 */
function findDate(text) {
  let m = /(20\d\d)\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/.exec(text);
  if (m && +m[2] <= 12 && +m[3] <= 31) return ymd(m[1], +m[2], +m[3]);
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(20\d\d)\b/i.exec(text);
  if (m) return ymd(m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d\d)\b/i.exec(text);
  if (m) return ymd(m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return "";
}
function parseLinkList(html, src) {
  const seen = new Set(), out = [];
  const re = /<a\b([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi;
  const item = new RegExp(src.item, "i");
  let m;
  while ((m = re.exec(html))) {
    const href = m[2].replace(/&amp;/g, "&");
    if (!item.test(href)) continue;
    let url = /^https?:/i.test(href) ? href : new URL(href, src.url).href;
    url = url.replace(/[?&]spss=[^&#]*/, "").replace(/\?$/, "");
    if (seen.has(url)) continue;
    const titleAttr = (/title="([^"]+)"/.exec(m[1] + m[3]) || [])[1];
    const title = (decode(titleAttr) || decode(m[4]))
      .replace(/\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+20\d\d|20\d\d\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日?)\s*$/, "").trim();
    const guid = (/[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(url) || [])[1];
    if (title.length < 6) continue;
    const near = html.slice(Math.max(0, m.index - (src.before || 300)), m.index + m[0].length + (src.after || 700));
    const date = findDate(decode(near.slice(0, (src.before || 300))) + " | " + decode(near.slice(src.before || 300))) || findDate(decode(near));
    if (!date) continue;
    seen.add(url);
    out.push({ id: guid ? guid.toLowerCase() : src.id + "-" + hashId(url), kind: src.kind || "news", title: title.slice(0, 160), date, organiser: src.organiser, url, image: "", source: src.id, lang: src.lang || "en" });
  }
  return out;
}

// For developers: run one source and print what OMNI would get. node tools/crawl.js --try <source id or url> [item pattern]
async function trySource(idOrUrl, pattern) {
  const src = SOURCES.find((s) => s.id === idOrUrl) || { id: "try", type: "list", url: idOrUrl, item: pattern || "Article", organiser: "Test" };
  const html = await getPage(src.url);
  const items = parse(html, src);
  console.log(src.id + ": " + items.length + " items from " + src.url);
  items.slice(0, 25).forEach((x) => console.log("  " + (x.date || x.start) + "  " + x.title + "\n      " + x.url));
  if (!items.length) process.exitCode = 1;
}

// For developers: show how a page is built, to write a parser for it.
async function probe(url) {
  const html = await getPage(url);
  console.log("Length " + html.length);
  for (const k of ["event-listing__item", "mainsite-newslisting-tile", "Article.aspx", "Event.aspx", "<table", "<tr", "<h2", "<h3", "<li", "pageIndex"]) console.log(k + ": " + (html.split(k).length - 1) + "x");
  const at = Math.max(0, ["mainsite-newslisting-tile", "event-listing__item", "Article.aspx", "Semester"].map((k) => html.indexOf(k)).filter((n) => n > 0).sort((a, b) => a - b)[0] - 400 || 0);
  console.log("----- sample -----\n" + html.slice(at, at + 3500).replace(/\s+/g, " "));
}

if (require.main === module) {
  const i = process.argv.indexOf("--test-feed"), j = process.argv.indexOf("--probe"), k = process.argv.indexOf("--try");
  if (k > -1) trySource(process.argv[k + 1], process.argv[k + 2]).catch((e) => { console.log(String(e)); process.exitCode = 1; });
  else if (i > -1) testFeed(process.argv[i + 1]);
  else if (j > -1) probe(process.argv[j + 1]).catch((e) => { console.log(String(e)); process.exitCode = 1; });
  else main();
}
module.exports = { mergeLanguages, parseLinkList, findDate, parseUniEvents, parseFacultyEvents, parseNews, parseRange, parseStamp, decode, parseFeed, parseKeyDates, parseDatePhrase };
