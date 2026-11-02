// Builds the G.S.R. 864(E) campaign Short from script.json into build/<slug>/:
// Kokoro voiceover over the music bed, word captions, and clause-by-clause
// scenes. Every claim comes from the campaign page (protectouranimals.in).
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

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;

// ---------- scenes: each returns { html, js(from) } ----------

function gazetteScene(id) {
  return {
    html: `<div id="${id}-sheet" class="gazette">
          <div class="gz-kicker">The Gazette of India · Extraordinary</div>
          <div class="gz-title">${esc(script.tag)}</div>
          <div class="gz-sub">Draft rules on laboratory animals · published 6 October 2026</div>
          <div class="gz-lines"><i></i><i></i><i></i><i></i></div>
        </div>
        <div id="${id}-stamp" class="stamp" data-layout-allow-occlusion>Draft</div>`,
    js: () => `
      tl.fromTo("#${id}-stamp", { scale: 1.6, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.35, ease: "back.out(2)" }, 0.6);`,
  };
}

function timelineScene(s, id) {
  const node = ([year, text], cls, y) =>
    `<div class="tl-node ${cls}" style="top:${y}px"><b>${esc(year)}</b><span>${esc(text)}</span></div>`;
  return {
    html: `<div class="tl-line" style="top:${TOP + 120}px;height:330px"></div>
        ${node(s.from, "then", TOP + 60)}
        ${node(s.to, "now", TOP + 330)}`,
    js: (from) => `
      tl.from("#${id} .tl-line", { scaleY: 0, transformOrigin: "top center", duration: 0.8, ease: "power2.inOut" }, ${f(from + 0.6)});
      tl.from("#${id} .tl-node.now", { x: 80, opacity: 0, duration: 0.4, ease: "back.out(1.8)" }, ${f(from + 1.4)});`,
  };
}

function animalsScene(s, id) {
  const tiles = s.animals
    .map(([icon, name], i) => {
      const x = 70 + (i % 3) * 320;
      const y = TOP + 10 + Math.floor(i / 3) * 160;
      return `<div class="tile" style="left:${x}px;top:${y}px"><span class="tile-icon">${icon}</span><span>${esc(name)}</span></div>`;
    })
    .join("");
  return {
    html: `${tiles}
        <div id="${id}-stamp" class="tag-red" style="top:${TOP + 500}px">${esc(s.stamp)}</div>`,
    js: (from) => `
      tl.from("#${id} .tile", { scale: 0.7, opacity: 0, duration: 0.25, stagger: 0.12, ease: "back.out(2)" }, ${f(from + 0.3)});
      tl.from("#${id}-stamp", { scale: 1.5, opacity: 0, duration: 0.3, ease: "back.out(2)" }, ${f(from + 3.4)});`,
  };
}

function quoteScene(s, id) {
  return {
    html: `<div class="doc" style="top:${TOP + 40}px">
          <div class="doc-kicker">${esc(s.before)}</div>
          <div class="doc-quote"><span id="${id}-struck" class="struck">${esc(s.struck)}</span></div>
        </div>
        <div class="ask-box" style="top:${TOP + 400}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.fromTo("#${id}-struck", { "--strike": "0%" }, { "--strike": "100%", duration: 0.7, ease: "power2.inOut" }, ${f(from + 2.2)});
      tl.from("#${id} .ask-box", { y: 40, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 3.4)});`,
  };
}

function gapScene(s, id) {
  const rows = s.rows
    .map(([what, who], i) => `<div class="gap-row ${who ? "" : "missing"}" style="top:${TOP + 70 + i * 130}px">
          <span class="gap-what">${esc(what)}</span>
          <span class="gap-who">${who ? esc(who) : "?"}</span>
        </div>`)
    .join("");
  return {
    html: `<div class="gap-head" style="top:${TOP}px">Who approves the experiment?</div>
        ${rows}
        <div class="note" style="top:${TOP + 70 + s.rows.length * 130 + 6}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .gap-row", { x: -60, opacity: 0, duration: 0.3, stagger: 0.45, ease: "power3.out" }, ${f(from + 0.4)});
      tl.fromTo("#${id} .gap-row.missing .gap-who", { scale: 1 }, { scale: 1.25, duration: 0.3, yoyo: true, repeat: 3, ease: "power1.inOut" }, ${f(from + 2.2)});`,
  };
}

