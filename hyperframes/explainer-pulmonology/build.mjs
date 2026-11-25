// Builds the pulmonology lecture explainer (landscape 1920x1080, for a faculty
// lecture) from script.json into build/<slug>/: a British English voiceover,
// word captions, and schematic diagrams of ventilation, perfusion, diffusion and
// V/Q matching. Render with `hyperframes render` in the build folder.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1920;
const H = 1080;
const PW = 900; // right-hand panel
const PH = 740;

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const svg = (body, defs = "") => `<svg class="pv" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}" aria-hidden="true"><defs>${defs}<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#334155" /></marker><marker id="arr-o2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2563eb" /></marker><marker id="arr-co2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#dc2626" /></marker></defs>${body}</svg>`;
const drawLines = (id, sel, from, dur = 0.9, gap = 0.25) => `
      document.querySelectorAll("#${id} ${sel}").forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: ${dur}, ease: "power1.inOut" }, ${f(from)} + i * ${gap});
      });`;

// ---------- scenes: each returns { html, js(from) } inside the right panel ----------

// The respiratory system, schematic: airways, lungs, pleura, diaphragm.
function anatomyScene(id) {
  const lung = (side) => {
    const s = side === "L" ? -1 : 1;
    const cx = 450 + s * 165;
    return `<path class="lung" d="M${cx - s * 40} 150 C ${cx + s * 90} 140, ${cx + s * 140} 360, ${cx + s * 120} 560 C ${cx + s * 60} 600, ${cx - s * 70} 590, ${cx - s * 95} 560 C ${cx - s * 110} 400, ${cx - s * 90} 220, ${cx - s * 40} 150 Z" />
      <path class="pleura" d="M${cx - s * 52} 136 C ${cx + s * 104} 124, ${cx + s * 158} 360, ${cx + s * 136} 574 C ${cx + s * 66} 618, ${cx - s * 80} 608, ${cx - s * 110} 574 C ${cx - s * 126} 400, ${cx - s * 104} 210, ${cx - s * 52} 136 Z" />`;
  };
  const airways = `<path class="air" d="M450 40 V 250" /><path class="air" d="M450 250 C 420 280, 380 300, 340 330" /><path class="air" d="M450 250 C 480 280, 520 300, 560 330" />
    <path class="air thin" d="M340 330 L 300 400 M340 330 L 360 420 M300 400 L 270 460 M300 400 L 320 470 M360 420 L 350 490" />
    <path class="air thin" d="M560 330 L 600 400 M560 330 L 540 420 M600 400 L 630 460 M600 400 L 580 470 M540 420 L 550 490" />`;
  const diaphragm = `<path class="diaph" d="M170 620 C 300 540, 400 560, 450 600 C 500 560, 600 540, 730 620" />`;
  const tags = [
    ["Airways", 470, 90, "air-tag"],
    ["Lungs", 700, 300, "lung-tag"],
    ["Pleura", 760, 470, "pleura-tag"],
    ["Respiratory muscles · diaphragm", 450, 690, "mus-tag"],
  ];
  return {
    html: `${svg(lung("L") + lung("R") + airways + diaphragm)}
        ${tags.map(([t, x, y, c]) => `<div class="tag ${c}" style="left:${x}px;top:${y}px">${esc(t)}</div>`).join("")}`,
    js: (from) => `${drawLines(id, ".air", from + 0.8, 0.6, 0.15)}
      tl.from("#${id} .lung", { opacity: 0, duration: 0.6 }, ${f(from + 1.6)});
      tl.from("#${id} .pleura", { opacity: 0, duration: 0.5 }, ${f(from + 2.4)});
      tl.from("#${id} .diaph", { opacity: 0, duration: 0.5 }, ${f(from + 3.0)});
      tl.from("#${id} .tag", { opacity: 0, x: -14, duration: 0.3, stagger: 1.1 }, ${f(from + 4.0)});`,
  };
}

