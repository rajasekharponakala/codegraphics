// Builds the Corpus Volunteer Compute explainer (landscape 1920x1080, for the
// project README) from script.json into build/<slug>/: Indian English voiceover,
// word captions, and diagrams redrawn from the project's README and pages, in the
// project's own paper-and-ink look. Render with `hyperframes render` there.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1920;
const H = 1080;
const PW = 860; // right-hand panel
const PH = 720;

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const svg = (body) => `<svg class="pv" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}" aria-hidden="true">${body}</svg>`;
// "_words_" in a headline is set in the italic serif, as on the project page.
const rich = (s) => esc(display(s)).replace(/_([^_]+)_/g, "<em>$1</em>");

// ---------- scenes: each returns { html, js(from) } inside the right panel ----------

const laptop = (x, y, cls = "lap") =>
  `<g class="${cls}" transform="translate(${x} ${y})"><rect class="scr" x="0" y="0" width="96" height="62" rx="6" /><rect class="base" x="-12" y="66" width="120" height="8" rx="4" /></g>`;

function fleetScene(id) {
  let body = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) body += laptop(40 + c * 136, 90 + r * 140);
  return {
    html: `${svg(body)}<div class="pnote" style="top:${PH - 40}px">Idle laptops, phones and desktops, already switched on</div>`,
    js: (from) => `
      tl.to("#${id} .lap .scr", { fill: "var(--red)", stroke: "var(--red)", duration: 0.25, stagger: { each: 0.12, from: "random" } }, ${f(from + 1.2)});`,
  };
}

