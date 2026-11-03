// Builds the India poverty data-explainer from script.json into build/<slug>/:
// Indian English voiceover over the music bed, word captions, and charts redrawn
// from the World Bank's Poverty & Equity Brief: India (October 2026).
// Render with `hyperframes render` inside the build folder.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
const TOP = 400; // first pixel below the header
const CHART = { x0: 150, x1: 970, y0: TOP + 70, y1: TOP + 470 }; // plot area for line charts

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const svg = (body) => `<svg class="overlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg>`;

// Line chart frame: y axis from 0 to max with gridlines; x positions follow the
// actual years in `labels`, so uneven gaps (2011, 2023, 2026) are drawn to scale.
function lineFrame(max, labels, unit) {
  const years = labels.map(Number);
  const [first, last] = [years[0], years.at(-1)];
  const y = (v) => CHART.y1 - (v / max) * (CHART.y1 - CHART.y0);
  const x = (i) => CHART.x0 + ((years[i] - first) / (last - first)) * (CHART.x1 - CHART.x0);
  const ticks = [0, max / 2, max]
    .map((v) => `<line class="grid" x1="${CHART.x0}" x2="${CHART.x1}" y1="${f(y(v))}" y2="${f(y(v))}" /><text class="tick" x="${CHART.x0 - 18}" y="${f(y(v) + 10)}" text-anchor="end">${v}</text>`)
    .join("");
  const xs = labels.map((l, i) => `<text class="tick" x="${f(x(i))}" y="${CHART.y1 + 46}" text-anchor="middle">${esc(l)}</text>`).join("");
  return { x, y, frame: `${ticks}${xs}<text class="unit" x="${CHART.x0 - 70}" y="${CHART.y0 - 50}">${esc(unit)}</text>` };
}

// Value label above a point; near the top of the chart (or at the first point) it
// goes to the right of the dot so it does not hit the axis title or top tick.
function valueLabel(px, py, v, max, first, cls) {
  if (first && v > max * 0.6) return `<text class="val ${cls}" x="${f(px + 22)}" y="${f(py - 28)}" text-anchor="start">${v}%</text>`;
  return `<text class="val ${cls}" x="${f(px)}" y="${f(py - 30)}" text-anchor="middle">${v}%</text>`;
}

// ---------- scenes: each returns { html, js(from) } ----------

function hookScene(id) {
  const [a, b] = script.beats[0].scene.points;
  return {
    html: `<div class="hero-num then" style="top:${TOP + 10}px"><small>${esc(a[0])}</small>${a[1]}%</div>
        <div class="hero-arrow" style="top:${TOP + 250}px">↓</div>
        <div class="hero-num now" style="top:${TOP + 345}px"><small>${esc(b[0])}</small>${b[1]}%</div>
        <div class="chip" style="top:${TOP + 600}px">${esc(script.hookNote)}</div>`,
    js: () => "",
  };
}

function lineScene(s, id) {
  const { x, y, frame } = lineFrame(s.max, s.points.map(([l]) => l), s.unit);
  const d = s.points.map(([, v], i) => `${i ? "L" : "M"}${f(x(i))} ${f(y(v))}`).join(" ");
  const dots = s.points
    .map(([, v], i) => `<circle class="dot" cx="${f(x(i))}" cy="${f(y(v))}" r="14" />${valueLabel(x(i), y(v), v, s.max, i === 0, "")}`)
    .join("");
  return {
    html: `${svg(`${frame}<path class="line" d="${d}" />${dots}`)}
        <div class="note" style="top:${CHART.y1 + 80}px">${esc(s.note)}</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .line").forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, ${f(from + 0.4)});
      });`,
  };
}

