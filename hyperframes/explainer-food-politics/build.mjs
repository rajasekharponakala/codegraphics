// Builds "Plate & Power", an explainer of the arguments and evidence in Dr Sylvia
// Karpagam's The Meat of the Matter as set out in its companion site, from
// script.json into build/<slug>/: Indian English voiceover, word captions and
// neo-brutalist diagrams in the site's own palette. Render with `hyperframes render`.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
const TOP = 440; // first pixel of the scene area, below the card

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const COLORS = ["coral", "lime", "blue", "yellow", "pink", "coral"];

// ---------- scenes: each returns { html, js(from) } ----------

function signalsScene(s, id) {
  const tiles = s.tiles
    .map(([big, text, src], i) => `<div class="tile c-${COLORS[i]}" style="left:${60 + (i % 2) * 490}px;top:${TOP + 30 + Math.floor(i / 2) * 400}px"><b>${esc(big)}</b><span>${esc(text)}</span><em>${esc(src)}</em></div>`)
    .join("");
  return {
    html: `${tiles}<div class="snote" style="top:${TOP + 850}px">Signals from different surveys and years, not one scorecard</div>`,
    js: (from) => `
      tl.from("#${id} .tile", { opacity: 0, y: 40, rotation: -3, duration: 0.4, stagger: 0.6, ease: "back.out(1.6)" }, ${f(from + 1.0)});`,
  };
}

function chainScene(s, id) {
  const rows = s.steps
    .map(([n, t, q], i) => `<div class="link c-${COLORS[i]}" style="top:${TOP + 20 + i * 190}px"><i>${n}</i><div><b>${esc(t)}</b><span>${esc(q)}</span></div></div>`)
    .join("");
  return {
    html: `<div class="chainline" style="top:${TOP + 100}px;height:${4 * 190}px"></div>${rows}`,
    js: (from) => `
      tl.from("#${id} .link", { opacity: 0, x: -60, duration: 0.35, stagger: 1.05, ease: "power3.out" }, ${f(from + 2.6)});
      tl.from("#${id} .chainline", { scaleY: 0, transformOrigin: "top center", duration: 5.2, ease: "none" }, ${f(from + 2.6)});`,
  };
}

function barsScene(s, id) {
  const gap = s.rows.length > 2 ? 190 : 260;
  const rows = s.rows
    .map(([k, v, label], i) => {
      const y = TOP + 120 + i * gap;
      const w = Math.max(14, (v / s.max) * 760);
      return `<div class="blabel" style="top:${y}px">${esc(k)}</div>
        <div class="bar c-${COLORS[i]}" style="top:${y + 56}px;width:${f(w)}px"></div>
        <div class="bval" style="top:${y + 52}px;left:${f(60 + w + 20)}px">${esc(label)}</div>`;
    })
    .join("");
  return {
    html: `<div class="unit" style="top:${TOP + 20}px">${esc(s.unit)}</div>${rows}<div class="snote" style="top:${TOP + 120 + s.rows.length * gap + 20}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .bar", { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.45, ease: "power3.out" }, ${f(from + 1.2)});
      tl.from("#${id} .bval", { opacity: 0, duration: 0.3, stagger: 0.45 }, ${f(from + 1.7)});
      tl.from("#${id} .snote", { opacity: 0, duration: 0.4 }, ${f(from + 3.0)});`,
  };
}

