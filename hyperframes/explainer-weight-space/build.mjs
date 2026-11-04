// Builds the Weight-Space Programming explainer from script.json (59 s) or
// script-full.json (all eight experiments) into build/<slug>/:
// Indian English voiceover, word captions, and a dark "weight inspector" look
// (the post's own fonts and accent colours) with diagrams redrawn from the
// authors' published numbers. Render with `hyperframes render` in the build folder.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
const TOP = 400; // first pixel below the header

// node build.mjs [--script script-full.json]: the short and the full version share this build.
const scriptArg = process.argv.indexOf("--script");
const scriptFile = scriptArg === -1 ? "script.json" : process.argv[scriptArg + 1];
const script = JSON.parse(readFileSync(join(HERE, scriptFile), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const pct = (v) => Number(v).toFixed(1); // keep "7.0", not "7"
const svg = (body) => `<svg class="overlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg>`;

// ---------- scenes: each returns { html, js(from) } ----------

// Hook: a field of weight cells with a few lit up, the signature image.
function hookScene(id) {
  let cells = "";
  for (let r = 0; r < 24; r++)
    for (let c = 0; c < 32; c++) {
      const lit = (r === 15 || r === 19) && c >= 12 && c < 16;
      const shade = 0.08 + (((r * 37 + c * 61) % 23) / 23) * 0.22;
      cells += `<rect class="${lit ? "lit" : "cell"}" x="${110 + c * 27}" y="${TOP + 20 + r * 18}" width="23" height="14" ${lit ? "" : `style="opacity:${shade.toFixed(2)}"`} />`;
    }
  return { html: svg(cells), js: () => `
      tl.fromTo("#${id} .lit", { opacity: 1 }, { opacity: 0.35, duration: 0.5, repeat: 5, yoyo: true, ease: "sine.inOut" }, 0.4);` };
}

// The model's 24 layers as rows of cells; the edited columns of two layers light up.
function layersScene(s, id) {
  let body = "";
  const cols = 40;
  for (let r = 0; r < s.layers; r++) {
    const y = TOP + 20 + r * 22;
    body += `<text class="mono-label" x="96" y="${y + 15}" text-anchor="end">${r}</text>`;
    for (let c = 0; c < cols; c++) {
      const lit = s.edited.includes(r) && c >= 18 && c < 21;
      body += `<rect class="${lit ? "lit" : "cell"}" x="${110 + c * 22}" y="${y}" width="18" height="16" />`;
    }
  }
  const marks = s.edited.map((r) => `<text class="mono-tag" x="${110 + 21 * 22 + 12}" y="${TOP + 20 + r * 22 + 15}">← layer ${r}</text>`).join("");
  return {
    html: `${svg(body + marks)}
        <div class="note" style="top:${TOP + 20 + s.layers * 22 + 16}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .lit", { opacity: 0, duration: 0.25, stagger: 0.05, ease: "power1.out" }, ${f(from + 1.4)});`,
  };
}

// A looping answer scrolling in an output panel, with the token-limit meter.
function loopScene(s, id) {
  const lines = s.lines.map((l, i) => `<div class="out-line ${i ? "rep" : ""}">${esc(l)}</div>`).join("");
  return {
    html: `<div class="panel" style="top:${TOP}px;height:420px">
          <div class="panel-title">model output</div>
          <div class="out">${lines}</div>
        </div>
        <div class="meter-label" style="top:${TOP + 450}px">Answers that hit the 32,768-token limit</div>
        <div class="meter" style="top:${TOP + 496}px"><i style="width:93%"></i><b>93%</b></div>
        <div class="note" style="top:${TOP + 560}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .out-line", { opacity: 0, y: 20, duration: 0.25, stagger: 0.7, ease: "power1.out" }, ${f(from + 0.3)});
      tl.from("#${id} .meter i", { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power2.out" }, ${f(from + 2.6)});`,
  };
}

// The edit as a code diff.
function diffScene(s, id) {
  const lines = s.lines
    .map(([kind, text]) => `<div class="diff-line ${kind}"><span>${kind === "del" ? "-" : kind === "add" ? "+" : " "}</span>${esc(text)}</div>`)
    .join("");
  return {
    html: `<div class="panel" style="top:${TOP}px">
          <div class="panel-title">weight edit</div>
          ${lines}
        </div>
        <div class="note" style="top:${TOP + 420}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .diff-line", { opacity: 0, x: -20, duration: 0.25, stagger: 0.6, ease: "power1.out" }, ${f(from + 0.3)});`,
  };
}

// Paired horizontal bars: base (grey) and edited (green), from 0.
function barsScene(s, id) {
  const width = 640;
  const rows = s.rows
    .map(([name, base, edited], i) => {
      const y = TOP + 10 + i * 170;
      return `<div class="hlabel" style="top:${y}px">${esc(name)}</div>
        <div class="hbar base" style="top:${y + 44}px;width:${f((base / s.max) * width)}px"></div>
        <div class="hval mono" style="left:${f(70 + (base / s.max) * width + 14)}px;top:${y + 40}px">${pct(base)}%</div>
        <div class="hbar edit" style="top:${y + 92}px;width:${f((edited / s.max) * width)}px"></div>
        <div class="hval mono strong" style="left:${f(70 + (edited / s.max) * width + 14)}px;top:${y + 88}px">${pct(edited)}%</div>`;
    })
    .join("");
  return {
    html: `<div class="legend"><i class="base"></i>base <i class="edit"></i>edited</div>
        ${rows}
        <div class="note" style="top:${TOP + 10 + s.rows.length * 170}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .hbar.edit", { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.4, ease: "power3.out" }, ${f(from + 0.6)});`,
  };
}

// MATH-500 against the forward-pass budget; x is to scale.
function passesScene(s, id) {
  const P = { x0: 170, x1: 960, y0: TOP + 80, y1: TOP + 500 };
  const x = (p) => P.x0 + (p / s.max) * (P.x1 - P.x0);
  const y = (v) => P.y1 - (v / 60) * (P.y1 - P.y0);
  const grid = [0, 30, 60]
    .map((v) => `<line class="grid" x1="${P.x0}" x2="${P.x1}" y1="${f(y(v))}" y2="${f(y(v))}" /><text class="tick" x="${P.x0 - 18}" y="${f(y(v) + 10)}" text-anchor="end">${v}</text>`)
    .join("");
  const xs = s.points.map(([p]) => `<text class="tick" x="${f(x(p))}" y="${P.y1 + 46}" text-anchor="middle">${p}</text>`).join("");
  const d = s.points.map(([p, v], i) => `${i ? "L" : "M"}${f(x(p))} ${f(y(v))}`).join(" ");
  const dots = s.points
    .map(([p, v], i) => `<circle class="dot" cx="${f(x(p))}" cy="${f(y(v))}" r="12" /><text class="val" x="${f(x(p) + (i === s.points.length - 1 ? -20 : 0))}" y="${f(y(v) - 26)}" text-anchor="${i === s.points.length - 1 ? "end" : "middle"}">${pct(v)}</text>`)
    .join("");
  return {
    html: `${svg(`${grid}${xs}<text class="unit" x="${P.x0 - 100}" y="${P.y0 - 40}">${esc(s.unit)}</text><path class="line" d="${d}" />${dots}`)}
        <div class="note" style="top:${P.y1 + 80}px">Forward passes: test runs on practice problems, not training</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .line").forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, ${f(from + 0.4)});
      });`,
  };
}

// The control: Gemma barely moves; the authors' own conclusion.
function controlScene(s, id) {
  const width = 640;
  return {
    html: `<div class="hlabel" style="top:${TOP + 10}px">Gemma 3 270M · MATH-500</div>
        <div class="hbar base" style="top:${TOP + 54}px;width:${f((s.base / s.max) * width)}px"></div>
        <div class="hval mono" style="left:${f(70 + (s.base / s.max) * width + 14)}px;top:${TOP + 50}px">${pct(s.base)}% base</div>
        <div class="hbar edit dim" style="top:${TOP + 102}px;width:${f((s.edited / s.max) * width)}px"></div>
        <div class="hval mono" style="left:${f(70 + (s.edited / s.max) * width + 14)}px;top:${TOP + 98}px">${pct(s.edited)}% edited</div>
        <div class="quote" style="top:${TOP + 200}px">${esc(s.quote)}<small>— the authors</small></div>`,
    js: (from) => `
      tl.from("#${id} .quote", { y: 30, opacity: 0, duration: 0.4, ease: "power3.out" }, ${f(from + 2.2)});`,
  };
}


// ---------- scenes for the full version ----------

// Exp 1: the four game clips (video layers, see `media`) with Astra's answers.
function gamesScene(s, id) {
  const tile = (i) => ({ x: 70 + (i % 2) * 485, y: TOP + 10 + Math.floor(i / 2) * 320 });
  const tiles = s.games
    .map(([, name, answer], i) => {
      const { x, y } = tile(i);
      return `<div class="game-tile" style="left:${x}px;top:${y}px"><b>${esc(name)}</b><span>${esc(answer)}</span></div>`;
    })
    .join("");
  return {
    html: `${tiles}<div class="note" style="top:${TOP + 650}px">${esc(s.note)}</div>`,
    media: (from, to, clipFn) =>
      s.games
        .map(([file], i) => {
          const { x, y } = tile(i);
          return `      <video id="${id}-clip-${i}" class="game-clip clip" src="assets/${file}" muted playsinline style="left:${x + 117}px;top:${y + 12}px" ${clipFn(from, to, 60 + i)}></video>`;
        })
        .join("\n"),
    js: (from) => `
      tl.from("#${id} .game-tile", { opacity: 0, y: 20, duration: 0.3, stagger: 0.25, ease: "power1.out" }, ${f(from + 0.2)});`,
  };
}

// Exp 2: what the models generate (filled) and what Astra described (outlines).
function shapesScene(s, id) {
  const shape = (kind, cx, cy, cls) => {
    if (kind === "circle") return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="90" />`;
    if (kind === "square") return `<rect class="${cls}" x="${cx - 85}" y="${cy - 85}" width="170" height="170" />`;
    return `<polygon class="${cls}" points="${cx},${cy - 95} ${cx + 100},${cy + 80} ${cx - 100},${cy + 80}" />`;
  };
  const kinds = ["circle", "square", "triangle"];
  const top = kinds.map((k, i) => shape(k, 230 + i * 310, TOP + 140, "shape-fill")).join("");
  const bottom = kinds.map((k, i) => shape(k, 230 + i * 310, TOP + 440, "shape-line")).join("");
  return {
    html: `${svg(top + bottom)}
        <div class="row-label" style="top:${TOP + 10}px">The models generate</div>
        <div class="row-label green" style="top:${TOP + 300}px">Astra, from the weights alone</div>
        <div class="note" style="top:${TOP + 560}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .shape-line", { opacity: 0, duration: 0.3, stagger: 0.3 }, ${f(from + 1.4)});`,
  };
}

// Exp 3: 4 layers x 6 heads per model; copying heads Astra named, all matching.
function headsScene(s, id) {
  let body = "";
  s.models.forEach(([name, heads], m) => {
    const x0 = 90 + m * 315;
    body += `<text class="grid-title" x="${x0 + 132}" y="${TOP + 40}" text-anchor="middle">${esc(name)}</text>`;
    for (let l = 0; l < 4; l++)
      for (let h = 0; h < 6; h++) {
        const on = heads.includes(`${l}.${h}`);
        body += `<rect class="${on ? "head-on" : "head"}" x="${x0 + h * 44}" y="${TOP + 70 + l * 44}" width="38" height="38" />`;
      }
    body += `<text class="mono-tag small" x="${x0 + 132}" y="${TOP + 290}" text-anchor="middle">${heads.join(" · ")}</text>`;
  });
  return {
    html: `${svg(body)}
        <div class="match" style="top:${TOP + 340}px">✓ Language named correctly · ✓ every copying head found</div>
        <div class="note" style="top:${TOP + 420}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .head-on", { opacity: 0, scale: 0.4, transformOrigin: "center", duration: 0.3, stagger: 0.15 }, ${f(from + 1.0)});`,
  };
}

// Exp 7: failure from weights alone, success with attention patterns.
function sycoScene(s, id) {
  const rows = s.rows
    .map(([what, mark, text], i) => `<div class="status ${mark === "✓" ? "ok" : "no"}" style="top:${TOP + 10 + i * 100}px"><i>${mark}</i><b>${esc(what)}</b><span>${esc(text)}</span></div>`)
    .join("");
  const bars = s.head
    .map(([name, question, answer], i) => {
      const y = TOP + 260 + i * 150;
      return `<div class="hlabel" style="top:${y}px">${esc(name)}</div>
        <div class="hbar base" style="top:${y + 44}px;width:${f(question * 6)}px"></div>
        <div class="hval mono" style="left:${f(70 + question * 6 + 12)}px;top:${y + 40}px">${pct(question)}% question</div>
        <div class="hbar ${i ? "warn" : "edit"}" style="top:${y + 90}px;width:${f(Math.max(answer * 6, 4))}px"></div>
        <div class="hval mono" style="left:${f(70 + Math.max(answer * 6, 4) + 12)}px;top:${y + 86}px">${answer}% user's answer</div>`;
    })
    .join("");
  return {
    html: `${rows}${bars}
        <div class="note" style="top:${TOP + 560}px">Where attention head 10.2 looks from the answer position (Figure 2)</div>`,
    js: (from) => `
      tl.from("#${id} .status.ok", { opacity: 0, x: 40, duration: 0.35, ease: "power3.out" }, ${f(from + 3.2)});`,
  };
}

