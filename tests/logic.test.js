// Run with: npm test   (or: node --test tests/)
const test = require("node:test");
const assert = require("node:assert/strict");
const data = Object.assign({}, require("../js/data.js"), require("./fixtures.js"));
const L = require("../js/logic.js");

const now = new Date(2026, 10, 17, 9, 0); // 17 Nov 2026, 09:00
const events = L.withDates(data.events, now);
const byId = (id) => events.find((e) => e.id === id);

test("feed hides finished events and sorts soonest first", () => {
  const list = L.filterEvents(events, {}, now, {});
  assert.ok(!list.some((e) => e.id === "halloween-movie"));
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].startAt <= list[i].startAt);
});

test("search matches title, tags and organiser", () => {
  assert.deepEqual(L.filterEvents(events, { query: "badminton" }, now, {}).map((e) => e.id), ["badminton"]);
  assert.ok(L.filterEvents(events, { query: "internship" }, now, {}).some((e) => e.id === "careers-fair"));
  assert.equal(L.filterEvents(events, { query: "zzzz" }, now, {}).length, 0);
});

test("category and date filters work", () => {
  const sports = L.filterEvents(events, { category: "sports" }, now, {});
  assert.ok(sports.length > 0 && sports.every((e) => e.category === "sports"));
  const today = L.filterEvents(events, { when: "today" }, now, {});
  assert.ok(today.every((e) => e.day === 0));
});

test("one tap registers when there is space and joins the waitlist when full", () => {
  const student = { id: "20512345" };
  const r1 = L.register(byId("badminton"), {}, student, now);
  assert.equal(r1.status, "registered");
  assert.equal(L.spotsLeft(byId("badminton"), r1.registrations), 48 - 30 - 1);
  const r2 = L.register(byId("hackathon"), {}, student, now);
  assert.equal(r2.status, "waitlist");
  assert.deepEqual(Object.keys(L.cancel("badminton", r1.registrations)), []);
});

