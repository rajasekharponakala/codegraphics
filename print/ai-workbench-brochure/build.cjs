// Prints brochure.html to an A4 PDF, plus PNG previews of each page.
//   node build.cjs   ->  brochure.pdf, page-1.png, page-2.png
const { chromium } = require("playwright");
const { join } = require("node:path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await page.goto("file://" + join(__dirname, "brochure.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(__dirname, "brochure.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: "print" });
  const pages = await page.$$(".page");
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: join(__dirname, `page-${i + 1}.png`) });
  await browser.close();
  console.log(`brochure.pdf, ${pages.length} pages`);
})();
