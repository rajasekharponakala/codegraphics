// Builds the G.S.R. 864(E) campaign Short from script.json into build/<slug>/:
// Kokoro voiceover over the music bed, word captions, and photo-led scenes.
// Every claim comes from the campaign page (protectouranimals.in); photos are
// the site's CC-licensed Wikimedia Commons images.
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
const img = (src) => `assets/${src}`;
// Blurred, darkened copy of a photo filling the frame behind a scene.
const backdrop = (src) => (src ? `<div class="backdrop" style="background-image:url('${img(src)}')"></div><div class="shade"></div>` : "");
const photo = (src, cls, style) => `<div class="photo ${cls}" style="${style};background-image:url('${img(src)}')"></div>`;

// Grid of photos for the end card, 3 across, filling the space above it.
const collage = (srcs) =>
  srcs
    .map((src, i) => {
      const x = 70 + (i % 3) * 318;
      const y = 150 + Math.floor(i / 3) * 196;
      return `<div class="tile collage" style="left:${x}px;top:${y}px;background-image:url('${img(src)}')"></div>`;
    })
    .join("");

// ---------- scenes: each returns { html, js(from) } ----------

function hookScene(id) {
  return {
    html: `${backdrop(script.hookPhoto)}
        ${photo(script.hookPhoto, "hero", `left:70px;top:${TOP + 20}px;width:940px;height:600px`)}`,
    js: () => `
      tl.fromTo("#${id} .hero", { backgroundSize: "100%" }, { backgroundSize: "112%", duration: 4.5, ease: "none" }, 0);`,
  };
}

function gazetteScene(s, id) {
  return {
    html: `${backdrop(s.bg)}
        <div class="gazette-img" style="background-image:url('${img(s.image)}')"></div>
        <div id="${id}-stamp" class="stamp" data-layout-allow-occlusion>Draft</div>`,
    js: (from) => `
      tl.fromTo("#${id}-stamp", { scale: 1.8, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.35, ease: "back.out(2)" }, ${f(from + 1.0)});
`,
  };
}

function animalsScene(s, id) {
  const tiles = s.animals
    .map(([src, name], i) => {
      const x = 70 + (i % 3) * 318;
      const y = TOP + 10 + Math.floor(i / 3) * 196;
      return `<div class="tile" style="left:${x}px;top:${y}px;background-image:url('${img(src)}')"><span>${esc(name)}</span></div>`;
    })
    .join("");
  return {
    html: `${backdrop(s.bg)}
        ${tiles}
        <div id="${id}-stamp" class="tag-red" style="top:${TOP + 600}px">${esc(s.stamp)}</div>`,
    js: (from) => `
      tl.from("#${id} .tile", { scale: 0.7, opacity: 0, duration: 0.25, stagger: 0.12, ease: "back.out(2)" }, ${f(from + 0.3)});
      tl.from("#${id}-stamp", { scale: 1.5, opacity: 0, duration: 0.3, ease: "back.out(2)" }, ${f(from + 3.4)});`,
  };
}

function quoteScene(s, id) {
  return {
    html: `${backdrop(s.bg)}
        ${photo(s.photo, "", `left:70px;top:${TOP + 10}px;width:940px;height:400px`)}
        <div class="doc" style="top:${TOP + 330}px">
          <div class="doc-kicker">${esc(s.before)}</div>
          <div class="doc-quote"><span id="${id}-struck" class="struck">${esc(s.struck)}</span></div>
        </div>`,
    js: (from) => `
      tl.from("#${id} .doc", { y: 60, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 0.6)});
      tl.fromTo("#${id}-struck", { "--strike": "0%" }, { "--strike": "100%", duration: 0.7, ease: "power2.inOut" }, ${f(from + 2.2)});`,
  };
}