test("ticket codes are stable and readable", () => {
  const a = L.ticketCode("badminton", "20512345");
  assert.equal(a, L.ticketCode("badminton", "20512345"));
  assert.match(a, /^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  assert.notEqual(a, L.ticketCode("hackathon", "20512345"));
});

test("help routing sends students to the right office", () => {
  const top = (q) => L.routeHelp(q, data.offices, data.faqs).offices[0]?.office.id;
  assert.equal(top("I can't connect to the wifi"), "it");
  assert.equal(top("my dorm air conditioner is broken"), "accommodation");
  assert.equal(top("how do I renew my residence permit"), "international");
  assert.equal(top("feeling really stressed about exams and can't sleep"), "wellbeing");
  assert.equal(top("宿舍空调坏了"), "accommodation");
  assert.equal(top("help me with my CV for an internship"), "careers");
  assert.deepEqual(L.routeHelp("", data.offices, data.faqs).offices, []);
});

test("Discover mixes events, notices and news, and each switch works", () => {
  const all = L.filterFeed(events, data.posts, {}, now, {});
  const kinds = new Set(all.map((i) => i.kind));
  assert.deepEqual([...kinds].sort(), ["event", "news", "notice"]);
  const onlyNews = L.filterFeed(events, data.posts, { kinds: { news: true } }, now, {});
  assert.ok(onlyNews.length > 0 && onlyNews.every((i) => i.kind === "news"));
  const latest = L.filterFeed(events, data.posts, { sort: "latest" }, now, {});
  for (let i = 1; i < latest.length; i++) assert.ok(latest[i - 1].postedAt >= latest[i].postedAt);
  const fromEmail = L.filterFeed(events, data.posts, { source: "email" }, now, {});
  assert.ok(fromEmail.length > 0 && fromEmail.every((i) => i.source === "email"));
  assert.ok(L.filterFeed(events, data.posts, { query: "exam timetable" }, now, {}).some((i) => i.id === "n-exams"));
});

test("food picker and ID masking", () => {
  const pick = L.pickFood(data.food, 0.5);
  assert.ok(pick.place && pick.shop);
  assert.equal(L.maskId("20512345"), "205***45");
});

test("items crawled from the UNNC website become events and news", () => {
  const live = {
    events: [
      { id: "a1", title: "Public Lecture: Inspiring Innovators", start: "2026-11-20T09:30", end: "2026-11-20T11:00", location: "Siyuan Auditorium", url: "https://example.org/e" },
      { id: "a2", title: "Design Competition", start: "2026-11-05T00:00", end: "2027-05-31T23:59" },
      { id: "bad" }
    ],
    news: [{ id: "n1", title: "UNNC and British Council sign partnership", date: "2026-10-30", url: "https://example.org/n" }]
  };
  const out = L.fromWebsite(live, now);
  assert.equal(out.events.length, 2);
  const ev = L.withDates(out.events, now);
  assert.equal(ev[0].day, 3);
  assert.equal(ev[0].start, "09:30");
  assert.ok(ev[1].endAt > now, "a multi-day event that started earlier is still on");
  assert.ok(L.filterEvents(ev, {}, now, {}).some((e) => e.id === "web-a2"));
  assert.equal(out.posts[0].kind, "news");
  assert.equal(out.posts[0].posted, -18);
  assert.equal(L.guessTopic("Autumn Careers Fair"), "careers");
});

test("crawler understands UNNC's page formats", () => {
  const C = require("../tools/crawl.js");
  assert.deepEqual(C.parseRange("04 - 06 Dec 2026, UNNC"), { start: "2026-12-04T00:00", end: "2026-12-06T23:59", location: "UNNC" });
  assert.equal(C.parseRange("05 Nov 2026 - 31 May 2027, University of Nottingham UK, China, Malaysia").end, "2027-05-31T23:59");
  assert.equal(C.parseRange("30 Oct 2026").start, "2026-10-30T00:00");
  assert.equal(C.parseStamp("15/11/2026 09:30:00"), "2026-11-15T09:30");
  const html = '<ul><li class="event-listing__item event"> <div itemprop="startDate" content="15/11/2026 09:30:00"> <span class="event-listing__info--time">09:30 - 11:00</span> </div> <a href="/en/events/event-details.aspx?id=04a1e20c-c3a3-4971-a962-4b4f7fde9123&language=en-GB">Public Lecture: Engineer &amp; Investor</a> <p class="event-listing__content--text location" itemprop="location">Siyuan Auditorium</p> <img src="/image-library/a.png?w=768&amp;h=432" /></li></ul>';
  const [e] = C.parseUniEvents(html, { id: "x", organiser: "UNNC" });
  assert.equal(e.title, "Public Lecture: Engineer & Investor");
  assert.equal(e.end, "2026-11-15T11:00");
  assert.equal(e.location, "Siyuan Auditorium");
  const tile = '<div class="tb mainsite-newslisting-tile" > <a class="zn" href="/en/Press-Release/News-Article.aspx?id=f75343bb-8c1a-4bb2-8e52-5796e0b4e078&language=en-GB" title="UNNC and British Council sign partnership" target="_blank"> <img class="article-img" src="/image-library/x.jpg" /> <div class="article-text-desc">30 Oct 2026</div></a></div>';
  const [n] = C.parseNews(tile, { id: "news", organiser: "UNNC News" });
  assert.equal(n.date, "2026-10-30");
  assert.ok(n.url.startsWith("https://www.nottingham.edu.cn/en/Press-Release/"));
});

test("checks what the AI read from a poster before it reaches the form", () => {
  const now = new Date(2026, 10, 17, 10, 0);
  const x = L.cleanExtract({ kind: "party", title: "  Board Games Night ", date: "2026-11-31", start: "7:05 pm", end: "21:30", topic: "nonsense", capacity: -3, description: "Bring friends." }, now);
  assert.equal(x.kind, "event");
  assert.equal(x.title, "Board Games Night");
  assert.equal(x.date, "", "31 November does not exist");
  assert.equal(x.start, "19:05");
  assert.equal(x.end, "21:30");
  assert.equal(x.capacity, null);
  assert.ok(["academic", "careers", "clubs", "sports", "culture", "wellbeing"].includes(x.topic));
  assert.ok(L.extractPrompt("hello", now, true).includes("2026-11-17"));
});

test("guesses an event from pasted WeChat or email text without AI", () => {
  const now = new Date(2026, 10, 17, 10, 0);
  const en = L.guessFromText("Board Games Night\nFri 20 Nov, 18:00-20:30\nVenue: Student Union Lounge\nOrganised by: Tabletop Society\nFree snacks, everyone welcome!", now);
  assert.equal(en.title, "Board Games Night");
  assert.equal(en.date, "2026-11-20");
  assert.equal(en.start, "18:00");
  assert.equal(en.end, "20:30");
  assert.equal(en.location, "Student Union Lounge");
  assert.equal(en.organiser, "Tabletop Society");
  const zh = L.guessFromText("【讲座】人工智能与金融\n时间：11月25日 晚上7点\n地点：图书馆报告厅", now);
  assert.equal(zh.title, "讲座 人工智能与金融");
  assert.equal(zh.date, "2026-11-25");
  assert.equal(zh.start, "19:00");
  assert.equal(zh.location, "图书馆报告厅");
  assert.equal(L.guessFromText("Careers fair on Jan 8", now).date, "2027-01-08", "a January date in November means next year");
});

test("reads a Moodle or timetable calendar file", () => {
  const now = new Date(2026, 10, 17, 10, 0);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "BEGIN:VEVENT", "UID:1@moodle", "SUMMARY:Essay 2 is due", "CATEGORIES:BUSI1116", "DTSTART:20261120T155900Z", "DTEND:20261120T155900Z", "END:VEVENT",
    "BEGIN:VEVENT", "UID:2@tt", "SUMMARY:BUSI1116 Workshop", "LOCATION:Trent Building\\, Room 201", "DTSTART;TZID=Asia/Shanghai:20261118T090000",
    "DTEND;TZID=Asia/Shanghai:20261118T110000", "RRULE:FREQ=WEEKLY;COUNT=3", "END:VEVENT",
    "BEGIN:VEVENT", "UID:3@old", "SUMMARY:Long ago", "DTSTART;VALUE=DATE:20250101", "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const items = L.parseICS(ics, now);
  assert.equal(items.length, 4, "1 deadline + 3 weekly classes, old item dropped");
  const ws = items.filter((i) => i.title === "BUSI1116 Workshop");
  assert.equal(ws.length, 3);
  assert.equal(ws[0].location, "Trent Building, Room 201");
  assert.equal(new Date(ws[1].start).getDate(), 25);
  assert.equal(new Date(ws[0].end) - new Date(ws[0].start), 2 * 3600 * 1000);
  assert.equal(items.find((i) => i.course === "BUSI1116").title, "Essay 2 is due");
});

test("labels links to the original post by where they point", () => {
  assert.equal(L.linkSource("https://mp.weixin.qq.com/s/AbC123").label, "Read on WeChat");
  assert.equal(L.linkSource("https://mp.weixin.qq.com/s/AbC123").source, "wechat");
  assert.equal(L.linkSource("https://moodle.nottingham.edu.cn/course/view.php?id=1").source, "moodle");
  assert.equal(L.linkSource("https://portal.nottingham.edu.cn/events/123").label, "Open in the UNNC portal");
  assert.equal(L.linkSource("https://www.nottingham.edu.cn/en/news").source, "web");
  assert.equal(L.linkSource("https://www.wjx.cn/vm/abc.aspx").label, "Open sign-up form");
  assert.equal(L.linkSource("https://example.org/x").label, "Open original post");
  assert.equal(L.linkSource("javascript:alert(1)"), null);
  assert.equal(L.linkSource("not a link"), null);
  assert.equal(L.linkSource("https://javascript:alert(1)"), null);
  const now = new Date(2026, 10, 17, 10, 0);
  const g = L.guessFromText("Charity Run\n22 Nov 08:00\nSign up: https://www.wjx.cn/vm/run.aspx", now);
  assert.equal(g.link, "https://www.wjx.cn/vm/run.aspx");
  assert.equal(g.date, "2026-11-22");
});

test("email-code sign-in only accepts UNNC emails and checks codes safely", () => {
  assert.equal(L.unncEmail("SSYLY12"), "ssyly12@nottingham.edu.cn");
  assert.equal(L.unncEmail(" ssyly12@Nottingham.edu.cn "), "ssyly12@nottingham.edu.cn");
  assert.equal(L.unncEmail("someone@gmail.com"), null);
  assert.equal(L.unncEmail("a@nottingham.edu.cn.evil.com"), null);
  assert.equal(L.maskEmail("ssyly12@nottingham.edu.cn"), "ss***2@nottingham.edu.cn");
  assert.match(L.makeCode(() => 0.000042), /^\d{6}$/);
  assert.equal(L.makeCode(() => 0.000042), "000042");
  const t = 1_000_000_000;
  const p = { code: "123456", sentAt: t, tries: 0 };
  assert.equal(L.checkCode(p, "123 456", t + 1000), "ok");
  assert.equal(L.checkCode(p, "654321", t + 1000), "wrong");
  assert.equal(L.checkCode(p, "12345", t + 1000), "format");
  assert.equal(L.checkCode(p, "123456", t + 11 * 60 * 1000), "expired");
  assert.equal(L.checkCode({ ...p, tries: 5 }, "123456", t), "locked");
  assert.equal(L.sendWait([], t), 0);
  assert.ok(L.sendWait([t - 10 * 1000], t) > 0, "30 seconds between codes");
  assert.ok(L.sendWait([t - 50 * 60e3, t - 40 * 60e3, t - 30 * 60e3], t) > 0, "at most 3 codes an hour");
  assert.equal(L.sendWait([t - 61 * 60e3, t - 40 * 60e3, t - 30 * 60e3], t), 0);
});

test("reads RSS and Atom feeds as headlines with links, never full articles", () => {
  const C = require("../tools/crawl.js");
  const rss = `<?xml version="1.0"?><rss><channel><title>宁诺就业</title>
    <item><title><![CDATA[2027届秋季招聘会 | Autumn Careers Fair]]></title><link>https://mp.weixin.qq.com/s/AbC123</link><pubDate>Mon, 16 Nov 2026 09:00:00 +0800</pubDate><description><![CDATA[<p>Full article text that OMNI must not keep</p>]]></description></item>
    <item><title>No link here</title><pubDate>Mon, 16 Nov 2026 09:00:00 +0800</pubDate></item>
  </channel></rss>`;
  const items = C.parseFeed(rss, { name: "宁诺就业", kind: "news", topic: "careers" });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "2027届秋季招聘会 | Autumn Careers Fair");
  assert.equal(items[0].url, "https://mp.weixin.qq.com/s/AbC123");
  assert.equal(items[0].date, "2026-11-16");
  assert.equal(items[0].via, "wechat");
  assert.ok(!JSON.stringify(items[0]).includes("Full article"), "the article body is not kept");
  const atom = `<feed><entry><title>SU elections open</title><link rel="alternate" href="https://example.org/su/elections"/><updated>2026-11-15T10:00:00Z</updated></entry></feed>`;
  assert.equal(C.parseFeed(atom, { name: "Student Union" })[0].url, "https://example.org/su/elections");

  const now = new Date(2026, 10, 17, 10, 0);
  const out = L.fromWebsite({ events: [], news: [], feeds: items }, now);
  const p = out.posts[0];
  assert.equal(p.source, "wechat");
  assert.equal(p.linkLabel, "Read on WeChat");
  assert.equal(p.topic, "careers");
  assert.equal(p.body, "");
  assert.equal(p.posted, -1);
});

