// Builds the Swecha medical-camps donation Short from script.json (or the
// Thanksgiving version, script-thanks.json) into build/<slug>/: Indian English
// voiceover, word captions, the camp's own photos animated shot by shot, and
// stat cards from Swecha's programme proposal. Render with `hyperframes render`.
//
// Shot styles (a beat's "shots"; a plain "photos" list means push/pull):
//   push, pull     slow zoom in / out          panL, panR   slow sideways pan
//   wipe           circle reveal, then push    split        two photos slide in, top and bottom
//   polaroids      2-3 tilted prints drop in   mosaic       a 2x3 grid of tiles pops in
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;

const scriptArg = process.argv.indexOf("--script");
const scriptFile = scriptArg === -1 ? "script.json" : process.argv[scriptArg + 1];
const script = JSON.parse(readFileSync(join(HERE, scriptFile), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "camps.css"), join(out, "camps.css"));
cpSync(join(HERE, "assets"), join(out, "assets"), { recursive: true });

// ---------- narration ----------

const segments = [
  { kind: "intro", text: script.hookSay, label: script.hookLabel ?? script.brand, big: script.hook, sub: "", photos: script.hookPhotos, shots: script.hookShots },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, ...b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: script.seed ?? 1606 });

const scenes = segments.slice(0, -1).map((seg, i) => ({
  ...seg,
  from: i === 0 ? 0 : seg.start - 0.2,
  to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
}));

// ---------- shots: each beat's time split between its shots ----------

const src = (file) => `assets/photos/${file}`;
const img = (file, x = "50%", cls = "fill") => `<img class="${cls}" src="${src(file)}" alt="" style="object-position:${x} 50%" />`;

function shotHtml(sh) {
  switch (sh.style) {
    case "panL":
    case "panR":
      return img(sh.photo, sh.x, "fill pan");
    case "split":
      return sh.photos.map(([file, x], i) => `<div class="half h${i}">${img(file, x)}</div>`).join("");
    case "polaroids":
      return sh.photos
        .map(([file, note], i) => `<div class="polaroid p${i}"><div class="pimg" style="background-image:url('${src(file)}')"></div><span>${esc(note)}</span></div>`)
        .join("");
    case "mosaic":
      return `<div class="mosaic">${sh.photos.map((file) => `<div class="tile" style="background-image:url('${src(file)}')"></div>`).join("")}</div>`;
    default:
      return img(sh.photo, sh.x);
  }
}

function shotJs(sh, id, from, to) {
  const d = f(to - from);
  const at = f(from);
  const fadeIn = `tl.from("#${id}", { opacity: 0, duration: 0.45, ease: "power1.out" }, ${at});`;
  switch (sh.style) {
    case "pull":
      return `${fadeIn} tl.fromTo("#${id} .fill", { scale: 1.14 }, { scale: 1, duration: ${d}, ease: "none" }, ${at});`;
    case "panL":
      return `${fadeIn} tl.fromTo("#${id} .pan", { x: 0 }, { x: -340, duration: ${d}, ease: "none" }, ${at});`;
    case "panR":
      return `${fadeIn} tl.fromTo("#${id} .pan", { x: -340 }, { x: 0, duration: ${d}, ease: "none" }, ${at});`;
    case "wipe":
      return `tl.fromTo("#${id}", { clipPath: "circle(0% at 50% 45%)" }, { clipPath: "circle(80% at 50% 45%)", duration: 1.1, ease: "power2.inOut" }, ${at});
      tl.fromTo("#${id} .fill", { scale: 1.2 }, { scale: 1.05, duration: ${d}, ease: "none" }, ${at});`;
    case "split":
      return `${fadeIn} tl.from("#${id} .h0", { x: -1080, duration: 0.7, ease: "power3.out" }, ${at});
      tl.from("#${id} .h1", { x: 1080, duration: 0.7, ease: "power3.out" }, ${f(from + 0.35)});
      tl.fromTo("#${id} .fill", { scale: 1 }, { scale: 1.1, duration: ${d}, ease: "none" }, ${at});`;
    case "polaroids":
      return `${fadeIn} tl.from("#${id} .polaroid", { y: -900, rotation: "+=24", opacity: 0, duration: 0.8, stagger: 0.9, ease: "back.out(1.2)" }, ${f(from + 0.2)});
      tl.from("#${id} .polaroid span", { opacity: 0, duration: 0.4, stagger: 0.9 }, ${f(from + 0.8)});`;
    case "mosaic":
      return `${fadeIn} tl.from("#${id} .tile", { scale: 0.4, opacity: 0, duration: 0.45, stagger: 0.15, ease: "back.out(1.6)" }, ${at});
      tl.fromTo("#${id} .mosaic", { scale: 1 }, { scale: 1.06, duration: ${d}, ease: "none" }, ${at});`;
    default: // push
      return `${fadeIn} tl.fromTo("#${id} .fill", { scale: 1 }, { scale: 1.14, duration: ${d}, ease: "none" }, ${at});`;
  }
}