// One alveolus wrapped by a capillary: the three processes.
function alveolusScene(s, id) {
  return {
    html: `${svg(`<path class="air" d="M120 120 C 220 140, 300 220, 330 300" />
          <circle class="alv" cx="430" cy="380" r="150" />
          <path class="cap" d="M180 610 C 300 640, 420 560, 470 540 C 560 500, 610 420, 600 330 C 590 250, 620 210, 700 190" />
          <path class="o2" d="M440 400 L 560 545" /><path class="o2h" d="M560 545 l-6 -26 l-18 15 z" />
          <path class="co2" d="M600 470 L 490 340" /><path class="co2h" d="M490 340 l6 26 l18 -15 z" />
          <text class="gas o2t" x="410" y="480">O₂</text><text class="gas co2t" x="478" y="330">CO₂</text>`)}
        <div class="pill p1" style="left:20px;top:40px"><b>Ventilation</b>air reaches the alveolus</div>
        <div class="pill p2" style="left:560px;top:600px"><b>Perfusion</b>blood reaches the capillary</div>
        <div class="pill p3" style="left:590px;top:40px"><b>Diffusion</b>O₂ in, CO₂ out</div>`,
    js: (from) => `${drawLines(id, ".air", from + 1.6)}
      tl.from("#${id} .alv", { opacity: 0, scale: 0.6, transformOrigin: "430px 380px", duration: 0.5 }, ${f(from + 0.4)});
      tl.from("#${id} .p1", { opacity: 0, y: 14, duration: 0.3 }, ${f(from + 2.2)});
      ${drawLines(id, ".cap", from + 5.0, 1.0)}
      tl.from("#${id} .p2", { opacity: 0, y: 14, duration: 0.3 }, ${f(from + 5.6)});
      ${drawLines(id, ".o2, #" + id + " .co2", from + 8.6, 0.5, 0.4)}
      tl.from("#${id} .gas, #${id} .o2h, #${id} .co2h", { opacity: 0, duration: 0.3, stagger: 0.2 }, ${f(from + 8.9)});
      tl.from("#${id} .p3", { opacity: 0, y: 14, duration: 0.3 }, ${f(from + 9.2)});`,
  };
}

// A breath split into dead space and alveolar volume, then per minute.
function breathScene(s, id) {
  const scale = 1.5; // px per mL
  const dead = s.vd * scale, alv = (s.vt - s.vd) * scale;
  const perMin = ((s.vt - s.vd) * s.rate) / 1000;
  return {
    html: `<div class="blabel" style="top:60px">One breath · tidal volume ${s.vt} mL</div>
        <div class="bseg dead" style="left:60px;top:110px;width:${dead}px">dead space<br /><b>${s.vd} mL</b></div>
        <div class="bseg alvb" style="left:${60 + dead}px;top:110px;width:${alv}px">reaches the alveoli<br /><b>${s.vt - s.vd} mL</b></div>
        <div class="note-l" style="top:270px">Conducting airways (trachea to terminal bronchioles) carry air but do not exchange gas.</div>
        <div class="calc" style="top:400px">(${s.vt} − ${s.vd}) mL × ${s.rate} breaths/min</div>
        <div class="calc big" style="top:470px">≈ ${perMin.toFixed(1)} L/min alveolar ventilation</div>
        <div class="note-l" style="top:600px">Rapid shallow breathing wastes a larger share on dead space.</div>`,
    js: (from) => `
      tl.from("#${id} .bseg.dead", { scaleX: 0, transformOrigin: "left center", duration: 0.6 }, ${f(from + 3.2)});
      tl.from("#${id} .bseg.alvb", { scaleX: 0, transformOrigin: "left center", duration: 0.8 }, ${f(from + 6.6)});
      tl.from("#${id} .calc", { opacity: 0, y: 16, duration: 0.35, stagger: 0.8 }, ${f(from + 9.0)});
      tl.from("#${id} .note-l", { opacity: 0, duration: 0.3, stagger: 2.2 }, ${f(from + 4.4)});`,
  };
}