test("reads UNNC Key Dates (semesters, exams, holidays) into all-day events", () => {
  const C = require("../tools/crawl.js");
  assert.deepEqual(C.parseDatePhrase("Monday 4 - Saturday 23 January 2027", 2026), { start: "2027-01-04", end: "2027-01-23" });
  assert.deepEqual(C.parseDatePhrase("Monday 15 February - Friday 4 June 2027", 2026), { start: "2027-02-15", end: "2027-06-04" });
  assert.deepEqual(C.parseDatePhrase("Monday 21 September 2026 - Saturday 23 January 2027", 2026), { start: "2026-09-21", end: "2027-01-23" });
  assert.deepEqual(C.parseDatePhrase("Thursday 1 October to Saturday 3 October 2026", 2026), { start: "2026-10-01", end: "2026-10-03" });
  assert.deepEqual(C.parseDatePhrase("Sunday 5 April 2026, Monday 6 April as Weekend Compensation", 2025), { start: "2026-04-05", end: "2026-04-05" });
  assert.deepEqual(C.parseDatePhrase("Saturday 1 and Sunday 2 May 2027", 2026), { start: "2027-05-01", end: "2027-05-02" });
  const html = '<div class="accordion__panel__title"> Key Dates of Academic Year 2026/27 </div> <article><div class="rte"> <p>Semesters</p> <ul> <li>Autumn Semester: Monday 21 September 2026 - Saturday 23 January 2027</li> </ul> <p>Registration</p> <ul> <li>PGR Students: Saturday 19 September 2026; Monday 15 February 2027</li> </ul> <p>Examination</p> <ul> <ul> <li>Autumn Semester: Monday 4 - Saturday 23 January 2027</li> <li>Late summer resits: <ul> <li>Year 1 Students:&nbsp;Monday 16 - Saturday 21 August 2027</li> </ul> </li> </ul> </ul> <p>Holidays</p> <ul> <li>Christmas &amp; Boxing Day: Friday 25 December and Saturday 26 December 2026</li> </ul></div></article>';
  const items = C.parseKeyDates(html, { id: "key-dates", organiser: "UNNC Key Dates", url: "https://www.nottingham.edu.cn/en/about/key-dates/key-dates.aspx" });
  const t = items.map((i) => i.title + " " + i.start.slice(0, 10) + ".." + i.end.slice(0, 10));
  assert.deepEqual(t, [
    "Autumn Semester 2026-09-21..2027-01-23",
    "Registration · PGR Students 2026-09-19..2026-09-19",
    "Registration · PGR Students 2027-02-15..2027-02-15",
    "Exams · Autumn Semester 2027-01-04..2027-01-23",
    "Exams · Late summer resits · Year 1 Students 2027-08-16..2027-08-21",
    "Holiday · Christmas & Boxing Day 2026-12-25..2026-12-26"
  ]);
});

