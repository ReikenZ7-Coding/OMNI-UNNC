/*
 * OMNI-UNNC screens.
 *
 * How it works, in short:
 *  - The address after "#" decides the screen: #discover, #event-<id>,
 *    #my-events, #help, #office-<id>, #profile.
 *  - Everything the student does (sign-in, registrations, help requests) is
 *    saved in this browser with localStorage. There is no server yet.
 *  - Sign-in is a demo. A real version would use the university's own
 *    single sign-on, so students log in once and every feature trusts it.
 */
(function () {
  "use strict";

  var D = window.OMNI_DATA;
  var L = window.OmniLogic;
  var STORE_KEY = "omni-unnc-v1";
  var view = document.getElementById("view");
  var tabs = document.getElementById("tabs");
  var toastEl = document.getElementById("toast");

  // ---------- Saved state ----------
  function blankState() {
    return { student: null, registrations: {}, requests: [], logins: 0 };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(blankState(), JSON.parse(raw));
    } catch (e) { /* storage blocked: run without saving */ }
    return blankState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  var state = load();

  // Screen-only state (not saved)
  var ui = { query: "", category: "all", when: "all", available: false, helpQuery: "", myTab: "upcoming" };

  function now() { return new Date(); }
  function events() { return L.withDates(D.events, now()); }
  function eventById(id) { return events().find(function (e) { return e.id === id; }); }
  function officeById(id) { return D.offices.find(function (o) { return o.id === id; }); }
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
  var DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function sameDay(a, b) { return a.toDateString() === b.toDateString(); }
  function dayWord(d) {
    var today = L.startOfDay(now());
    var diff = Math.round((L.startOfDay(d) - today) / L.DAY);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  function when(e) { return dayWord(e.startAt) + " · " + e.start + " to " + e.end; }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "S";
  }
  function firstName() { return state.student ? state.student.name.split(" ")[0] : ""; }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function availability(e) {
    var mine = state.registrations[e.id];
    if (mine && mine.status === "registered") return '<span class="pill ok">✓ You\'re going</span>';
    if (mine && mine.status === "waitlist") return '<span class="pill low">On waitlist</span>';
    if (L.isDropIn(e)) return '<span class="pill info">Drop-in, no booking</span>';
    var left = L.spotsLeft(e, state.registrations);
    if (left === 0) return '<span class="pill full">Full · waitlist open</span>';
    if (left <= 10) return '<span class="pill low">' + left + (left === 1 ? " place" : " places") + ' left</span>';
    return '<span class="pill plain">' + left + ' places left</span>';
  }

  function actionButton(e, size) {
    var mine = state.registrations[e.id];
    var cls = "btn" + (size ? " " + size : "");
    if (L.isDropIn(e)) return "";
    if (mine) return '<button class="' + cls + ' quiet" data-act="cancel" data-id="' + e.id + '">' + (mine.status === "waitlist" ? "Leave waitlist" : "Cancel") + "</button>";
    if (L.spotsLeft(e, state.registrations) === 0) return '<button class="' + cls + ' secondary" data-act="register" data-id="' + e.id + '">Join waitlist</button>';
    return '<button class="' + cls + '" data-act="register" data-id="' + e.id + '">Register</button>';
  }

  function dateStub(e) {
    var d = e.startAt;
    return '<div class="date-stub' + (sameDay(d, now()) ? " today" : "") + '" aria-hidden="true">' +
      '<span class="dow">' + DOW[d.getDay()] + '</span><span class="d">' + d.getDate() + '</span><span class="m">' + MON[d.getMonth()] + "</span></div>";
  }

  function eventCard(e) {
    return '<article class="card" data-open="' + e.id + '" tabindex="0" aria-label="' + esc(e.title) + '">' +
      dateStub(e) +
      '<div class="card-body">' +
        '<div class="card-title">' + esc(e.title) + "</div>" +
        '<div class="meta">' + esc(e.start + " · " + e.location) + "</div>" +
        '<div class="card-foot">' + availability(e) + '<span class="source">' + esc(categoryLabel(e.category)) + "</span>" + actionButton(e, "small") + "</div>" +
      "</div></article>";
  }

  // ---------- Screens ----------
  function screenSignIn() {
    var sources = Object.keys(D.sources).map(function (k) { return '<span class="pill plain">' + esc(D.sources[k]) + "</span>"; }).join("");
    return '<section class="stack signin">' +
      '<div class="wordmark">OMNI<span>.</span></div>' +
      '<p class="signin-lede">Every campus event and every kind of help, in one place. <b>Sign in once</b> and you are done.</p>' +
      '<div class="stack"><span class="eyebrow">Instead of checking</span><div class="scatter">' + sources + "</div></div>" +
      '<form class="signin-card" id="signin-form" autocomplete="off">' +
        "<h2>Sign in with your university account</h2>" +
        '<div class="field"><label for="si-name">Your name</label><input class="input" id="si-name" name="name" placeholder="e.g. Lin Yifan" value="" maxlength="40"></div>' +
        '<div class="field"><label for="si-id">Student ID</label><input class="input" id="si-id" name="sid" inputmode="numeric" placeholder="8 digits" value="20512345" maxlength="8"></div>' +
        '<button class="btn block" type="submit">Sign in once</button>' +
        '<p class="demo-note">Demo sign-in: no password is asked for and nothing leaves this device. The real app would hand this step to the university\'s single sign-on.</p>' +
      "</form></section>";
  }

  function screenDiscover() {
    var list = L.filterEvents(events(), ui, now(), state.registrations);
    var chips = [{ id: "all", label: "All" }].concat(D.categories).map(function (c) {
      return '<button class="chip" data-cat="' + c.id + '" aria-pressed="' + (ui.category === c.id) + '">' + esc(c.label) + "</button>";
    }).join("");
    var seg = [["all", "Any time"], ["today", "Today"], ["week", "This week"]].map(function (w) {
      return '<button data-when="' + w[0] + '" aria-pressed="' + (ui.when === w[0]) + '">' + w[1] + "</button>";
    }).join("");
    var going = Object.keys(state.registrations).filter(function (id) {
      var e = eventById(id); return e && e.endAt > now() && state.registrations[id].status === "registered";
    }).length;
    return '<section class="greeting"><div class="stack" style="gap:4px">' +
        '<span class="eyebrow">' + esc(now().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })) + "</span>" +
        "<h1>Hi " + esc(firstName()) + ", what's on?</h1></div>" +
        (going ? '<a class="pill ok" href="#my-events">' + going + " booked</a>" : "") +
      "</section>" +
      '<section class="filters">' +
        '<div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
        '<input class="input" id="q" type="search" placeholder="Search events, clubs, places" aria-label="Search events" value="' + esc(ui.query) + '"></div>' +
        '<div class="chips" role="group" aria-label="Category">' + chips + "</div>" +
        '<div class="row"><div class="segmented" role="group" aria-label="When" style="flex:1;min-width:220px">' + seg + "</div>" +
        '<label class="toggle"><input type="checkbox" id="avail"' + (ui.available ? " checked" : "") + "> Places left</label></div>" +
      "</section>" +
      '<section class="feed" aria-live="polite">' +
        '<div class="feed-head"><h2>' + (list.length ? list.length + (list.length === 1 ? " event" : " events") : "No events") + '</h2><span class="muted small">from 5 places, in one list</span></div>' +
        (list.length ? list.map(eventCard).join("") :
          '<div class="empty"><p>Nothing matches those filters.</p><button class="btn secondary small" data-act="clear">Clear filters</button></div>') +
      "</section>";
  }

  function screenEvent(id) {
    var e = eventById(id);
    if (!e) return '<a class="back" href="#discover">← Back</a><div class="empty">That event could not be found.</div>';
    var mine = state.registrations[e.id];
    var filled = e.capacity ? Math.min(100, Math.round(((e.taken + (mine && mine.status === "registered" ? 1 : 0)) / e.capacity) * 100)) : 0;
    var past = e.endAt < now();
    var ticket = mine ? ticketHtml(e, mine) : "";
    var cta = "";
    if (!past) {
      if (L.isDropIn(e)) cta = '<p class="muted small">No registration needed. Just turn up.</p>';
      else if (!mine) cta = actionButton(e, "block") + '<p class="muted small" style="text-align:center">One tap. You\'re already signed in as ' + esc(state.student.name) + ".</p>";
      else cta = actionButton(e, "block");
    }
    return '<a class="back" href="#discover">← All events</a>' +
      '<section class="detail-head">' +
        '<div class="row"><span class="pill info">' + esc(categoryLabel(e.category)) + "</span>" + (past ? '<span class="pill plain">Finished</span>' : availability(e)) + "</div>" +
        "<h1>" + esc(e.title) + "</h1>" +
        '<p class="muted">by ' + esc(e.organiser) + "</p>" +
      "</section>" +
      ticket +
      '<dl class="facts"><dt>When</dt><dd>' + esc(when(e)) + "</dd><dt>Where</dt><dd>" + esc(e.location) + "</dd>" +
        (e.capacity ? "<dt>Places</dt><dd><div class=\"stack\" style=\"gap:6px\"><span>" + (L.spotsLeft(e, state.registrations)) + " of " + e.capacity + ' left</span><div class="meter" role="img" aria-label="' + filled + '% full"><i style="width:' + filled + '%"></i></div></div></dd>' : "") +
      "</dl>" +
      "<p>" + esc(e.description) + "</p>" +
      '<p class="was">Before OMNI, this was only posted on <b>' + esc(D.sources[e.source]) + "</b>. Now it is in the same feed as everything else.</p>" +
      (cta ? '<div class="sticky-cta">' + cta + "</div>" : "");
  }

  function ticketHtml(e, mine) {
    var wait = mine.status === "waitlist";
    return '<div class="ticket' + (wait ? " waitlist" : "") + '">' +
      '<div class="ticket-main"><span class="eyebrow">' + (wait ? "Waitlist" : "Your ticket") + "</span>" +
        '<a href="#event-' + e.id + '" class="card-title" style="color:inherit;text-decoration:none">' + esc(e.title) + "</a>" +
        '<span class="meta">' + esc(when(e)) + "</span><span class=\"meta\">" + esc(e.location) + "</span></div>" +
      '<div class="ticket-code"><span>' + (wait ? "Ref" : "Check-in") + "</span><b>" + esc(mine.code) + "</b></div></div>";
  }

  function screenMyEvents() {
    var all = Object.keys(state.registrations).map(function (id) { return eventById(id); }).filter(Boolean);
    var upcoming = all.filter(function (e) { return e.endAt > now(); }).sort(function (a, b) { return a.startAt - b.startAt; });
    var past = all.filter(function (e) { return e.endAt <= now(); }).sort(function (a, b) { return b.startAt - a.startAt; });
    var list = ui.myTab === "past" ? past : upcoming;
    var seg = '<div class="segmented" role="group" aria-label="Show"><button data-mytab="upcoming" aria-pressed="' + (ui.myTab === "upcoming") + '">Upcoming (' + upcoming.length + ')</button><button data-mytab="past" aria-pressed="' + (ui.myTab === "past") + '">Past (' + past.length + ")</button></div>";
    var body = list.length ? list.map(function (e) { return ticketHtml(e, state.registrations[e.id]); }).join("") :
      '<div class="empty"><p>' + (ui.myTab === "past" ? "No past events yet." : "You haven't registered for anything yet.") + "</p>" +
      (ui.myTab === "past" ? "" : '<a class="btn small" href="#discover">Find something to do</a>') + "</div>";
    return '<section class="stack" style="gap:4px"><span class="eyebrow">Your tickets</span><h1>My events</h1></section>' +
      seg + '<section class="stack">' + body + "</section>" +
      (ui.myTab === "upcoming" && upcoming.length ? '<p class="muted small">Show the check-in code at the door. Tap an event name for details or to cancel.</p>' : "");
  }

  function screenHelp() {
    var r = L.routeHelp(ui.helpQuery, D.offices, D.faqs);
    var results = "";
    if (ui.helpQuery.trim()) {
      if (r.offices.length) {
        var best = r.offices[0].office;
        results += '<section class="match"><span class="eyebrow">Best place to ask</span><h2>' + esc(best.name) + "</h2>" +
          '<p class="muted small">' + esc(best.short) + ". Matched: " + esc(r.offices[0].hits.slice(0, 3).join(", ") || best.name) + "</p>" +
          '<div class="row"><a class="btn small" href="#office-' + best.id + '">Ask ' + esc(best.name) + "</a>" +
          (r.offices[1] ? '<span class="muted small">or <a href="#office-' + r.offices[1].office.id + '">' + esc(r.offices[1].office.name) + "</a></span>" : "") + "</div></section>";
      } else {
        results += '<div class="empty"><p>We couldn\'t tell which office handles that. Try other words, or ask the Student Service Centre and they will pass it on.</p><a class="btn small secondary" href="#office-registry">Ask the Student Service Centre</a></div>';
      }
      if (r.faqs.length) results += '<section class="stack"><h2>Quick answers</h2>' + r.faqs.map(function (f) { return faqHtml(f.faq, true); }).join("") + "</section>";
    }
    var mine = state.requests.slice().reverse();
    var requests = mine.length ? '<section class="stack"><h2>Your requests</h2>' + mine.map(function (q) {
      var o = officeById(q.office);
      return '<div class="request"><div class="row"><b>' + esc(q.subject) + '</b><span class="spacer"></span><span class="pill low">' + esc(q.status) + "</span></div>" +
        '<span class="muted small">' + esc(o ? o.name : q.office) + " · sent " + esc(dayWord(new Date(q.at))) + " · replies " + esc(o ? o.replies : "soon") + "</span></div>";
    }).join("") + "</section>" : "";

    var tiles = D.offices.map(function (o) {
      return '<a class="office-tile" href="#office-' + o.id + '"><b>' + esc(o.name) + "</b><span>" + esc(o.short) + "</span></a>";
    }).join("");
    return '<section class="stack" style="gap:4px"><span class="eyebrow">One front desk</span><h1>What do you need help with?</h1></section>' +
      '<div class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
      '<input class="input" id="hq" type="search" placeholder="e.g. my dorm air conditioner is broken" aria-label="Describe your problem" value="' + esc(ui.helpQuery) + '"></div>' +
      (ui.helpQuery.trim() ? "" : '<div class="chips">' + ["Wi-Fi not working", "Lost my student card", "Residence permit", "Feeling stressed", "CV check", "Book a study room"].map(function (s) {
        return '<button class="chip" data-hq="' + esc(s) + '">' + esc(s) + "</button>";
      }).join("") + "</div>") +
      '<div id="help-results" class="stack" style="gap:18px">' + results + "</div>" +
      requests +
      '<section class="stack"><h2>Or pick an office</h2><div class="office-grid">' + tiles + "</div></section>";
  }

  function faqHtml(f, withOffice) {
    var o = officeById(f.office);
    return '<details class="faq"><summary>' + esc(f.q) + "</summary><p>" + esc(f.a) + "</p>" +
      (withOffice && o ? '<a class="office-link" href="#office-' + o.id + '">Still stuck? Ask ' + esc(o.name) + " →</a>" : "") + "</details>";
  }

  function screenOffice(id) {
    var o = officeById(id);
    if (!o) return '<a class="back" href="#help">← Help</a><div class="empty">That office could not be found.</div>';
    var faqs = D.faqs.filter(function (f) { return f.office === o.id; });
    var guess = ui.helpQuery.trim();
    return '<a class="back" href="#help">← Help</a>' +
      '<section class="stack" style="gap:6px"><span class="eyebrow">Office</span><h1>' + esc(o.name) + '</h1><p class="muted">' + esc(o.short) + "</p></section>" +
      '<dl class="facts"><dt>Where</dt><dd>' + esc(o.where) + "</dd><dt>Open</dt><dd>" + esc(o.hours) + "</dd><dt>Replies</dt><dd>" + esc(o.replies) + "</dd></dl>" +
      (faqs.length ? '<section class="stack"><h2>Common questions</h2>' + faqs.map(function (f) { return faqHtml(f, false); }).join("") + "</section>" : "") +
      '<form class="stack" id="req-form" data-office="' + o.id + '"><h2>Send a request</h2>' +
        '<div class="as-user"><span class="avatar" style="width:32px;height:32px;font-size:.85rem">' + esc(initials(state.student.name)) + "</span><span>Sending as <b>" + esc(state.student.name) + "</b> (" + esc(state.student.id) + "). No need to log in again.</span></div>" +
        '<div class="field"><label for="rq-subject">Subject</label><input class="input" id="rq-subject" required maxlength="80" value="' + esc(guess) + '" placeholder="A short summary"></div>' +
        '<div class="field"><label for="rq-body">Details</label><textarea class="input" id="rq-body" maxlength="1000" placeholder="What happened, and anything they need to know (room number, module code...)"></textarea></div>' +
        '<button class="btn block" type="submit">Send to ' + esc(o.name) + "</button>" +
        '<p class="muted small">Demo: the request is saved on this device only. Nothing is sent to the real office.</p>' +
      "</form>";
  }

  function screenProfile() {
    var s = state.student;
    var regs = Object.keys(state.registrations).length;
    return '<section class="profile-head"><div class="avatar">' + esc(initials(s.name)) + '</div><div class="stack" style="gap:2px;min-width:0"><h1 style="font-size:1.4rem">' + esc(s.name) + '</h1><span class="muted">Student ID ' + esc(s.id) + "</span></div></section>" +
      '<section class="stats"><div class="stat"><b>' + regs + "</b><span>events booked</span></div><div class=\"stat\"><b>" + state.requests.length + '</b><span>help requests</span></div><div class="stat"><b>' + Math.max(1, state.logins) + "</b><span>" + (state.logins > 1 ? "sign-ins" : "sign-in") + "</span></div></section>" +
      '<section class="sso"><h2>Signed in once, used everywhere</h2><ul>' +
        "<li><span>Event registration</span><span class=\"pill ok\">✓ connected</span></li>" +
        "<li><span>Help requests to offices</span><span class=\"pill ok\">✓ connected</span></li>" +
        "<li><span>Moodle, email, timetable</span><span class=\"pill plain\">planned</span></li>" +
      "</ul></section>" +
      '<section class="about"><h2 style="color:var(--ink)">About this prototype</h2>' +
        "<p>OMNI is a student project for BUSI1116. It tests one idea: students should find an event, register and get help in one place, logging in only once.</p>" +
        "<p>All events, offices and answers here are sample data written for testing. This is not an official university service.</p></section>" +
      '<div class="row"><button class="btn secondary" data-act="signout">Sign out</button><button class="btn quiet" data-act="reset">Reset demo data</button></div>';
  }

  // ---------- Router ----------
  function route() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!state.student) return { name: "signin" };
    if (!h || h === "discover") return { name: "discover", tab: "discover" };
    if (h.indexOf("event-") === 0) return { name: "event", id: h.slice(6), tab: "discover" };
    if (h === "my-events") return { name: "my-events", tab: "my-events" };
    if (h === "help") return { name: "help", tab: "help" };
    if (h.indexOf("office-") === 0) return { name: "office", id: h.slice(7), tab: "help" };
    if (h === "profile") return { name: "profile", tab: "profile" };
    return { name: "discover", tab: "discover" };
  }

  var lastRoute = "";
  function render(opts) {
    var r = route();
    var html;
    switch (r.name) {
      case "signin": html = screenSignIn(); break;
      case "event": html = screenEvent(r.id); break;
      case "my-events": html = screenMyEvents(); break;
      case "help": html = screenHelp(); break;
      case "office": html = screenOffice(r.id); break;
      case "profile": html = screenProfile(); break;
      default: html = screenDiscover();
    }
    view.innerHTML = html;
    view.classList.toggle("no-tabs", r.name === "signin");
    tabs.hidden = r.name === "signin";
    Array.prototype.forEach.call(tabs.querySelectorAll("a"), function (a) {
      if (a.dataset.tab === r.tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var key = r.name + ":" + (r.id || "");
    if (key !== lastRoute && !(opts && opts.keepScroll)) window.scrollTo(0, 0);
    lastRoute = key;
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
    toast(res.status === "registered" ? "You're in! Ticket saved to My events." : "Event is full, so you're on the waitlist.");
  }
  function doCancel(id) {
    var mine = state.registrations[id];
    state.registrations = L.cancel(id, state.registrations);
    save();
    toast(mine && mine.status === "waitlist" ? "You left the waitlist." : "Registration cancelled.");
  }

  view.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-act],[data-cat],[data-when],[data-mytab],[data-hq],[data-open]");
    if (!t) return;
    if (t.dataset.act) {
      ev.stopPropagation();
      var act = t.dataset.act;
      if (act === "register") doRegister(t.dataset.id);
      else if (act === "cancel") doCancel(t.dataset.id);
      else if (act === "clear") { ui.query = ""; ui.category = "all"; ui.when = "all"; ui.available = false; }
      else if (act === "signout") { state.student = null; save(); location.hash = ""; toast("Signed out."); }
      else if (act === "reset") {
        if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Tap again to reset"; return; }
        var s = state.student; state = blankState(); state.student = s; state.logins = 1; seedDemo(); save(); toast("Demo data reset.");
      }
      render({ keepScroll: true });
      return;
    }
    if (t.dataset.cat) { ui.category = t.dataset.cat; render({ keepScroll: true }); return; }
    if (t.dataset.when) { ui.when = t.dataset.when; render({ keepScroll: true }); return; }
    if (t.dataset.mytab) { ui.myTab = t.dataset.mytab; render({ keepScroll: true }); return; }
    if (t.dataset.hq) { ui.helpQuery = t.dataset.hq; render({ keepScroll: true }); return; }
    if (t.dataset.open) { location.hash = "event-" + t.dataset.open; }
  });

  view.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.open) location.hash = "event-" + ev.target.dataset.open;
  });

  function onSearchInput(ev) {
    if (ev.isComposing) return; // wait until a Chinese (pinyin) word is finished
    if (ev.target.id === "q") { ui.query = ev.target.value; rerenderKeepingFocus("q"); }
    else if (ev.target.id === "hq") { ui.helpQuery = ev.target.value; rerenderKeepingFocus("hq"); }
  }
  view.addEventListener("input", onSearchInput);
  view.addEventListener("compositionend", onSearchInput);
  view.addEventListener("change", function (ev) {
    if (ev.target.id === "avail") { ui.available = ev.target.checked; render({ keepScroll: true }); }
  });

  view.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target;
    if (f.id === "signin-form") {
      var name = f.querySelector("#si-name").value.trim().replace(/\s+/g, " ");
      var sid = f.querySelector("#si-id").value.trim();
      if (!name) name = "Demo Student";
      if (!/^\d{8}$/.test(sid)) { toast("Student ID should be 8 digits."); return; }
      var first = !state.logins;
      state.student = { name: name, id: sid };
      state.logins = (state.logins || 0) + 1;
      if (first) seedDemo();
      save();
      location.hash = "discover";
      render();
      toast("Signed in. You won't be asked again.");
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
    var regs = {};
    ["halloween-movie", "referencing"].forEach(function (id) {
      var e = eventById(id);
      if (e) regs = L.register(e, regs, state.student, new Date(e.startAt.getTime() - 3 * L.DAY)).registrations;
    });
    state.registrations = Object.assign(regs, state.registrations);
  }

  window.addEventListener("hashchange", function () { render(); });
  render();
})();
