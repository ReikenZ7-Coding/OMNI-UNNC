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
      return Object.assign({}, e, { startAt: atTime(day, e.start), endAt: atTime(day, e.end) });
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
    maskId: maskId
  };
  root.OmniLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