test("key dates show as events, but long ones already under way are skipped", () => {
  const now = new Date(2026, 10, 17, 9, 0);
  const out = L.fromWebsite({ dates: [
    { id: "kd-a", title: "Autumn Semester", start: "2026-09-21T00:00", end: "2027-01-23T23:59", organiser: "UNNC Key Dates", url: "https://www.nottingham.edu.cn/x", topic: "academic" },
    { id: "kd-b", title: "Exams · Autumn Semester", start: "2027-01-04T00:00", end: "2027-01-23T23:59", organiser: "UNNC Key Dates", url: "https://www.nottingham.edu.cn/x", topic: "academic" }
  ] }, now);
  assert.deepEqual(out.events.map((e) => e.title), ["Exams · Autumn Semester"]);
  assert.equal(out.events[0].category, "academic");
  assert.ok(out.events[0].external);
});

test("Chinese pages: dates, link lists, and one item per event in both languages", () => {
  const C = require("../tools/crawl.js");
  assert.equal(C.findDate("重量级合作+1！ 2026年10月30日"), "2026-10-30");
  assert.equal(C.findDate("2026-11-14 18:21:02"), "2026-11-14");
  assert.equal(C.findDate("Posted 3rd Nov 2026"), "2026-11-03");
  const html = '<li><a href="https://www.163.com/dy/article/LBNDPUNJ05369NFG.html">宁波诺丁汉大学举行2026届冬季毕业典礼</a><span>2026-11-14 18:21</span></li>' +
    '<li><a href="/dy/article/AAA.html">短</a> 2026-11-13</li><li><a href="/other/x.html">不是文章的链接</a> 2026-11-13</li>';
  const items = C.parseLinkList(html, { id: "netease-unnc", item: "/dy/article/[A-Z0-9]+\\.html", url: "https://www.163.com/dy/media/T1.html", organiser: "UNNC", lang: "zh" });
  assert.equal(items.length, 1);
  assert.equal(items[0].date, "2026-11-14");
  assert.equal(items[0].url, "https://www.163.com/dy/article/LBNDPUNJ05369NFG.html");
  const merged = C.mergeLanguages([{ id: "g1", title: "Open Day", lang: "en" }, { id: "g1", title: "开放日", lang: "zh" }, { id: "g2", title: "只有中文", lang: "zh" }]);
  assert.deepEqual(merged.map((x) => [x.title, x.titleZh || ""]), [["Open Day", "开放日"], ["只有中文", ""]]);
  const L = require("../js/logic.js");
  const live = { news: [{ id: "g1", title: "Open Day", titleZh: "开放日", date: "2026-11-10", url: "https://www.nottingham.edu.cn/x" }] };
  const at = new Date(2026, 10, 17, 9);
  assert.equal(L.fromWebsite(live, at, "en").posts[0].title, "Open Day");
  assert.equal(L.fromWebsite(live, at, "zh").posts[0].title, "开放日");
  assert.equal(L.linkSource("https://www.163.com/dy/article/X.html").label, "Read on NetEase (网易)");
});