const shots = [];
for (const sc of scenes) {
  const list = sc.shots ?? sc.photos.map(([photo, x], k) => ({ style: (shots.length + k) % 2 ? "pull" : "push", photo, x }));
  const span = (sc.to - sc.from) / list.length;
  list.forEach((sh, k) => {
    shots.push({ ...sh, id: `shot-${shots.length}`, from: Math.max(0, sc.from + k * span - (k ? 0.4 : 0)), to: sc.from + (k + 1) * span + 0.4 });
  });
}
shots.at(-1).to = endStart;

const photoHtml = shots
  .map((sh) => `      <div id="${sh.id}" class="shot ${sh.style ?? "push"} clip" ${clip(sh.from, sh.to, 1)}>${shotHtml(sh)}</div>`)
  .join("\n");
const photoJs = shots.map((sh) => `      ${shotJs(sh, sh.id, sh.from, sh.to)}`).join("\n");

// ---------- cards ----------

const cards = scenes
  .map((sc, i) => {
    const big = display(sc.big);
    const base = i === 0 ? 84 : big.length <= 10 ? 128 : big.length <= 16 ? 100 : 84;
    const size = Math.round(base * (script.theme === "thanks" ? 1.25 : 1)); // the handwritten face runs small
    return `      <div id="card-${i}" class="card clip" ${clip(sc.from, sc.to, 10)}>
        <div class="card-label">${esc(display(sc.label))}</div>
        <div class="card-big" style="font-size:${size}px">${esc(big)}</div>
        ${sc.sub ? `<div class="card-sub">${esc(sc.sub)}</div>` : ""}
      </div>`;
  })
  .join("\n");

const captions = captionClips(segments, clip);
const e = script.end;
const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en" data-theme="${script.theme ?? "teal"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="camps.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${photoHtml}
      <div id="fade" class="clip" ${clip(0, endStart, 3)}></div>
      <div id="brand" class="clip" ${clip(0, endStart, 4)}>${esc(script.brand)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
${cards}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-grid">${e.photos.map((p, i) => `<div class="eg eg${i}"><img src="assets/photos/${p}" alt="" /></div>`).join("")}</div>
        <div id="end-box">
          <div id="end-kicker">${esc(e.kicker)}</div>
          <div id="end-title">${esc(e.title)}</div>
          <div id="end-url">${esc(script.url)}</div>
          <ul id="end-lines">${e.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
          <p id="end-small">${esc(e.small)}</p>
        </div>
      </div>
${captions.html}
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const endStart = ${f(endStart)};
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
${photoJs}
${scenes.map((sc, i) => `      tl.from("#card-${i}", { y: 50, opacity: 0, duration: 0.4, ease: "power3.out" }, ${f(sc.from + (i ? 0 : 0.3))});`).join("\n")}
${CAPTION_TIMELINE}
      tl.from("#end-grid .eg", { opacity: 0, scale: 0.9, duration: 0.4, stagger: 0.12, ease: "power2.out" }, endStart);
      tl.from("#end-box > *", { y: 30, opacity: 0, duration: 0.45, stagger: 0.15, ease: "power3.out" }, endStart + 0.4);
      tl.to("#end-url", { scale: 1.05, duration: 0.5, repeat: 5, yoyo: true, ease: "sine.inOut" }, endStart + 2);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`${script.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups, ${shots.length} shots`);
