/* Extract the LEVELS array literal from flow2.html so tools can operate on it. */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dir = dirname(fileURLToPath(import.meta.url));

export function loadLevels(file = join(__dir, "..", "flow2.html")) {
  const src = readFileSync(file, "utf8");
  const start = src.indexOf("var LEVELS=[");
  if (start < 0) throw new Error("LEVELS not found");
  // find the matching closing "];" of the array
  let i = src.indexOf("[", start), depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  const arrText = src.slice(src.indexOf("[", start), end + 1);
  // eslint-disable-next-line no-eval
  return eval(arrText);
}