function cardsScene(s, id) {
  const rows = s.items
    .map(([k, v], i) => `<div class="card2 c-${COLORS[i + 1]}" style="top:${TOP + 20 + i * 225}px"><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
    .join("");
  return {
    html: rows,
    js: (from) => `
      tl.from("#${id} .card2", { opacity: 0, x: 60, duration: 0.35, stagger: 1.0, ease: "power3.out" }, ${f(from + 0.6)});`,
  };
}

function mythsScene(s, id) {
  const rows = s.items
    .map(([claim, resp], i) => `<div class="myth" style="top:${TOP + 20 + i * 310}px"><q>${esc(claim)}</q><span><i>Evidence</i>${esc(resp)}</span></div>`)
    .join("");
  return {
    html: rows,
    js: (from) => `
      tl.from("#${id} .myth", { opacity: 0, y: 30, duration: 0.35, stagger: 2.6, ease: "power3.out" }, ${f(from + 1.4)});
      tl.from("#${id} .myth span", { opacity: 0, x: -20, duration: 0.3, stagger: 2.6 }, ${f(from + 2.6)});`,
  };
}

function quoteScene(s, id) {
  return {
    html: `<div class="claim" style="top:${TOP + 60}px"><i>The claim</i><q>${esc(s.text)}</q></div>
        <div class="stamp" style="top:${TOP + 420}px">Not neutral</div>
        <div class="verdict" style="top:${TOP + 560}px">${esc(s.verdict)}</div>
        <div class="snote" style="top:${TOP + 820}px">${esc(s.who)}</div>`,
    js: (from) => `
      tl.from("#${id} .claim", { opacity: 0, y: 30, duration: 0.4 }, ${f(from + 0.4)});
      tl.from("#${id} .stamp", { opacity: 0, scale: 2.2, rotation: -20, duration: 0.35, ease: "back.out(2)" }, ${f(from + 2.6)});
      tl.from("#${id} .verdict, #${id} .snote", { opacity: 0, y: 20, duration: 0.35, stagger: 0.5 }, ${f(from + 3.2)});`,
  };
}

function pipelineScene(s, id) {
  const rows = s.steps
    .map((t, i) => `<div class="pipe c-${COLORS[i]}" style="left:${60 + (i % 2) * 490}px;top:${TOP + 30 + Math.floor(i / 2) * 260}px"><i>0${i + 1}</i><b>${esc(t)}</b></div>`)
    .join("");
  return {
    html: `${rows}<div class="ask" style="top:${TOP + 830}px">Eaten and enjoyed, or only counted?</div>`,
    js: (from) => `
      tl.from("#${id} .pipe", { opacity: 0, scale: 0.7, duration: 0.3, stagger: 0.6, ease: "back.out(2)" }, ${f(from + 5.0)});
      tl.from("#${id} .ask", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 9.0)});`,
  };
}

function quadScene(s, id) {
  const q = s.items
    .map(([k, v], i) => `<div class="quad c-${COLORS[i]}" style="left:${60 + (i % 2) * 490}px;top:${TOP + 40 + Math.floor(i / 2) * 420}px"><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
    .join("");
  return {
    html: `${q}<div class="plate" style="top:${TOP + 330}px">Plate</div>`,
    js: (from) => `
      tl.from("#${id} .quad", { opacity: 0, scale: 0.8, duration: 0.35, stagger: 0.7, ease: "back.out(2)" }, ${f(from + 2.0)});
      tl.from("#${id} .plate", { opacity: 0, scale: 0.3, duration: 0.4, ease: "back.out(2)" }, ${f(from + 0.6)});`,
  };
}

const SCENES = { chain: chainScene, bars: barsScene, cards: cardsScene, myths: mythsScene, quote: quoteScene, pipeline: pipelineScene, quad: quadScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "plate.css"), join(out, "plate.css"));

const segments = [
  { kind: "intro", text: script.hook.say, ...script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, ...b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 2611 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));
const parts = scenes.map((sc, i) => {
  const id = `scene-${i}`;
  return { id, sc, ...(i === 0 ? signalsScene(sc.scene, id) : SCENES[sc.scene.type](sc.scene, id)) };
});

const sceneHtml = parts.map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>\n        ${p.html}\n      </div>`).join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");
const cards = scenes
  .map((sc, i) => {
    const big = display(sc.big);
    const size = big.length <= 18 ? 92 : big.length <= 28 ? 78 : 66;
    return `      <div id="card-${i}" class="card clip" ${clip(sc.from, sc.to, 10)}>
        <div class="card-label">${esc(display(sc.label))}</div>
        <div class="card-big" style="font-size:${size}px">${esc(big)}</div>
      </div>`;
  })
  .join("\n");

const captions = captionClips(segments, clip);
const e = script.end;
const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="plate.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
${cards}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-kicker">Explore the evidence</div>
        <div id="end-title">${esc(e.title)}</div>
        <div id="end-url">${esc(script.url)}</div>
        <ul id="end-lines">${e.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
        <p id="end-small">${esc(e.small)}</p>
      </div>
${captions.html}
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const endStart = ${f(endStart)};
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
${sceneJs}
${scenes.slice(1).map((sc, i) => `      tl.from("#card-${i + 1}", { y: -30, opacity: 0, rotation: -2, duration: 0.35, ease: "back.out(1.6)" }, ${f(sc.from)});`).join("\n")}
${CAPTION_TIMELINE}
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.45, stagger: 0.15, ease: "power3.out" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`${script.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups`);
for (const sc of scenes) console.log(`  ${(sc.scene?.type ?? "").padEnd(9)} ${(sc.to - sc.from).toFixed(1)}s  ${display(sc.big)}`);