// The pulmonary circuit: right heart → lungs → left heart, with pressures.
function circuitScene(s, id) {
  return {
    html: `${svg(`<rect class="heart rv" x="90" y="470" width="190" height="130" rx="24" /><rect class="heart lv" x="620" y="470" width="190" height="130" rx="24" />
          <path class="art" d="M185 470 C 185 330, 260 250, 360 250" marker-end="url(#arr)" />
          <path class="capbed" d="M360 250 C 400 210, 420 290, 450 250 C 480 210, 500 290, 540 250" />
          <path class="vein" d="M540 250 C 640 250, 715 330, 715 466" marker-end="url(#arr)" />
          <path class="sys" d="M715 600 C 715 700, 185 700, 185 604" marker-end="url(#arr)" />
          <text class="lbl" x="185" y="545" text-anchor="middle">Right ventricle</text><text class="lbl" x="715" y="545" text-anchor="middle">Left heart</text>
          <text class="lbl small" x="450" y="200" text-anchor="middle">pulmonary capillaries</text>
          <text class="lbl small" x="450" y="725" text-anchor="middle">systemic circulation</text>`)}
        <div class="press" style="left:40px;top:40px"><b>~5 L/min</b>the whole right-ventricular output</div>
        <div class="press" style="left:500px;top:40px"><b>~15 mmHg</b>mean pulmonary arterial pressure</div>
        <div class="press dim" style="left:300px;top:320px;width:280px"><b>~95 mmHg</b>mean systemic arterial pressure</div>`,
    js: (from) => `${drawLines(id, ".art, #" + id + " .capbed, #" + id + " .vein", from + 0.8, 0.8, 0.7)}
      tl.from("#${id} .heart", { opacity: 0, duration: 0.4 }, ${f(from + 0.3)});
      tl.from("#${id} .press", { opacity: 0, y: 14, duration: 0.35, stagger: 1.6 }, ${f(from + 4.8)});
      ${drawLines(id, ".sys", from + 8.5, 1.0)}`,
  };
}

// Fick's law as a membrane whose area, gradient and thickness change.
function fickScene(s, id) {
  return {
    html: `<div class="eq" style="top:30px">V̇<sub>gas</sub> ∝ <span class="ea">A</span> × <span class="ed">D</span> × <span class="ep">(P₁ − P₂)</span> ÷ <span class="et">T</span></div>
        <div class="legend3" style="top:150px"><span class="ea">A</span> area<span class="ed">D</span> diffusion constant<span class="ep">ΔP</span> pressure gradient<span class="et">T</span> thickness</div>
        ${svg(`<rect class="alvspace" x="60" y="250" width="780" height="150" rx="10" /><rect class="memb" x="60" y="400" width="780" height="22" /><rect class="blood" x="60" y="422" width="780" height="150" rx="10" />
          <text class="lbl" x="80" y="300">alveolar gas · PO₂ ≈ 100 mmHg</text><text class="lbl" x="80" y="545">capillary blood · PO₂ ≈ 40 mmHg</text>
          ${[150, 300, 450, 600, 750].map((x) => `<path class="flux" d="M${x} 340 V 470" marker-end="url(#arr)" />`).join("")}`)}
        <div class="facts" style="top:620px"><span><b>50–100 m²</b> surface area</span><span><b>&lt; 0.5 µm</b> blood–gas barrier</span></div>`,
    js: (from) => `
      tl.from("#${id} .eq", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 0.4)});
      tl.from("#${id} .legend3 span", { opacity: 0, duration: 0.25, stagger: 0.5 }, ${f(from + 2.0)});
      ${drawLines(id, ".flux", from + 4.0, 0.5, 0.15)}
      tl.from("#${id} .facts span", { opacity: 0, y: 14, duration: 0.35, stagger: 1.4 }, ${f(from + 9.0)});`,
  };
}

// Capillary PO2 against transit time: normal, thickened membrane, exercise.
function curveScene(s, id) {
  const X = (t) => 120 + (t / 0.75) * 700, Y = (p) => 560 - ((p - 30) / 80) * 440;
  const normal = [[0, 40], [0.05, 66], [0.1, 84], [0.15, 93], [0.2, 98], [0.25, 100], [0.75, 100]];
  const thick = [[0, 40], [0.1, 56], [0.2, 67], [0.3, 75], [0.45, 83], [0.6, 88], [0.75, 91]];
  const path = (pts) => pts.map(([t, p], i) => `${i ? "L" : "M"}${f(X(t))} ${f(Y(p))}`).join(" ");
  const grid = [40, 70, 100].map((p) => `<line class="gl" x1="120" x2="820" y1="${f(Y(p))}" y2="${f(Y(p))}" /><text class="ax" x="105" y="${f(Y(p) + 7)}" text-anchor="end">${p}</text>`).join("")
    + [0, 0.25, 0.5, 0.75].map((t) => `<text class="ax" x="${f(X(t))}" y="600" text-anchor="middle">${t}</text>`).join("");
  return {
    html: `${svg(`${grid}<text class="ax" x="120" y="70">PO₂ (mmHg)</text><text class="ax" x="820" y="640" text-anchor="end">time in capillary (s)</text>
          <rect class="ex" x="${X(0)}" y="${Y(110)}" width="${f(X(0.25) - X(0))}" height="${f(Y(30) - Y(110))}" />
          <path class="cv normal" d="${path(normal)}" /><path class="cv thick" d="${path(thick)}" />`)}
        <div class="key" style="top:645px"><i class="kn"></i>normal<i class="kt"></i>thickened membrane (illustrative)<i class="ke"></i>exercise: transit may fall to ~0.25 s</div>`,
    js: (from) => `${drawLines(id, ".cv.normal", from + 0.8, 2.2)}
      ${drawLines(id, ".cv.thick", from + 8.4, 2.0)}
      tl.from("#${id} .ex", { opacity: 0, duration: 0.5 }, ${f(from + 11.0)});
      tl.from("#${id} .key", { opacity: 0, duration: 0.4 }, ${f(from + 8.2)});`,
  };
}

