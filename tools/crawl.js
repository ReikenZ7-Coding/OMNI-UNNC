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
  { id: "news", type: "news", organiser: "UNNC News", url: BASE + "/en/press-release/news-listing.aspx" }
];

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

function decode(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
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
  return parseTiles(html, "News-Article\\.aspx").map((t) => {
    const r = parseRange(t.desc);
    if (!r) return null;
    return { id: t.id, kind: "news", title: t.title, date: r.start.slice(0, 10), organiser: src.organiser, url: t.url, image: t.image ? abs(t.image) : "", source: src.id };
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

async function getPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" }, signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  } finally { clearTimeout(timer); }
}

function readPrevious() {
  try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { return { events: [], news: [], feeds: [] }; }
}

async function main() {
  const prev = readPrevious();
  const today = new Date().toISOString().slice(0, 10);
  let events = [], news = [];
  const report = {};
  for (const src of SOURCES) {
    try {
      const html = await getPage(src.url);
      const items = src.type === "uniEvents" ? parseUniEvents(html, src) : src.type === "facultyEvents" ? parseFacultyEvents(html, src) : parseNews(html, src);
      report[src.id] = { ok: true, items: items.length };
      (src.type === "news" ? news : events).push(...items);
    } catch (e) {
      // Keep what we had from this source last time, so one bad page doesn't empty the app.
      report[src.id] = { ok: false, error: String(e.message || e) };
      const keep = (list) => (list || []).filter((x) => x.source === src.id);
      if (src.type === "news") news.push(...keep(prev.news)); else events.push(...keep(prev.events));
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
  events = events.filter(dedupe).filter((e) => e.end.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 40);
  news = news.filter(dedupe).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  feeds = feeds.filter(dedupe).filter((f) => f.date >= oldest).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);

  const changed = JSON.stringify({ events, news, feeds }) !== JSON.stringify({ events: prev.events, news: prev.news, feeds: prev.feeds || [] });
  const out = { updatedAt: changed || !prev.updatedAt ? new Date().toISOString() : prev.updatedAt, from: BASE, events, news, feeds };
  console.log(JSON.stringify(report, null, 1));
  console.log(events.length + " upcoming events, " + news.length + " news items, " + feeds.length + " feed items" + (changed ? " (changed)" : " (no change)"));
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

// For developers: show how a page is built, to write a parser for it.
async function probe(url) {
  const html = await getPage(url);
  console.log("Length " + html.length);
  for (const k of ["event-listing__item", "mainsite-newslisting-tile", "Article.aspx", "Event.aspx", "<table", "<tr", "<h2", "<h3", "<li", "pageIndex"]) console.log(k + ": " + (html.split(k).length - 1) + "x");
  const at = Math.max(0, ["mainsite-newslisting-tile", "event-listing__item", "Article.aspx", "Semester"].map((k) => html.indexOf(k)).filter((n) => n > 0).sort((a, b) => a - b)[0] - 400 || 0);
  console.log("----- sample -----\n" + html.slice(at, at + 3500).replace(/\s+/g, " "));
}

if (require.main === module) {
  const i = process.argv.indexOf("--test-feed"), j = process.argv.indexOf("--probe");
  if (i > -1) testFeed(process.argv[i + 1]);
  else if (j > -1) probe(process.argv[j + 1]).catch((e) => { console.log(String(e)); process.exitCode = 1; });
  else main();
}
module.exports = { parseUniEvents, parseFacultyEvents, parseNews, parseRange, parseStamp, decode, parseFeed };