function pilotScene(s, id) {
  const wave = Array.from({ length: 28 }, (_, i) => {
    const h = 20 + Math.round(60 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)));
    return `<rect x="${40 + i * 13}" y="${180 - h / 2}" width="7" height="${h}" rx="3.5" />`;
  }).join("");
  const pages = [0, 1, 2].map((i) => `<rect x="${480 + i * 26}" y="${110 - i * 14}" width="150" height="190" rx="6" class="page" />`).join("") +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="552" y="${112 + i * 24}" width="${100 - (i % 2) * 30}" height="8" rx="4" class="line" />`).join("");
  return {
    html: `${svg(`<g class="wave">${wave}</g>${pages}`)}
        <div class="count" style="left:20px;top:330px"><b data-to="50000">0</b><span>hours of Telugu audio<br />transcribed by volunteer laptops</span></div>
        <div class="count" style="left:460px;top:330px"><b data-to="80000">0</b><span>book pages<br />OCR'd into text</span></div>
        <div class="pnote" style="top:${PH - 40}px">Pilot phase · from the project README</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .count b").forEach((el, i) => {
        const o = { v: 0 }, to = Number(el.dataset.to);
        tl.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("en-US"); } }, ${f(from + 0.6)} + i * 1.4);
      });
      tl.from("#${id} .wave rect", { scaleY: 0.1, transformOrigin: "center", duration: 0.3, stagger: 0.03 }, ${f(from + 0.4)});`,
  };
}

function ledgerScene(s, id) {
  const rows = [["New servers", "hardware people already own"], ["New cooling", "a laptop's heat is heat it was already making"], ["New always-on demand", "work rides on capacity already connected"]];
  return {
    html: rows.map(([k, v], i) => `<div class="ledger" style="top:${60 + i * 190}px"><b>0</b><div><strong>${esc(k)}</strong><span>${esc(v)}</span></div></div>`).join("") +
      `<div class="pnote" style="top:${PH - 40}px">Pilot energy: 2.1 Wh per audio-hour at 25 W, measured</div>`,
    js: (from) => `
      tl.from("#${id} .ledger", { opacity: 0, x: 60, duration: 0.35, stagger: 0.7, ease: "power3.out" }, ${f(from + 0.4)});`,
  };
}

function accessScene(s, id) {
  let fleet = "";
  const kinds = ["C", "N", "C", "C", "N", "G", "C", "N", "C", "C", "N", "C"];
  kinds.forEach((k, i) => {
    const x = 470 + (i % 4) * 92, y = 170 + Math.floor(i / 4) * 110;
    fleet += `<g class="dev"><rect x="${x}" y="${y}" width="74" height="74" rx="12" /><text x="${x + 37}" y="${y + 48}" text-anchor="middle">${k}</text></g>`;
  });
  return {
    html: `${svg(`<g class="gpu"><rect x="90" y="200" width="200" height="200" rx="18" /><text x="190" y="318" text-anchor="middle">GPU</text></g>
          <path class="lock" d="M165 175 v-30 a25 25 0 0 1 50 0 v30" />${fleet}`)}
        <div class="colhead" style="left:40px;top:40px"><b>GPU allocation</b><span>scarce · rationed · rented</span></div>
        <div class="colhead" style="left:460px;top:40px"><b>Volunteer fabric</b><span>CPUs · GPUs · NPUs</span></div>
        <div class="split-note" style="top:520px"><b>Train</b> on a rented GPU, once. <b>Serve</b> on CPUs and NPUs that are already on.</div>
        <div class="pnote" style="top:${PH - 40}px">C = CPU · N = NPU · G = GPU · schematic</div>`,
    js: (from) => `
      tl.from("#${id} .dev", { opacity: 0, scale: 0.5, transformOrigin: "center", duration: 0.25, stagger: 0.12, ease: "back.out(2)" }, ${f(from + 3.2)});
      tl.from("#${id} .split-note", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 6.2)});`,
  };
}

function gridScene(s, id) {
  const cx = 430, cy = 330, r = 260;
  const devs = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.95];
  });
  const lines = devs.map(([x, y]) => `<line class="spoke" x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" />`).join("");
  const nodes = devs.map(([x, y], i) => laptop(f(x - 48), f(y - 37), `lap dv${i}`)).join("");
  const packets = devs.map(([x, y], i) => `<circle class="lease p${i}" cx="${cx}" cy="${cy}" r="10" /><circle class="result r${i}" cx="${f(x)}" cy="${f(y)}" r="10" />`).join("");
  return {
    html: `${svg(`${lines}${nodes}<g class="server"><rect x="${cx - 80}" y="${cy - 60}" width="160" height="120" rx="14" /><text x="${cx}" y="${cy - 8}" text-anchor="middle">Corpus API</text><text x="${cx}" y="${cy + 26}" text-anchor="middle" class="small">queue</text></g>${packets}`)}
        <div class="legend" style="top:${PH - 44}px"><i class="l"></i>task lease<i class="r"></i>text result<span>devices never talk to each other</span></div>`,
    js: (from) => {
      const moves = devs
        .map(([x, y], i) => {
          const t = f(from + 1.0 + i * 0.35);
          return `tl.fromTo("#${id} .p${i}", { attr: { cx: ${cx}, cy: ${cy} }, opacity: 1 }, { attr: { cx: ${f(x)}, cy: ${f(y)} }, duration: 0.7, ease: "power1.inOut" }, ${t});
      tl.to("#${id} .p${i}", { opacity: 0, duration: 0.15 }, ${f(from + 1.7 + i * 0.35)});
      tl.to("#${id} .dv${i} .scr", { fill: "var(--red)", duration: 0.2 }, ${f(from + 1.7 + i * 0.35)});
      tl.fromTo("#${id} .r${i}", { attr: { cx: ${f(x)}, cy: ${f(y)} }, opacity: 1 }, { attr: { cx: ${cx}, cy: ${cy} }, duration: 0.7, ease: "power1.inOut" }, ${f(from + 3.6 + i * 0.35)});
      tl.to("#${id} .r${i}", { opacity: 0, duration: 0.15 }, ${f(from + 4.3 + i * 0.35)});
      tl.to("#${id} .dv${i} .scr", { fill: "var(--teal-lt)", duration: 0.2 }, ${f(from + 4.3 + i * 0.35)});`;
        })
        .join("\n      ");
      return `
      gsap.set("#${id} .lease, #${id} .result", { opacity: 0 });
      ${moves}`;
    },
  };
}

function sessionScene(s, id) {
  const steps = [["1", "Ask for work", "one record, marked as taken"], ["2", "Download only that record", "into a temporary folder"], ["3", "Transcribe locally", "the model runs on the laptop"], ["4", "Return the text", "the audio is deleted"]];
  return {
    html: steps.map(([n, k, v], i) => `<div class="step" style="top:${30 + i * 140}px"><i>${n}</i><div><strong>${esc(k)}</strong><span>${esc(v)}</span></div><em class="tick">✓</em></div>`).join("") +
      `<div class="expire" style="top:600px">Laptop leaves mid-record? <b>The claim expires</b> and the next volunteer picks it up.</div>`,
    js: (from) => `
      tl.from("#${id} .step", { opacity: 0, x: 50, duration: 0.3, stagger: 0.8, ease: "power3.out" }, ${f(from + 0.3)});
      tl.from("#${id} .tick", { opacity: 0, scale: 0.3, duration: 0.25, stagger: 0.8, ease: "back.out(3)" }, ${f(from + 0.9)});
      tl.from("#${id} .expire", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 4.6)});`,
  };
}

