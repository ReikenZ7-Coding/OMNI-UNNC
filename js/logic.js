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
    if (/competition|club|society|hackathon|challenge|union/.test(t)) return "clubs";
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
    fromWebsite: fromWebsite
  };
  root.OmniLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
