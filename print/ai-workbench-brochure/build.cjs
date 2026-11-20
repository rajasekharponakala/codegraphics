// Prints a brochure HTML file to an A4 PDF, plus PNG previews of each page.
//   node build.cjs                          ->  brochure.pdf, page-1.png, page-2.png
//   node build.cjs brochure-first-year      ->  brochure-first-year.pdf, brochure-first-year-page-1.png, ...
const { chromium } = require("playwright");
const { join } = require("node:path");

const name = process.argv[2] ?? "brochure";
const prefix = name === "brochure" ? "" : `${name}-`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await page.goto("file://" + join(__dirname, `${name}.html`), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(__dirname, `${name}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: "print" });
  const pages = await page.$$(".page");
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: join(__dirname, `${prefix}page-${i + 1}.png`) });
  await browser.close();
  console.log(`${name}.pdf, ${pages.length} pages`);
})();
