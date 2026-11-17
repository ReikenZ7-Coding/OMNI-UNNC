/*
 * OMNI-UNNC screens.
 *
 * How it works, in short:
 *  - The address after "#" decides the screen (see route() near the bottom):
 *    #home, #discover, #event-<id>, #post-<id>, #help, #office-<id>, #tools,
 *    #tool-<id>, #food, #place-<id>, #me, #my-events, #saved, #prefs.
 *  - Everything the student does (sign-in, registrations, saves, reminders,
 *    room bookings, help requests) is saved in this browser with localStorage.
 *    There is no server yet.
 *  - Sign-in is a demo. A real version would use the university's own single
 *    sign-on, so students log in once and every feature trusts it.
 */
(function () {
  "use strict";

  var D = window.OMNI_DATA;
  var L = window.OmniLogic;
  var I = window.OmniIcon;
  var STORE_KEY = "omni-unnc-v1";
  var view = document.getElementById("view");
  var tabs = document.getElementById("tabs");
  var actionBar = document.getElementById("actionbar");
  var toastEl = document.getElementById("toast");

  // ---------- Saved state ----------
  function blankState() {
    return {
      student: null, registrations: {}, requests: [], logins: 0,
      saved: {}, reminders: {}, bookings: {}, pins: D.defaultPins.slice(),
      printCredit: 23.4, localPosts: [], calendar: null, prefs: { theme: "system", lang: "en", remind: "60", notify: true }
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = Object.assign(blankState(), JSON.parse(raw));
        s.prefs = Object.assign(blankState().prefs, s.prefs);
        return s;
      }
    } catch (e) { /* storage blocked: run without saving */ }
    return blankState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  var state = load();

  // Screen-only state (not saved)
  var ui = {
    query: "", topic: "all", when: "any", source: "all", available: false, sort: "soonest",
    kinds: { event: true, notice: true, news: true }, showFilters: false,
    helpQuery: "", myTab: "upcoming", lang: null, toolQuery: "", editPins: false,
    foodQuery: "", foodPick: null, mapQuery: "", ttDay: null, confirm: null, newKind: "event",
    snapText: "", snapFile: null, snapBusy: false, snapMsg: "",
    signin: { step: "email", name: "", email: "", pending: null, sends: {}, error: "" }
  };
  // "Fill it in for me": Claude reads a poster or pasted message (only inside claude.ai).
  var AI = { sample: null, images: null, ctl: null };

  function now() { return new Date(); }

  // ---------- Live data ----------
  // 1. WEB: real news and events read from UNNC's public website by tools/crawl.js.
  var WEB = { events: [], posts: [], updatedAt: null };
  function setWebData(live) {
    var c = L.fromWebsite(live, now());
    WEB.events = c.events; WEB.posts = c.posts; WEB.updatedAt = live && live.updatedAt;
  }
  if (window.OMNI_LIVE) setWebData(window.OMNI_LIVE);

  // 2. COMMUNITY: events and notices people post in OMNI. Shared live through the
  //    page's database when there is one, otherwise kept on this device.
  var COMM = { db: null, me: null, owner: false, canWrite: null, posts: [], regs: [], status: "local" };
  var TIME = /^\d{2}:\d{2}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
  function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
  function cleanPost(id, d) {
    if (!d || typeof d !== "object") return null;
    var kind = ["event", "notice", "news"].indexOf(d.kind) !== -1 ? d.kind : null;
    var title = str(d.title, 120);
    if (!kind || !title) return null;
    var p = { id: String(id), kind: kind, title: title, organiser: str(d.organiser, 80) || "A student", topic: D.categories.some(function (c) { return c.id === d.topic; }) ? d.topic : "clubs",
      body: str(d.body, 1500), zh: str(d.zh, 1500), createdBy: str(d.createdBy, 80), createdAt: DATE.test(String(d.createdAt).slice(0, 10)) ? String(d.createdAt) : new Date().toISOString() };
    var link = L.linkSource(d.url);
    if (link) { p.url = link.url; p.source = link.source; p.linkLabel = link.label; }
    if (kind === "event") {
      if (!DATE.test(d.date) || !TIME.test(d.start) || !TIME.test(d.end)) return null;
      p.date = d.date; p.start = d.start; p.end = d.end; p.location = str(d.location, 100) || "To be confirmed";
      p.capacity = Math.max(0, Math.min(5000, parseInt(d.capacity, 10) || 0));
    }
    return p;
  }
  function communityRaw() {
    return COMM.db ? COMM.posts : (state.localPosts || []).map(function (p) { return cleanPost(p.id, p); }).filter(Boolean);
  }
  function takenFor(cid) {
    return COMM.regs.filter(function (r) { return r.event === cid && r.status === "registered" && r.by !== COMM.me; }).length;
  }
  function communityEvents() {
    return communityRaw().filter(function (p) { return p.kind === "event"; }).map(function (p) {
      var day = L.dayOffset(p.date, now());
      return { id: "c-" + p.id, cid: p.id, title: p.title, category: p.topic, organiser: p.organiser, source: p.source || "omni", url: p.url, linkLabel: p.linkLabel, day: day, start: p.start, end: p.end < p.start ? "23:59" : p.end,
        location: p.location, capacity: p.capacity, taken: Math.min(p.capacity, takenFor(p.id)), tags: [], description: p.body, zh: p.zh,
        posted: L.dayOffset(p.createdAt, now()) || 0, community: true, createdBy: p.createdBy };
    }).filter(function (e) { return e.day != null; });
  }
  function communityPosts() {
    return communityRaw().filter(function (p) { return p.kind !== "event"; }).map(function (p) {
      return { id: "c-" + p.id, cid: p.id, kind: p.kind, title: p.title, organiser: p.organiser, source: p.source || "omni", url: p.url, linkLabel: p.linkLabel, posted: L.dayOffset(p.createdAt, now()) || 0,
        topic: p.topic, body: p.body, zh: p.zh, community: true, createdBy: p.createdBy };
    });
  }
  function allPosts() { return D.posts.concat(WEB.posts, communityPosts()); }
  function events() { return L.withDates(D.events.concat(WEB.events, communityEvents()), now()); }
  function canDelete(it) { return it && it.community && (!COMM.db || it.createdBy === COMM.me || COMM.owner); }
  function eventById(id) { return events().find(function (e) { return e.id === id; }); }
  function postById(id) { return allPosts().find(function (p) { return p.id === id; }); }
  function officeById(id) { return D.offices.find(function (o) { return o.id === id; }); }
  function toolById(id) { return D.tools.find(function (t) { return t.id === id; }); }
  function placeById(id) { return D.food.find(function (p) { return p.id === id; }); }
  function categoryLabel(id) {
    var c = D.categories.find(function (c) { return c.id === id; });
    return c ? c.label : id;
  }

  // ---------- Small helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
  function dayWord(d) {
    var diff = Math.round((L.startOfDay(d) - L.startOfDay(now())) / L.DAY);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  function allDay(e) { return e.start === "00:00" && e.end === "23:59"; }
  function when(e) {
    if (!sameDay(e.startAt, e.endAt)) return dayWord(e.startAt) + " to " + dayWord(e.endAt) + (allDay(e) ? "" : " · " + e.start + " to " + e.end);
    return dayWord(e.startAt) + " · " + (allDay(e) ? "All day" : e.start + " to " + e.end);
  }
  function postedWord(d) {
    var w = dayWord(d);
    return w === "Today" || w === "Yesterday" ? w : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "S";
  }
  function firstName() { return state.student ? state.student.name.split(" ")[0] : ""; }
  function lang() { return ui.lang || state.prefs.lang; }
  function isUpcoming(e) { return e.endAt > now(); }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function applyTheme() {
    var t = state.prefs.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else if (applyTheme.touched) document.documentElement.removeAttribute("data-theme");
    applyTheme.touched = true;
  }

  // ---------- Shared pieces ----------
  function posterHtml(e, size) {
    var words = e.title.replace(/[:]/g, "").split(" ");
    return '<div class="poster p-' + e.category + (size ? " " + size : "") + '" aria-hidden="true">' +
      (e.image ? '<img class="poster-img" alt="" loading="lazy" src="' + esc(e.image) + '">' : "") +
      '<span class="poster-org">' + esc(e.organiser) + "</span>" +
      '<span class="poster-title">' + esc(words.slice(0, size === "thumb" ? 3 : 7).join(" ")) + "</span>" +
      '<span class="poster-date">' + esc(e.startAt.getDate() + " " + e.startAt.toLocaleDateString("en-GB", { month: "short" }).toUpperCase() + (allDay(e) ? "" : " · " + e.start)) + "</span></div>";
  }

  function statusPill(e) {
    var mine = state.registrations[e.id];
    if (!isUpcoming(e)) return '<span class="pill plain">Finished</span>';
    if (e.external) return '<span class="pill live">' + I("globe") + " UNNC website</span>";
    if (mine && mine.status === "registered") return '<span class="pill ok">' + I("check") + " You're going</span>";
    if (mine && mine.status === "waitlist") return '<span class="pill low">On waitlist</span>';
    if (L.isDropIn(e)) return '<span class="pill info">Drop-in</span>';
    var left = L.spotsLeft(e, state.registrations);
    if (left === 0) return '<span class="pill full">Full · waitlist</span>';
    if (left <= 10) return '<span class="pill low">' + left + (left === 1 ? " place" : " places") + " left</span>";
    return '<span class="pill reg">Registration required</span>';
  }

  function registerButton(e, size) {
    var mine = state.registrations[e.id];
    if (e.external || L.isDropIn(e) || !isUpcoming(e) || mine) return "";
    var full = L.spotsLeft(e, state.registrations) === 0;
    return '<button class="btn ' + (full ? "secondary " : "") + (size || "") + '" data-act="register" data-id="' + e.id + '">' + (full ? "Join waitlist" : "Register") + "</button>";
  }

  function saveButton(id) {
    var on = !!state.saved[id];
    return '<button class="icon-btn' + (on ? " on" : "") + '" data-act="save" data-id="' + id + '" aria-pressed="' + on + '" aria-label="' + (on ? "Remove from saved" : "Save") + '">' + I("bookmark") + "</button>";
  }

  function sourceLine(it) {
    if (it.feed) return '<span class="live-dot quiet"></span>Live from ' + esc(it.source === "wechat" ? "WeChat" : D.sources[it.source] || "the web");
    if (it.source === "web") return '<span class="live-dot quiet"></span>Live from UNNC website';
    if (it.community) return '<span class="live-dot quiet"></span>Posted in OMNI';
    return "From " + esc(D.sources[it.source]);
  }
  function updatedWord(iso) {
    if (!iso) return "";
    var mins = Math.round((now() - new Date(iso)) / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return mins + " min ago";
    if (mins < 60 * 24) return Math.round(mins / 60) + " h ago";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function kindLabel(k) { return { event: "Event", notice: "Notice", news: "News" }[k]; }

  function feedCard(it) {
    if (it.kind === "event") {
      return '<article class="fcard" data-open="event-' + it.id + '" tabindex="0">' +
        posterHtml(it, "thumb") +
        '<div class="fcard-body">' +
          '<div class="fcard-top"><span class="kind k-event">Event</span><span class="org">' + esc(it.organiser) + "</span></div>" +
          '<h3 class="fcard-title">' + esc(it.title) + "</h3>" +
          '<div class="meta">' + esc(when(it)) + "</div>" +
          '<div class="meta">' + esc(it.location) + "</div>" +
          '<div class="tags">' + statusPill(it) + '<span class="pill tag t-' + it.category + '">' + esc(categoryLabel(it.category)) + "</span></div>" +
          '<div class="fcard-foot"><span class="meta small">' + sourceLine(it) + "</span>" + saveButton(it.id) + registerButton(it, "small") + "</div>" +
        "</div></article>";
    }
    return '<article class="fcard" data-open="post-' + it.id + '" tabindex="0">' +
      '<div class="post-icon k-' + it.kind + '">' + I(it.kind === "notice" ? "bell" : "news") + "</div>" +
      '<div class="fcard-body">' +
        '<div class="fcard-top"><span class="kind k-' + it.kind + '">' + kindLabel(it.kind) + '</span><span class="org">' + esc(it.organiser) + "</span></div>" +
        '<h3 class="fcard-title">' + esc(it.title) + "</h3>" +
        (it.body ? '<p class="meta clamp">' + esc(it.body) + "</p>" : it.feed ? '<p class="meta">' + esc(it.linkLabel || "Open original") + " for the full article</p>" : "") +
        '<div class="fcard-foot"><span class="meta small">' + (it.source === "web" || it.community || it.feed ? sourceLine(it) + " · " : "") + "Posted " + esc(postedWord(it.postedAt)) + "</span>" + saveButton(it.id) + "</div>" +
      "</div></article>";
  }

  function ticketHtml(e, mine) {
    var wait = mine.status === "waitlist";
    return '<a class="ticket' + (wait ? " waitlist" : "") + '" href="#event-' + e.id + '">' +
      '<div class="ticket-main"><span class="eyebrow">' + (wait ? "Waitlist" : "Your ticket") + "</span>" +
        '<span class="ticket-title">' + esc(e.title) + "</span>" +
        '<span class="meta">' + esc(when(e)) + '</span><span class="meta">' + esc(e.location) + "</span></div>" +
      '<div class="ticket-code"><span>' + (wait ? "Ref" : "Check-in") + "</span><b>" + esc(mine.code) + "</b></div></a>";
  }

  function pageHead(title, opts) {
    opts = opts || {};
    return '<header class="page-head"><h1>' + esc(title) + "</h1>" + (opts.right || "") + "</header>";
  }

  function backBar(href, label, title) {
    return '<div class="backbar"><a class="back-pill" href="#' + href + '">' + I("back") + esc(label) + "</a>" +
      (title ? '<span class="backbar-title">' + esc(title) + "</span>" : "") + "</div>";
  }

  function sectionHead(title, link) {
    return '<div class="section-head"><h2>' + esc(title) + "</h2>" + (link || "") + "</div>";
  }

  function rowLink(href, iconName, tint, title, sub, right) {
    return '<a class="row-link" href="#' + href + '"><span class="tile t-' + tint + '">' + I(iconName) + "</span>" +
      '<span class="row-text"><b>' + esc(title) + "</b>" + (sub ? "<span>" + esc(sub) + "</span>" : "") + "</span>" +
      (right || "") + I("chevron", "chev") + "</a>";
  }

  function searchBox(id, value, placeholder) {
    return '<div class="search">' + I("search") + '<input class="input" id="' + id + '" type="search" placeholder="' + esc(placeholder) + '" aria-label="' + esc(placeholder) + '" value="' + esc(value) + '"></div>';
  }

  function langSwitch() {
    return '<div class="segmented small" role="group" aria-label="Language">' +
      '<button data-lang="zh" aria-pressed="' + (lang() === "zh") + '">中文</button>' +
      '<button data-lang="en" aria-pressed="' + (lang() === "en") + '">English</button></div>';
  }

  function upcomingMine() {
    return events().filter(function (e) { return state.registrations[e.id] && isUpcoming(e); })
      .sort(function (a, b) { return a.startAt - b.startAt; });
  }

  // ---------- Screens ----------
  function screenSignIn() {
    var sources = Object.keys(D.sources).filter(function (k) { return k !== "omni"; }).map(function (k) { return '<span class="pill plain">' + esc(D.sources[k]) + "</span>"; }).join("");
    var si = ui.signin;
    var err = si.error ? '<p class="form-error" role="alert">' + I("info") + esc(si.error) + "</p>" : "";
    var form;
    if (si.step === "code" && si.pending) {
      var wait = L.sendWait(si.sends[si.email], Date.now());
      form = '<form class="card-panel stack" id="code-form" autocomplete="off">' +
        "<h2>Check your UNNC email</h2>" +
        '<p class="meta">We sent a 6-digit code to <b>' + esc(si.email) + "</b>. It works for 10 minutes. If you can't see it, check your Junk folder.</p>" +
        '<div class="demo-code">' + I("mail") + '<span>Demo: no email is really sent. Your code is <b>' + esc(si.pending.code) + "</b></span></div>" +
        '<div class="field"><label for="si-code">6-digit code</label><input class="input code-input" id="si-code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000000"></div>' +
        err +
        '<button class="btn block" type="submit">' + I("key") + "Sign in once</button>" +
        '<div class="row between"><button type="button" class="link-btn" data-act="si-back">Use a different email</button>' +
        '<button type="button" class="link-btn" data-act="si-resend"' + (wait ? " disabled" : "") + ">" + (wait ? "Resend in " + Math.ceil(wait / 1000) + "s" : "Send a new code") + "</button></div>" +
      "</form>";
    } else {
      form = '<form class="card-panel stack" id="signin-form" autocomplete="off">' +
        "<h2>Sign in with your UNNC email</h2>" +
        '<p class="meta">We email you a one-time code. OMNI never asks for your university password.</p>' +
        '<div class="field"><label for="si-name">Your name</label><input class="input" id="si-name" name="name" placeholder="e.g. Lin Yifan" maxlength="40" value="' + esc(si.name) + '"></div>' +
        '<div class="field"><label for="si-email">UNNC email</label><div class="email-field"><input class="input" id="si-email" name="email" type="text" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="e.g. ssyly12" maxlength="90" value="' + esc(si.email ? si.email.replace("@nottingham.edu.cn", "") : "") + '"><span class="email-domain">@nottingham.edu.cn</span></div></div>' +
        '<label class="toggle consent"><input type="checkbox" id="si-consent"' + (si.consent ? " checked" : "") + '> <span>I agree OMNI can keep my name and UNNC email to confirm I\'m a student and keep me signed in.</span></label>' +
        '<details class="privacy"><summary>What OMNI keeps, and why</summary><ul>' +
          "<li><b>Kept:</b> your name and UNNC email. Nothing else about you is collected at sign-in.</li>" +
          "<li><b>Why:</b> to check you're a UNNC student (only @nottingham.edu.cn emails work), and so organisers know who registered.</li>" +
          "<li><b>Never:</b> your university password, Moodle login or WeChat account.</li>" +
          "<li><b>Your choice:</b> sign out or delete your data any time in Me → Settings.</li></ul></details>" +
        err +
        '<button class="btn block" type="submit">' + I("mail") + "Send me a code</button>" +
        '<p class="demo-note">Student prototype. In this demo the code appears on screen instead of in your inbox, and everything stays on this device.</p>' +
      "</form>";
    }
    return '<section class="signin">' +
      '<div class="wordmark">OMNI<span>.</span></div>' +
      '<p class="signin-lede">Every campus event, campus tool and kind of help, in one place. <b>Sign in once</b> and you are done.</p>' +
      (si.step === "code" ? "" : '<div class="stack"><span class="eyebrow">Instead of checking</span><div class="scatter">' + sources + "</div></div>") +
      form + "</section>";
  }

  function featuredSlides() {
    // Real content only: the next upcoming events, then the newest news.
    var today = L.startOfDay(now());
    var soon = events().filter(function (e) { return e.startAt >= today; }).sort(function (a, b) { return a.startAt - b.startAt; }).slice(0, 3).map(function (e) { return e.id; });
    var newest = allPosts().filter(function (p) { return p.kind === "news"; }).sort(function (a, b) { return b.posted - a.posted; }).slice(0, 5 - soon.length).map(function (p) { return p.id; });
    var picks = soon.concat(newest);
    return picks.map(function (id) {
      var e = eventById(id);
      if (e) {
        return '<a class="slide p-' + e.category + '" href="#event-' + e.id + '"><span class="kind on-dark">Event · ' + esc(dayWord(e.startAt)) + "</span>" +
          '<span class="slide-title">' + esc(e.title) + '</span><span class="slide-meta">' + esc((allDay(e) ? "" : e.start + " · ") + e.location) + "</span></a>";
      }
      var p = postById(id);
      return '<a class="slide p-' + (p.kind === "news" ? "news" : "notice") + '" href="#post-' + p.id + '"><span class="kind on-dark">' + kindLabel(p.kind) + "</span>" +
        '<span class="slide-title">' + esc(p.title) + '</span><span class="slide-meta">' + esc(p.organiser) + "</span></a>";
    });
  }

  function screenHome() {
    var slides = featuredSlides();
    var dots = slides.map(function (_, i) { return '<button class="dot" data-slide="' + i + '" aria-label="Slide ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : "") + "></button>"; }).join("");
    var pinned = state.pins.map(toolById).filter(Boolean);
    var quick;
    if (ui.editPins) {
      quick = '<div class="quick-grid">' + D.tools.map(function (t) {
        var on = state.pins.indexOf(t.id) !== -1;
        return '<button class="quick' + (on ? " on" : " off") + '" data-pin="' + t.id + '" aria-pressed="' + on + '"><span class="tile t-' + t.tint + '">' + I(t.icon) + '<i class="pin-mark">' + I(on ? "check" : "plus") + "</i></span><span>" + esc(t.name) + "</span></button>";
      }).join("") + "</div>";
    } else {
      quick = '<div class="quick-grid">' + pinned.map(function (t) {
        return '<a class="quick" href="#' + toolHref(t) + '"><span class="tile t-' + t.tint + '">' + I(t.icon) + "</span><span>" + esc(t.name) + "</span></a>";
      }).join("") + "</div>";
    }
    var mine = upcomingMine().slice(0, 2);
    var myEvents = mine.length ? '<div class="stack">' + mine.map(function (e) { return ticketHtml(e, state.registrations[e.id]); }).join("") + "</div>" :
      '<div class="empty">' + I("calendar") + "<p>No upcoming events yet</p><a class=\"btn soft small\" href=\"#discover\">Discover events</a></div>";
    var latest = allPosts().slice().sort(function (a, b) { return b.posted - a.posted; }).slice(0, 3);
    var notices = latest.length ? '<div class="list-panel">' + latest.map(function (p) {
      return '<a class="row-link" href="#post-' + p.id + '"><span class="tile t-jade">' + I(p.kind === "notice" ? "bell" : "news") + '</span><span class="row-text"><b>' + esc(p.title) + "</b><span>" + esc(p.organiser + " · " + postedWord(new Date(L.startOfDay(now()).getTime() + p.posted * L.DAY))) + "</span></span>" + I("chevron", "chev") + "</a>";
    }).join("") + "</div>" : '<div class="empty">' + I("bell") + "<p>No updates yet</p><span class=\"meta\">News and notices from UNNC and official accounts will appear here.</span></div>";
    return '<header class="page-head"><div class="stack tight"><span class="eyebrow">' + esc(now().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + "</span>" +
        '<h1 class="brand">OMNI<span>.</span></h1></div>' +
        '<a class="round-btn" href="#discover" data-focus="q" aria-label="Search everything">' + I("search") + "</a></header>" +
      '<p class="hello">Hi ' + esc(firstName()) + ", here's what's on around campus.</p>" + liveStrip() +
      (slides.length ? '<section class="carousel-wrap" aria-label="Featured"><div class="carousel" id="carousel">' + slides.join("") + "</div>" +
        (slides.length > 1 ? '<div class="carousel-nav"><button class="nav-btn" data-step="-1" aria-label="Previous">' + I("back") + '</button><div class="dots">' + dots + '</div><button class="nav-btn" data-step="1" aria-label="Next">' + I("chevron") + "</button></div>" : "") + "</section>" : "") +
      '<section class="stack">' + sectionHead("Quick access", '<button class="link-btn" data-act="edit-pins">' + (ui.editPins ? "Done" : "Edit") + "</button>") +
        (ui.editPins ? '<p class="meta small">Tap a tool to add it to or remove it from your home screen.</p>' : "") +
        '<div class="card-panel">' + quick + "</div></section>" +
      '<a class="post-cta" href="#new"><span class="tile t-jade">' + I("plus") + '</span><span class="row-text"><b>Running an event?</b><span>Post it once in OMNI and everyone sees it straight away.</span></span>' + I("chevron", "chev") + "</a>" +
      '<section class="stack">' + sectionHead("My events", '<a class="link-btn" href="#my-events">All tickets ' + I("chevron") + "</a>") + myEvents + "</section>" +
      '<section class="stack">' + sectionHead("Latest updates", '<button class="link-btn" data-act="all-updates">All updates ' + I("chevron") + "</button>") +
        notices + "</section>";
  }

  function toolHref(t) {
    if (t.route) return t.route;
    if (t.help === true) return "help";
    if (t.help) return "office-" + t.help;
    return "tool-" + t.id;
  }

  function liveStrip() {
    var bits = [];
    var fromFeeds = WEB.posts.filter(function (p) { return p.feed; }).length;
    if (WEB.updatedAt) bits.push(WEB.events.length + " events and " + (WEB.posts.length - fromFeeds) + " news stories from the UNNC website" + (fromFeeds ? ", " + fromFeeds + " from official accounts" : "") + ", updated " + esc(updatedWord(WEB.updatedAt)));
    if (COMM.db) bits.push(communityRaw().length + " posted in OMNI");
    if (!bits.length) return "";
    return '<div class="live-strip"><span class="live-dot"></span><span>' + bits.join(" · ") + "</span></div>";
  }

  function screenDiscover() {
    var list = L.filterFeed(events(), allPosts(), ui, now(), state.registrations);
    if (ui.keyOnly) list = list.filter(isKeyDate);
    var quickNow = ui.keyOnly ? "keydates" : ui.source === "omni" ? "omni" : ui.when === "today" ? "today" : ui.when === "week" ? "week" : ui.when === "any" && ui.source === "all" ? "all" : "";
    var quickChips = [["all", "Everything"], ["today", "Today"], ["week", "This week"], ["keydates", "Exams & holidays"], ["omni", "Posted in OMNI"]].map(function (q) {
      return '<button class="chip" data-quick="' + q[0] + '" aria-pressed="' + (quickNow === q[0]) + '">' + q[1] + "</button>";
    }).join("");
    var kindTiles = [["notice", "Notices", "bell"], ["news", "News", "news"], ["event", "Events", "calendar"]].map(function (k) {
      var on = !!ui.kinds[k[0]];
      return '<button class="kind-tile k-' + k[0] + (on ? " on" : "") + '" data-kind="' + k[0] + '" aria-pressed="' + on + '">' + I(k[2]) + "<span>" + k[1] + '</span><i class="tick">' + I("check") + "</i></button>";
    }).join("");
    var topicLabel = ui.topic === "all" ? "All topics" : categoryLabel(ui.topic);
    var whenLabel = { any: "Any date", today: "Today", week: "This week", month: "This month" }[ui.when];
    var sourceLabel = ui.source === "all" ? "All sources" : D.sources[ui.source];
    var filters = "";
    if (ui.showFilters) {
      var topics = [{ id: "all", label: "All topics" }].concat(D.categories).map(function (c) {
        return '<button class="chip" data-topic="' + c.id + '" aria-pressed="' + (ui.topic === c.id) + '">' + esc(c.label) + "</button>";
      }).join("");
      var dates = [["any", "Any date"], ["today", "Today"], ["week", "This week"], ["month", "This month"]].map(function (w) {
        return '<button class="chip" data-when="' + w[0] + '" aria-pressed="' + (ui.when === w[0]) + '">' + w[1] + "</button>";
      }).join("");
      var sources = [["all", "All sources"]].concat(Object.keys(D.sources).map(function (k) { return [k, D.sources[k]]; })).map(function (s) {
        return '<button class="chip" data-source="' + s[0] + '" aria-pressed="' + (ui.source === s[0]) + '">' + esc(s[1]) + "</button>";
      }).join("");
      filters = '<div class="filter-panel card-panel">' +
        '<div class="stack tight"><span class="eyebrow">Topic</span><div class="chips wrap">' + topics + "</div></div>" +
        '<div class="stack tight"><span class="eyebrow">Date</span><div class="chips wrap">' + dates + "</div></div>" +
        '<div class="stack tight"><span class="eyebrow">Originally posted on</span><div class="chips wrap">' + sources + "</div></div>" +
        '<label class="toggle"><input type="checkbox" id="avail"' + (ui.available ? " checked" : "") + "> Only events with places left</label>" +
        '<div class="row"><button class="btn quiet small" data-act="clear">Reset filters</button><span class="spacer"></span><button class="btn small" data-act="filters">Show ' + list.length + " results</button></div></div>";
    }
    return pageHead("Discover", { right: '<a class="btn small" href="#new">' + I("plus") + "Post</a>" }) +
      liveStrip() +
      '<div class="kind-row" role="group" aria-label="Show">' + kindTiles + "</div>" +
      searchBox("q", ui.query, "Search titles, topics or keywords") +
      '<div class="chips" role="group" aria-label="Quick filters">' + quickChips + "</div>" +
      '<button class="filter-line" data-act="filters" aria-expanded="' + ui.showFilters + '"><span>' + esc(topicLabel + " · " + whenLabel + " · " + sourceLabel) + "</span><b>" + I("filter") + "Filter</b></button>" +
      filters +
      '<div class="section-head"><h2 class="muted-h">' + list.length + (list.length === 1 ? " result" : " results") + '</h2>' +
        '<label class="sort"><span class="sr">Sort</span><select id="sort" class="select"><option value="soonest"' + (ui.sort === "soonest" ? " selected" : "") + '>Events soonest first</option><option value="latest"' + (ui.sort === "latest" ? " selected" : "") + ">Latest posted first</option></select></label></div>" +
      '<section class="feed" aria-live="polite">' +
        (list.length ? list.map(feedCard).join("") : ui.source === "omni" && !ui.query ?
          '<div class="empty">' + I("plus") + '<p>Nothing posted in OMNI yet</p><span class="meta">Running an event or have news for students? Be the first.</span><a class="btn small" href="#new">Post to OMNI</a></div>' :
          '<div class="empty"><p>Nothing matches those filters.</p><button class="btn secondary small" data-act="clear">Reset filters</button></div>') +
      "</section>";
  }

  function isKeyDate(it) { return /^web-kd-/.test(it.id); }

  function screenEvent(id) {
    var e = eventById(id);
    if (!e) return backBar("discover", "Events") + '<div class="empty">That event could not be found.</div>';
    var mine = state.registrations[e.id];
    var filled = e.capacity ? Math.min(100, Math.round(((e.taken + (mine && mine.status === "registered" ? 1 : 0)) / e.capacity) * 100)) : 0;
    var banner;
    if (!isUpcoming(e)) banner = '<div class="banner plain">' + I("clock") + "This event has finished</div>";
    else if (e.external) banner = '<div class="banner live">' + I("globe") + "Live from the UNNC website. Details and any registration are on the original page.</div>";
    else if (mine && mine.status === "registered") banner = '<div class="banner ok">' + I("checkCircle") + "You're registered. Show your check-in code at the door.</div>";
    else if (mine) banner = '<div class="banner low">' + I("clock") + "You're on the waitlist. We'll tell you if a place opens.</div>";
    else if (L.isDropIn(e)) banner = '<div class="banner info">' + I("checkCircle") + "No registration needed. Just turn up.</div>";
    else banner = '<div class="banner info">' + I("checkCircle") + "Registration required · register right here, in one tap</div>";
    var places = e.capacity ? '<div class="fact">' + I("ticket") + '<span class="fact-k">Places</span><span class="fact-v"><span>' + L.spotsLeft(e, state.registrations) + " of " + e.capacity + ' left</span><span class="meter" role="img" aria-label="' + filled + '% full"><i style="width:' + filled + '%"></i></span></span></div>' : "";
    return backBar("discover", "Events", "Event details") +
      posterHtml(e, "hero") +
      '<section class="stack tight"><span class="eyebrow accent">Event</span><h1>' + esc(e.title) + "</h1></section>" +
      '<div class="tags"><span class="pill tag t-' + e.category + '">' + esc(categoryLabel(e.category)) + "</span>" + statusPill(e) + "</div>" +
      banner +
      (mine ? ticketHtml(e, mine) : "") +
      '<div class="facts card-panel">' +
        '<div class="fact">' + I("clock") + '<span class="fact-k">Time</span><span class="fact-v">' + esc(when(e)) + "</span></div>" +
        '<div class="fact">' + I("pin") + '<span class="fact-k">Location</span><span class="fact-v">' + esc(e.location) + "</span></div>" +
        '<div class="fact">' + I("users") + '<span class="fact-k">Organiser</span><span class="fact-v">' + esc(e.organiser) + "</span></div>" +
        places +
      "</div>" +
      (e.community && e.url ? originLink(e) : "") +
      '<section class="stack">' + sectionHead("About this event") + langSwitch() +
        '<p class="body-text">' + esc(lang() === "zh" && e.zh ? e.zh : (e.description || e.zh)) + "</p></section>" +
      (e.external ? '<p class="was">' + I("info") + "<span>OMNI read this from UNNC's public events page" + (WEB.updatedAt ? " (checked " + esc(updatedWord(WEB.updatedAt)) + ")" : "") + ". In the full version, organisers would post into OMNI directly so you could register here in one tap.</span></p>"
        : e.community ? '<p class="was">' + I("info") + "<span>Posted into OMNI by <b>" + esc(e.organiser) + "</b>" + (e.url ? ", with a link to the original on " + esc(D.sources[e.source] || "its own page") : "") + ". Everyone using OMNI sees it the moment it's posted" + (COMM.db ? "" : " (in this offline copy, only on this device)") + ".</span></p>" + deleteButton(e)
        : '<p class="was">' + I("info") + "<span>Before OMNI, this was only posted on <b>" + esc(D.sources[e.source]) + "</b>, and registering meant following a link to another portal and logging in again.</span></p>");
  }

  // A card that sends people to the original post (WeChat, portal, Moodle, a form...).
  function originLink(it) {
    var host = ""; try { host = new URL(it.url).hostname.replace(/^www\./, ""); } catch (er) { /* keep empty */ }
    return '<a class="origin-link card-panel" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="tile t-' + (it.source === "wechat" ? "green" : it.source === "moodle" ? "amber" : "blue") + '">' + I(it.source === "wechat" ? "mail" : it.source === "moodle" ? "cap" : "globe") + "</span>" +
      '<span class="row-text"><b>' + esc(it.linkLabel || "Open original post") + "</b><span>Full details on the original" + (host ? " · " + esc(host) : "") + "</span></span>" + I("chevron", "chev") + "</a>";
  }

  function deleteButton(it) {
    if (!canDelete(it)) return "";
    var confirming = ui.confirm === "del-" + it.cid;
    return '<button class="btn ' + (confirming ? "danger" : "quiet") + ' small" data-act="delete-post" data-id="' + esc(it.cid) + '">' + (confirming ? "Tap again to delete" : "Delete this post") + "</button>";
  }

  function eventActionBar(e) {
    var mine = state.registrations[e.id];
    var saved = !!state.saved[e.id];
    var reminded = !!state.reminders[e.id];
    var primary;
    if (!isUpcoming(e)) primary = '<button class="btn grow" disabled>Finished</button>';
    else if (e.external) primary = '<a class="btn grow" href="' + esc(e.url) + '" target="_blank" rel="noopener">Open on UNNC website</a>';
    else if (mine) {
      var confirming = ui.confirm === "cancel-" + e.id;
      primary = '<button class="btn grow ' + (confirming ? "danger" : "soft") + '" data-act="cancel" data-id="' + e.id + '">' +
        (confirming ? "Tap again to cancel" : (mine.status === "waitlist" ? "On waitlist · leave" : I("check") + "Registered")) + "</button>";
    } else if (L.isDropIn(e)) primary = '<button class="btn grow soft" data-act="remind" data-id="' + e.id + '">' + (reminded ? "Reminder set" : "Remind me") + "</button>";
    else primary = registerButton(e, "grow");
    return '<button class="bar-btn' + (saved ? " on" : "") + '" data-act="save" data-id="' + e.id + '" aria-pressed="' + saved + '">' + I("bookmark") + "<span>" + (saved ? "Saved" : "Save") + "</span></button>" +
      '<button class="bar-btn' + (reminded ? " on" : "") + '" data-act="remind" data-id="' + e.id + '" aria-pressed="' + reminded + '"' + (isUpcoming(e) ? "" : " disabled") + ">" + I("bell") + "<span>" + (reminded ? "Reminder on" : "Add reminder") + "</span></button>" +
      '<span class="bar-sep"></span>' + primary;
  }

  function screenPost(id) {
    var p = postById(id);
    if (!p) return backBar("discover", "Discover") + '<div class="empty">That post could not be found.</div>';
    var postedAt = new Date(L.startOfDay(now()).getTime() + p.posted * L.DAY);
    var related = null;
    return backBar("discover", "Discover", kindLabel(p.kind)) +
      '<div class="post-hero k-' + p.kind + '">' + I(p.kind === "notice" ? "bell" : "news") + "</div>" +
      '<section class="stack tight"><span class="eyebrow accent">' + kindLabel(p.kind) + "</span><h1>" + esc(p.title) + "</h1>" +
        '<p class="meta">' + esc(p.organiser) + " · posted " + esc(postedWord(postedAt)) + " · " + (p.community ? "posted in OMNI" + (p.url ? " · from " + esc(D.sources[p.source] || "a link") : "") : p.feed ? "live from " + esc(D.sources[p.source] || "its feed") : p.source === "web" ? "live from the UNNC website" : "originally on " + esc(D.sources[p.source])) + "</p></section>" +
      (p.zh ? langSwitch() : "") +
      (p.body || p.zh ? '<p class="body-text">' + esc(lang() === "zh" && p.zh ? p.zh : p.body) + "</p>"
        : p.feed ? '<div class="banner live">' + I(p.source === "wechat" ? "mail" : "globe") + "<span>OMNI shows the headline. Read the full article on " + (p.source === "wechat" ? "WeChat" : "the original page") + ", where it was published.</span></div>"
        : '<p class="body-text">Read the full story on the UNNC website.</p>') +
      (p.image ? '<img class="post-img" alt="" loading="lazy" src="' + esc(p.image) + '">' : "") +
      (p.community && p.url ? originLink(p) : "") +
      (p.community ? deleteButton(p) : "") +
      (related && isUpcoming(related) ? '<section class="stack">' + sectionHead("Related event") + feedCard(Object.assign({ kind: "event", postedAt: now() }, related)) + "</section>" : "");
  }

  function postActionBar(p) {
    var saved = !!state.saved[p.id];
    return '<button class="bar-btn' + (saved ? " on" : "") + '" data-act="save" data-id="' + p.id + '" aria-pressed="' + saved + '">' + I("bookmark") + "<span>" + (saved ? "Saved" : "Save") + "</span></button>" +
      '<span class="bar-sep"></span>' + (p.url ? '<a class="btn grow" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.linkLabel || "Read on UNNC website") + "</a>" : '<a class="btn grow soft" href="#discover">More updates</a>');
  }

  function screenMyEvents() {
    var all = Object.keys(state.registrations).map(eventById).filter(Boolean);
    var upcoming = all.filter(isUpcoming).sort(function (a, b) { return a.startAt - b.startAt; });
    var past = all.filter(function (e) { return !isUpcoming(e); }).sort(function (a, b) { return b.startAt - a.startAt; });
    var list = ui.myTab === "past" ? past : upcoming;
    var seg = '<div class="segmented" role="group" aria-label="Show"><button data-mytab="upcoming" aria-pressed="' + (ui.myTab === "upcoming") + '">Upcoming (' + upcoming.length + ')</button><button data-mytab="past" aria-pressed="' + (ui.myTab === "past") + '">Past (' + past.length + ")</button></div>";
    var body = list.length ? list.map(function (e) { return ticketHtml(e, state.registrations[e.id]); }).join("") :
      '<div class="empty">' + I("ticket") + "<p>" + (ui.myTab === "past" ? "No past events yet." : "You haven't registered for anything yet.") + "</p>" +
      (ui.myTab === "past" ? "" : '<a class="btn soft small" href="#discover">Discover events</a>') + "</div>";
    return backBar("me", "Me") + pageHead("My events") + seg + '<section class="stack">' + body + "</section>" +
      (ui.myTab === "upcoming" && upcoming.length ? '<p class="meta small">Show the check-in code at the door. Tap a ticket for details or to cancel.</p>' : "");
  }

  function screenSaved() {
    var items = Object.keys(state.saved).map(function (id) {
      var e = eventById(id);
      if (e) return Object.assign({ kind: "event", postedAt: now() }, e);
      var p = postById(id);
      return p ? Object.assign({ postedAt: new Date(L.startOfDay(now()).getTime() + p.posted * L.DAY) }, p) : null;
    }).filter(Boolean);
    return backBar("me", "Me") + pageHead("Saved") +
      (items.length ? '<section class="feed">' + items.map(feedCard).join("") + "</section>" :
        '<div class="empty">' + I("bookmark") + '<p>Nothing saved yet. Tap the bookmark on any event, notice or news story.</p><a class="btn soft small" href="#discover">Discover</a></div>');
  }

  function screenHelp() {
    var r = L.routeHelp(ui.helpQuery, D.offices, D.faqs);
    var results = "";
    if (ui.helpQuery.trim()) {
      if (r.offices.length) {
        var best = r.offices[0].office;
        results += '<section class="match"><span class="eyebrow">Best place to ask</span><h2>' + esc(best.name) + "</h2>" +
          '<p class="meta">' + esc(best.short) + ". Matched: " + esc(r.offices[0].hits.slice(0, 3).join(", ") || best.name) + "</p>" +
          '<div class="row"><a class="btn small" href="#office-' + best.id + '">Ask ' + esc(best.name) + "</a>" +
          (r.offices[1] ? '<span class="meta small">or <a href="#office-' + r.offices[1].office.id + '">' + esc(r.offices[1].office.name) + "</a></span>" : "") + "</div></section>";
      } else {
        results += '<div class="empty"><p>We couldn\'t tell which office handles that. Try other words, or ask the Student Service Centre and they will pass it on.</p><a class="btn small secondary" href="#office-registry">Ask the Student Service Centre</a></div>';
      }
      if (r.faqs.length) results += '<section class="stack">' + sectionHead("Quick answers") + r.faqs.map(function (f) { return faqHtml(f.faq, true); }).join("") + "</section>";
    }
    var mine = state.requests.slice().reverse();
    var requests = mine.length ? '<section class="stack">' + sectionHead("Your requests") + mine.map(function (q) {
      var o = officeById(q.office);
      return '<div class="request"><div class="row"><b>' + esc(q.subject) + '</b><span class="spacer"></span><span class="pill low">' + esc(q.status) + "</span></div>" +
        '<span class="meta small">' + esc(o ? o.name : q.office) + " · sent " + esc(dayWord(new Date(q.at))) + " · replies " + esc(o ? o.replies : "soon") + "</span></div>";
    }).join("") + "</section>" : "";
    var offices = D.offices.map(function (o) {
      return '<a class="office-tile" href="#office-' + o.id + '"><b>' + esc(o.name) + "</b><span>" + esc(o.short) + "</span></a>";
    }).join("");
    return pageHead("Get help") +
      '<p class="hello">Describe the problem in your own words. OMNI finds the right office, so you don\'t get sent from desk to desk.</p>' +
      searchBox("hq", ui.helpQuery, "e.g. my dorm air conditioner is broken") +
      (ui.helpQuery.trim() ? "" : '<div class="chips">' + ["Wi-Fi not working", "Lost my student card", "Residence permit", "Feeling stressed", "CV check", "Book a study room"].map(function (s) {
        return '<button class="chip" data-hq="' + esc(s) + '">' + esc(s) + "</button>";
      }).join("") + "</div>") +
      results + requests +
      '<section class="stack">' + sectionHead("Or pick an office") + '<div class="office-grid">' + offices + "</div></section>";
  }

  function faqHtml(f, withOffice) {
    var o = officeById(f.office);
    return '<details class="faq"><summary>' + esc(f.q) + "</summary><p>" + esc(f.a) + "</p>" +
      (withOffice && o ? '<a class="office-link" href="#office-' + o.id + '">Still stuck? Ask ' + esc(o.name) + "</a>" : "") + "</details>";
  }

  function ssoStrip(what) {
    return '<div class="as-user"><span class="avatar xs">' + esc(initials(state.student.name)) + "</span><span>" + what + " as <b>" + esc(state.student.name) + "</b>. No need to log in again.</span></div>";
  }

  function screenOffice(id) {
    var o = officeById(id);
    if (!o) return backBar("help", "Help") + '<div class="empty">That office could not be found.</div>';
    var faqs = D.faqs.filter(function (f) { return f.office === o.id; });
    return backBar("help", "Help") +
      '<section class="stack tight"><span class="eyebrow accent">Office</span><h1>' + esc(o.name) + '</h1><p class="meta">' + esc(o.short) + "</p></section>" +
      '<div class="facts card-panel"><div class="fact">' + I("pin") + '<span class="fact-k">Where</span><span class="fact-v">' + esc(o.where) + "</span></div>" +
        '<div class="fact">' + I("clock") + '<span class="fact-k">Open</span><span class="fact-v">' + esc(o.hours) + "</span></div>" +
        '<div class="fact">' + I("mail") + '<span class="fact-k">Replies</span><span class="fact-v">' + esc(o.replies) + "</span></div></div>" +
      (faqs.length ? '<section class="stack">' + sectionHead("Common questions") + faqs.map(function (f) { return faqHtml(f, false); }).join("") + "</section>" : "") +
      '<form class="stack card-panel" id="req-form" data-office="' + o.id + '">' + sectionHead("Send a request") +
        ssoStrip("Sending") +
        '<div class="field"><label for="rq-subject">Subject</label><input class="input" id="rq-subject" required maxlength="80" value="' + esc(ui.helpQuery.trim()) + '" placeholder="A short summary"></div>' +
        '<div class="field"><label for="rq-body">Details</label><textarea class="input" id="rq-body" maxlength="1000" placeholder="What happened, and anything they need to know (room number, module code...)"></textarea></div>' +
        '<button class="btn block" type="submit">Send to ' + esc(o.name) + "</button>" +
        '<p class="meta small">Demo: the request is saved on this device only. Nothing is sent to the real office.</p>' +
      "</form>";
  }

  function toolRow(t) {
    var pinned = state.pins.indexOf(t.id) !== -1;
    if (ui.editPins) {
      return '<button class="row-link" data-pin="' + t.id + '" aria-pressed="' + pinned + '"><span class="tile t-' + t.tint + '">' + I(t.icon) + '</span><span class="row-text"><b>' + esc(t.name) + "</b><span>" + esc(t.desc) + "</span></span>" +
        '<span class="pin-toggle' + (pinned ? " on" : "") + '">' + I(pinned ? "minus" : "plus") + "</span></button>";
    }
    return rowLink(toolHref(t), t.icon, t.tint, t.name, t.desc);
  }

  function screenTools() {
    var q = ui.toolQuery.trim().toLowerCase();
    var match = function (t) { return !q || (t.name + " " + t.desc).toLowerCase().indexOf(q) !== -1; };
    var favs = state.pins.map(toolById).filter(Boolean).filter(match);
    var study = D.tools.filter(function (t) { return t.section === "study" && match(t); });
    var life = D.tools.filter(function (t) { return t.section === "life" && match(t); });
    function group(title, list, right) {
      if (!list.length) return "";
      return '<section class="stack"><div class="section-head"><h2 class="muted-h">' + title + "</h2>" + (right || "") + '</div><div class="list-panel">' + list.map(toolRow).join("") + "</div></section>";
    }
    return pageHead("Campus tools") +
      '<div class="sso-banner">' + I("key") + "<span>Every tool opens <b>already signed in</b> with your OMNI account.</span></div>" +
      searchBox("tq", ui.toolQuery, "Search campus systems and services") +
      (ui.editPins ? group("All tools · tap to add or remove from favourites", D.tools.filter(match), '<button class="link-btn" data-act="edit-pins">Done</button>') :
        group("Favourites", favs, '<button class="link-btn" data-act="edit-pins">Edit</button>') + group("Study", study) + group("Campus life", life)) +
      (!q || favs.length || study.length || life.length ? "" : '<div class="empty"><p>No tool matches "' + esc(ui.toolQuery) + '".</p></div>');
  }

  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  function miniTimetable() {
    var today = now().getDay();
    var sel = ui.ttDay || (today >= 1 && today <= 5 ? today : 1);
    var tabsHtml = DAYS.map(function (d, i) {
      return '<button data-ttday="' + (i + 1) + '" aria-pressed="' + (sel === i + 1) + '">' + d + (today === i + 1 ? " ·" : "") + "</button>";
    }).join("");
    if (state.calendar) {
      var monday = L.startOfDay(now()); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      var day = new Date(monday); day.setDate(monday.getDate() + sel - 1);
      var mineToday = calItems().filter(function (c) { return sameDay(calDate(c), day); });
      return '<div class="segmented" role="group" aria-label="Day">' + tabsHtml + "</div>" +
        '<div class="stack">' + (mineToday.length ? '<div class="list-panel">' + mineToday.map(calRow).join("") + "</div>" : '<div class="empty"><p>Nothing on ' + DOW[day.getDay()] + " " + day.getDate() + "/" + (day.getMonth() + 1) + ".</p></div>") + "</div>" +
        '<p class="meta small">From your imported calendar. <a href="#calendar">Update it</a></p>';
    }
    var classes = D.timetable.filter(function (c) { return c.d === sel; });
    return '<div class="segmented" role="group" aria-label="Day">' + tabsHtml + "</div>" +
      '<div class="stack">' + (classes.length ? classes.map(function (c) {
        return '<div class="class-row"><div class="class-time"><b>' + c.start + "</b><span>" + c.end + '</span></div><div class="class-body"><b>' + esc(c.what) + '</b><span class="meta">' + esc(c.type + " · " + c.where) + "</span></div></div>";
      }).join("") : '<div class="empty"><p>No classes this day.</p></div>') + "</div>" +
      '<p class="meta small">Sample timetable. <a href="#calendar">Import your own</a> to see your real classes and Moodle deadlines.</p>';
  }

  function miniRooms() {
    var mine = Object.keys(state.bookings);
    return (mine.length ? '<section class="stack">' + sectionHead("Your bookings today") + mine.map(function (k) {
      var parts = k.split("|"); var room = D.rooms.find(function (r) { return r.id === parts[0]; });
      return '<div class="request"><div class="row"><b>' + esc(room ? room.name : parts[0]) + '</b><span class="spacer"></span><span class="pill ok">' + esc(parts[1]) + "</span></div><span class=\"meta small\">2 hours · tap the time below to cancel</span></div>";
    }).join("") + "</section>" : "") +
      D.rooms.map(function (r) {
        var slots = r.slots.map(function (s) {
          var key = r.id + "|" + s;
          if (state.bookings[key]) return '<button class="slot mine" data-book="' + key + '">' + s + " · yours</button>";
          if (r.taken.indexOf(s) !== -1) return '<button class="slot taken" disabled>' + s + "</button>";
          return '<button class="slot" data-book="' + key + '">' + s + "</button>";
        }).join("");
        return '<div class="card-panel stack tight"><div class="row"><b>' + esc(r.name) + '</b><span class="spacer"></span><span class="meta small">' + r.seats + ' seats</span></div><div class="slots">' + slots + "</div></div>";
      }).join("") + '<p class="meta small">Tap a free time to book it in one tap. Booking needs no extra login.</p>';
  }

  function miniPrinting() {
    return '<div class="card-panel stack"><span class="eyebrow">Print credit</span><div class="big-num">¥' + state.printCredit.toFixed(2) + "</div>" +
      '<div class="row"><button class="btn soft small" data-topup="10">Add ¥10</button><button class="btn soft small" data-topup="20">Add ¥20</button></div>' +
      '<p class="meta small">Demo top-up: no money is taken.</p></div>' +
      '<section class="stack">' + sectionHead("Recent print jobs") +
        '<div class="list-panel"><div class="row-link static"><span class="tile t-jade">' + I("doc") + '</span><span class="row-text"><b>BUSI1116_Workshop02.docx</b><span>4 pages · ¥0.80 · printed yesterday</span></span></div>' +
        '<div class="row-link static"><span class="tile t-jade">' + I("doc") + '</span><span class="row-text"><b>Week 9 lecture slides.pdf</b><span>12 pages · ¥2.40 · printed 3 days ago</span></span></div></div></section>' +
      '<p class="meta small">Send a file to the campus print queue, then tap your student card on any printer to release it.</p>';
  }

  function miniMap() {
    var q = ui.mapQuery.trim().toLowerCase();
    var list = D.buildings.filter(function (b) { return !q || (b.name + " " + b.what).toLowerCase().indexOf(q) !== -1; });
    return searchBox("mq", ui.mapQuery, "Find a building or service") +
      '<div class="list-panel">' + (list.length ? list.map(function (b) {
        return '<div class="row-link static"><span class="tile t-green">' + I("pin") + '</span><span class="row-text"><b>' + esc(b.name) + "</b><span>" + esc(b.what) + "</span></span></div>";
      }).join("") : '<div class="empty"><p>No building matches that.</p></div>') + "</div>" +
      '<p class="meta small">A real version would show these on an interactive campus map.</p>';
  }

  function screenTool(id) {
    var t = toolById(id);
    if (!t) return backBar("tools", "Tools") + '<div class="empty">That tool could not be found.</div>';
    var body;
    if (t.mini === "timetable") body = miniTimetable();
    else if (t.mini === "rooms") body = miniRooms();
    else if (t.mini === "printing") body = miniPrinting();
    else if (t.mini === "map") body = miniMap();
    else {
      body = '<div class="list-panel">' + (t.items || []).map(function (it) {
        return '<div class="row-link static"><span class="tile t-' + t.tint + '">' + I(t.icon) + '</span><span class="row-text"><b>' + esc(it.t) + "</b><span>" + esc(it.m) + "</span></span></div>";
      }).join("") + "</div>" +
        '<p class="meta small">Sample preview. In the full app, ' + esc(t.name) + " would open right here with you already signed in, instead of in a separate portal.</p>";
    }
    return backBar("tools", "Tools") +
      '<section class="tool-head"><span class="tile lg t-' + t.tint + '">' + I(t.icon) + '</span><div class="stack tight"><h1>' + esc(t.name) + '</h1><p class="meta">' + esc(t.desc) + "</p></div></section>" +
      ssoStrip("Opened") + body;
  }

  function openNow(hours) {
    if (/24/.test(hours)) return true;
    var m = hours.match(/(\d\d):(\d\d)\D+(\d\d):(\d\d)/);
    if (!m) return false;
    var n = now(), mins = n.getHours() * 60 + n.getMinutes();
    var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
    if (b <= a) b += 24 * 60;
    return (mins >= a && mins < b) || (mins + 1440 >= a && mins + 1440 < b);
  }

  function shopRow(place, s) {
    var open = openNow(s.h);
    return '<div class="row-link static"><span class="tile t-' + place.tint + '">' + I(place.icon) + '</span><span class="row-text"><b>' + esc(s.n) + "</b><span>" + esc(s.c + " · " + s.p) + "</span><span>" + esc(place.name + " · " + s.h) + "</span></span>" +
      '<span class="pill ' + (open ? "ok" : "plain") + '">' + (open ? "Open" : "Closed") + "</span></div>";
  }

  function screenFood() {
    var q = ui.foodQuery.trim().toLowerCase();
    var pick = ui.foodPick;
    var picker = '<div class="eat-card"><div class="stack tight"><span class="eyebrow">Can\'t decide?</span><h2>What to eat</h2>' +
      (pick ? '<p class="eat-pick"><b>' + esc(pick.shop.n) + "</b> at " + esc(pick.place.name) + '</p><p class="meta">' + esc(pick.shop.c + " · " + pick.shop.p) + "</p>" : '<p class="meta">Tap and OMNI picks somewhere on campus for you.</p>') +
      '</div><button class="btn" data-act="pick-food">' + I("shuffle") + (pick ? "Try another" : "Pick for me") + "</button></div>";
    var content;
    if (q) {
      var hits = [];
      D.food.forEach(function (pl) { pl.shops.forEach(function (s) { if ((s.n + " " + s.c + " " + pl.name + " " + pl.area).toLowerCase().indexOf(q) !== -1) hits.push(shopRow(pl, s)); }); });
      content = hits.length ? '<div class="list-panel">' + hits.join("") + "</div>" : '<div class="empty"><p>Nothing matches "' + esc(ui.foodQuery) + '".</p></div>';
    } else {
      content = '<section class="stack">' + sectionHead("Choose a place") + '<div class="place-grid">' + D.food.map(function (pl) {
        return '<a class="place" href="#place-' + pl.id + '"><span class="tile t-' + pl.tint + '">' + I(pl.icon) + '</span><b>' + esc(pl.name) + "</b><span>" + esc(pl.area) + '</span><span class="meta small">' + pl.shops.length + " shops " + I("chevron") + "</span></a>";
      }).join("") + "</div></section>";
    }
    return backBar("tools", "Tools") + pageHead("Food") + searchBox("fq", ui.foodQuery, "Search shops, cuisines or areas") + (q ? "" : picker) + content +
      '<p class="meta small">Sample places and opening hours for the prototype.</p>';
  }

  function screenPlace(id) {
    var pl = placeById(id);
    if (!pl) return backBar("food", "Food") + '<div class="empty">That place could not be found.</div>';
    return backBar("food", "Food") +
      '<section class="tool-head"><span class="tile lg t-' + pl.tint + '">' + I(pl.icon) + '</span><div class="stack tight"><h1>' + esc(pl.name) + '</h1><p class="meta">' + esc(pl.area + " · " + pl.shops.length + " shops") + "</p></div></section>" +
      '<div class="list-panel">' + pl.shops.map(function (s) { return shopRow(pl, s); }).join("") + "</div>";
  }

  function screenMe() {
    var s = state.student;
    var mine = upcomingMine();
    var reminders = events().filter(function (e) { return state.reminders[e.id] && !state.registrations[e.id] && isUpcoming(e); });
    var schedule = mine.concat(reminders).concat(upcomingCal(7).map(function (c) { return { cal: c, startAt: calDate(c) }; }))
      .sort(function (a, b) { return a.startAt - b.startAt; }).slice(0, 5);
    var scheduleHtml = schedule.length ? '<div class="list-panel">' + schedule.map(function (e) {
      if (e.cal) return calRow(e.cal);
      var reg = state.registrations[e.id];
      var label = reg ? (reg.status === "waitlist" ? "Waitlist" : "Going") : "Reminder";
      return '<a class="row-link" href="#event-' + e.id + '"><span class="date-chip"><b>' + e.startAt.getDate() + "</b><span>" + DOW[e.startAt.getDay()] + '</span></span><span class="row-text"><b>' + esc(e.title) + "</b><span>" + esc(e.start + " · " + e.location) + '</span></span><span class="pill ' + (reg ? (reg.status === "waitlist" ? "low" : "ok") : "info") + '">' + label + "</span></a>";
    }).join("") + "</div>" :
      '<div class="empty row-empty">' + I("calendar") + '<div class="stack tight"><b>Nothing scheduled</b><span class="meta">Register or add a reminder from any event</span></div><a class="btn soft small" href="#discover">Browse events</a></div>';
    var calCount = upcomingCal(7).length;
    var savedCount = Object.keys(state.saved).length;
    var bookings = Object.keys(state.bookings).length;
    return pageHead("Me") +
      '<section class="profile card-panel"><div class="avatar">' + esc(initials(s.name)) + '</div><div class="stack tight" style="min-width:0"><h2>' + esc(s.name) + "</h2>" +
        '<span class="meta">' + esc(s.email ? L.maskEmail(s.email) : "ID " + L.maskId(s.id)) + ' · <span class="verified">' + I("checkCircle") + "Verified</span></span>" +
        '<span class="meta small">' + (s.email ? "UNNC student, confirmed by email code" : "Signed in once through OMNI") + "</span></div></section>" +
      '<section class="stack">' + sectionHead("My schedule", '<a class="link-btn" href="#my-events">All my events ' + I("chevron") + "</a>") + scheduleHtml + "</section>" +
      '<div class="list-panel">' +
        rowLink("calendar", "calendar", "violet", "My calendar", state.calendar ? calCount + " classes and deadlines this week" : "Import Moodle deadlines and your timetable", state.calendar ? "" : '<span class="pill info">New</span>') +
        rowLink("saved", "bookmark", "blue", "Saved", savedCount ? savedCount + " saved" : "Events, notices and news you bookmark", "") +
        rowLink("my-events", "ticket", "jade", "Tickets", Object.keys(state.registrations).length + " registrations", "") +
        rowLink("help", "help", "violet", "Help requests", state.requests.length ? state.requests.length + " sent" : "Ask the right office", "") +
        rowLink("tool-rooms", "door", "green", "Room bookings", bookings ? bookings + " today" : "Book a study room", "") +
        rowLink("prefs", "gear", "plain", "Settings", "Theme, language, reminders", "") +
      "</div>" +
      '<section class="about card-panel"><h2>About OMNI</h2>' +
        "<p>OMNI is a student project for BUSI1116. It tests one idea: students should find an event, register and get help in one place, logging in only once.</p>" +
        "<p>Events, notices and news come only from real sources: UNNC's public website, official feeds, and posts people make in OMNI. Offices, food places and tool previews are still sample data for the prototype. This is not an official university service.</p></section>";
  }

  function screenNew() {
    var k = ui.newKind;
    var d = new Date(now().getTime() + 3 * L.DAY);
    var defDate = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    var topics = D.categories.map(function (c) { return '<option value="' + c.id + '"' + (c.id === "clubs" ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("");
    var where = COMM.db ? (COMM.canWrite === false ? '<div class="banner low">' + I("info") + "You can view OMNI but not post. Ask the owner to give you edit access.</div>"
        : '<div class="banner ok">' + I("checkCircle") + "Live: everyone using this OMNI link sees your post straight away.</div>")
      : '<div class="banner plain">' + I("info") + "This copy isn't connected to the shared database, so posts are saved on this device only.</div>";
    var kinds = [["event", "Event"], ["notice", "Notice"], ["news", "News"]].map(function (x) {
      return '<button type="button" data-newkind="' + x[0] + '" aria-pressed="' + (k === x[0]) + '">' + x[1] + "</button>";
    }).join("");
    return backBar("discover", "Discover") + pageHead("Post to OMNI") + where + snapPanel() +
      '<form class="stack card-panel" id="post-form" autocomplete="off">' +
        '<div class="segmented" role="group" aria-label="What are you posting?">' + kinds + "</div>" +
        '<div class="field"><label for="np-title">Title</label><input class="input" id="np-title" required maxlength="120" placeholder="' + (k === "event" ? "e.g. Board Games Night" : "e.g. Room change for Thursday's workshop") + '"></div>' +
        '<div class="field"><label for="np-org">Posted by</label><input class="input" id="np-org" maxlength="80" value="' + esc(state.student.name) + '" placeholder="Your club, society or office"></div>' +
        '<div class="field"><label for="np-topic">Topic</label><select class="input" id="np-topic">' + topics + "</select></div>" +
        (k === "event" ?
          '<div class="form-row"><div class="field"><label for="np-date">Date</label><input class="input" id="np-date" type="date" required value="' + defDate + '"></div>' +
          '<div class="field"><label for="np-start">Starts</label><input class="input" id="np-start" type="time" required value="18:00"></div>' +
          '<div class="field"><label for="np-end">Ends</label><input class="input" id="np-end" type="time" required value="20:00"></div></div>' +
          '<div class="field"><label for="np-loc">Where</label><input class="input" id="np-loc" maxlength="100" placeholder="e.g. Student Union Lounge"></div>' +
          '<div class="field"><label for="np-cap">Places (0 = drop-in, no registration)</label><input class="input" id="np-cap" type="number" min="0" max="5000" value="30"></div>' : "") +
        '<div class="field"><label for="np-body">Details</label><textarea class="input" id="np-body" maxlength="1500" placeholder="What is it, who is it for, what to bring..."></textarea></div>' +
        '<div class="field"><label for="np-link">Link to the original (optional)</label><input class="input" id="np-link" type="text" inputmode="url" autocapitalize="off" spellcheck="false" maxlength="500" placeholder="WeChat article, portal page, Moodle or sign-up form">' +
          '<span class="meta small">People see a button to read the full post there. OMNI shows the summary, the original keeps the full article.</span></div>' +
        '<div class="field"><label for="np-zh">中文介绍 (optional)</label><textarea class="input" id="np-zh" maxlength="1500" placeholder="可选：中文描述"></textarea></div>' +
        '<button class="btn block" type="submit"' + (COMM.db && COMM.canWrite === false ? " disabled" : "") + ">" + I("plus") + "Post " + (k === "event" ? "event" : k) + "</button>" +
        (k === "event" ? '<p class="meta small">Students register in one tap inside OMNI. You can see the count go up live.</p>' : "") +
      "</form>";
  }


  // ---------- Fill it in for me (snap or paste) ----------
  function snapPanel() {
    var canImg = !!(AI.sample && AI.images);
    var f = ui.snapFile;
    return '<section class="card-panel stack snap" id="snap">' +
      '<div class="snap-head"><span class="tile t-violet">' + I("sparkle") + '</span><div class="stack tight"><b>Fill it in for me</b>' +
        '<span class="meta">' + (canImg ? "Paste a WeChat post or email, or add a screenshot of the poster." : "Paste the WeChat post, email or poster text.") +
        " OMNI fills in the form below for you to check.</span></div></div>" +
      '<textarea class="input" id="snap-text" maxlength="6000" placeholder="Paste the message here...">' + esc(ui.snapText) + "</textarea>" +
      (canImg ? '<div class="snap-file"><label class="btn soft small" for="snap-img">' + I("camera") + (f ? "Change picture" : "Add a poster picture") + "</label>" +
        '<input type="file" id="snap-img" accept="' + esc(AI.images.mediaTypes.join(",")) + '" hidden>' +
        (f ? '<span class="meta small snap-name">' + esc(f.name) + '</span><button type="button" class="link-btn" data-act="snap-unfile">Remove</button>' : "") + "</div>" : "") +
      (ui.snapBusy
        ? '<div class="row"><button type="button" class="btn secondary block" disabled>' + I("sparkle") + "Reading" + (f ? " the poster" : "") + "...</button>" +
          '<button type="button" class="btn quiet" data-act="snap-stop">Stop</button></div>'
        : '<button type="button" class="btn secondary block" data-act="snap">' + I("sparkle") + "Fill the form</button>") +
      '<p class="meta small" id="snap-status" aria-live="polite">' + esc(ui.snapMsg || (AI.sample ? "Uses Claude to read it. It may ask you to allow that the first time." : "Quick fill: OMNI looks for the title, date, time and place.")) + "</p>" +
    "</section>";
  }

  var FORM_FIELDS = { link: "np-link", title: "np-title", organiser: "np-org", topic: "np-topic", date: "np-date", start: "np-start", end: "np-end", location: "np-loc", capacity: "np-cap", body: "np-body", zh: "np-zh" };
  function formValues() {
    var out = {};
    Object.keys(FORM_FIELDS).forEach(function (k) { var el = document.getElementById(FORM_FIELDS[k]); if (el) out[k] = el.value; });
    return out;
  }
  function fillForm(vals, mark) {
    var n = 0;
    Object.keys(FORM_FIELDS).forEach(function (k) {
      var el = document.getElementById(FORM_FIELDS[k]);
      var v = vals[k];
      if (!el || v == null || v === "") return;
      el.value = String(v); n++;
      if (mark) { el.classList.add("filled"); setTimeout(function () { el.classList.remove("filled"); }, 2400); }
    });
    return n;
  }
  // Switch Event / Notice / News without losing what's typed.
  function setNewKind(kind) {
    var keep = formValues();
    ui.snapText = (document.getElementById("snap-text") || {}).value || ui.snapText;
    ui.newKind = kind;
    render({ keepScroll: true });
    fillForm(keep);
  }

  function snapMessage(text) { ui.snapMsg = text; var el = document.getElementById("snap-status"); if (el) el.textContent = text; }
  function applySnap(r, how) {
    ui.snapBusy = false;
    if (r.kind !== ui.newKind) ui.newKind = r.kind;
    var keepOrg = (document.getElementById("np-org") || {}).value;
    ui.snapMsg = "";
    render({ keepScroll: true });
    var n = fillForm(r, true);
    if (!r.organiser && keepOrg) fillForm({ organiser: keepOrg });
    var missing = [];
    if (!r.title) missing.push("title");
    if (r.kind === "event" && !r.date) missing.push("date");
    if (r.kind === "event" && !r.start) missing.push("time");
    snapMessage(n ? how + " filled in " + n + " field" + (n === 1 ? "" : "s") + "." + (missing.length ? " Please add the " + missing.join(", ") + " yourself." : " Check them, then post.")
      : "Couldn't find event details in that. Try pasting more of the message.");
    var form = document.getElementById("post-form");
    if (form && n) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function runSnap() {
    var text = ((document.getElementById("snap-text") || {}).value || "").trim();
    ui.snapText = text;
    var file = ui.snapFile;
    if (!text && !file) { snapMessage("Paste a message" + (AI.images ? " or add a picture" : "") + " first."); return; }
    if (!AI.sample) { applySnap(L.guessFromText(text, now()), "Quick fill"); return; }
    ui.snapBusy = true; ui.snapMsg = file ? "Reading the poster. This can take up to a minute." : "Reading it now...";
    render({ keepScroll: true });
    var ctl = AI.ctl = new AbortController();
    var opts = { signal: ctl.signal };
    if (file) opts.images = [file];
    AI.sample.json(L.extractPrompt(text, now(), !!file), opts).then(function (raw) {
      if (AI.ctl !== ctl) return;
      applySnap(L.cleanExtract(raw, now()), "Claude");
    }, function (e) {
      if (AI.ctl !== ctl) return;
      ui.snapBusy = false;
      var code = e && e.code;
      if (code === "cancelled") { ui.snapMsg = "Stopped."; render({ keepScroll: true }); return; }
      if (code === "not_granted" || code === "sampling_disabled" || code === "capability_disabled" || code === "capability_removed") AI.sample = null;
      if (text && !AI.sample) { applySnap(L.guessFromText(text, now()), "Quick fill"); return; }
      ui.snapMsg = code === "rate_limited" ? "Too many tries just now. Wait a minute and try again."
        : code === "image_rejected" ? "That picture couldn't be read. Try a clearer screenshot, or paste the text."
        : code === "invalid_json" || code === "empty_completion" ? "Couldn't make sense of that one. Try again, or paste the text instead."
        : !AI.sample ? "Reading pictures isn't available here. Paste the text instead."
        : "Something went wrong. Try again in a moment.";
      render({ keepScroll: true });
    });
  }

  // ---------- My calendar (imported .ics) ----------
  function calItems() { return (state.calendar && state.calendar.items) || []; }
  function calDate(c) { return new Date(c.start); }
  function calTime(c) {
    if (c.allDay) return "All day";
    var s = new Date(c.start), e = new Date(c.end);
    var f = function (d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
    return +e > +s ? f(s) + " – " + f(e) : f(s);
  }
  function isDeadline(c) { return /\b(due|deadline|submission|submit|closes)\b|截止/i.test(c.title) || c.start === c.end; }
  function calRow(c) {
    var d = calDate(c);
    return '<div class="row-link cal-row"><span class="date-chip"><b>' + d.getDate() + "</b><span>" + DOW[d.getDay()] + "</span></span>" +
      '<span class="row-text"><b>' + esc(c.title) + "</b><span>" + esc([calTime(c), c.location || c.course].filter(Boolean).join(" · ")) + "</span></span>" +
      '<span class="pill ' + (isDeadline(c) ? "low" : "plain") + '">' + (isDeadline(c) ? "Due" : "Class") + "</span></div>";
  }
  function upcomingCal(days) {
    var from = now().getTime(), to = L.startOfDay(now()).getTime() + days * L.DAY;
    return calItems().filter(function (c) { var t = new Date(c.end || c.start).getTime(); return t >= from && new Date(c.start).getTime() < to; });
  }
  function screenCalendar() {
    var cal = state.calendar;
    var items = upcomingCal(21);
    var byDay = {};
    items.forEach(function (c) { var k = L.startOfDay(calDate(c)).toISOString(); (byDay[k] = byDay[k] || []).push(c); });
    var list = Object.keys(byDay).sort().map(function (k) {
      var d = new Date(k);
      return '<section class="stack">' + sectionHead(/^(Today|Tomorrow)$/.test(dayWord(d)) ? dayWord(d) + ", " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : dayWord(d)) +
        '<div class="list-panel">' + byDay[k].map(calRow).join("") + "</div></section>";
    }).join("");
    return backBar("me", "Me") + pageHead("My calendar") +
      '<section class="card-panel stack">' +
        '<div class="snap-head"><span class="tile t-blue">' + I("calendar") + '</span><div class="stack tight"><b>' + (cal ? "Imported " + cal.items.length + " items" : "Bring in your Moodle deadlines and timetable") + "</b>" +
        '<span class="meta">' + (cal ? "From " + esc(cal.name) + ", " + new Date(cal.importedAt).toLocaleDateString() + ". Import again any time to refresh." : "Add a calendar file (.ics) and OMNI shows your classes and deadlines next to the events you've registered for.") + "</span></div></div>" +
        '<label class="btn block" for="cal-file">' + I("upload") + (cal ? "Import a newer file" : "Choose a calendar file") + "</label>" +
        '<input type="file" id="cal-file" accept=".ics,text/calendar" hidden>' +
        (cal ? '<button class="btn quiet" data-act="cal-clear">' + (ui.confirm === "cal" ? "Tap again to remove it" : "Remove imported calendar") + "</button>" : "") +
        '<p class="meta small">' + I("info") + " Your calendar stays on this device. OMNI doesn't upload it or share it with anyone.</p>" +
      "</section>" +
      (cal ? (list || '<div class="empty"><p>Nothing in the next three weeks.</p></div>') :
      '<section class="card-panel stack how-to"><span class="eyebrow">Where to get the file</span><ol>' +
        "<li><b>Moodle deadlines:</b> open Moodle, go to <b>Calendar</b>, then <b>Import or export calendars → Export calendar</b>. Choose <b>All events</b> and <b>Recent and next 60 days</b>, then <b>Export</b>. A .ics file downloads.</li>" +
        "<li><b>Timetable:</b> if your timetable page has a <b>Download</b> or <b>Subscribe / iCal</b> option, save it as a .ics file.</li>" +
        "<li><b>Phone calendar or Outlook:</b> most calendar apps can export a .ics file too.</li></ol></section>");
  }
  function importCalendar(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast("That file is too big. Export a shorter date range."); return; }
    var reader = new FileReader();
    reader.onload = function () {
      if (!/BEGIN:VCALENDAR/.test(String(reader.result || ""))) { toast("That isn't a calendar file. Look for a file ending in .ics."); return; }
      var items = L.parseICS(String(reader.result || ""), now(), 180).slice(0, 600);
      state.calendar = { name: file.name.slice(0, 60), importedAt: now().toISOString(), items: items };
      save(); render({ keepScroll: true });
      toast(items.length ? "Imported " + items.length + " classes and deadlines." : "The file was read, but it has nothing from the last week onwards.");
    };
    reader.onerror = function () { toast("Couldn't read that file."); };
    reader.readAsText(file);
  }

  function screenPrefs() {
    function seg(name, options, value) {
      return '<div class="segmented" role="group">' + options.map(function (o) {
        return '<button data-pref="' + name + '" data-val="' + o[0] + '" aria-pressed="' + (value === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }
    return backBar("me", "Me") + pageHead("Settings") +
      '<section class="card-panel stack"><span class="eyebrow">Appearance</span>' + seg("theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]], state.prefs.theme) + "</section>" +
      '<section class="card-panel stack"><span class="eyebrow">Show descriptions in</span>' + seg("lang", [["en", "English"], ["zh", "中文"]], state.prefs.lang) + "</section>" +
      '<section class="card-panel stack"><span class="eyebrow">Remind me</span>' + seg("remind", [["15", "15 min before"], ["60", "1 hour before"], ["1440", "1 day before"]], state.prefs.remind) +
        '<label class="toggle"><input type="checkbox" id="notify"' + (state.prefs.notify ? " checked" : "") + "> Notifications for events I'm going to</label></section>" +
      '<section class="card-panel stack"><span class="eyebrow">Signed in once, used everywhere</span><ul class="sso-list">' +
        '<li><span>Event registration</span><span class="pill ok">' + I("check") + "connected</span></li>" +
        '<li><span>Help requests to offices</span><span class="pill ok">' + I("check") + "connected</span></li>" +
        '<li><span>Room booking, printing</span><span class="pill ok">' + I("check") + "connected</span></li>" +
        '<li><span>Moodle deadlines, timetable</span><span class="pill ' + (state.calendar ? 'ok">' + I("check") + "imported" : 'plain">import a file') + "</span></li>" +
        '<li><span>Email, WeChat</span><span class="pill plain">paste to post</span></li></ul>' +
        '<p class="meta small">Sign-ins this session: ' + Math.max(1, state.logins) + "</p></section>" +
      '<div class="row"><button class="btn secondary" data-act="signout">' + I("out") + "Sign out</button><button class=\"btn quiet\" data-act=\"reset\">" + (ui.confirm === "reset" ? "Tap again to reset" : "Reset demo data") + "</button></div>";
  }

  // ---------- Router ----------
  function route() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!state.student) return { name: "signin" };
    var m;
    if (!h || h === "home") return { name: "home", tab: "home" };
    if (h === "discover") return { name: "discover", tab: "discover" };
    if ((m = h.match(/^event-(.+)$/))) return { name: "event", id: m[1], tab: "discover", bar: true };
    if ((m = h.match(/^post-(.+)$/))) return { name: "post", id: m[1], tab: "discover", bar: true };
    if (h === "help") return { name: "help", tab: "help" };
    if ((m = h.match(/^office-(.+)$/))) return { name: "office", id: m[1], tab: "help" };
    if (h === "tools") return { name: "tools", tab: "tools" };
    if ((m = h.match(/^tool-(.+)$/))) return { name: "tool", id: m[1], tab: "tools" };
    if (h === "food") return { name: "food", tab: "tools" };
    if ((m = h.match(/^place-(.+)$/))) return { name: "place", id: m[1], tab: "tools" };
    if (h === "me" || h === "profile") return { name: "me", tab: "me" };
    if (h === "my-events") return { name: "my-events", tab: "me" };
    if (h === "saved") return { name: "saved", tab: "me" };
    if (h === "prefs") return { name: "prefs", tab: "me" };
    if (h === "new") return { name: "new", tab: "discover" };
    if (h === "calendar") return { name: "calendar", tab: "me" };
    return { name: "home", tab: "home" };
  }

  var lastRoute = "";
  function render(opts) {
    var r = route();
    var html, bar = "";
    switch (r.name) {
      case "signin": html = screenSignIn(); break;
      case "discover": html = screenDiscover(); break;
      case "event": html = screenEvent(r.id); var ev = eventById(r.id); if (ev) bar = eventActionBar(ev); break;
      case "post": html = screenPost(r.id); var po = postById(r.id); if (po) bar = postActionBar(po); break;
      case "help": html = screenHelp(); break;
      case "office": html = screenOffice(r.id); break;
      case "tools": html = screenTools(); break;
      case "tool": html = screenTool(r.id); break;
      case "food": html = screenFood(); break;
      case "place": html = screenPlace(r.id); break;
      case "me": html = screenMe(); break;
      case "my-events": html = screenMyEvents(); break;
      case "saved": html = screenSaved(); break;
      case "prefs": html = screenPrefs(); break;
      case "new": html = screenNew(); break;
      case "calendar": html = screenCalendar(); break;
      default: html = screenHome();
    }
    view.innerHTML = html;
    actionBar.innerHTML = bar;
    actionBar.hidden = !bar;
    document.body.classList.toggle("has-bar", !!bar);
    document.body.classList.toggle("signed-out", r.name === "signin");
    tabs.hidden = r.name === "signin" || !!bar;
    Array.prototype.forEach.call(tabs.querySelectorAll("a"), function (a) {
      if (a.dataset.tab === r.tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var key = r.name + ":" + (r.id || "");
    if (key !== lastRoute) {
      if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
      ui.confirm = null;
      if (r.name !== "event" && r.name !== "post") ui.lang = null;
    }
    lastRoute = key;
    if (r.name === "home") bindCarousel();
    var qc = view.querySelector('.chips [data-quick][aria-pressed="true"]');
    if (qc) qc.parentNode.scrollLeft = Math.max(0, qc.offsetLeft - qc.parentNode.offsetLeft - 16);
    Array.prototype.forEach.call(view.querySelectorAll("img.poster-img, img.post-img"), function (img) {
      function ok() { if (img.naturalWidth) img.parentNode.classList.add("has-img"); }
      if (img.complete) ok(); else img.addEventListener("load", ok);
      img.addEventListener("error", function () { img.remove(); });
    });
    if (render.focus) { var f = document.getElementById(render.focus); if (f) f.focus(); render.focus = null; }
  }

  // Re-render after live data arrives, without wiping a form the person is filling in.
  function softRender() {
    var r = route();
    if (r.name === "new" || r.name === "office" || r.name === "signin") return;
    var a = document.activeElement;
    if (a && a.id && view.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)) rerenderKeepingFocus(a.id);
    else render({ keepScroll: true });
  }

  function bindCarousel() {
    var c = document.getElementById("carousel");
    if (!c) return;
    c.addEventListener("scroll", function () {
      var i = Math.round(c.scrollLeft / c.clientWidth);
      Array.prototype.forEach.call(document.querySelectorAll(".dot"), function (d, j) {
        if (i === j) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    }, { passive: true });
  }
  function slideTo(i) {
    var c = document.getElementById("carousel");
    if (!c) return;
    var n = c.children.length;
    i = (i + n) % n;
    c.scrollTo({ left: i * c.clientWidth, behavior: "smooth" });
  }

  // Re-render but keep the cursor in a search box the user is typing in.
  function rerenderKeepingFocus(inputId) {
    var el = document.getElementById(inputId);
    var pos = el ? el.selectionStart : null;
    render({ keepScroll: true });
    var again = document.getElementById(inputId);
    if (again) { again.focus(); if (pos != null) again.setSelectionRange(pos, pos); }
  }

  // ---------- Actions ----------
  function doRegister(id) {
    var e = eventById(id);
    if (!e) return;
    var res = L.register(e, state.registrations, state.student, now());
    state.registrations = res.registrations;
    save();
    if (e.community && COMM.db && COMM.me) {
      COMM.db.doc("regs/" + e.cid + "--" + COMM.me).set({ event: e.cid, by: COMM.me, status: res.status, at: now().toISOString() }).catch(function () {});
    }
    toast(res.status === "registered" ? "You're in! Your ticket is in My events." : "It's full, so you're on the waitlist.");
  }
  function doCancel(id) {
    if (ui.confirm !== "cancel-" + id) { ui.confirm = "cancel-" + id; return; }
    ui.confirm = null;
    var mine = state.registrations[id];
    state.registrations = L.cancel(id, state.registrations);
    save();
    var ce = eventById(id);
    if (ce && ce.community && COMM.db && COMM.me) COMM.db.doc("regs/" + ce.cid + "--" + COMM.me).delete().catch(function () {});
    toast(mine && mine.status === "waitlist" ? "You left the waitlist." : "Registration cancelled.");
  }
  function remindLabel() { return { "15": "15 minutes", "60": "1 hour", "1440": "1 day" }[state.prefs.remind] || "1 hour"; }

  function handleAction(t) {
    var act = t.dataset.act, id = t.dataset.id;
    if (act === "register") doRegister(id);
    else if (act === "cancel") doCancel(id);
    else if (act === "save") {
      if (state.saved[id]) { delete state.saved[id]; toast("Removed from saved."); } else { state.saved[id] = true; toast("Saved. Find it under Me."); }
      save();
    } else if (act === "remind") {
      if (state.reminders[id]) { delete state.reminders[id]; toast("Reminder removed."); } else { state.reminders[id] = true; toast("We'll remind you " + remindLabel() + " before."); }
      save();
    } else if (act === "clear") { ui.query = ""; ui.topic = "all"; ui.when = "any"; ui.source = "all"; ui.available = false; ui.keyOnly = false; ui.kinds = { event: true, notice: true, news: true }; }
    else if (act === "filters") ui.showFilters = !ui.showFilters;
    else if (act === "snap") { runSnap(); return; }
    else if (act === "snap-stop") { if (AI.ctl) AI.ctl.abort(); return; }
    else if (act === "snap-unfile") { ui.snapText = (document.getElementById("snap-text") || {}).value || ""; ui.snapFile = null; }
    else if (act === "cal-clear") {
      if (ui.confirm !== "cal") { ui.confirm = "cal"; }
      else { state.calendar = null; ui.confirm = null; save(); toast("Imported calendar removed."); }
    }
    else if (act === "edit-pins") ui.editPins = !ui.editPins;
    else if (act === "all-updates") { ui.kinds = { event: false, notice: true, news: true }; ui.sort = "latest"; location.hash = "discover"; return; }
    else if (act === "delete-post") {
      if (ui.confirm !== "del-" + id) { ui.confirm = "del-" + id; render({ keepScroll: true }); return; }
      ui.confirm = null;
      if (COMM.db) COMM.db.doc("posts/" + id).delete().then(function () { toast("Post deleted."); }, function () { toast("Couldn't delete that post. You may not have permission."); });
      else { state.localPosts = (state.localPosts || []).filter(function (p) { return p.id !== id; }); save(); toast("Post deleted."); }
      location.hash = "discover"; return;
    }
    else if (act === "pick-food") ui.foodPick = L.pickFood(D.food, Math.random());
    else if (act === "signout") { state.student = null; save(); ui.signin = { step: "email", name: "", email: "", pending: null, sends: ui.signin.sends, error: "" }; location.hash = ""; toast("Signed out."); }
    else if (act === "si-back") { ui.signin.step = "email"; ui.signin.pending = null; ui.signin.error = ""; }
    else if (act === "si-resend") { sendCode(); return; }
    else if (act === "reset") {
      if (ui.confirm !== "reset") { ui.confirm = "reset"; render({ keepScroll: true }); return; }
      var s = state.student; state = blankState(); state.student = s; state.logins = 1; seedDemo(); save(); applyTheme(); ui.confirm = null; toast("Demo data reset.");
    }
    render({ keepScroll: true });
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-act],[data-topic],[data-when],[data-source],[data-kind],[data-mytab],[data-hq],[data-open],[data-lang],[data-pin],[data-pref],[data-ttday],[data-book],[data-topup],[data-slide],[data-step],[data-focus],[data-newkind],[data-quick]");
    if (!t || !(view.contains(t) || actionBar.contains(t))) return;
    var d = t.dataset;
    if (d.act) { ev.stopPropagation(); handleAction(t); return; }
    if (d.focus) { render.focus = d.focus; return; } // let the link navigate, then focus search
    if (d.topic) ui.topic = d.topic;
    else if (d.when) ui.when = d.when;
    else if (d.source) ui.source = d.source;
    else if (d.kind) {
      ui.kinds[d.kind] = !ui.kinds[d.kind];
      if (!ui.kinds.event && !ui.kinds.notice && !ui.kinds.news) { ui.kinds[d.kind] = true; toast("Keep at least one type switched on."); }
    }
    else if (d.mytab) ui.myTab = d.mytab;
    else if (d.newkind) { setNewKind(d.newkind); return; }
    else if (d.quick) {
      ui.keyOnly = d.quick === "keydates";
      ui.when = d.quick === "today" || d.quick === "week" ? d.quick : "any";
      ui.source = d.quick === "omni" ? "omni" : "all";
      if (ui.keyOnly || d.quick === "today" || d.quick === "week") ui.kinds = { event: true, notice: true, news: true };
    }
    else if (d.hq) ui.helpQuery = d.hq;
    else if (d.lang) ui.lang = d.lang;
    else if (d.pin) {
      var i = state.pins.indexOf(d.pin);
      if (i === -1) state.pins.push(d.pin); else state.pins.splice(i, 1);
      save();
    }
    else if (d.pref) { state.prefs[d.pref] = d.val; save(); if (d.pref === "theme") applyTheme(); }
    else if (d.ttday) ui.ttDay = +d.ttday;
    else if (d.book) {
      if (state.bookings[d.book]) { delete state.bookings[d.book]; toast("Booking cancelled."); }
      else { state.bookings[d.book] = now().toISOString(); toast("Booked for " + d.book.split("|")[1] + ". No extra login needed."); }
      save();
    }
    else if (d.topup) { state.printCredit = Math.round((state.printCredit + +d.topup) * 100) / 100; save(); toast("Added ¥" + d.topup + " (demo)."); }
    else if (d.slide) { slideTo(+d.slide); return; }
    else if (d.step) {
      var c = document.getElementById("carousel");
      if (c) slideTo(Math.round(c.scrollLeft / c.clientWidth) + +d.step);
      return;
    }
    else if (d.open) {
      if (ev.target.closest("button, a")) return;
      location.hash = d.open; return;
    }
    render({ keepScroll: true });
  });

  view.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.open) location.hash = ev.target.dataset.open;
  });

  var SEARCHES = { q: "query", hq: "helpQuery", tq: "toolQuery", fq: "foodQuery", mq: "mapQuery" };
  function onSearchInput(ev) {
    if (ev.isComposing) return; // wait until a Chinese (pinyin) word is finished
    var key = SEARCHES[ev.target.id];
    if (!key) return;
    ui[key] = ev.target.value;
    rerenderKeepingFocus(ev.target.id);
  }
  view.addEventListener("input", onSearchInput);
  view.addEventListener("compositionend", onSearchInput);
  view.addEventListener("change", function (ev) {
    if (ev.target.id === "avail") { ui.available = ev.target.checked; render({ keepScroll: true }); }
    else if (ev.target.id === "sort") { ui.sort = ev.target.value; render({ keepScroll: true }); }
    else if (ev.target.id === "snap-img") {
      var file = ev.target.files && ev.target.files[0];
      if (file && AI.images && file.size > AI.images.maxInputBytes) { toast("That picture is too big. Try a screenshot instead."); return; }
      ui.snapText = (document.getElementById("snap-text") || {}).value || "";
      ui.snapFile = file || null; ui.snapMsg = "";
      render({ keepScroll: true });
    }
    else if (ev.target.id === "cal-file") importCalendar(ev.target.files && ev.target.files[0]);
    else if (ev.target.id === "notify") { state.prefs.notify = ev.target.checked; save(); toast(ev.target.checked ? "Notifications on." : "Notifications off."); }
  });

  // Demo version of "email me a code". A real version calls a small server that
  // emails the code (see README) and never sends the code back to the page.
  function sendCode() {
    var si = ui.signin, t = Date.now();
    var wait = L.sendWait(si.sends[si.email], t);
    if (wait) { si.error = "Please wait " + (wait > 60000 ? Math.ceil(wait / 60000) + " minutes" : Math.ceil(wait / 1000) + " seconds") + " before asking for another code."; render({ keepScroll: true }); return; }
    si.sends[si.email] = (si.sends[si.email] || []).concat([t]);
    si.pending = { code: L.makeCode(), sentAt: t, tries: 0 };
    si.step = "code"; si.error = "";
    render.focus = "si-code";
    render({ keepScroll: true });
    toast("Code sent to " + L.maskEmail(si.email));
    clearTimeout(sendCode.timer);
    sendCode.timer = setTimeout(function tick() {
      if (route().name === "signin" && ui.signin.step === "code") {
        var btn = view.querySelector("[data-act=si-resend]"), w = L.sendWait(ui.signin.sends[ui.signin.email], Date.now());
        if (btn) { btn.disabled = !!w; btn.textContent = w ? "Resend in " + Math.ceil(w / 1000) + "s" : "Send a new code"; }
        if (w) sendCode.timer = setTimeout(tick, 1000);
      }
    }, 1000);
  }

  view.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target;
    if (f.id === "signin-form") {
      var si = ui.signin;
      si.name = f.querySelector("#si-name").value.trim().replace(/\s+/g, " ");
      var raw = f.querySelector("#si-email").value;
      si.consent = f.querySelector("#si-consent").checked;
      si.email = L.unncEmail(raw) || raw.trim();
      si.error = !si.name ? "Add your name first."
        : !L.unncEmail(raw) ? "Use your UNNC email, the one ending in @nottingham.edu.cn."
        : !f.querySelector("#si-consent").checked ? "Please tick the box to agree, so we can keep you signed in." : "";
      if (si.error) { render({ keepScroll: true }); return; }
      sendCode();
    } else if (f.id === "code-form") {
      var sc = ui.signin;
      var result = L.checkCode(sc.pending, f.querySelector("#si-code").value, Date.now());
      if (result !== "ok") {
        if (result === "wrong") sc.pending.tries = (sc.pending.tries || 0) + 1;
        var left = sc.pending ? L.CODE_TRIES - (sc.pending.tries || 0) : 0;
        sc.error = result === "format" ? "The code has 6 digits."
          : result === "expired" ? "That code has expired. Send a new one."
          : result === "locked" || left <= 0 ? "Too many wrong tries. Send a new code."
          : "That code isn't right. " + left + (left === 1 ? " try" : " tries") + " left.";
        render({ keepScroll: true }); return;
      }
      var first = !state.logins;
      state.student = { name: sc.name, email: sc.email, id: sc.email };
      ui.signin = { step: "email", name: "", email: "", pending: null, sends: sc.sends, error: "" };
      state.logins = (state.logins || 0) + 1;
      if (first) seedDemo();
      save();
      location.hash = "home";
      render();
      toast("Signed in. You won't be asked again.");
    } else if (f.id === "post-form") {
      var g = function (id) { var el = f.querySelector("#" + id); return el ? el.value : ""; };
      var doc = { kind: ui.newKind, title: g("np-title").trim(), organiser: g("np-org").trim() || state.student.name, topic: g("np-topic"),
        body: g("np-body").trim(), zh: g("np-zh").trim(), url: g("np-link").trim(), createdBy: COMM.me || "this-device", createdAt: now().toISOString() };
      if (doc.kind === "event") {
        doc.date = g("np-date"); doc.start = g("np-start"); doc.end = g("np-end"); doc.location = g("np-loc").trim(); doc.capacity = parseInt(g("np-cap"), 10) || 0;
        var off = L.dayOffset(doc.date, now());
        if (off == null || off < 0) { toast("Pick a date from today onwards."); return; }
      }
      if (doc.url && !/^https?:\/\//i.test(doc.url)) doc.url = "https://" + doc.url;
      if (doc.url && !L.linkSource(doc.url)) { toast("The link should start with https://"); return; }
      if (!doc.url) delete doc.url;
      if (!cleanPost("check", doc)) { toast("Add a title" + (doc.kind === "event" ? ", date and times" : "") + " first."); return; }
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      var done = function (id) {
        ui.newKind = "event"; ui.snapText = ""; ui.snapFile = null; ui.snapMsg = "";
        location.hash = doc.kind === "event" ? "event-c-" + id : "post-c-" + id;
        toast(COMM.db ? "Posted. Everyone using OMNI can see it now." : "Posted on this device.");
      };
      if (COMM.db) {
        COMM.db.collection("posts").add(doc).then(function (ref) { done(ref.id); }, function () { btn.disabled = false; toast("Couldn't post. You may need edit access from the owner."); });
      } else {
        var lid = "l" + Date.now().toString(36);
        state.localPosts = (state.localPosts || []).concat([Object.assign({ id: lid }, doc)]);
        save(); done(lid);
      }
    } else if (f.id === "req-form") {
      var subject = f.querySelector("#rq-subject").value.trim();
      if (!subject) { toast("Add a short subject first."); return; }
      state.requests.push({ office: f.dataset.office, subject: subject, body: f.querySelector("#rq-body").value.trim(), at: now().toISOString(), status: "Received" });
      save();
      ui.helpQuery = "";
      location.hash = "help";
      toast("Request sent to " + officeById(f.dataset.office).name + ".");
    }
  });

  // First sign-in: give the demo a past event and one booking so screens aren't empty.
  function seedDemo() {
    // Nothing to pre-fill: OMNI starts empty and shows only real events.
  }

  tabs.innerHTML = [["home", "Home", "home"], ["discover", "Discover", "discover"], ["help", "Help", "help"], ["tools", "Tools", "tools"], ["me", "Me", "me"]].map(function (t) {
    return '<a href="#' + t[0] + '" data-tab="' + t[0] + '">' + I(t[2]) + "<span>" + t[1] + "</span></a>";
  }).join("");

  // Load the latest crawled UNNC data (works when OMNI is served from a website,
  // e.g. GitHub Pages), and check again every 10 minutes while it's open.
  function refreshWeb() {
    if (!/^https?:$/.test(location.protocol) || typeof fetch !== "function") return;
    fetch("data/live.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.updatedAt !== WEB.updatedAt) { setWebData(j); softRender(); } })
      .catch(function () { /* offline or not published: keep what we have */ });
  }
  refreshWeb();
  setInterval(refreshWeb, 10 * 60 * 1000);

  // Connect to the shared database when OMNI runs as a claude.ai artifact.
  if (window.claude && typeof window.claude.use === "function") {
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (caps) {
      var db = caps[0], user = caps[1];
      if (!db) return;
      COMM.db = db; COMM.status = "connecting";
      var idP = user ? user.id().catch(function () { return null; }) : Promise.resolve(null);
      if (user) {
        user.isOwner().then(function (v) { COMM.owner = !!v; }, function () {});
        user.can("data.write").then(function (v) { COMM.canWrite = v; if (route().name === "new") render({ keepScroll: true }); }, function () {});
      }
      idP.then(function (id) {
        COMM.me = id;
        db.collection("posts").orderBy("createdAt", "desc").limit(200).onSnapshot(function (snap) {
          COMM.posts = snap.docs.map(function (d) { return cleanPost(d.id, d.data()); }).filter(Boolean);
          COMM.status = "live"; softRender();
        }, function () { COMM.status = "error"; });
        db.collection("regs").limit(2000).onSnapshot(function (snap) {
          COMM.regs = snap.docs.map(function (d) { var x = d.data() || {}; return { event: String(x.event || ""), by: String(x.by || ""), status: x.status === "waitlist" ? "waitlist" : "registered" }; });
          softRender();
        }, function () {});
      });
    }, function () {});
  }

  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("sample").then(function (sample) {
      if (!sample) return;
      AI.sample = sample;
      return sample.limits().then(function (lim) { AI.images = lim && lim.images && lim.images.maxCount ? lim.images : null; }, function () {});
    }).then(function () { if (route().name === "new") { ui.snapText = (document.getElementById("snap-text") || {}).value || ui.snapText; var keep = formValues(); render({ keepScroll: true }); fillForm(keep); } }, function () {});
  }

  window.addEventListener("hashchange", function () { render(); });
  applyTheme();
  render();
})();