// The V/Q spectrum from shunt to dead space.
function vqScene(s, id) {
  const unit = (x, label, sub, cls, vent, perf) => `<div class="unit ${cls}" style="left:${x}px;top:250px">
      <div class="u-alv ${vent ? "" : "off"}"></div><div class="u-cap ${perf ? "" : "off"}"></div>
      <b>${label}</b><span>${sub}</span></div>`;
  return {
    html: `<div class="ratio" style="top:30px">V̇<sub>A</sub> ≈ 4 L/min ÷ Q̇ ≈ 5 L/min ≈ <b>0.8</b></div>
        <div class="axis" style="top:200px"><span>V̇/Q̇ = 0</span><span>≈ 0.8</span><span>V̇/Q̇ = ∞</span></div>
        ${unit(20, "Shunt", "perfused, not ventilated · e.g. pneumonia, atelectasis", "shunt", false, true)}
        ${unit(320, "Matched", "ventilation meets perfusion", "match", true, true)}
        ${unit(620, "Dead space", "ventilated, not perfused · e.g. pulmonary embolism", "dead", true, false)}`,
    js: (from) => `
      tl.from("#${id} .ratio", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 0.6)});
      tl.from("#${id} .axis", { opacity: 0, duration: 0.4 }, ${f(from + 5.0)});
      tl.from("#${id} .unit.match", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 5.4)});
      tl.from("#${id} .unit.shunt", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 9.4)});
      tl.from("#${id} .unit.dead", { opacity: 0, y: 20, duration: 0.4 }, ${f(from + 12.6)});`,
  };
}

function clinicScene(s, id) {
  const cols = [
    ["Ventilation", "v", ["Airway obstruction · asthma, COPD", "Respiratory muscle weakness"]],
    ["Perfusion", "q", ["Pulmonary embolism"]],
    ["Diffusion", "d", ["Fibrosis · thicker membrane", "Emphysema · less area"]],
  ];
  return {
    html: cols
      .map(([h, c, items], i) => `<div class="ccol ${c}" style="left:${i * 300}px;top:40px"><b>${h}</b>${items.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`)
      .join("") + `<div class="note-l" style="top:640px">Examples only; most lung diseases affect more than one process.</div>`,
    js: (from) => `
      tl.from("#${id} .ccol", { opacity: 0, y: 24, duration: 0.4, stagger: 3.6 }, ${f(from + 1.4)});`,
  };
}

const SCENES = { alveolus: alveolusScene, breath: breathScene, circuit: circuitScene, fick: fickScene, curve: curveScene, vq: vqScene, clinic: clinicScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "lecture.css"), join(out, "lecture.css"));

const segments = [
  { kind: "intro", text: script.hook.say, ...script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, ...b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 1311 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));
const parts = scenes.map((sc, i) => {
  const id = `scene-${i}`;
  return { id, sc, ...(i === 0 ? anatomyScene(id) : SCENES[sc.scene.type](sc.scene, id)) };
});

const sceneHtml = parts
  .map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>
        <div class="copy"><div class="label">${esc(p.sc.label)}</div><h2>${esc(display(p.sc.big))}</h2><p class="sub">${esc(p.sc.sub)}</p></div>
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
    <link rel="stylesheet" href="lecture.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="course" class="clip" ${clip(0, endStart, 4)}>${esc(script.course)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-kicker">Summary</div>
        <div id="end-title">${esc(e.title)}</div>
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
for (const sc of scenes) console.log(`  ${(sc.scene?.type ?? "").padEnd(9)} ${(sc.to - sc.from).toFixed(1)}s  ${display(sc.big)}`);