function pairScene(s, id) {
  const base = TOP + 560;
  const bars = s.bars
    .map(([label, v], i) => {
      const h = (v / s.max) * 460;
      const x = 250 + i * 360;
      return `<div class="vbar ${i ? "now" : "then"}" style="left:${x}px;top:${f(base - h)}px;height:${f(h)}px"></div>
        <div class="vbar-val" style="left:${x - 40}px;top:${f(base - h - 80)}px">${v}%</div>
        <div class="vbar-label" style="left:${x - 40}px;top:${base + 16}px">${esc(label)}</div>`;
    })
    .join("");
  return {
    html: `<div class="unit-label" style="top:${TOP}px">${esc(s.unit)}</div>
        ${bars}
        <div class="baseline" style="top:${base}px"></div>`,
    js: (from) => `
      tl.from("#${id} .vbar", { scaleY: 0, transformOrigin: "bottom center", duration: 0.7, stagger: 0.5, ease: "power3.out" }, ${f(from + 0.3)});`,
  };
}

function driversScene(s, id) {
  const items = s.items
    .map((t, i) => `<div class="driver" style="top:${TOP + 10 + i * 140}px"><b>${i + 1}</b>${esc(t)}</div>`)
    .join("");
  return {
    html: `${items}
        <div class="fact" style="top:${TOP + 10 + s.items.length * 140 + 10}px">${esc(s.fact)}</div>`,
    js: (from) => `
      tl.from("#${id} .driver", { x: -60, opacity: 0, duration: 0.35, stagger: 0.9, ease: "power3.out" }, ${f(from + 0.6)});
      tl.from("#${id} .fact", { y: 30, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 3.4)});`,
  };
}

function groupsScene(s, id) {
  const width = 560;
  const rows = s.rows
    .map(([name, v], i) => {
      const y = TOP + 20 + i * 108;
      return `<div class="hlabel" style="top:${y}px">${esc(name)}</div>
        <div class="hbar ${i < 2 ? "pair" : ""}" style="top:${y + 42}px;width:${f((v / s.max) * width)}px"></div>
        <div class="hval" style="left:${f(70 + (v / s.max) * width + 14)}px;top:${y + 38}px">${v}%</div>`;
    })
    .join("");
  return {
    html: `${rows}
        <div class="note" style="top:${TOP + 20 + s.rows.length * 108}px">Poverty rate at $4.20/day, 2023 survey · bars start at 0</div>`,
    js: (from) => `
      tl.from("#${id} .hbar", { scaleX: 0, transformOrigin: "left center", duration: 0.5, stagger: 0.25, ease: "power3.out" }, ${f(from + 0.3)});`,
  };
}

function beltScene(s, id) {
  const dots = Array.from({ length: 100 }, (_, i) => {
    const x = 140 + (i % 10) * 82;
    const y = TOP + 10 + Math.floor(i / 10) * 50;
    return `<div class="pdot ${i < s.share ? "in" : ""}" style="left:${x}px;top:${y}px"></div>`;
  }).join("");
  return {
    html: `${dots}
        <div class="belt" style="top:${TOP + 520}px"><span>${esc(s.from)}</span><i></i><span>${esc(s.to)}</span></div>
        <div class="note" style="top:${TOP + 590}px">Each dot = 1% of India's poor (about ${s.share} of 100 in the belt)</div>`,
    js: (from) => `
      tl.from("#${id} .pdot.in", { scale: 0, duration: 0.2, stagger: 0.02, ease: "back.out(2)" }, ${f(from + 0.3)});`,
  };
}

function gapScene(s, id) {
  const full = 900;
  return {
    html: `<div class="hlabel" style="top:${TOP + 20}px">${esc(s.a)}</div>
        <div class="hbar" style="top:${TOP + 66}px;width:${f(full / s.ratio)}px"></div>
        <div class="hval" style="left:${f(70 + full / s.ratio + 14)}px;top:${TOP + 62}px">1×</div>
        <div class="hlabel" style="top:${TOP + 150}px">${esc(s.b)}</div>
        <div class="hbar pair" style="top:${TOP + 196}px;width:${full}px"></div>
        <div class="hval light" style="left:${full - 60}px;top:${TOP + 192}px">${s.ratio}×</div>
        <div class="note" style="top:${TOP + 270}px">${esc(s.unit)}</div>
        <div class="fact" style="top:${TOP + 360}px">${esc(s.chip)}</div>`,
    js: (from) => `
      tl.from("#${id} .hbar", { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.5, ease: "power3.out" }, ${f(from + 0.4)});
      tl.from("#${id} .fact", { y: 30, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 3.0)});`,
  };
}

