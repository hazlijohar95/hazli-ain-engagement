// Renders public/og.png (link preview) and public/apple-touch-icon.png from the same SVG components the site uses.
// Run with: npm run og
import { Resvg } from "@resvg/resvg-js";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontDir = join(root, "scripts/fonts");
const { ogImage, touchIcon, icsText, iconSvg } = await import(pathToFileURL(join(root, ".og/og.js")).href);

const fonts = {
  fontFiles: readdirSync(fontDir).map((f) => join(fontDir, f)),
  loadSystemFonts: false,
  defaultFontFamily: "Paper Mono",
};

writeFileSync(join(root, "public/engagement.ics"), icsText());
writeFileSync(join(root, "public/icon.svg"), iconSvg());
console.log("public/engagement.ics");

for (const [file, svg, width] of [
  ["public/og.png", ogImage(), 1200],
  ["public/apple-touch-icon.png", touchIcon(), 180],
]) {
  const png = new Resvg(svg, { font: fonts, fitTo: { mode: "width", value: width } }).render().asPng();
  writeFileSync(join(root, file), png);
  console.log(`${file} ${png.length} bytes`);
}
