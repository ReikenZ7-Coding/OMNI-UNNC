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
