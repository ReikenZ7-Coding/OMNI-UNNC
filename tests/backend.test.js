// Checks OMNI's Supabase link with a pretend server, so no real account is needed.
const test = require("node:test");
const assert = require("node:assert");
const B = require("../js/backend.js");

function fakeServer(routes) {
  const calls = [];
  const fetch = (url, opts) => {
    calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : undefined });
    const path = url.replace("https://x.supabase.co", "");
    const hit = routes.find((r) => r.method === opts.method && path.startsWith(r.path));
    const [status, json] = hit ? hit.reply(path, opts) : [404, { message: "not found" }];
    return Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(json === undefined ? "" : JSON.stringify(json)) });
  };
  return { fetch, calls };
}
function memStore() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; }, m }; }
const cfg = { supabaseUrl: "https://x.supabase.co/", supabaseKey: "pub-key" };
const session = { access_token: "tok", refresh_token: "ref", expires_in: 3600, user: { id: "u1", email: "ssyly12@nottingham.edu.cn", user_metadata: { name: "Lin" } } };

test("email code: send, verify, then remembered after reload", async () => {
  const srv = fakeServer([
    { method: "POST", path: "/auth/v1/otp", reply: () => [200, {}] },
    { method: "POST", path: "/auth/v1/verify", reply: () => [200, session] }
  ]);
  const store = memStore();
  const be = B.create(cfg, { fetch: srv.fetch, storage: store, noTimer: true });
  assert.equal(be.user(), null);
  await be.sendCode("ssyly12@nottingham.edu.cn", "Lin");
  assert.equal(srv.calls[0].opts.headers.apikey, "pub-key");
  assert.equal(srv.calls[0].body.create_user, true);
  const u = await be.verifyCode("ssyly12@nottingham.edu.cn", " 123 456 ");
  assert.equal(srv.calls[1].body.token, "123456");
  assert.equal(srv.calls[1].body.type, "email");
  assert.deepEqual(u, { id: "u1", email: "ssyly12@nottingham.edu.cn", name: "Lin" });
  const again = B.create(cfg, { fetch: srv.fetch, storage: store, noTimer: true });
  assert.equal(again.user().id, "u1");
  again.signOut();
  assert.equal(again.user(), null);
});

test("wrong code and other errors become plain sentences", async () => {
  const srv = fakeServer([{ method: "POST", path: "/auth/v1/verify", reply: () => [403, { error_code: "otp_expired", msg: "Token has expired or is invalid" }] }]);
  const be = B.create(cfg, { fetch: srv.fetch, storage: memStore(), noTimer: true });
  const err = await be.verifyCode("a@nottingham.edu.cn", "000000").catch((e) => e);
  assert.match(B.explain(err, "verify"), /isn't right or has expired/);
  assert.match(B.explain({ status: 429 }, "send"), /wait a minute/);
  assert.match(B.explain({ status: 500, message: "Database error saving new user" }, "send"), /Only UNNC emails/);
  assert.match(B.explain(new TypeError("fetch failed")), /internet connection/);
});

test("an old sign-in is refreshed before use", async () => {
  let t = 1000000;
  const srv = fakeServer([
    { method: "POST", path: "/auth/v1/verify", reply: () => [200, Object.assign({}, session, { expires_in: 120 })] },
    { method: "POST", path: "/auth/v1/token", reply: () => [200, Object.assign({}, session, { access_token: "tok2" })] },
    { method: "GET", path: "/rest/v1/posts", reply: () => [200, []] }
  ]);
  const be = B.create(cfg, { fetch: srv.fetch, storage: memStore(), noTimer: true, now: () => t });
  await be.verifyCode("ssyly12@nottingham.edu.cn", "123456");
  t += 100000; // 100 s later: 20 s left, so refresh first
  await new Promise((done) => be.collection("posts").onSnapshot(done));
  const get = srv.calls.find((c) => c.url.includes("/rest/v1/posts"));
  assert.equal(get.opts.headers.Authorization, "Bearer tok2");
  assert.equal(srv.calls.find((c) => c.url.includes("/auth/v1/token")).body.refresh_token, "ref");
});

test("refresh refused: signed out, and the app is told", async () => {
  let t = 0, told = false;
  const srv = fakeServer([
    { method: "POST", path: "/auth/v1/verify", reply: () => [200, Object.assign({}, session, { expires_in: 30 })] },
    { method: "POST", path: "/auth/v1/token", reply: () => [400, { error_code: "refresh_token_not_found" }] },
    { method: "GET", path: "/rest/v1/posts", reply: () => [200, []] }
  ]);
  const be = B.create(cfg, { fetch: srv.fetch, storage: memStore(), noTimer: true, now: () => t, onSignedOut: () => { told = true; } });
  await be.verifyCode("ssyly12@nottingham.edu.cn", "123456");
  await new Promise((done) => be.collection("posts").onSnapshot(done));
  assert.equal(be.user(), null);
  assert.equal(told, true);
  assert.equal(srv.calls.find((c) => c.url.includes("/rest/v1/posts")).opts.headers.Authorization, undefined);
});

test("shared posts: read, add, register and delete", async () => {
  const rows = [{ id: "p1", data: { kind: "news", title: "Hello" } }];
  const srv = fakeServer([
    { method: "POST", path: "/auth/v1/verify", reply: () => [200, session] },
    { method: "GET", path: "/rest/v1/posts", reply: () => [200, rows] },
    { method: "POST", path: "/rest/v1/posts", reply: (p, o) => { rows.unshift(JSON.parse(o.body)); return [201]; } },
    { method: "POST", path: "/rest/v1/regs", reply: () => [201] },
    { method: "DELETE", path: "/rest/v1/posts", reply: (p) => [200, p.includes("id=eq.p1") ? [{ id: "p1" }] : []] }
  ]);
  const be = B.create(cfg, { fetch: srv.fetch, storage: memStore(), noTimer: true });
  const snaps = [];
  be.collection("posts").orderBy("createdAt", "desc").limit(200).onSnapshot((s) => snaps.push(s.docs.map((d) => [d.id, d.data().title])));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(snaps[0], [["p1", "Hello"]]);
  assert.ok(srv.calls[0].url.endsWith("/rest/v1/posts?select=id,data&order=created_at.desc&limit=200"));

  // Not signed in: writing is refused before anything is sent.
  const refused = await be.collection("posts").add({ title: "x" }).catch((e) => e);
  assert.equal(refused.status, 401);

  await be.verifyCode("ssyly12@nottingham.edu.cn", "123456");
  const ref = await be.collection("posts").add({ kind: "notice", title: "Lost keys", createdBy: "u1" });
  const post = srv.calls.find((c) => c.opts.method === "POST" && c.url.endsWith("/rest/v1/posts"));
  assert.equal(post.body.id, ref.id);
  assert.equal(post.opts.headers.Authorization, "Bearer tok");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(snaps[snaps.length - 1][0][1], "Lost keys");

  await be.doc("regs/p9--u1").set({ event: "p9", by: "u1", status: "registered" });
  const reg = srv.calls.find((c) => c.url.includes("/rest/v1/regs"));
  assert.ok(reg.url.endsWith("?on_conflict=id"));
  assert.match(reg.opts.headers.Prefer, /merge-duplicates/);
  assert.equal(reg.body.id, "p9--u1");

  await be.doc("posts/p1").delete();
  const notMine = await be.doc("posts/other").delete().catch((e) => e);
  assert.equal(notMine.status, 403);
});