function struckScene(s, id) {
  return {
    html: `<div class="doc" style="top:${TOP + 40}px">
          <div class="doc-kicker">${esc(s.title)}</div>
          <div class="doc-text"><span id="${id}-struck" class="struck">${esc(s.text)}</span></div>
        </div>
        <div id="${id}-stamp" class="tag-red" style="top:${TOP + 470}px">${esc(s.stamp)}</div>`,
    js: (from) => `
      tl.fromTo("#${id}-struck", { "--strike": "0%" }, { "--strike": "100%", duration: 0.8, ease: "power2.inOut" }, ${f(from + 2.0)});
      tl.from("#${id}-stamp", { scale: 1.5, opacity: 0, duration: 0.3, ease: "back.out(2)" }, ${f(from + 2.9)});`,
  };
}

function asksScene(s, id) {
  const items = s.asks
    .map((a, i) => {
      const x = 70 + (i % 2) * 475;
      const y = TOP - 10 + Math.floor(i / 2) * 70;
      return `<div class="ask" style="left:${x}px;top:${y}px"><b>${i + 1}</b>${esc(a)}</div>`;
    })
    .join("");
  return {
    html: `${items}
        <div class="note" style="top:${TOP - 10 + Math.ceil(s.asks.length / 2) * 70 + 4}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .ask", { opacity: 0, x: -20, duration: 0.2, stagger: 0.16, ease: "power2.out" }, ${f(from + 0.2)});`,
  };
}

const SCENES = { timeline: timelineScene, animals: animalsScene, quote: quoteScene, gap: gapScene, struck: struckScene, asks: asksScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "campaign.css"), join(out, "campaign.css"));

const segments = [
  { kind: "hook", text: script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, beat: b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 864 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));
const parts = scenes.map((sc, i) => {
  const id = `scene-${i}`;
  return { id, sc, ...(i === 0 ? gazetteScene(id) : SCENES[sc.beat.scene.type](sc.beat.scene, id)) };
});

const sceneHtml = parts
  .map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>
        ${p.html}
      </div>`)
  .join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { y: 40, opacity: 0, duration: 0.3, ease: "power3.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");

const cards = scenes
  .slice(1)
  .map((sc, i) => {
    const big = display(sc.beat.big);
    const size = big.length <= 8 ? 150 : big.length <= 12 ? 120 : 96;
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
    <link rel="stylesheet" href="campaign.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="tag" class="clip" ${clip(0, endStart, 4)}>${esc(script.tag)}</div>
      <div id="deadline" class="clip" ${clip(0, endStart, 5)}>${esc(script.deadline)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <h1 id="hook" class="clip" ${clip(0, scenes[0].to, 8)}>${esc(display(script.hook))}</h1>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">${esc(e.title)}</div>
        <div class="end-row"><span>Email</span><b>${esc(e.email)}</b></div>
        <div class="end-row"><span>Or use</span><b>${esc(e.site)}</b></div>
        <p id="end-small">${esc(e.small)}</p>
      </div>
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const endStart = ${f(endStart)};
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
      // The hook is on screen from frame 0: that frame is the thumbnail.
      tl.fromTo("#hook", { scale: 1 }, { scale: 1.02, duration: ${f(scenes[0].to)}, ease: "none" }, 0);
${sceneJs}
${scenes
  .slice(1)
  .map((sc, i) => `      tl.from("#card-${i + 1}", { y: 50, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(sc.from)});`)
  .join("\n")}
${CAPTION_TIMELINE}
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.45, stagger: 0.2, ease: "power3.out" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`${script.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups`);
