// Builds "Telugudanam: the findings" from script.json into build/<slug>/: an
// Indian English voiceover, word captions, and diagrams redrawn from what each of
// the museum's five modules finds (script, language, literature, diaspora,
// digital), in the site's parchment look. Render with `hyperframes render` there.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
const TOP = 470; // first pixel of the scene area, below the card

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const svg = (body) => `<svg class="overlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg>`;

const MODULES = {
  script: ["Script", "లిపి"],
  language: ["Language", "భాష"],
  literature: ["Literature", "సాహిత్యం"],
  diaspora: ["Diaspora", "ప్రవాసం"],
  digital: ["Digital Telugu", "డిజిటల్"],
};

// ---------- scenes: each returns { html, js(from) } ----------

// Hook: the five modules as tiles.
function hallsScene(id) {
  const tiles = Object.entries(MODULES)
    .map(([k, [en, te]], i) => `<div class="hall m-${k}" style="top:${TOP + 10 + i * 196}px"><b>${te}</b><span>${esc(en)}</span><em>0${i + 1}</em></div>`)
    .join("");
  return {
    html: tiles,
    js: (from) => `
      tl.from("#${id} .hall", { opacity: 0, x: 80, duration: 0.35, stagger: 0.45, ease: "power3.out" }, ${f(from + 0.8)});`,
  };
}

function timelineScene(s, id) {
  const n = s.steps.length;
  const gap = Math.min(250, 960 / n);
  const rows = s.steps
    .map(([when, what, note], i) => `<div class="tstep" style="top:${TOP + 30 + i * gap}px"><i></i><span class="when">${esc(when)}</span><b>${esc(what)}</b><span class="note">${esc(note)}</span></div>`)
    .join("");
  return {
    html: `<div class="tline" style="top:${TOP + 50}px;height:${f((n - 1) * gap)}px"></div>${rows}`,
    js: (from) => `
      tl.from("#${id} .tline", { scaleY: 0, transformOrigin: "top center", duration: ${f(n * 0.9)}, ease: "none" }, ${f(from + 0.4)});
      tl.from("#${id} .tstep", { opacity: 0, x: 40, duration: 0.35, stagger: 0.9, ease: "power3.out" }, ${f(from + 0.4)});`,
  };
}

// Palm leaf: a straight stroke tears the veins; a curved stroke rides them.
function leafScene(s, id) {
  const leaf = (y, cls) => {
    let veins = "";
    for (let k = 0; k < 9; k++) veins += `<line class="vein" x1="110" x2="970" y1="${y + 30 + k * 26}" y2="${y + 30 + k * 26}" />`;
    return `<rect class="leaf" x="90" y="${y}" width="900" height="270" rx="30" />${veins}`;
  };
  const y1 = TOP + 40;
  const y2 = TOP + 520;
  return {
    html: `${svg(`${leaf(y1)}<path class="stroke bad" d="M250 ${y1 + 240} L520 ${y1 + 30}" />
          <path class="tear" d="M330 ${y1 + 175} l20 -6 l-6 20 l22 -4" />
          ${leaf(y2)}<path class="stroke good" d="M220 ${y2 + 170} C 260 ${y2 + 40}, 420 ${y2 + 40}, 430 ${y2 + 140} S 600 ${y2 + 250}, 640 ${y2 + 120} S 800 ${y2 + 40}, 860 ${y2 + 150}" />`)}
        <div class="leaf-tag bad" style="top:${y1 + 290}px">✕ A straight line splits the leaf</div>
        <div class="leaf-tag good" style="top:${y2 + 290}px">✓ A curve follows it</div>
        <div class="glyphs" style="top:${TOP + 900}px">క ఖ గ ఘ ఙ</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .stroke").forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.0, ease: "power1.inOut" }, ${f(from + 0.8)} + i * 3.2);
      });
      tl.from("#${id} .tear", { opacity: 0, duration: 0.2 }, ${f(from + 1.8)});
      tl.from("#${id} .leaf-tag.bad", { opacity: 0, y: 14, duration: 0.3 }, ${f(from + 1.9)});
      tl.from("#${id} .leaf-tag.good", { opacity: 0, y: 14, duration: 0.3 }, ${f(from + 5.1)});
      tl.from("#${id} .glyphs", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 6.0)});`,
  };
}