function guardScene(s, id) {
  const X = (t) => 80 + t * 7.2, Y = (w) => 520 - w * 52;
  const pts = [[0, 1], [10, 2], [20, 4], [30, 6], [42, 6], [48, 2], [62, 2], [70, 5], [80, 8], [100, 8]];
  const d = pts.map(([t, w], i) => `${i ? "L" : "M"}${f(X(t))} ${f(Y(w))}`).join(" ");
  const grid = [0, 2, 4, 6, 8].map((w) => `<line class="gl" x1="80" x2="800" y1="${Y(w)}" y2="${Y(w)}" /><text class="ax" x="60" y="${Y(w) + 8}" text-anchor="end">${w}</text>`).join("");
  return {
    html: `${svg(`${grid}<path class="curve" d="${d}" />
          <text class="ann" x="${X(14)}" y="${Y(5) - 20}">idle → ramp</text>
          <text class="ann red" x="${X(44)}" y="${Y(2) + 50}">battery 18% → throttle</text>
          <text class="ann" x="${X(64)}" y="${Y(8) - 24}">12 GB free → ramp</text>
          <text class="ax" x="80" y="580">workers · sampled every 30 s</text>`)}
        <div class="pnote" style="top:${PH - 40}px">Illustration of the guard's behaviour · from the project page</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .curve").forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 4.5, ease: "none" }, ${f(from + 0.5)});
      });
      tl.from("#${id} .ann", { opacity: 0, duration: 0.3, stagger: 1.5 }, ${f(from + 1.4)});`,
  };
}

function flowScene(s, id) {
  const box = (x, y, w, h, title, meta, cls = "") =>
    `<g class="fb ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" /><text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle">${esc(title)}</text><text class="meta" x="${x + w / 2}" y="${y + h / 2 + 24}" text-anchor="middle">${esc(meta)}</text></g>`;
  const arrow = (x1, y1, x2, y2) => `<line class="ar" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#vc-arrow)" />`;
  return {
    html: svg(`<defs><marker id="vc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)" /></marker></defs>
      ${box(20, 40, 230, 90, "Audio / video", "corpus records")}
      ${box(20, 200, 230, 90, "Book scans", "pages + layout")}
      ${box(310, 40, 250, 90, "Gonthuka ASR", "wav2vec2 · 50k hours", "teal")}
      ${box(310, 200, 250, 90, "OCR", "dots.ocr · 80k pages", "teal")}
      ${box(620, 110, 220, 110, "Corpus API", "one database", "red")}
      ${box(140, 430, 300, 100, "Gonthuka fine-tune", "audio + transcript pairs")}
      ${box(500, 400, 300, 80, "Telugu BPE", "65,536 tokens")}
      ${box(500, 540, 300, 100, "Nanochat 560M", "20 layers · 2k context")}
      ${arrow(250, 85, 306, 85)}${arrow(250, 245, 306, 245)}
      ${arrow(560, 85, 616, 140)}${arrow(560, 245, 616, 195)}
      ${arrow(660, 220, 440, 428)}${arrow(730, 220, 670, 396)}${arrow(650, 480, 650, 536)}`) +
      `<div class="pnote" style="top:${PH - 40}px">Shared store, separate training slices · AGPL-3.0</div>`,
    js: (from) => `
      tl.from("#${id} .fb", { opacity: 0, y: 16, duration: 0.3, stagger: 0.45, ease: "power2.out" }, ${f(from + 0.4)});
      tl.from("#${id} .ar", { opacity: 0, duration: 0.25, stagger: 0.3 }, ${f(from + 2.4)});`,
  };
}

