/*
 * OMNI's link to Supabase: real email codes, and posts and registrations that
 * every student sees. It talks to Supabase's plain web API, so no extra library
 * is needed. It only switches on when js/config.js has a Supabase URL and key.
 *
 * The shared-data part copies the small set of calls the app already uses for
 * the claude.ai preview (collection().onSnapshot, collection().add, doc().set,
 * doc().delete), so the rest of the app doesn't care which one it is using.
 */
(function (root) {
  "use strict";

  var SESSION_KEY = "omni-unnc-session";

  function safeStorage() {
    try { var s = root.localStorage; s.getItem("x"); return s; } catch (e) {
      var mem = {};
      return { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
    }
  }

  function newId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Turns a server error into a sentence a student understands.
  function explain(e, step) {
    var msg = String((e && e.message) || "").toLowerCase(), code = String((e && e.code) || "").toLowerCase(), st = e && e.status;
    if (!st) return "Couldn't reach OMNI's server. Check your internet connection and try again.";
    if (st === 429 || /rate.?limit/.test(code + msg)) return "Too many codes were asked for. Please wait a minute, then try again.";
    if (/unnc|database error saving new user|signup/.test(msg)) return "Only UNNC emails (ending in @nottingham.edu.cn) can sign in to OMNI.";
    if (step === "verify" && (st === 401 || st === 403 || /expired|invalid|otp/.test(code + msg))) return "That code isn't right or has expired. Check the newest email, or send a new code.";
    if (step === "send" && /email/.test(msg) && st === 400) return "That email address doesn't look right.";
    if (st === 401 || st === 403) return "Please sign in again, then try once more.";
    return "Something went wrong on OMNI's server (" + st + "). Please try again in a moment.";
  }

  function create(cfg, env) {
    env = env || {};
    var base = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
    var key = String(cfg.supabaseKey || "");
    var doFetch = env.fetch || (root.fetch && root.fetch.bind(root));
    var store = env.storage || safeStorage();
    var now = env.now || Date.now;
    var listeners = [];
    var session = load();

    function load() {
      try { var s = JSON.parse(store.getItem(SESSION_KEY) || "null"); return s && s.access_token && s.user && s.user.id ? s : null; } catch (e) { return null; }
    }
    function keep(s) {
      session = s;
      try { if (s) store.setItem(SESSION_KEY, JSON.stringify(s)); else store.removeItem(SESSION_KEY); } catch (e) { /* private window: stay signed in for this visit only */ }
    }

    function call(path, opts) {
      opts = opts || {};
      var headers = { apikey: key, "Content-Type": "application/json" };
      if (opts.token) headers.Authorization = "Bearer " + opts.token;
      Object.keys(opts.headers || {}).forEach(function (h) { headers[h] = opts.headers[h]; });
      return doFetch(base + path, { method: opts.method || "GET", headers: headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
        .then(function (r) {
          return r.text().then(function (t) {
            var j = null;
            try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
            if (!r.ok) {
              var err = new Error((j && (j.msg || j.message || j.error_description || j.error)) || "HTTP " + r.status);
              err.status = r.status; err.code = (j && (j.error_code || j.code)) || "";
              throw err;
            }
            return j;
          });
        });
    }

    function fromAuth(j) {
      if (!j || !j.access_token || !j.user || !j.user.id) { var e = new Error("No session in the reply"); e.status = 500; throw e; }
      var meta = j.user.user_metadata || {};
      return {
        access_token: j.access_token, refresh_token: j.refresh_token || "",
        expires_at: j.expires_at ? j.expires_at * 1000 : now() + (j.expires_in || 3600) * 1000,
        user: { id: j.user.id, email: j.user.email || "", name: meta.name || "" }
      };
    }

    // A working access token, refreshed when it's about to run out; null when signed out.
    var refreshing = null;
    function token() {
      if (!session) return Promise.resolve(null);
      if (session.expires_at - now() > 60000) return Promise.resolve(session.access_token);
      if (!refreshing) {
        var old = session;
        refreshing = call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: old.refresh_token } })
          .then(function (j) { keep(fromAuth(j)); return session.access_token; }, function (e) {
            if (e.status && e.status < 500) { keep(null); if (env.onSignedOut) env.onSignedOut(); return null; }
            return old.access_token; // offline for now: keep the session and try again later
          })
          .then(function (t) { refreshing = null; return t; });
      }
      return refreshing;
    }

    // ----- Sign-in with a code emailed by Supabase -----
    function sendCode(email, name) {
      return call("/auth/v1/otp", { method: "POST", body: { email: email, create_user: true, data: { name: name || "" } } });
    }
    function verifyCode(email, code) {
      return call("/auth/v1/verify", { method: "POST", body: { type: "email", email: email, token: String(code || "").replace(/\D/g, "") } })
        .then(function (j) { keep(fromAuth(j)); refresh(); return session.user; });
    }
    function signOut() {
      var t = session && session.access_token;
      keep(null);
      if (t) call("/auth/v1/logout", { method: "POST", token: t }).catch(function () {});
      refresh();
    }
    function deleteMe() {
      return token().then(function (t) {
        if (!t) throw notSignedIn();
        return call("/rest/v1/rpc/delete_me", { method: "POST", token: t, body: {} });
      }).then(function () { keep(null); refresh(); });
    }
    function isAdmin() {
      if (!session) return Promise.resolve(false);
      return token().then(function (t) {
        return call("/rest/v1/admins?select=user_id&user_id=eq." + encodeURIComponent(session.user.id), { token: t });
      }).then(function (rows) { return !!(rows && rows.length); }, function () { return false; });
    }

    // ----- Shared posts and registrations -----
    function notSignedIn() { var e = new Error("Sign in first"); e.status = 401; return e; }
    function poll(l) {
      return token().then(function (t) { return call(l.path, { token: t }); }).then(function (rows) {
        l.cb({ docs: (rows || []).map(function (r) { return { id: r.id, data: function () { return r.data || {}; } }; }) });
      }, function (e) { if (l.onErr) l.onErr(e); });
    }
    function refresh(table) {
      return Promise.all(listeners.filter(function (l) { return !table || l.table === table; }).map(poll));
    }
    var timer = null;
    function startTimer() {
      if (timer || env.noTimer || typeof setInterval !== "function") return;
      timer = setInterval(function () { if (!(root.document && root.document.hidden)) refresh(); }, env.pollMs || 20000);
      if (root.document && root.document.addEventListener) {
        root.document.addEventListener("visibilitychange", function () { if (!root.document.hidden) refresh(); });
      }
    }
    function write(table, id, data, upsert) {
      return token().then(function (t) {
        if (!t) throw notSignedIn();
        return call("/rest/v1/" + table + (upsert ? "?on_conflict=id" : ""), {
          method: "POST", token: t, body: { id: id, data: data },
          headers: { Prefer: "return=minimal" + (upsert ? ",resolution=merge-duplicates" : "") }
        });
      }).then(function () { refresh(table); });
    }

    function collection(table) {
      var q = { order: "created_at.desc", limit: 1000 };
      var api = {
        orderBy: function (field, dir) { q.order = "created_at." + (dir === "asc" ? "asc" : "desc"); return api; },
        limit: function (n) { q.limit = Math.max(1, Math.min(5000, n | 0)); return api; },
        add: function (data) { var id = newId(); return write(table, id, data, false).then(function () { return { id: id }; }); },
        onSnapshot: function (cb, onErr) {
          var l = { table: table, path: "/rest/v1/" + table + "?select=id,data&order=" + q.order + "&limit=" + q.limit, cb: cb, onErr: onErr };
          listeners.push(l); poll(l); startTimer();
          return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
        }
      };
      return api;
    }
    function doc(path) {
      var i = path.indexOf("/"), table = path.slice(0, i), id = path.slice(i + 1);
      return {
        set: function (data) { return write(table, id, data, true); },
        delete: function () {
          return token().then(function (t) {
            if (!t) throw notSignedIn();
            return call("/rest/v1/" + table + "?id=eq." + encodeURIComponent(id), { method: "DELETE", token: t, headers: { Prefer: "return=representation" } });
          }).then(function (rows) {
            refresh(table);
            if (!rows || !rows.length) { var e = new Error("Not allowed"); e.status = 403; throw e; }
          });
        }
      };
    }

    return {
      kind: "supabase",
      user: function () { return session ? session.user : null; },
      sendCode: sendCode, verifyCode: verifyCode, signOut: signOut, deleteMe: deleteMe, isAdmin: isAdmin,
      collection: collection, doc: doc, refresh: refresh, explain: explain
    };
  }

  var api = { create: create, explain: explain };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OMNI_BACKEND = api;
})(typeof window !== "undefined" ? window : globalThis);