function projectionScene(s, id) {
  const labels = [...s.actual, ...s.projected].map(([l]) => l);
  const { x, y, frame } = lineFrame(s.max, labels, s.unit);
  const pts = [...s.actual, ...s.projected].map(([, v], i) => [x(i), y(v), v]);
  const solid = pts.slice(0, s.actual.length).map(([px, py], i) => `${i ? "L" : "M"}${f(px)} ${f(py)}`).join(" ");
  const dashed = pts.slice(s.actual.length - 1).map(([px, py], i) => `${i ? "L" : "M"}${f(px)} ${f(py)}`).join(" ");
  const dots = pts
    .map(([px, py, v], i) => {
      const proj = i >= s.actual.length;
      // Projected points sit close together: label them below the line, the others above.
      const label = proj
        ? `<text class="val small" x="${f(px)}" y="${f(py + 58)}" text-anchor="middle">${v}%</text>`
        : valueLabel(px, py, v, s.max, i === 0, "small");
      return `<circle class="dot ${proj ? "proj" : ""}" cx="${f(px)}" cy="${f(py)}" r="12" />${label}`;
    })
    .join("");
  return {
    html: `${svg(`${frame}<path class="line" d="${solid}" /><path class="line proj" d="${dashed}" />${dots}`)}
        <div class="note" style="top:${CHART.y1 + 66}px">Dashed: projected (indicative) · years to scale</div>
        <div class="fact warn" style="top:${CHART.y1 + 108}px">${esc(s.caveat)}</div>`,
    js: (from) => `
      tl.from("#${id} .line.proj, #${id} .dot.proj", { opacity: 0, duration: 0.5 }, ${f(from + 1.0)});
      tl.from("#${id} .fact", { y: 30, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 3.6)});`,
  };
}

const SCENES = { line: lineScene, pair: pairScene, drivers: driversScene, groups: groupsScene, belt: beltScene, gap: gapScene, projection: projectionScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "explainer.css"), join(out, "explainer.css"));

const segments = [
  { kind: "hook", text: script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, beat: b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 2026 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));
const parts = scenes.map((sc, i) => {
  const id = `scene-${i}`;
  return { id, sc, ...(i === 0 ? hookScene(id) : SCENES[sc.beat.scene.type](sc.beat.scene, id)) };
});

const sceneHtml = parts
  .map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>
        ${p.html}
      </div>`)
  .join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");

const cards = scenes
  .slice(1)
  .map((sc, i) => {
    const big = display(sc.beat.big);
    const size = big.length <= 9 ? 140 : big.length <= 13 ? 112 : 92;
    return `      <div id="card-${i + 1}" class="card clip" ${clip(sc.from, sc.to, 10)}>
        <div class="card-label">${esc(display(sc.beat.label))}</div>
        <div class="card-big" style="font-size:${size}px">${esc(big)}</div>
      </div>`;
  })
  .join("\n");

const captions = captionClips(segments, clip);
const e = script.end;
const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="explainer.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="tag" class="clip" ${clip(0, endStart, 4)}>${esc(script.tag)}</div>
      <div id="source" class="clip" ${clip(0, endStart, 5)}>${esc(script.source)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <h1 id="hook" class="clip" ${clip(0, scenes[0].to, 8)}>${esc(display(script.hook))}</h1>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">${esc(e.title)}</div>
        <p id="end-source">${esc(e.source)}</p>
        <ul id="end-lines">${e.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
        <p id="end-small">${esc(e.small)}</p>
      </div>
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const endStart = ${f(endStart)};
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
${sceneJs}
${scenes
  .slice(1)
  .map((sc, i) => `      tl.from("#card-${i + 1}", { y: 50, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(sc.from)});`)
  .join("\n")}
${CAPTION_TIMELINE}
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.45, stagger: 0.18, ease: "power3.out" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`${script.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups`);
