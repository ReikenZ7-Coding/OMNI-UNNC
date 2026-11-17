/*
 * OMNI-UNNC logic: small pure functions with no screen code, so they can be
 * tested on their own (see tests/logic.test.js).
 */
(function (root) {
  var DAY = 24 * 60 * 60 * 1000;

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function atTime(day, hhmm) {
    var p = hhmm.split(":");
    var d = new Date(day.getTime());
    d.setHours(Number(p[0]), Number(p[1]), 0, 0);
    return d;
  }

  // Turns "days from today" into real dates.
  function withDates(events, now) {
    var today = startOfDay(now);
    return events.map(function (e) {
      var day = new Date(today.getTime() + e.day * DAY);
      var endDay = e.endDay != null ? new Date(today.getTime() + e.endDay * DAY) : day;
      return Object.assign({}, e, { startAt: atTime(day, e.start), endAt: atTime(endDay, e.end) });
    });
  }

  function normalise(text) {
    return String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  }

  function words(text) {
    return normalise(text).split(" ").filter(Boolean);
  }

  function eventMatches(e, query) {
    var q = words(query);
    if (!q.length) return true;
    var hay = normalise([e.title, e.organiser, e.location, e.description, (e.tags || []).join(" ")].join(" "));
    return q.every(function (w) { return hay.indexOf(w) !== -1; });
  }

  // Registrations is an object: { eventId: { status: "registered" | "waitlist" } }
  function spotsLeft(e, registrations) {
    if (!e.capacity) return Infinity; // drop-in, no booking
    var mine = registrations && registrations[e.id] && registrations[e.id].status === "registered" ? 1 : 0;
    return Math.max(0, e.capacity - e.taken - mine);
  }

  function isDropIn(e) {
    return !e.capacity;
  }

  /*
   * filters = { query, category, when: "all" | "today" | "week", available: bool }
   * Returns upcoming events (not yet finished), soonest first.
   */
  function filterEvents(events, filters, now, registrations) {
    var f = filters || {};
    var today = startOfDay(now);
    var tomorrow = new Date(today.getTime() + DAY);
    var weekEnd = new Date(today.getTime() + 7 * DAY);
    return events
      .filter(function (e) { return e.endAt > now; })
      .filter(function (e) { return !f.category || f.category === "all" || e.category === f.category; })
      .filter(function (e) {
        if (f.when === "today") return e.startAt < tomorrow;
        if (f.when === "week") return e.startAt < weekEnd;
        return true;
      })
      .filter(function (e) {
        if (!f.available) return true;
        var mine = registrations && registrations[e.id];
        return isDropIn(e) || spotsLeft(e, registrations) > 0 || (mine && mine.status === "registered");
      })
      .filter(function (e) { return eventMatches(e, f.query); })
      .sort(function (a, b) { return a.startAt - b.startAt; });
  }

  /*
   * One tap: register if there is space, otherwise join the waitlist.
   * Returns a new registrations object (does not change the old one).
   */
  function register(e, registrations, student, now) {
    var next = Object.assign({}, registrations);
    var status = spotsLeft(e, registrations) > 0 ? "registered" : "waitlist";
    next[e.id] = { status: status, at: now.toISOString(), code: ticketCode(e.id, student.id) };
    return { registrations: next, status: status };
  }

  function cancel(eventId, registrations) {
    var next = Object.assign({}, registrations);
    delete next[eventId];
    return next;
  }

  // A short check-in code that is the same every time for one student + event.
  function ticketCode(eventId, studentId) {
    var s = eventId + "|" + studentId;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    for (var j = 0; j < 6; j++) {
      out += alphabet[h % alphabet.length];
      h = Math.floor(h / alphabet.length) + (j + 1) * 7919;
    }
    return out.slice(0, 3) + "-" + out.slice(3);
  }

  /*
   * Help routing: given what the student typed, rank offices and FAQs.
   * Each office has keywords; phrases like "residence permit" count as one.
   */
  function routeHelp(query, offices, faqs) {
    var text = " " + normalise(query) + " ";
    var qWords = words(query);
    if (!qWords.length) return { offices: [], faqs: [] };

    function keywordHits(keywords) {
      var hits = [];
      keywords.forEach(function (k) {
        var nk = normalise(k);
        var isCjk = /[㐀-鿿]/.test(nk);
        var found = isCjk ? text.indexOf(nk) !== -1 : text.indexOf(" " + nk + " ") !== -1 || (nk.length > 4 && text.indexOf(" " + nk) !== -1);
        if (found) hits.push(k);
      });
      return hits;
    }

    var officeScores = offices.map(function (o) {
      var hits = keywordHits(o.keywords);
      var nameHit = normalise(o.name).split(" ").some(function (w) { return w.length > 3 && qWords.indexOf(w) !== -1; });
      return { office: o, score: hits.length * 2 + (nameHit ? 1 : 0), hits: hits };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    var officeScoreById = {};
    officeScores.forEach(function (r) { officeScoreById[r.office.id] = r.score; });

    var faqScores = faqs.map(function (f) {
      var qn = " " + normalise(f.q + " " + f.a) + " ";
      var overlap = qWords.filter(function (w) { return w.length > 2 && qn.indexOf(" " + w) !== -1; }).length;
      return { faq: f, score: overlap + (officeScoreById[f.office] ? 1 : 0) };
    }).filter(function (r) { return r.score > 1; })
      .sort(function (a, b) { return b.score - a.score; });

    return { offices: officeScores, faqs: faqScores.slice(0, 4) };
  }


  /*
   * The Discover feed mixes events, notices and news.
   * filters = { kinds: {event, notice, news}, query, topic, when: "any" | "today" | "week" | "month",
   *             source, available, sort: "soonest" | "latest" }
   */
  function filterFeed(events, posts, filters, now, registrations) {
    var f = filters || {};
    var kinds = f.kinds || { event: true, notice: true, news: true };
    var today = startOfDay(now);
    var span = { today: 1, week: 7, month: 31 }[f.when] || 0;
    var items = [];
    if (kinds.event) {
      filterEvents(events, { query: f.query, category: f.topic, available: f.available }, now, registrations).forEach(function (e) {
        if (span && e.startAt >= new Date(today.getTime() + span * DAY)) return;
        items.push(Object.assign({ kind: "event", postedAt: new Date(today.getTime() + e.posted * DAY) }, e));
      });
    }
    posts.forEach(function (p) {
      if (!kinds[p.kind]) return;
      if (f.available) return; // notices and news have no places
      var postedAt = new Date(today.getTime() + p.posted * DAY);
      if (span && postedAt < new Date(today.getTime() - (span - 1) * DAY)) return;
      if (f.topic && f.topic !== "all" && p.topic !== f.topic) return;
      var hay = { title: p.title, organiser: p.organiser, location: "", description: p.body, tags: [] };
      if (!eventMatches(hay, f.query)) return;
      items.push(Object.assign({ postedAt: postedAt }, p));
    });
    var filtered = items.filter(function (it) { return !f.source || f.source === "all" || it.source === f.source; });
    if (f.sort === "latest") {
      filtered.sort(function (a, b) { return b.postedAt - a.postedAt; });
    } else {
      // Soonest first: events by start time, then notices and news newest first.
      filtered.sort(function (a, b) {
        if (a.kind === "event" && b.kind === "event") return a.startAt - b.startAt;
        if (a.kind === "event") return -1;
        if (b.kind === "event") return 1;
        return b.postedAt - a.postedAt;
      });
    }
    return filtered;
  }

  // "What to eat?" picks a random shop; pass a random number in [0, 1) so it can be tested.
  function pickFood(places, rand) {
    var all = [];
    places.forEach(function (pl) { pl.shops.forEach(function (sh) { all.push({ place: pl, shop: sh }); }); });
    return all[Math.floor(rand * all.length) % all.length];
  }

  // Masks a student ID for display, e.g. 20512345 -> 205***45
  function maskId(id) {
    var s = String(id || "");
    return s.length > 5 ? s.slice(0, 3) + "***" + s.slice(-2) : s;
  }


  // Whole days between today and a "YYYY-MM-DD" date (negative = in the past).
  function dayOffset(isoDate, now) {
    var p = String(isoDate).slice(0, 10).split("-").map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    var d = new Date(p[0], p[1] - 1, p[2]);
    return Math.round((d - startOfDay(now)) / DAY);
  }

  // Guess a topic for an item from the UNNC website from words in its title.
  function guessTopic(text) {
    var t = String(text || "").toLowerCase();
    if (/career|employ|intern|job|recruit|fair|alumni/.test(t)) return "careers";
    if (/sport|football|basketball|badminton|run|marathon|fitness|cup/.test(t)) return "sports";
    if (/wellbeing|well-being|mental|health|counsel|mindful/.test(t)) return "wellbeing";
    if (/festival|culture|cultural|music|concert|art|film|exhibition|calligraphy|chinese new year|lantern/.test(t)) return "culture";
    if (/招聘|实习|就业|宣讲/.test(t)) return "careers";
    if (/比赛|球|运动|健身|跑/.test(t)) return "sports";
    if (/心理|健康/.test(t)) return "wellbeing";
    if (/文化|音乐|电影|展览|节/.test(t)) return "culture";
    if (/competition|club|society|hackathon|challenge|union|game|社团|学生会|招新/.test(t)) return "clubs";
    return "academic";
  }

  /*
   * Turns crawled UNNC website data (data/live.json) into OMNI events and posts.
   * live = { events: [{id, title, start, end, location, organiser, url, summary}], news: [{id, title, date, url, summary, organiser}] }
   */
  function fromWebsite(live, now) {
    var out = { events: [], posts: [] };
    if (!live) return out;
    (live.events || []).forEach(function (e) {
      if (!e || !e.id || !e.title || !e.start) return;
      var day = dayOffset(e.start, now);
      if (day == null) return;
      var endDay = e.end ? dayOffset(e.end, now) : day;
      var st = /T(\d\d:\d\d)/.exec(e.start), en = /T(\d\d:\d\d)/.exec(e.end || "");
      out.events.push({
        id: "web-" + e.id, title: String(e.title).slice(0, 160), category: guessTopic(e.title + " " + (e.summary || "")),
        organiser: e.organiser || "UNNC", source: "web", day: day, endDay: endDay == null ? day : endDay,
        start: st ? st[1] : "00:00", end: en ? en[1] : "23:59", location: e.location || "See event page",
        capacity: 0, taken: 0, tags: [], description: e.summary || "", zh: e.summaryZh || "", url: e.url,
        image: e.image || "", external: true, posted: Math.min(day, 0) - 1
      });
    });
    (live.news || []).forEach(function (n) {
      if (!n || !n.id || !n.title || !n.date) return;
      var posted = dayOffset(n.date, now);
      if (posted == null) return;
      out.posts.push({
        id: "web-" + n.id, kind: n.kind === "notice" ? "notice" : "news", title: String(n.title).slice(0, 200),
        organiser: n.organiser || "UNNC", source: "web", posted: posted, topic: guessTopic(n.title),
        body: n.summary || "", zh: n.summaryZh || "", url: n.url, image: n.image || "", external: true
      });
    });
    return out;
  }

  // ---------- Snap or paste to post ----------

  var TOPIC_IDS = ["academic", "careers", "clubs", "sports", "culture", "wellbeing"];
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  function pad2(n) { return String(n).padStart(2, "0"); }
  function isoDate(y, m, d) { return y + "-" + pad2(m) + "-" + pad2(d); }
  function validDate(y, m, d) {
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var x = new Date(y, m - 1, d);
    return x.getMonth() === m - 1 && x.getDate() === d;
  }
  // A date written without a year means the next time that day comes round.
  function withYear(m, d, now) {
    var y = now.getFullYear();
    if (new Date(y, m - 1, d) < startOfDay(now).getTime() - 30 * DAY) y += 1;
    return validDate(y, m, d) ? isoDate(y, m, d) : "";
  }
  function cleanTime(t) {
    var m = String(t || "").trim().match(/^(\d{1,2})[:.：](\d{2})\s*(am|pm)?/i);
    if (!m || +m[1] > 23 || +m[2] > 59) return "";
    var h = +m[1], ap = (m[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return pad2(h) + ":" + m[2];
  }
  function clip(s, n) { return String(s == null ? "" : s).replace(/\s+\n/g, "\n").trim().slice(0, n); }

  /*
   * Checks what the AI (or the guesser below) read from a poster or message and
   * keeps only values the posting form can use. Anything doubtful becomes "".
   */
  function cleanExtract(raw, now) {
    raw = raw && typeof raw === "object" ? raw : {};
    var kind = ["event", "notice", "news"].indexOf(raw.kind) >= 0 ? raw.kind : "event";
    var date = "";
    var dm = String(raw.date || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dm && validDate(+dm[1], +dm[2], +dm[3])) date = isoDate(+dm[1], +dm[2], +dm[3]);
    var title = clip(raw.title, 120);
    var body = clip(raw.description || raw.body, 1500);
    return {
      kind: kind,
      title: title,
      organiser: clip(raw.organiser || raw.organizer, 80),
      topic: TOPIC_IDS.indexOf(raw.topic) >= 0 ? raw.topic : guessTopic(title + " " + body + " " + (raw.organiser || "")),
      date: date,
      start: cleanTime(raw.start),
      end: cleanTime(raw.end),
      location: clip(raw.location, 100),
      capacity: raw.capacity > 0 && raw.capacity <= 5000 ? Math.round(raw.capacity) : null,
      body: body,
      zh: clip(raw.zh, 1500),
      link: (linkSource(raw.link) || {}).url || ""
    };
  }

  /*
   * A no-AI fallback: pulls a title, date, time and place out of pasted text
   * using patterns students actually see ("Fri 20 Nov, 18:00-20:00",
   * "11月20日 晚上7点", "地点：图书馆"). Less clever than the AI, works offline.
   */
  function guessFromText(text, now) {
    var t = String(text || "").replace(/\r/g, "");
    var lines = t.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var out = { kind: "event" };
    var url = t.match(/https?:\/\/[^\s<>"'，。）)]+/i);
    if (url) { out.link = url[0]; t = t.replace(url[0], " "); }
    lines = t.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var title = lines.find(function (l) { return !/^(date|time|when|where|venue|location|地点|时间|日期)\s*[:：]/i.test(l); }) || "";
    out.title = title.replace(/^#+\s*/, "").replace(/[【】\[\]]/g, " ").replace(/\s+/g, " ").trim();
    var m;
    if ((m = t.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/))) out.date = validDate(+m[1], +m[2], +m[3]) ? isoDate(+m[1], +m[2], +m[3]) : "";
    else if ((m = t.match(/(\d{1,2})月(\d{1,2})[日号]/))) out.date = withYear(+m[1], +m[2], now);
    else if ((m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?/i)))
      out.date = m[3] ? (validDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) ? isoDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]) : "") : withYear(MONTHS[m[2].toLowerCase()], +m[1], now);
    else if ((m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i)))
      out.date = m[3] ? (validDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) ? isoDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]) : "") : withYear(MONTHS[m[1].toLowerCase()], +m[2], now);
    else if (/\btomorrow\b|明天/i.test(t)) { var tm = new Date(now.getTime() + DAY); out.date = isoDate(tm.getFullYear(), tm.getMonth() + 1, tm.getDate()); }
    else if (/\btoday\b|tonight|今天|今晚/i.test(t)) out.date = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

    if ((m = t.match(/(\d{1,2})[:.：](\d{2})\s*(am|pm)?\s*(?:-|–|—|~|～|to|至|到)\s*(\d{1,2})[:.：](\d{2})\s*(am|pm)?/i))) {
      out.start = to24(+m[1], m[2], m[3] || m[6]); out.end = to24(+m[4], m[5], m[6]);
    } else if ((m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i))) {
      out.start = to24(+m[1], m[2] || "00", m[3]);
    } else if ((m = t.match(/(\d{1,2})[:.：](\d{2})/))) {
      out.start = to24(+m[1], m[2]);
    } else if ((m = t.match(/(上午|下午|晚上)?\s*(\d{1,2})\s*[点時时](半)?/))) {
      var h = +m[2]; if ((m[1] === "下午" || m[1] === "晚上") && h < 12) h += 12;
      out.start = pad2(h) + ":" + (m[3] ? "30" : "00");
    }
    if (out.start && !out.end) { var sh = +out.start.slice(0, 2); out.end = sh < 22 ? pad2(sh + 2) + out.start.slice(2) : "23:59"; }

    if ((m = t.match(/(?:where|venue|location|place|room|地点|地址|场地)\s*[:：]\s*([^\n]+)/i))) out.location = m[1].trim();
    if ((m = t.match(/(?:organi[sz]ed by|organi[sz]er|host(?:ed by)?|主办方?|主辦)\s*[:：]?\s*([^\n]+)/i))) out.organiser = m[1].trim();
    if (/讲座|lecture|seminar|talk|workshop|活动|event|party|night|match|比赛|competition|fair/i.test(t) || out.start) out.kind = "event";
    else out.kind = "notice";
    var rest = lines.filter(function (l) { return l !== title && !/^(date|time|when|where|venue|location|place|organi[sz]e[dr]|host|时间|日期|地点|地址|场地|主办)/i.test(l); }).join("\n");
    if (/[一-鿿]/.test(t) && !/[a-z]{4,}/i.test(rest)) { out.zh = rest; out.description = ""; }
    else out.description = rest;
    return cleanExtract(out, now);
  }
  function to24(h, mm, ap) {
    ap = String(ap || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h <= 23 ? pad2(h) + ":" + mm : "";
  }

  // The prompt OMNI sends to Claude with a poster image or pasted message.
  function extractPrompt(text, now, hasImage) {
    return "You help students post campus events at the University of Nottingham Ningbo China into a campus app.\n" +
      "Today is " + isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()) + " (" + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()] + ").\n" +
      (hasImage ? "Read the attached poster or screenshot" + (text ? " and the pasted text below" : "") + ".\n" : "Read the pasted text below (it may be from WeChat, email or a poster).\n") +
      "Reply with only one JSON object with these keys:\n" +
      '{"kind":"event"|"notice"|"news", "title":string, "organiser":string, "topic":"academic"|"careers"|"clubs"|"sports"|"culture"|"wellbeing", ' +
      '"date":"YYYY-MM-DD" or "", "start":"HH:MM" (24h) or "", "end":"HH:MM" or "", "location":string, "capacity":number or null, "link":string (a full https link to the original post, portal page or sign-up form if one is written out, else ""), ' +
      '"description":string (2-4 plain English sentences: what it is, who it is for, how to join), "zh":string (a short Chinese description if the source has Chinese, else "")}\n' +
      "Use \"\" for anything not stated. Never invent a date, time or place. If no year is given, use the next upcoming date. " +
      "If there is no end time, leave end empty. Copy QR-code or sign-up instructions into the description." +
      (text ? "\n\nPASTED TEXT:\n" + String(text).slice(0, 6000) : "");
  }

  /*
   * Where a pasted link points, so OMNI can label the button ("Read on WeChat")
   * and file the post under the right source. Only http(s) links are accepted.
   */
  function linkSource(url) {
    var u = String(url || "").trim();
    var m = u.match(/^https?:\/\/([^\/?#\s:]+)(?::\d+)?((?:[\/?#][^\s]*)?)$/i);
    if (!m || u.length > 500 || m[1].indexOf(".") < 0) return null;
    var host = m[1].toLowerCase(), path = m[2] || "";
    var r = function (source, label) { return { url: u, source: source, label: label }; };
    if (/(^|\.)(weixin|wechat)\.(qq\.)?com$|^mp\.weixin\.qq\.com$/.test(host)) return r("wechat", "Read on WeChat");
    if (/moodle/.test(host) || /^\/moodle/i.test(path)) return r("moodle", "Open in Moodle");
    if (/(^|\.)nottingham\.edu\.cn$/.test(host)) return /^(www\.)?nottingham\.edu\.cn$/.test(host) ? r("web", "Read on UNNC website") : r("portal", "Open in the UNNC portal");
    if (/(^|\.)nottingham\.ac\.uk$/.test(host)) return r("web", "Open on University website");
    if (/(^|\.)(wjx\.(cn|top)|jinshuju\.(net|com)|forms\.office\.com|forms\.gle)$/.test(host) || /^docs\.(google|qq)\.com$/.test(host) && /form/i.test(path))
      return r("omni", "Open sign-up form");
    return r("omni", "Open original post");
  }

  // ---------- Email code sign-in ----------
  // OMNI proves someone is a UNNC student with a code sent to their university
  // email. It never asks for, or stores, a university password.
  var CODE_TTL = 10 * 60 * 1000, CODE_TRIES = 5, CODE_SENDS = 3, SEND_WINDOW = 60 * 60 * 1000;

  // "ssyxx1" or "SSYXX1@nottingham.edu.cn" -> "ssyxx1@nottingham.edu.cn"; anything else -> null
  function unncEmail(input) {
    var s = String(input || "").trim().toLowerCase();
    if (s.indexOf("@") < 0) s += "@nottingham.edu.cn";
    return /^[a-z0-9][a-z0-9._%+-]{0,63}@nottingham\.edu\.cn$/.test(s) ? s : null;
  }
  function maskEmail(email) {
    var p = String(email || "").split("@");
    if (p.length !== 2) return String(email || "");
    var u = p[0];
    return (u.length > 3 ? u.slice(0, 2) + "***" + u.slice(-1) : u[0] + "***") + "@" + p[1];
  }
  function makeCode(random) {
    var r = typeof random === "function" ? random() : Math.random();
    return String(Math.floor(r * 1e6)).padStart(6, "0");
  }
  // sends = times of earlier codes for this email; returns ms to wait, 0 = OK to send now
  function sendWait(sends, nowMs) {
    var recent = (sends || []).filter(function (t) { return nowMs - t < SEND_WINDOW; }).sort(function (a, b) { return a - b; });
    if (recent.length && nowMs - recent[recent.length - 1] < 30 * 1000) return 30 * 1000 - (nowMs - recent[recent.length - 1]);
    if (recent.length >= CODE_SENDS) return SEND_WINDOW - (nowMs - recent[0]);
    return 0;
  }
  // pending = {code, sentAt, tries}; returns "ok" | "wrong" | "expired" | "locked" | "format"
  function checkCode(pending, input, nowMs) {
    var c = String(input || "").replace(/\D/g, "");
    if (!pending) return "expired";
    if ((pending.tries || 0) >= CODE_TRIES) return "locked";
    if (nowMs - pending.sentAt > CODE_TTL) return "expired";
    if (c.length !== 6) return "format";
    return c === pending.code ? "ok" : "wrong";
  }

  // ---------- Import my calendar (.ics from Moodle or a timetable) ----------

  function icsDate(value, params) {
    var v = String(value || "").trim();
    var m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/.test(params || "")) return { at: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
    var at = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)))
      : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)); // TZID or floating: read as local (China) time
    return { at: at, allDay: false };
  }
  function icsText(s) { return String(s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim(); }

  /*
   * Reads a calendar file (Moodle "Export calendar", a timetable export, Outlook...).
   * Returns [{id, title, start, end, location, allDay, course}] sorted by start,
   * keeping items from 7 days ago up to `horizonDays` ahead. Weekly repeats are expanded.
   */
  function parseICS(text, now, horizonDays) {
    var lines = String(text || "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
    var from = startOfDay(now).getTime() - 7 * DAY, to = startOfDay(now).getTime() + (horizonDays || 180) * DAY;
    var out = [], cur = null;
    lines.forEach(function (line) {
      if (line === "BEGIN:VEVENT") { cur = {}; return; }
      if (line === "END:VEVENT") {
        if (cur && cur.start) expand(cur);
        cur = null; return;
      }
      if (!cur) return;
      var i = line.indexOf(":"); if (i < 0) return;
      var head = line.slice(0, i), val = line.slice(i + 1);
      var name = head.split(";")[0].toUpperCase(), params = head.slice(name.length);
      if (name === "SUMMARY") cur.title = icsText(val);
      else if (name === "LOCATION") cur.location = icsText(val);
      else if (name === "CATEGORIES") cur.course = icsText(val);
      else if (name === "UID") cur.uid = val.trim();
      else if (name === "DTSTART") cur.start = icsDate(val, params);
      else if (name === "DTEND") cur.end = icsDate(val, params);
      else if (name === "RRULE") cur.rrule = val;
    });
    function push(c, startMs, n) {
      if (startMs < from || startMs > to) return;
      var len = c.end ? c.end.at - c.start.at : 0;
      out.push({
        id: "cal-" + hash((c.uid || c.title || "") + "|" + startMs) + (n ? "-" + n : ""),
        title: (c.title || "Untitled").slice(0, 160), location: (c.location || "").slice(0, 120), course: (c.course || "").slice(0, 80),
        start: new Date(startMs).toISOString(), end: new Date(startMs + Math.max(0, len)).toISOString(), allDay: c.start.allDay
      });
    }
    function expand(c) {
      var s = c.start.at.getTime();
      var r = c.rrule ? Object.fromEntries(c.rrule.split(";").map(function (p) { return p.split("="); })) : null;
      if (!r || (r.FREQ !== "WEEKLY" && r.FREQ !== "DAILY")) { push(c, s, 0); return; }
      var step = (r.FREQ === "DAILY" ? 1 : 7) * (+r.INTERVAL || 1) * DAY;
      var count = +r.COUNT || 60, until = r.UNTIL ? (icsDate(r.UNTIL) || {}).at : null;
      for (var n = 0; n < Math.min(count, 120); n++) {
        var at = new Date(c.start.at); at.setDate(at.getDate() + n * step / DAY);
        if (until && at > until) break;
        if (at.getTime() > to) break;
        push(c, at.getTime(), n);
      }
    }
    var seen = {};
    return out.filter(function (e) { if (seen[e.id]) return false; seen[e.id] = 1; return true; })
      .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  var api = {
    DAY: DAY,
    startOfDay: startOfDay,
    withDates: withDates,
    eventMatches: eventMatches,
    spotsLeft: spotsLeft,
    isDropIn: isDropIn,
    filterEvents: filterEvents,
    register: register,
    cancel: cancel,
    ticketCode: ticketCode,
    routeHelp: routeHelp,
    filterFeed: filterFeed,
    pickFood: pickFood,
    maskId: maskId,
    dayOffset: dayOffset,
    guessTopic: guessTopic,
    fromWebsite: fromWebsite,
    cleanExtract: cleanExtract,
    guessFromText: guessFromText,
    extractPrompt: extractPrompt,
    parseICS: parseICS,
    linkSource: linkSource,
    unncEmail: unncEmail,
    maskEmail: maskEmail,
    makeCode: makeCode,
    sendWait: sendWait,
    checkCode: checkCode,
    CODE_TRIES: CODE_TRIES
  };
  root.OmniLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
