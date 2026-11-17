// Builds dist/preview.html: the whole app squeezed into one file, so it can be
// shared as a single page. Run with: npm run build:preview
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let html = read("index.html");
html = html.replace(/<link rel="stylesheet" href="css\/app\.css">/, () => "<style>\n" + read("css/app.css") + "</style>");
html = html.replace(/<script src="(js\/[\w.-]+\.js)"><\/script>/g, (_, file) => "<script>\n" + read(file) + "</script>");
// Bake in the latest crawled UNNC data, so the single-file preview shows it too.
try {
  const live = read("data/live.json");
  JSON.parse(live);
  html = html.replace('<script>\n', () => "<script>\nwindow.OMNI_LIVE = " + live.trim().replace(/</g, "\\u003c") + ";\n</script>\n<script>\n");
} catch (e) { console.log("No data/live.json yet: the preview will only show sample data."); }
html = html.replace(/<link rel="manifest"[^>]*>\n?/, "").replace(/<link rel="icon"[^>]*>\n?/, "");
if (process.argv.includes("--fragment")) {
  // The page host adds its own <html>, <head> and <body>, so strip ours.
  html = html
    .replace(/<!doctype html>\n?/i, "")
    .replace(/<\/?html[^>]*>\n?/g, "")
    .replace(/<\/?head>\n?/g, "")
    .replace(/<\/?body>\n?/g, "")
    .replace(/<meta charset[^>]*>\n?/, "")
    .replace(/<meta name="viewport"[^>]*>\n?/, "");
}
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const out = path.join(root, "dist", process.argv.includes("--fragment") ? "preview-fragment.html" : "preview.html");
fs.writeFileSync(out, html);
console.log("Wrote " + path.relative(root, out) + " (" + Math.round(html.length / 1024) + " KB)");
