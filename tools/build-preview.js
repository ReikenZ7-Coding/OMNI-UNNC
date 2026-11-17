// Builds dist/preview.html: the whole app squeezed into one file, so it can be
// shared as a single page. Run with: npm run build:preview
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let html = read("index.html");
html = html.replace(/<link rel="stylesheet" href="css\/app\.css">/, () => "<style>\n" + read("css/app.css") + "</style>");
html = html.replace(/<script src="(js\/[\w.-]+\.js)"><\/script>/g, (_, file) => "<script>\n" + read(file) + "</script>");
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