// The Dravidian family, with Telugu and its closest relative marked.
function treeScene(s, id) {
  const root = [540, TOP + 70];
  const kids = [["Tamil", "86M", 140], ["Kannada", "59M", 330], ["Malayalam", "38M", 530], ["Tulu", "2M · closest", 735, "kin"], ["Telugu", "96M", 935, "you"]];
  const y = TOP + 420;
  const lines = kids.map(([, , x]) => `<path class="branch" d="M${root[0]} ${root[1] + 50} C ${root[0]} ${y - 120}, ${x} ${y - 160}, ${x} ${y - 46}" />`).join("");
  const nodes = kids
    .map(([n, sp, x, cls]) => `<div class="tnode ${cls ?? ""}" style="left:${x}px;top:${y}px"><b>${esc(n)}</b><span>${esc(sp)}</span></div>`)
    .join("");
  return {
    html: `${svg(lines)}<div class="troot" style="left:${root[0]}px;top:${root[1]}px">Proto-Dravidian<span>before 3000 BCE</span></div>${nodes}
        <div class="tnote" style="top:${TOP + 640}px"><b>Not</b> a daughter of Sanskrit</div>
        <div class="pnote" style="top:${TOP + 820}px">Speakers as shown in the museum's language-family exhibit</div>`,
    js: (from) => `
      tl.from("#${id} .branch", { opacity: 0, duration: 0.3, stagger: 0.2 }, ${f(from + 0.6)});
      tl.from("#${id} .tnode", { opacity: 0, y: 30, duration: 0.3, stagger: 0.2, ease: "back.out(2)" }, ${f(from + 0.6)});
      tl.from("#${id} .tnote", { opacity: 0, scale: 0.8, duration: 0.4, ease: "back.out(2)" }, ${f(from + 2.4)});`,
  };
}

// Agglutination: three pieces slide together into one word.
function buildScene(s, id) {
  const pieces = s.parts
    .map(([te, en], i) => `<div class="piece p${i}" style="left:${90 + i * 320}px;top:${TOP + 60}px"><b>${te}</b><span>${esc(en)}</span></div>`)
    .join("");
  return {
    html: `${pieces}<div class="arrow" style="top:${TOP + 330}px">↓</div>
        <div class="word" style="top:${TOP + 450}px">${s.word}</div>
        <div class="gloss" style="top:${TOP + 650}px">${esc(s.gloss)}</div>`,
    js: (from) => `
      tl.from("#${id} .piece", { opacity: 0, y: -40, duration: 0.35, stagger: 0.55, ease: "back.out(2)" }, ${f(from + 0.5)});
      tl.from("#${id} .arrow", { opacity: 0, y: -20, duration: 0.3 }, ${f(from + 2.6)});
      tl.from("#${id} .word", { opacity: 0, scale: 0.7, duration: 0.45, ease: "back.out(2)" }, ${f(from + 2.9)});
      tl.from("#${id} .gloss", { opacity: 0, y: 20, duration: 0.35 }, ${f(from + 3.5)});`,
  };
}

// Telugu ↔ English pairs.
function pairsScene(s, id) {
  const rows = s.rows
    .map(([te, roman, en], i) => `<div class="pair" style="top:${TOP + 40 + i * 420}px"><b>${te}</b><span class="roman">${esc(roman)}</span><i>→</i><strong>${esc(en)}</strong></div>`)
    .join("");
  return {
    html: rows,
    js: (from) => `
      tl.from("#${id} .pair", { opacity: 0, y: 40, duration: 0.4, stagger: 1.6, ease: "power3.out" }, ${f(from + 0.5)});
      tl.from("#${id} .pair strong", { opacity: 0, x: -30, duration: 0.35, stagger: 1.6 }, ${f(from + 1.2)});`,
  };
}

function chipsScene(s, id) {
  const rows = s.items
    .map(([k, v], i) => `<div class="chip" style="top:${TOP + 20 + i * 215}px"><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
    .join("");
  return {
    html: rows,
    js: (from) => `
      tl.from("#${id} .chip", { opacity: 0, x: -50, duration: 0.35, stagger: 0.8, ease: "power3.out" }, ${f(from + 0.4)});`,
  };
}

function quoteScene(s, id) {
  return {
    html: `<div class="qte" style="top:${TOP + 60}px">${s.te}</div>
        <div class="qen" style="top:${TOP + 420}px">“${esc(s.en)}”</div>
        <div class="qwho" style="top:${TOP + 600}px">${esc(s.who)}</div>
        <div class="milestones" style="top:${TOP + 760}px"><span><b>1892</b> Kanyasulkam, in spoken Telugu</span><span><b>1950</b> Sri Sri's free verse</span></div>`,
    js: (from) => `
      tl.from("#${id} .qte", { opacity: 0, y: 30, duration: 0.5, ease: "power3.out" }, ${f(from + 0.4)});
      tl.from("#${id} .qen", { opacity: 0, duration: 0.5 }, ${f(from + 1.4)});
      tl.from("#${id} .milestones span", { opacity: 0, y: 20, duration: 0.35, stagger: 2.2 }, ${f(from + 2.0)});`,
  };
}

