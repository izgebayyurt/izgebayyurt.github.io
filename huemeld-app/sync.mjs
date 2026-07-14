/* Build www/ from ../huemeld for the native wrapper:
   - flow2.html becomes index.html, with native.js injected BEFORE the game script
     (so window.HuemeldNative exists when the game boots)
   - the service worker is NOT copied (Capacitor serves from the app bundle;
     updates ship as app updates)
   Run: node sync.mjs */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dir, "..", "huemeld");
const WWW = join(__dir, "www");
mkdirSync(WWW, { recursive: true });

let html = readFileSync(join(SRC, "flow2.html"), "utf8");
// native bridge must exist before the game script runs
html = html.replace('<script src="flow-data.js"></script>',
  '<script src="native.js"></script>\n<script src="flow-data.js"></script>');
// no service worker inside the app shell (the registration is one full line)
html = html.replace(/^if\("serviceWorker".*$/m, "/* service worker: web build only */");
if (html.includes("serviceWorker")) throw new Error("service worker registration not fully stripped — check flow2.html");
if (!html.includes('<script src="native.js">')) throw new Error("native.js injection point not found — check flow2.html");
writeFileSync(join(WWW, "index.html"), html);

for (const f of ["flow-data.js", "icon-192.png", "icon-512.png", "icon-180.png"]) {
  copyFileSync(join(SRC, f), join(WWW, f));
}
// native.js lives in this folder (source of truth), copied into www
copyFileSync(join(__dir, "native.js"), join(WWW, "native.js"));
// background music (bundled into the app)
const MUSIC = join(WWW, "music");
mkdirSync(MUSIC, { recursive: true });
for (const f of readdirSync(join(SRC, "music"))) if (f.endsWith(".mp3")) copyFileSync(join(SRC, "music", f), join(MUSIC, f));
console.log("www/ built from ../huemeld");
