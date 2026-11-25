// Records Telugudanam (ranjithraj.gitlab.io/telugudanam) in use, one clip per
// hall, with a real mouse (a cursor dot is drawn so viewers can follow it).
//   node record.cjs [https://ranjithraj.gitlab.io/telugudanam] [clip ...]
// Uses $HTTPS_PROXY when set.
// Writes assets/<clip>.mp4 (1080x1400, 30 fps, no audio).
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "https://ranjithraj.gitlab.io/telugudanam";
const only = process.argv.slice(2).filter((a) => !a.startsWith("http"));
const OUT = join(__dirname, "assets");
const TMP = join(__dirname, "build", ".rec"); // hidden, so render.sh skips it
const VW = 540, VH = 700; // CSS pixels; recorded at 2x

const CURSOR = `(() => {
  const c = document.createElement('div');
  c.id = '__cursor';
  Object.assign(c.style, { position: 'fixed', left: '-100px', top: '-100px', width: '26px', height: '26px', margin: '-13px 0 0 -13px',
    borderRadius: '50%', border: '3px solid #111', background: 'rgba(194,65,12,.6)', boxShadow: '2px 2px 0 #111',
    zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .12s' });
  document.body.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
  addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
})()`;

const wait = (p, ms) => p.waitForTimeout(ms);

// Put an element `offset` CSS px below the sticky nav.
async function scrollTo(p, sel, offset = 10) {
  // Twice: images above load and shift the page after the first jump.
  for (let k = 0; k < 3; k++) {
    await p.evaluate(([s, o]) => {
      const el = document.querySelector(s);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - o - 96, behavior: "instant" }); // below the sticky header
    }, [sel, offset]);
    await wait(p, 700);
  }
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

const scrollSlow = async (p, px, ms = 14) => { for (let y = 0; y <= px; y += 4) { await p.mouse.wheel(0, 4); await wait(p, ms); } };
// Switch a hall from Read to its interactive Explore view.
const explore = async (p) => { await click(p, 'button:text-is("Explore")', 1600); };
const tap = async (p, name, pause = 1200) => { const b = p.getByRole("button", { name }).or(p.locator("button").filter({ hasText: name })).first(); const box = await b.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 }); await wait(p, 150); await b.click(); await wait(p, pause); };

const CLIPS = {
  home: { hash: "", async run(p) {
    await wait(p, 1400);
    await p.mouse.move(270, 420, { steps: 20 });
    await scrollSlow(p, 860, 10);
    await wait(p, 800);
  } },
  script: { hash: "#/script", async pre(p) { await explore(p); }, async run(p) {
    await wait(p, 600);
    for (const n of [/^Native$/, /^Loan$/, /^Long$/]) await tap(p, n, 1500);
    await wait(p, 300);
  } },
  language: { hash: "#/language", async pre(p) { await explore(p); }, async run(p) {
    await wait(p, 800);
    await scrollSlow(p, 200);
    for (const n of [/Tulu/, /Telugu\s*96M/, /Gondi/]) await tap(p, n, 1400);
  } },
  literature: { hash: "#/literature", async pre(p) { await explore(p); }, async run(p) {
    await wait(p, 800);
    for (const n of [/Burra Katha/, /Vemana/, /Oggu Katha/]) await tap(p, n, 1400);
  } },
  diaspora: { hash: "#/diaspora", async pre(p) { await explore(p); await wait(p, 6000); }, async run(p) {
    await wait(p, 800);
    for (const n of [/1830–1920/, /1970s–90s/, /1990s–2000s/, /2010s–present/]) await tap(p, n, 1500);
  } },
  // The whole visitor path: home → a hall → read → explore.
  toggle: { hash: "", async run(p) {
    await wait(p, 400);
    await p.mouse.move(270, 420, { steps: 20 });
    await scrollSlow(p, 700, 5);
    await tap(p, /Digital Telugu/, 1700);
    await scrollSlow(p, 120, 8);
    await click(p, 'button:text-is("Explore")', 1500);
    await tap(p, /^1991$/, 900);
    await tap(p, /^Today$/, 1600);
  } },
  digital: { hash: "#/digital", async pre(p) { await explore(p); }, async run(p) {
    await wait(p, 800);
    for (const n of [/^1998$/, /^2003$/, /^2005$/, /^Today$/]) await tap(p, n, 1300);
  } },
};

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
  for (const [name, clip] of Object.entries(CLIPS)) {
    if (only.length && !only.includes(name)) continue;
    rmSync(join(TMP, name), { recursive: true, force: true });
    mkdirSync(join(TMP, name), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/" + (clip.hash ?? ""), { waitUntil: "networkidle", timeout: 90000 });
    await p.evaluate(() => { try { localStorage.clear(); } catch {} });
    await p.reload({ waitUntil: "networkidle", timeout: 90000 });
    await wait(p, 1500);
    await wait(p, 900);
    await p.evaluate(CURSOR);
    await p.mouse.move(VW * 0.8, VH * 0.85);
    if (clip.pre) await clip.pre(p); // settle the page before recording starts
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
