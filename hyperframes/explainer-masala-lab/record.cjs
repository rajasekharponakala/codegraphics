// Records the Masala Lab Atlas tools in use, one clip per beat, with a real
// mouse (a cursor dot is drawn so viewers can follow it).
// Usage: serve the site (e.g. `python3 -m http.server 8765` in the scicook repo),
//   node record.cjs [http://localhost:8765] [clip ...]
// Writes assets/<clip>.mp4 (1080x1400, 30 fps, no audio).
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:8765";
const only = process.argv.slice(2).filter((a) => !a.startsWith("http"));
const OUT = join(__dirname, "assets");
const TMP = join(__dirname, "build", ".rec"); // hidden, so render.sh skips it
const VW = 540, VH = 700; // CSS pixels; recorded at 2x

const CURSOR = `(() => {
  const c = document.createElement('div');
  c.id = '__cursor';
  Object.assign(c.style, { position: 'fixed', left: '-100px', top: '-100px', width: '26px', height: '26px', margin: '-13px 0 0 -13px',
    borderRadius: '50%', border: '3px solid #111', background: 'rgba(220,38,38,.55)', boxShadow: '2px 2px 0 #111',
    zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .12s' });
  document.body.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
  addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
})()`;

const wait = (p, ms) => p.waitForTimeout(ms);

// Put an element `offset` CSS px below the sticky nav.
async function scrollTo(p, sel, offset = 10) {
  await p.evaluate(([s, o]) => {
    const el = document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o - 112); // below the sticky nav
  }, [sel, offset]);
  await wait(p, 400);
}

async function center(p, sel) {
  const b = await p.locator(sel).first().boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function moveTo(p, sel, steps = 25) {
  const c = await center(p, sel);
  await p.mouse.move(c.x, c.y, { steps });
  return c;
}

async function click(p, sel, pause = 900) {
  await moveTo(p, sel);
  await wait(p, 150);
  await p.mouse.down();
  await wait(p, 90);
  await p.mouse.up();
  await wait(p, pause);
}

// Drag a range input through the given values, slowly.
async function drag(p, sel, values, msPerStep = 18) {
  const info = await p.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + r.height / 2, w: r.width, min: +el.min, max: +el.max, v: +el.value };
  }, sel);
  const thumb = 11;
  const xOf = (v) => info.x + thumb + ((v - info.min) / (info.max - info.min)) * (info.w - 2 * thumb);
  await p.mouse.move(xOf(info.v), info.y, { steps: 25 });
  await wait(p, 200);
  await p.mouse.down();
  let cur = info.v;
  for (const v of values) {
    const steps = Math.max(8, Math.round(Math.abs(xOf(v) - xOf(cur)) / 3));
    for (let i = 1; i <= steps; i++) {
      await p.mouse.move(xOf(cur) + ((xOf(v) - xOf(cur)) * i) / steps, info.y);
      await wait(p, msPerStep);
    }
    cur = v;
    await wait(p, 500);
  }
  await p.mouse.up();
}

async function select(p, sel, value, pause = 1200) {
  await moveTo(p, sel);
  await wait(p, 200);
  await p.selectOption(sel, value);
  await wait(p, pause);
}