// Exp 4: the car scene and before/after success.
function carScene(s, id) {
  return {
    html: `<div class="scene-img" style="top:${TOP + 10}px;background-image:url('assets/${s.image}')"></div>
        <div class="hlabel" style="top:${TOP + 300}px">Trained PPO network</div>
        <div class="meter" style="top:${TOP + 344}px"><b>0 of 256 episodes</b></div>
        <div class="hlabel" style="top:${TOP + 420}px">After Astra's edit (3.5% of 171,664 weights)</div>
        <div class="meter good" style="top:${TOP + 464}px"><i style="width:100%"></i><b>1,024 of 1,024 episodes</b></div>
        <div class="note" style="top:${TOP + 540}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .meter.good i", { scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power2.out" }, ${f(from + 2.6)});`,
  };
}

// Exp 5: three games, PPO 100M / PPO 500M / Astra, bars scaled within each game.
function games3Scene(s, id) {
  const width = 470;
  const rows = s.rows
    .map(([game, ...vals], r) => {
      const y = TOP + 10 + r * 200;
      const max = Math.max(...vals);
      const bars = vals
        .map((v, k) => `<div class="hbar ${k === 2 ? "edit" : "base"}" style="top:${y + 40 + k * 46}px;width:${f(Math.max((v / max) * width, 4))}px"></div>
        <div class="hval mono ${k === 2 ? "strong" : ""}" style="left:${f(70 + Math.max((v / max) * width, 4) + 12)}px;top:${y + 36 + k * 46}px">${pct(v)} · ${esc(s.cols[k])}</div>`)
        .join("");
      return `<div class="hlabel" style="top:${y}px">${esc(game)}</div>${bars}`;
    })
    .join("");
  return {
    html: `${rows}<div class="note" style="top:${TOP + 610}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .hbar.edit", { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.5, ease: "power3.out" }, ${f(from + 0.8)});`,
  };
}

