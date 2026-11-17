// Temporary: prints the raw HTML around the first items of each UNNC page,
// so the crawler's patterns can be written against the real markup.
const urls = [
  "https://www.nottingham.edu.cn/en/events/event-listing.aspx",
  "https://www.nottingham.edu.cn/en/press-release/news-listing.aspx",
  "https://www.nottingham.edu.cn/en/science-engineering/events/listing.aspx",
  "https://www.nottingham.edu.cn/en/events/event-details.aspx?id=04a1e20c-c3a3-4971-a962-4b4f7fde9123&language=en-GB",
  "https://www.nottingham.edu.cn/en/Press-Release/News-Article.aspx?id=74d320ec-aaad-4e73-8bdc-3e66aad64152&language=en-GB"
];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "OMNI-UNNC student prototype (github.com/ReikenZ7-Coding/OMNI-UNNC)" } });
      const h = await r.text();
      console.log("\n######## " + u + " status " + r.status + " length " + h.length);
      const i = h.search(/event-details\.aspx\?id=|News-Article\.aspx\?id=|Event\.aspx\?id=/i);
      const detail = /details|Article/.test(u);
      const start = detail ? Math.max(0, h.search(/<main|id="content|class="[^"]*(content|article|event)/i)) : Math.max(0, i - 1500);
      console.log(h.slice(start, start + (detail ? 6000 : 4500)).replace(/\s+/g, " "));
      if (detail) console.log("META:", (h.match(/<meta[^>]+(og:|description)[^>]*>/gi) || []).join("\n"));
    } catch (e) { console.log("FAIL " + u + " " + e.message); }
  }
})();