function gapScene(s, id) {
  const rows = s.rows
    .map(([what, who], i) => `<div class="gap-row ${who ? "" : "missing"}" style="top:${TOP + 80 + i * 140}px">
          <span class="gap-what">${esc(what)}</span>
          <span class="gap-who">${who ? esc(who) : "?"}</span>
        </div>`)
    .join("");
  return {
    html: `${backdrop(s.bg)}
        <div class="gap-head" style="top:${TOP + 10}px">Who approves the experiment?</div>
        ${rows}
        <div class="note" style="top:${TOP + 80 + s.rows.length * 140 + 6}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .gap-row", { x: -60, opacity: 0, duration: 0.3, stagger: 0.45, ease: "power3.out" }, ${f(from + 0.4)});
      tl.fromTo("#${id} .gap-row.missing .gap-who", { scale: 1 }, { scale: 1.25, duration: 0.3, yoyo: true, repeat: 3, ease: "power1.inOut" }, ${f(from + 2.2)});`,
  };
}

function struckScene(s, id) {
  return {
    html: `${backdrop(s.bg)}
        ${photo(s.photo, "", `left:220px;top:${TOP + 10}px;width:640px;height:330px`)}
        <div class="doc" style="top:${TOP + 290}px">
          <div class="doc-kicker">${esc(s.title)}</div>
          <div class="doc-text"><span id="${id}-struck" class="struck">${esc(s.text)}</span></div>
        </div>
        <div id="${id}-stamp" class="tag-red" style="top:${TOP + 230}px;left:600px">${esc(s.stamp)}</div>`,
    js: (from) => `
      tl.fromTo("#${id}-struck", { "--strike": "0%" }, { "--strike": "100%", duration: 0.8, ease: "power2.inOut" }, ${f(from + 2.0)});
      tl.from("#${id}-stamp", { scale: 1.5, opacity: 0, duration: 0.3, ease: "back.out(2)" }, ${f(from + 2.9)});`,
  };
}

function voicesScene(s, id) {
  const tiles = s.people
    .map(([src, name, role], i) => {
      const x = 70 + (i % 4) * 238;
      const y = TOP + 70 + Math.floor(i / 4) * 196;
      return `<div class="face" style="left:${x}px;top:${y}px;background-image:url('${img(src)}')"><span><b>${esc(name)}</b>${esc(role)}</span></div>`;
    })
    .join("");
  return {
    html: `${backdrop(s.bg)}
        <div class="count" style="top:${TOP}px">${esc(s.count)}</div>
        ${tiles}`,
    js: (from) => `
      tl.from("#${id} .face", { scale: 0.6, opacity: 0, duration: 0.25, stagger: 0.08, ease: "back.out(2)" }, ${f(from + 0.3)});`,
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
    html: `${backdrop(s.bg)}
        ${items}
        <div class="note light" style="top:${TOP - 10 + Math.ceil(s.asks.length / 2) * 70 + 4}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .ask", { opacity: 0, x: -20, duration: 0.2, stagger: 0.16, ease: "power2.out" }, ${f(from + 0.2)});`,
  };
}

const SCENES = { gazette: gazetteScene, animals: animalsScene, quote: quoteScene, gap: gapScene, struck: struckScene, voices: voicesScene, asks: asksScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "assets"), join(out, "assets"), { recursive: true });
cpSync(join(HERE, "campaign.css"), join(out, "campaign.css"));

const segments = [
  { kind: "hook", text: script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, beat: b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, lang: script.lang, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 864 });

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
    const size = big.length <= 9 ? 150 : big.length <= 12 ? 120 : 96;
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
      <div id="end-scene" class="clip" ${clip(endStart, total, 29)}>
        ${backdrop(e.photo)}
        ${collage(e.collage)}
      </div>
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">${esc(e.title)}</div>
        <div class="end-row"><span>Email</span><b>${esc(e.email)}</b></div>
        <div class="end-row"><span>Or use</span><b>${esc(e.site)}</b></div>
        <p id="end-small">${esc(e.small)}</p>
        <p id="end-credits">${esc(e.credits)}</p>
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
      tl.from("#end-scene", { opacity: 0, duration: 0.4 }, endStart);
      tl.from("#end-scene .collage", { scale: 0.8, opacity: 0, duration: 0.3, stagger: 0.07, ease: "back.out(2)" }, endStart + 0.1);
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.45, stagger: 0.18, ease: "power3.out" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`${script.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups`);