// Exp 6: an illustrative 9x9 board and the reported win rates.
function goScene(s, id) {
  const size = 300;
  const x0 = 70;
  const y0 = TOP + 10;
  const step = size / 8;
  let board = `<rect class="go-board" x="${x0 - 20}" y="${y0 - 20}" width="${size + 40}" height="${size + 40}" />`;
  for (let i = 0; i < 9; i++) {
    board += `<line class="go-line" x1="${x0}" y1="${y0 + i * step}" x2="${x0 + size}" y2="${y0 + i * step}" />`;
    board += `<line class="go-line" x1="${x0 + i * step}" y1="${y0}" x2="${x0 + i * step}" y2="${y0 + size}" />`;
  }
  const stones = [[2, 2, 0], [6, 6, 1], [2, 6, 0], [6, 2, 1], [4, 4, 0], [3, 4, 1], [4, 3, 1], [5, 4, 0], [4, 5, 0], [3, 3, 0]];
  board += stones.map(([c, r, w]) => `<circle class="${w ? "go-white" : "go-black"}" cx="${x0 + c * step}" cy="${y0 + r * step}" r="15" />`).join("");
  const bars = s.bars
    .map(([label, a, b], i) => {
      const y = TOP + 10 + i * 160;
      return `<div class="hlabel" style="left:440px;top:${y}px">${esc(label)}</div>
        <div class="hbar ${i ? "edit" : "base"}" style="left:440px;top:${y + 44}px;width:${f(a * 5)}px"></div>
        <div class="hval mono" style="left:${f(440 + a * 5 + 10)}px;top:${y + 40}px">${pct(a)}</div>
        <div class="hbar ${i ? "edit" : "base"}" style="left:440px;top:${y + 90}px;width:${f(b * 5)}px"></div>
        <div class="hval mono" style="left:${f(440 + b * 5 + 10)}px;top:${y + 86}px">${pct(b)}</div>`;
    })
    .join("");
  return {
    html: `${svg(board)}${bars}
        <div class="fact-line" style="top:${TOP + 380}px">50 test runs: beats the equal-sized PPO network trained on 20 million games</div>
        <div class="note" style="top:${TOP + 480}px">${esc(s.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .hbar.edit", { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.3, ease: "power3.out" }, ${f(from + 1.6)});`,
  };
}