function barsScene(s, id) {
  const max = Math.max(...s.rows.map((r) => r[1]));
  const rows = s.rows
    .map(([k, v, label], i) => {
      const y = TOP + 40 + i * 175;
      return `<div class="blabel" style="top:${y}px">${esc(k)}</div>
        <div class="bar" style="top:${y + 50}px;width:${f(Math.max(10, (v / max) * 720))}px"></div>
        <div class="bval" style="top:${y + 46}px;left:${f(90 + Math.max(10, (v / max) * 720) + 18)}px">${esc(label)}</div>`;
    })
    .join("");
  return {
    html: `${rows}<div class="pnote" style="top:${TOP + 40 + s.rows.length * 175 + 10}px">${esc(s.unit)} · bars to scale</div>`,
    js: (from) => `
      tl.from("#${id} .bar", { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.35, ease: "power3.out" }, ${f(from + 0.5)});
      tl.from("#${id} .bval", { opacity: 0, duration: 0.3, stagger: 0.35 }, ${f(from + 0.9)});`,
  };
}

function statScene(s, id) {
  let dots = "";
  for (let k = 0; k < 100; k++) {
    const x = 160 + (k % 10) * 78, y = TOP + 380 + Math.floor(k / 10) * 56;
    dots += `<circle class="${k < s.value ? "on" : "off"}" cx="${x}" cy="${y}" r="20" />`;
  }
  return {
    html: `<div class="big-stat" style="top:${TOP + 20}px"><b data-to="${s.value}">0</b>${esc(s.suffix)}</div>
        <div class="stat-text" style="top:${TOP + 230}px">${esc(s.text)}</div>
        ${svg(dots)}
        <div class="pnote" style="top:${TOP + 960}px">${esc(s.foot)}</div>`,
    js: (from) => `
      { const el = document.querySelector("#${id} .big-stat b"), o = { v: 0 };
        tl.to(o, { v: ${s.value}, duration: 1.2, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(o.v); } }, ${f(from + 0.4)}); }
      tl.from("#${id} circle.on", { opacity: 0, scale: 0, transformOrigin: "center", duration: 0.15, stagger: 0.05 }, ${f(from + 0.5)});`,
  };
}

const SCENES = { timeline: timelineScene, leaf: leafScene, tree: treeScene, build: buildScene, pairs: pairsScene, chips: chipsScene, quote: quoteScene, bars: barsScene, stat: statScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "findings.css"), join(out, "findings.css"));

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
  return { id, sc, ...(i === 0 ? hallsScene(id) : SCENES[sc.scene.type](sc.scene, id)) };
});

const sceneHtml = parts
  .map((p) => `      <div id="${p.id}" class="scene m-${p.sc.module ?? "intro"} clip" ${clip(p.sc.from, p.sc.to, 2)}>
        ${p.html}
      </div>`)
  .join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");

const cards = scenes
  .map((sc, i) => {
    const big = display(sc.big);
    const size = big.length <= 14 ? 104 : big.length <= 22 ? 86 : 74;
    const mod = sc.module ? MODULES[sc.module] : null;
    return `      <div id="card-${i}" class="card m-${sc.module ?? "intro"} clip" ${clip(sc.from, sc.to, 10)}>
        <div class="card-label">${mod ? `<span class="te">${mod[1]}</span>` : ""}${esc(display(sc.label))}</div>
        <div class="card-big" style="font-size:${size}px">${esc(big)}</div>
      </div>`;
  })
  .join("\n");

// The module rail: five dots, the current module lit.
const order = Object.keys(MODULES);
const rails = scenes
  .slice(1)
  .map((sc, i) => `      <div id="rail-${i}" class="rail clip" ${clip(sc.from, sc.to, 11)}>${order.map((k) => `<i class="m-${k} ${k === sc.module ? "on" : ""}">${MODULES[k][0]}</i>`).join("")}</div>`)
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
    <link rel="stylesheet" href="findings.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
${cards}
${rails}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-kicker">Visit and explore</div>
        <div id="end-te">తెలుగుదనం</div>
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
${scenes.slice(1).map((sc, i) => `      tl.from("#card-${i + 1}", { y: -30, opacity: 0, duration: 0.35, ease: "back.out(1.6)" }, ${f(sc.from)});`).join("\n")}
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
for (const sc of scenes) console.log(`  ${(sc.module ?? "intro").padEnd(10)} ${(sc.scene?.type ?? "").padEnd(8)} ${(sc.to - sc.from).toFixed(1)}s  ${display(sc.big)}`);
