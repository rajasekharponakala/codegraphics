// Renders story.html to a 1080x1920 PNG for an Instagram story.
//   node build.cjs  ->  gitlab-19-6-story.png
const { chromium } = require("playwright");
const { join } = require("node:path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file://" + join(__dirname, "story.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(__dirname, "gitlab-19-6-story.png") });
  await browser.close();
  console.log("gitlab-19-6-story.png");
})();