const CLIPS = {
  home: { hash: "", async run(p) {
    await wait(p, 1500);
    await p.mouse.move(270, 640, { steps: 30 });
    for (let y = 0; y <= 520; y += 4) { await p.mouse.wheel(0, 4); await wait(p, 12); }
    await wait(p, 1500);
  } },
  thermal: { hash: "#sec-thermal", async run(p) {
    await scrollTo(p, "#temp-readout", 10);
    await drag(p, "#thermal-slider", [20, 100, 160, 230]);
    await wait(p, 1200);
  } },
  boiling: { hash: "#sec-boiling", async run(p) {
    await scrollTo(p, "#sec-boiling", 10);
    await drag(p, "#alt-slider", [0, 5500, 2276], 5);
    await wait(p, 600);
    await click(p, "#cooker-toggle", 1600);
  } },
  spices: { hash: "#sec-spice-network", async run(p) {
    await scrollTo(p, "#spice-network-svg", 10);
    await click(p, '[data-spice-node="Cardamom"]', 1500);
    await click(p, '[data-spice-node="Clove"]', 1500);
    await click(p, '[data-spice-node="Cumin"]', 1500);
  } },
  onion: { hash: "#sec-onion", async run(p) {
    await scrollTo(p, "#onion-stage-slider", 20);
    await drag(p, "#onion-stage-slider", [0, 2, 3, 4, 5], 7);
    await wait(p, 1000);
  } },
  ph: { hash: "#sec-ph", async run(p) {
    await scrollTo(p, "#ph-svg", 10);
    for (const sel of await p.$$eval("#ph-buttons [data-ph-id]", (bs) => bs.map((b) => b.dataset.phId)))
      await click(p, `#ph-buttons [data-ph-id="${sel}"]`, 900);
  } },
  umami: { hash: "#sec-umami", async run(p) {
    await scrollTo(p, "#umami-output", 10);
    await select(p, "#umami-nucleotide", { index: 4 }, 1300);
    await select(p, "#umami-nucleotide", { index: 2 }, 1300);
    await drag(p, "#umami-u", [0.15]);
    await wait(p, 900);
  } },
  microwave: { hash: "#sec-microwave", async run(p) {
    await scrollTo(p, "#sec-microwave", 10);
    await wait(p, 2000);
    await click(p, '[data-papad="rolled"]', 2600);
    await click(p, '[data-papad="flat"]', 1500);
  } },
  gravy: { hash: "#ch7", async run(p) {
    await scrollTo(p, "#gen-subtabs", 10);
    await select(p, "#gravy-main", { index: 2 }, 1100);
    await select(p, "#gravy-region", { index: 2 }, 1200);
    await select(p, "#gravy-region", { index: 4 }, 1200);
    for (let y = 0; y <= 240; y += 4) { await p.mouse.wheel(0, 4); await wait(p, 12); }
    await wait(p, 900);
  } },
  biryani: { hash: "#sec-gantt", async run(p) {
    await scrollTo(p, "#sec-gantt", 10);
    const bars = await p.$$eval(".gantt-bar", (bs) => bs.slice(0, 5).map((b) => b.dataset.biryaniToggle));
    for (const id of bars) await click(p, `.gantt-bar[data-biryani-toggle="${id}"]`, 700);
    await wait(p, 900);
  } },
};

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, clip] of Object.entries(CLIPS)) {
    if (only.length && !only.includes(name)) continue;
    rmSync(join(TMP, name), { recursive: true, force: true });
    mkdirSync(join(TMP, name), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/" + clip.hash, { waitUntil: "networkidle" });
    await p.evaluate(() => { try { localStorage.clear(); } catch {} });
    await p.reload({ waitUntil: "networkidle" });
    await wait(p, 900);
    await p.evaluate(CURSOR);
    await p.mouse.move(VW * 0.8, VH * 0.85);
    // Chrome's screencast gives frames at device pixels (Playwright's recorder is 1x).
    const cdp = await ctx.newCDPSession(p);
    const frames = [];
    cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const file = join(TMP, name, `f${String(frames.length).padStart(5, "0")}.jpg`);
      writeFileSync(file, Buffer.from(data, "base64"));
      frames.push({ file, ts: metadata.timestamp });
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: VW * 2, maxHeight: VH * 2, everyNthFrame: 1 });
    await wait(p, 300);
    await clip.run(p);
    await wait(p, 300);
    const endTs = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    await ctx.close();
    // Frames arrive only when the page changes: hold each until the next one.
    const list = frames.map((fr, i) => `file '${fr.file}'\nduration ${((frames[i + 1]?.ts ?? endTs) - fr.ts).toFixed(4)}`);
    list.push(`file '${frames.at(-1).file}'`);
    writeFileSync(join(TMP, name, "list.txt"), list.join("\n") + "\n");
    const len = endTs - frames[0].ts;
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(TMP, name, "list.txt"),
      "-vf", `fps=30,scale=${VW * 2}:${VH * 2}:flags=lanczos,format=yuv420p`, "-t", len.toFixed(2),
      "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", join(OUT, name + ".mp4")]);
    console.log(`${name}: ${len.toFixed(1)} s`);
  }
  await browser.close();
})();