function scaleScene(s, id) {
  const max = 700;
  const rows = [["Audio hours", 50000, 1000000, "20×"], ["Book pages", 80000, 11000000, "137×"]];
  return {
    html: rows
      .map(([k, a, b, x], i) => {
        const y = 60 + i * 290;
        return `<div class="srow" style="top:${y}px"><strong>${esc(k)}</strong>
          <div class="sbar pilot" style="width:${Math.max(6, (a / b) * max)}px"></div><span class="sval" style="top:102px">Pilot: ${a.toLocaleString("en-US")}</span>
          <div class="sbar next" style="top:140px;width:${max}px"></div><span class="sval strong" style="top:192px">Next: ${b.toLocaleString("en-US")}</span>
          <em class="mult">${x}</em></div>`;
      })
      .join("") + `<div class="pnote" style="top:${PH - 40}px">Bars to scale</div>`,
    js: (from) => `
      tl.from("#${id} .sbar.next", { scaleX: 0, transformOrigin: "left center", duration: 1.2, stagger: 0.6, ease: "power2.out" }, ${f(from + 0.8)});
      tl.from("#${id} .mult", { opacity: 0, scale: 0.5, duration: 0.3, stagger: 0.6, ease: "back.out(2)" }, ${f(from + 1.8)});`,
  };
}

function commonsScene(s, id) {
  const cards = [["By", "the people", "volunteers, on their own machines"], ["For", "the people", "corpus and models open to all"], ["Of", "the people", "the language belongs to its speakers"]];
  return {
    html: cards.map(([a, b, v], i) => `<div class="pcard" style="top:${20 + i * 175}px"><b><em>${a}</em> ${b}</b><span>${esc(v)}</span></div>`).join("") +
      `<div class="agpl" style="top:560px">AGPL-3.0 · corpus · client · ASR checkpoint · Telugu language model</div>`,
    js: (from) => `
      tl.from("#${id} .pcard", { opacity: 0, x: 60, duration: 0.35, stagger: 0.6, ease: "power3.out" }, ${f(from + 0.3)});
      tl.from("#${id} .agpl", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 2.4)});`,
  };
}

function joinScene(s, id) {
  const lines = [
    ["cmd", "$ uv tool install --extra compute \\"],
    ["cont", "    git+https://code.swecha.org/corpus/corpus-client-cli"],
    ["cmd", "$ corpus-client login"],
    ["cmd", "$ corpus-client volunteer-compute"],
  ];
  return {
    html: `<div class="term" style="top:60px"><div class="tbar"><i></i><i></i><i></i><span>terminal</span></div>
          ${lines.map(([k, t]) => `<div class="tl ${k}">${esc(t)}</div>`).join("")}<div class="tl cursor">▍</div></div>
        <div class="pnote" style="top:${PH - 40}px">Commands from the corpus-client user manual</div>`,
    js: (from) => `
      tl.from("#${id} .tl", { opacity: 0, x: -14, duration: 0.2, stagger: 0.7, ease: "power1.out" }, ${f(from + 0.5)});
      tl.to("#${id} .cursor", { opacity: 0, duration: 0.3, repeat: 7, yoyo: true, ease: "steps(1)" }, ${f(from + 3.4)});`,
  };
}

const SCENES = { pilot: pilotScene, ledger: ledgerScene, access: accessScene, grid: gridScene, session: sessionScene, guard: guardScene, flow: flowScene, scale: scaleScene, commons: commonsScene, join: joinScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "assets"), join(out, "assets"), { recursive: true });
cpSync(join(HERE, "vc.css"), join(out, "vc.css"));

const segments = [
  { kind: "intro", text: script.hook.say, ...script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, ...b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 2111 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));
const parts = scenes.map((sc, i) => {
  const id = `scene-${i}`;
  return { id, sc, ...(i === 0 ? fleetScene(id) : SCENES[sc.scene.type](sc.scene, id)) };
});

const sceneHtml = parts
  .map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>
        <div class="copy"><div class="label">${esc(p.sc.label)}</div><h2>${rich(p.sc.big)}</h2><p class="sub">${esc(p.sc.sub)}</p></div>
        <div class="panel">${p.html}</div>
      </div>`)
  .join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.35, ease: "power1.out" }, ${f(p.sc.from)});\n      tl.from("#${p.id} .copy > *", { y: 24, opacity: 0, duration: 0.4, stagger: 0.12, ease: "power3.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");

const captions = captionClips(segments, clip);
const e = script.end;
const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="vc.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <img id="logo" class="clip" src="assets/swecha-logo-dark.png" alt="Swecha" ${clip(0, endStart, 4)} />
      <div id="source" class="clip" ${clip(0, endStart, 5)}>${esc(script.source)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <img src="assets/swecha-logo-dark.png" alt="Swecha" />
        <div id="end-title">${esc(e.title)}</div>
        <div id="end-tag">The cluster is already <em>in the room.</em></div>
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
for (const sc of scenes) console.log(`  ${(sc.scene?.type ?? "?").padEnd(8)} ${(sc.to - sc.from).toFixed(1)}s`);