// Closing summary: what worked, what partly worked, what did not.
function caveatsScene(s, id) {
  const rows = s.items
    .map(([mark, text], i) => `<div class="cav ${mark === "✓" ? "ok" : mark === "✗" ? "no" : mark === "~" ? "part" : "link"}" style="top:${TOP + 10 + i * 112}px"><i>${mark}</i>${esc(text)}</div>`)
    .join("");
  return {
    html: rows,
    js: (from) => `
      tl.from("#${id} .cav", { opacity: 0, x: -30, duration: 0.3, stagger: 0.4, ease: "power3.out" }, ${f(from + 0.3)});`,
  };
}

const SCENES = {
  layers: layersScene,
  loop: loopScene,
  diff: diffScene,
  bars: barsScene,
  passes: passesScene,
  control: controlScene,
  games: gamesScene,
  shapes: shapesScene,
  heads: headsScene,
  syco: sycoScene,
  car: carScene,
  games3: games3Scene,
  go: goScene,
  caveats: caveatsScene,
};

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "weights.css"), join(out, "weights.css"));
cpSync(join(HERE, "assets"), join(out, "assets"), { recursive: true });

const segments = [
  { kind: "hook", text: script.hook },
  ...script.beats.map((b) => ({ kind: "beat", text: b.say, beat: b })),
  { kind: "outro", text: script.outro },
];
const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, accent: script.accent, cacheDir: join(BUILD, ".tts") });
writeSoundtrack(segments, total, out, { music: script.music, seed: 1102 });

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
// Video layers (the game clips) sit outside the scene divs so HyperFrames can seek them.
const mediaHtml = parts
  .filter((p) => p.media)
  .map((p) => p.media(p.sc.from, p.sc.to, clip))
  .join("\n");
const chapters = scenes
  .slice(1)
  .filter((sc) => sc.beat.chapter)
  .map((sc, i) => `      <div id="chapter-${i + 1}" class="chapter clip" ${clip(sc.from, sc.to, 9)}>${esc(sc.beat.chapter)}</div>`)
  .join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");

const cards = scenes
  .slice(1)
  .map((sc, i) => {
    const big = display(sc.beat.big);
    const size = big.length <= 7 ? 150 : big.length <= 13 ? 112 : 92;
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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="weights.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
${mediaHtml}
${chapters}
      <div id="tag" class="clip" ${clip(0, endStart, 4)}>${esc(script.tag)}</div>
      <div id="source" class="clip" ${clip(0, endStart, 5)}>${esc(script.source)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <h1 id="hook" class="clip" ${clip(0, scenes[0].to, 8)}>${esc(display(script.hook))}</h1>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">${esc(e.title)}</div>
        <p id="end-source">${esc(e.byline)}</p>
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
