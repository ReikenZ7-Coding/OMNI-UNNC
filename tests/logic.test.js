// Run with: npm test   (or: node --test tests/)
const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../js/data.js");
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
