// Unpacks the exported design bundle into one readable HTML file per screen.
// Usage: node scripts/extract-design.mjs <bundle.html> <outDir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

const EXPECTED_SCREENS = [
  "01-sign-in",
  "02-sign-up",
  "03-tasks-board",
  "04-create-task",
  "05-task-detail",
  "06-calendar",
  "07-history-streak",
  "08-focus-mode",
  "09-create-project",
  "10-project-overview",
  "component-sidebar",
];
const MAX_SCREEN_BYTES = 30_000;

function island(html, type) {
  const pattern = new RegExp(`<script type="__bundler/${type}">\\s*([\\s\\S]*?)\\s*</script>`);
  const match = html.match(pattern);
  if (!match) throw new Error(`Not a design bundle: no ${type} section found`);
  return JSON.parse(match[1]);
}

function decodeAsset(manifest, uuid) {
  const asset = manifest[uuid];
  if (!asset) throw new Error(`Bundle has no asset ${uuid}`);
  const bytes = Buffer.from(asset.data, "base64");
  return (asset.compressed ? gunzipSync(bytes) : bytes).toString("utf8");
}

function slug(title) {
  return title
    .replace(/\(.*\)/, "")
    .replace(/&amp;/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripBundleRuntime(html) {
  return html
    .replace(/<style>\/\* devanagari \*\/[\s\S]*?<\/style>\n?/, "")
    .replace(/<script src="[0-9a-f-]{36}"><\/script>\n?/, "");
}

function extractScreens(bundle) {
  const manifest = island(bundle, "manifest");
  const boards = island(bundle, "template").matchAll(
    /<h2>([^<]*)<\/h2><iframe src="about:blank#([0-9a-f-]{36})"/g,
  );
  return [...boards].map(([, title, uuid]) => ({
    name: slug(title),
    html: stripBundleRuntime(island(decodeAsset(manifest, uuid), "template")),
  }));
}

function assertComplete(screens) {
  const found = screens.map((screen) => screen.name).sort();
  const missing = EXPECTED_SCREENS.filter((name) => !found.includes(name));
  const extra = found.filter((name) => !EXPECTED_SCREENS.includes(name));
  if (missing.length || extra.length) {
    throw new Error(`Unexpected screens. Missing: [${missing}]. Extra: [${extra}]`);
  }
  for (const { name, html } of screens) {
    if (Buffer.byteLength(html) > MAX_SCREEN_BYTES) throw new Error(`${name} is over 30 KB`);
    if (/[A-Za-z0-9+/]{500,}/.test(html)) throw new Error(`${name} still contains embedded data`);
  }
}

const [bundlePath, outDir] = process.argv.slice(2);
if (!bundlePath || !outDir) {
  console.error("Usage: node scripts/extract-design.mjs <bundle.html> <outDir>");
  process.exit(1);
}

const screens = extractScreens(readFileSync(bundlePath, "utf8"));
assertComplete(screens); // checked before writing so a bad bundle leaves outDir untouched

mkdirSync(outDir, { recursive: true });
for (const { name, html } of screens) writeFileSync(join(outDir, `${name}.html`), html);
console.log(`Extracted ${screens.length} screens to ${outDir}`);
