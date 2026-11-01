// Builds one HyperFrames composition per episode of script.json into build/<slug>/:
// a narrated Short (Kokoro voice, music bed, word captions) with redrawn
// neo-brutalist diagrams. Render each folder with `hyperframes render`.
//
//   node build.mjs                 all episodes
//   node build.mjs --episode 1     one episode (number or slug)
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
// Diagram area: below the header, above the bottom-anchored card.
const AREA = { x0: 70, x1: 1010, y0: 400, y1: 1010 };
const HEAD_COLORS = { 5: "#3d7bff", 6: "#ff5a36" };

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const only = argValue("--episode");

const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;

// ---------- layout helpers ----------

// Word chips in centred rows. Widths are set explicitly so arcs drawn at build
// time land on the chips exactly.
function layoutChips(words, { font = 50, y0, maxWidth = AREA.x1 - AREA.x0, gapX = 18, gapY = 30 }) {
  const h = Math.round(font * 1.7);
  const width = (w) => Math.round(w.length * font * 0.6 + font * 0.9);
  const rows = [[]];
  let used = 0;
  for (const word of words) {
    const w = width(word);
    if (rows.at(-1).length && used + gapX + w > maxWidth) {
      rows.push([]);
      used = 0;
    }
    used += (rows.at(-1).length ? gapX : 0) + w;
    rows.at(-1).push({ word, w });
  }
  const chips = [];
  rows.forEach((row, r) => {
    const rowWidth = row.reduce((n, c) => n + c.w, 0) + gapX * (row.length - 1);
    let x = AREA.x0 + (maxWidth - rowWidth) / 2;
    for (const c of row) {
      chips.push({ ...c, x, y: y0 + r * (h + gapY), h, font });
      x += c.w + gapX;
    }
  });
  return chips;
}

const chipHtml = (c, id, cls = "") =>
  `<div id="${id}" class="chip ${cls}" style="left:${f(c.x)}px;top:${f(c.y)}px;width:${c.w}px;height:${c.h}px;font-size:${c.font}px">${esc(c.word)}</div>`;

const svg = (body) => `<svg class="overlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg>`;

// ---------- scenes ----------
// Each returns { html, js(from, to) } where js adds tweens to the timeline `tl`.

function paperScene(ep, id) {
  const p = ep.paper;
  return {
    html: `<div id="${id}-sheet" class="sheet">
          <div class="sheet-kicker">${esc(p.venue)}</div>
          <div class="sheet-title">${esc(p.title)}</div>
          <div class="sheet-authors">${esc(p.authors)}</div>
          <div class="sheet-lines"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div id="${id}-stamp" class="stamp">${p.year}</div>`,
    js: () => `
      tl.fromTo("#${id}-sheet", { rotation: -3 }, { rotation: -1.5, duration: 4, ease: "none" }, 0);
      tl.fromTo("#${id}-stamp", { scale: 1, rotation: 12 }, { scale: 1.06, rotation: 9, duration: 4, ease: "none" }, 0);`,
  };
}

function sequenceScene(scene, id) {
  const chips = layoutChips(scene.words, { y0: 700, font: 42, gapX: 16 });
  const arrows = chips.slice(1).map((c, i) => {
    const a = chips[i];
    if (Math.abs(a.y - c.y) > 1) return "";
    const y = a.y + a.h / 2;
    return `<path class="arrow" d="M${f(a.x + a.w + 3)} ${f(y)} L${f(c.x - 5)} ${f(y)}" />`;
  });
  const counters = chips
    .map((_, i) => `<div id="${id}-count-${i}" class="counter">Step ${i + 1} of ${chips.length}</div>`)
    .join("");
  return {
    html: `${chips.map((c, i) => chipHtml(c, `${id}-chip-${i}`)).join("")}
        ${svg(arrows.join(""))}
        <div id="${id}-reader" class="reader"></div>
        ${counters}`,
    js: (from, to) => {
      const step = Math.min(0.9, (to - from - 1.2) / chips.length);
      return chips
        .map((c, i) => {
          const t = f(from + 0.5 + i * step);
          return `
      tl.set("#${id}-reader", { x: ${f(c.x - 10)}, y: ${f(c.y - 10)}, width: ${c.w + 20}, height: ${c.h + 20}, opacity: 1 }, ${t});
      tl.set("#${id}-chip-${i}", { attr: { "data-on": "1" } }, ${t});
      tl.set("#${id}-count-${i}", { opacity: 1 }, ${t});
      ${i > 0 ? `tl.set("#${id}-count-${i - 1}", { opacity: 0 }, ${t});` : ""}`;
        })
        .join("");
    },
  };
}

function parallelScene(scene, id) {
  const chips = layoutChips(scene.words, { y0: 800, font: 42, gapX: 16 });
  const top = (c) => [c.x + c.w / 2, c.y];
  const links = [];
  chips.forEach((a, i) =>
    chips.forEach((b, j) => {
      if (j <= i) return;
      const [x1, y1] = top(a);
      const [x2, y2] = top(b);
      const lift = Math.min(230, 50 + Math.abs(x2 - x1) * 0.3);
      links.push(`<path class="link" d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2)} ${f(Math.min(y1, y2) - lift)} ${f(x2)} ${f(y2)}" />`);
    }),
  );
  return {
    html: `${svg(links.join(""))}
        ${chips.map((c, i) => chipHtml(c, `${id}-chip-${i}`)).join("")}
        <div id="${id}-badge" class="counter badge">1 step for all words</div>`,
    js: (from) => `
      tl.set("#${id} .chip", { attr: { "data-on": "2" } }, ${f(from + 0.6)});
      document.querySelectorAll("#${id} .link").forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" }, ${f(from + 0.6)});
      });
      tl.from("#${id}-badge", { scale: 0, duration: 0.35, ease: "back.out(2)" }, ${f(from + 0.8)});`,
  };
}

// Redrawn like the paper's Figure 4: the sentence twice, side by side, with
// lines from the source word on the left to the words it attends to on the right.
function attentionScene(scene, id) {
  const rowH = 32;
  const top = AREA.y0 + 110;
  const leftX = 330; // right edge of the left column
  const rightX = 750; // left edge of the right column
  const rows = scene.words.map((word, i) => ({ word, y: top + i * rowH }));
  const srcRow = rows.find((r) => r.word === scene.from);
  const lines = scene.links.map((link, k) => {
    const dst = rows.find((r) => r.word === link.to);
    const dy = link.head === 5 ? -5 : 5;
    return `<path id="${id}-line-${k}" class="arc" stroke="${HEAD_COLORS[link.head]}" stroke-width="${f(4 + 8 * link.weight)}" d="M${leftX + 18} ${f(srcRow.y + rowH / 2 + dy)} L${rightX - 18} ${f(dst.y + rowH / 2 + dy)}" />`;
  });
  const targets = new Set(scene.links.map((l) => l.to));
  const col = (side) =>
    rows
      .map((r, i) => {
        const cls = side === "left" ? (r.word === scene.from ? "source" : "") : targets.has(r.word) ? "target" : "";
        const pos = side === "left" ? `right:${W - leftX}px` : `left:${rightX}px`;
        return `<div id="${id}-${side}-${i}" class="fig-word ${side} ${cls}" style="${pos};top:${r.y}px;height:${rowH}px">${esc(r.word)}</div>`;
      })
      .join("");
  const legend = [5, 6]
    .map((h, i) => `<span class="legend-item"><i style="background:${HEAD_COLORS[h]}"></i>Head ${"AB"[i]}</span>`)
    .join("");
  return {
    html: `<div class="fig-frame" style="top:${top - 30}px;height:${rows.length * rowH + 60}px"></div>
        ${col("left")}${col("right")}
        ${svg(lines.join(""))}
        <div class="legend" style="top:${AREA.y0}px">${legend}</div>
        <div class="note right" style="top:${AREA.y0 + 12}px">${esc(scene.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .fig-word.source", { scale: 0.5, duration: 0.4, ease: "back.out(2.5)" }, ${f(from + 0.4)});
      document.querySelectorAll("#${id} .arc").forEach((p, k) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, ${f(from + 0.9)} + k * 0.4);
      });
      tl.from("#${id} .fig-word.target", { backgroundColor: "rgba(255,207,63,0)", duration: 0.3 }, ${f(from + 2.1)});`,
  };
}

function qkvScene(scene, id) {
  const rowH = 74;
  const top = AREA.y0 + 200;
  const keyW = Math.max(...scene.keys.map(([w]) => Math.round(w.length * 38 * 0.6 + 34)));
  const keyX = 290;
  const barX = keyX + keyW + 40;
  const barW = AREA.x1 - barX - 110;
  const q = { word: scene.query, x: AREA.x0, y: top + (rowH * scene.keys.length) / 2 - 50, w: 160, h: 84, font: 46 };
  const rows = scene.keys.map(([word, weight], i) => ({ word, weight, y: top + i * rowH }));
  const lines = rows
    .map((r, i) => `<path id="${id}-cmp-${i}" class="compare" d="M${q.x + q.w} ${f(q.y + q.h / 2)} L${keyX - 6} ${f(r.y + 35)}" />`)
    .join("");
  const keys = rows
    .map((r, i) => {
      const chip = { word: r.word, x: keyX, y: r.y, w: keyW, h: 62, font: 36 };
      return `${chipHtml(chip, `${id}-key-${i}`, "key")}
        <div class="bar-track" style="left:${barX}px;top:${r.y + 9}px;width:${barW}px"></div>
        <div id="${id}-bar-${i}" class="bar-fill" style="left:${barX}px;top:${r.y + 9}px;width:${f(barW * r.weight)}px"></div>
        <div id="${id}-pct-${i}" class="bar-value" style="left:${f(barX + barW * r.weight + 12)}px;top:${r.y + 9}px">${Math.round(r.weight * 100)}%</div>`;
    })
    .join("");
  return {
    html: `<div id="${id}-formula" class="formula" style="top:${AREA.y0}px">softmax(<b>Q</b><b>K</b><sup>T</sup> / √d<sub>k</sub>) <b>V</b></div>
        <div class="note" style="top:${AREA.y0 + 116}px">${esc(scene.note)}</div>
        <div class="col-head" style="left:${AREA.x0}px;top:${top - 50}px">Query</div>
        <div class="col-head" style="left:${keyX}px;top:${top - 50}px">Keys</div>
        <div class="col-head" style="left:${barX}px;top:${top - 50}px">Weights</div>
        ${svg(lines)}
        ${chipHtml(q, `${id}-query`, "source")}
        ${keys}`,
    js: (from) => `
      tl.from("#${id}-formula", { y: -30, opacity: 0, duration: 0.4, ease: "power3.out" }, ${f(from + 0.2)});
      document.querySelectorAll("#${id} .compare").forEach((p, k) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, ${f(from + 2.2)} + k * 0.12);
      });
      tl.from("#${id} .bar-fill", { scaleX: 0, transformOrigin: "left center", duration: 0.8, stagger: 0.1, ease: "power3.out" }, ${f(from + 4.6)});
      tl.from("#${id} .bar-value", { opacity: 0, duration: 0.3, stagger: 0.1 }, ${f(from + 5.0)});`,
  };
}

function barsScene(scene, id) {
  const [lo, hi] = scene.axis;
  const x0 = AREA.x0 + 10;
  const width = AREA.x1 - AREA.x0 - 20;
  const scale = (v) => ((v - lo) / (hi - lo)) * width;
  const rowH = 118;
  const top = AREA.y0 + 40;
  const bars = scene.bars
    .map(([name, value, ours], i) => {
      const y = top + i * rowH;
      return `<div class="bar-name" style="left:${x0}px;top:${y}px">${esc(name)}</div>
        <div id="${id}-bar-${i}" class="hbar ${ours ? "ours" : ""}" style="left:${x0}px;top:${y + 44}px;width:${f(scale(value))}px"></div>
        <div id="${id}-val-${i}" class="hbar-value" style="left:${f(x0 + scale(value) + 14)}px;top:${y + 46}px">${value}</div>`;
    })
    .join("");
  const axisY = top + scene.bars.length * rowH + 4;
  const ticks = [lo, (lo + hi) / 2, hi]
    .map((v) => `<div class="tick" style="left:${f(x0 + scale(v) - 30)}px;top:${axisY + 12}px">${v}</div>`)
    .join("");
  return {
    html: `${bars}
        <div class="axis" style="left:${x0}px;top:${axisY}px;width:${width}px"></div>
        ${ticks}
        <div class="note" style="top:${axisY + 66}px">${esc(scene.note)} · axis starts at ${lo}</div>`,
    js: (from) => `
      tl.from("#${id} .hbar", { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.35, ease: "power3.out" }, ${f(from + 0.4)});
      tl.from("#${id} .hbar-value", { opacity: 0, duration: 0.25, stagger: 0.35 }, ${f(from + 0.9)});`,
  };
}

// Hook: the Transformer's two halves, with the encoder struck out.
function splitScene(ep, id) {
  return {
    html: `<div id="${id}-enc" class="block enc" style="left:110px;top:440px">Encoder<small>×6</small></div>
        <div id="${id}-dec" class="block dec" style="left:570px;top:440px">Decoder<small>×12</small></div>
        <div id="${id}-cross" class="cross" style="left:110px;top:440px"></div>
        <div class="note" style="top:910px">Ep 1: encoder + decoder · this paper: decoder only</div>`,
    js: () => `
      tl.fromTo("#${id}-dec", { rotation: 0 }, { rotation: -2, duration: 4, ease: "none" }, 0);`,
  };
}

// Causal mask: row = the word that looks, column = the words it can see.
function maskScene(scene, id) {
  const n = scene.words.length;
  const cell = 76;
  const x0 = 1010 - n * cell;
  const y0 = AREA.y0 + 90;
  let html = "";
  scene.words.forEach((w, i) => {
    html += `<div class="grid-label row" style="right:${W - x0 + 14}px;top:${y0 + i * cell}px;height:${cell}px">${esc(w)}</div>`;
    html += `<div class="grid-label col" style="left:${x0 + i * cell}px;top:${y0 - 54}px;width:${cell}px">${esc(w)}</div>`;
    for (let j = 0; j < n; j++) {
      const open = j <= i;
      html += `<div id="${id}-c${i}-${j}" class="cell ${open ? "open" : "shut"}" style="left:${x0 + j * cell}px;top:${y0 + i * cell}px;width:${cell}px;height:${cell}px">${open ? "" : "×"}</div>`;
    }
  });
  return {
    html: `${html}
        <div class="note" style="top:${y0 + n * cell + 20}px">Each row: the words that one word can see</div>`,
    js: (from) =>
      scene.words
        .map((_, i) => `
      tl.from("#${id} [id^='${id}-c${i}-'].open", { opacity: 0, scale: 0.5, duration: 0.25, stagger: 0.05, ease: "back.out(2)" }, ${f(from + 0.5 + i * 0.55)});`)
        .join(""),
  };
}

// Next-word prediction: the context, a blank, and candidate words with bars.
function predictScene(scene, id) {
  const chips = layoutChips([...scene.words, "?"], { y0: AREA.y0 + 120, font: 42, gapX: 16 });
  const blank = chips.at(-1);
  const top = AREA.y0 + 290;
  const rows = scene.options
    .map(([word, p], i) => {
      const y = top + i * 104;
      const chip = { word, x: AREA.x0, y, w: 230, h: 76, font: 40 };
      return `${chipHtml(chip, `${id}-opt-${i}`, i === 0 ? "pick" : "")}
        <div class="bar-track" style="left:330px;top:${y + 14}px;width:520px"></div>
        <div id="${id}-bar-${i}" class="bar-fill" style="left:330px;top:${y + 14}px;width:${f(520 * p)}px"></div>
        <div class="bar-value" style="left:${f(330 + 520 * p + 12)}px;top:${y + 14}px">${Math.round(p * 100)}%</div>`;
    })
    .join("");
  return {
    html: `${chips.map((c, i) => chipHtml(c, `${id}-chip-${i}`, i === chips.length - 1 ? "blank" : "")).join("")}
        ${rows}
        <div id="${id}-answer" class="chip answer" style="left:${f(blank.x)}px;top:${f(blank.y)}px;width:${blank.w + 120}px;height:${blank.h}px;font-size:${blank.font}px">${esc(scene.options[0][0])}</div>
        <div class="note" style="top:${top + scene.options.length * 104 + 10}px">${esc(scene.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .bar-fill", { scaleX: 0, transformOrigin: "left center", duration: 0.7, stagger: 0.15, ease: "power3.out" }, ${f(from + 1.2)});
      tl.fromTo("#${id}-answer", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(2)" }, ${f(from + 3.2)});
      tl.set("#${id}-chip-${chips.length - 1}", { opacity: 0 }, ${f(from + 3.2)});`,
  };
}

// A shelf of book spines for the pre-training corpus.
function booksScene(scene, id) {
  const colors = ["#ffcf3f", "#ff5a36", "#3d7bff", "#ffffff", "#ff8fc7", "#29c48a"];
  let x = 90;
  let k = 0;
  const spines = [];
  while (x < 990) {
    const w = 44 + ((k * 37) % 40);
    const h = 260 + ((k * 53) % 120);
    spines.push(`<div class="spine" style="left:${x}px;top:${AREA.y0 + 520 - h}px;width:${w}px;height:${h}px;background:${colors[k % colors.length]}"></div>`);
    x += w + 8;
    k++;
  }
  const genres = scene.genres
    .map((g, i) => `<div class="genre" style="left:${110 + i * 300}px;top:${AREA.y0 + 40}px">${esc(g)}</div>`)
    .join("");
  return {
    html: `${genres}
        ${spines.join("")}
        <div class="shelf" style="top:${AREA.y0 + 520}px"></div>
        <div class="note" style="top:${AREA.y0 + 560}px">${esc(scene.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .spine", { y: -120, opacity: 0, duration: 0.35, stagger: 0.04, ease: "bounce.out" }, ${f(from + 0.3)});
      tl.from("#${id} .genre", { scale: 0, duration: 0.3, stagger: 0.15, ease: "back.out(2)" }, ${f(from + 1.4)});`,
  };
}

// Two training stages, then one task input as a token sequence (Figure 1).
function transformScene(scene, id) {
  const stages = scene.stages
    .map((s, i) => `<div id="${id}-stage-${i}" class="stage ${i ? "two" : ""}" style="left:${70 + i * 490}px;top:${AREA.y0}px">${esc(s)}</div>`)
    .join(`<div class="stage-arrow" style="left:503px;top:${AREA.y0 + 30}px">→</div>`);
  const chips = layoutChips(scene.tokens.map(([t]) => t), { y0: AREA.y0 + 290, font: 34, gapX: 10 });
  const tokens = chips
    .map((c, i) => chipHtml(c, `${id}-tok-${i}`, scene.tokens[i][1] === "tok" ? "token" : ""))
    .join("");
  return {
    html: `${stages}
        <div class="col-head" style="left:70px;top:${AREA.y0 + 220}px">Task input as one sequence</div>
        ${tokens}
        <div class="down-arrow" style="top:${AREA.y0 + 390}px">↓</div>
        <div id="${id}-out" class="stage out" style="top:${AREA.y0 + 470}px">${esc(scene.output)}</div>
        <div class="note" style="top:${AREA.y0 + 570}px">${esc(scene.note)}</div>`,
    js: (from) => `
      tl.from("#${id}-stage-1", { x: 60, opacity: 0, duration: 0.4, ease: "back.out(1.8)" }, ${f(from + 0.6)});
      tl.from("#${id} .chip", { y: 40, opacity: 0, duration: 0.3, stagger: 0.18, ease: "back.out(2)" }, ${f(from + 2.6)});
      tl.from("#${id}-out", { y: -30, opacity: 0, duration: 0.35, ease: "power3.out" }, ${f(from + 3.8)});`,
  };
}

// Paired bars per task: previous best (white) and this paper (yellow).
function pairsScene(scene, id) {
  const [lo, hi] = scene.axis;
  const x0 = AREA.x0 + 10;
  const width = AREA.x1 - AREA.x0 - 130;
  const scale = (v) => ((v - lo) / (hi - lo)) * width;
  const rowH = 138;
  const top = AREA.y0 + 10;
  const rows = scene.pairs
    .map(([name, before, after], i) => {
      const y = top + i * rowH;
      return `<div class="bar-name" style="left:${x0}px;top:${y}px">${esc(name)}</div>
        <div class="pbar" style="left:${x0}px;top:${y + 42}px;width:${f(scale(before))}px"></div>
        <div class="pbar-value" style="left:${f(x0 + scale(before) + 12)}px;top:${y + 40}px">${before}</div>
        <div class="pbar ours" style="left:${x0}px;top:${y + 84}px;width:${f(scale(after))}px"></div>
        <div class="pbar-value strong" style="left:${f(x0 + scale(after) + 12)}px;top:${y + 80}px">${after}</div>`;
    })
    .join("");
  return {
    html: `${rows}
        <div class="note" style="top:${top + scene.pairs.length * rowH + 4}px">${esc(scene.note)}</div>`,
    js: (from) => `
      tl.from("#${id} .pbar", { scaleX: 0, transformOrigin: "left center", duration: 0.5, stagger: 0.18, ease: "power3.out" }, ${f(from + 0.4)});
      tl.from("#${id} .pbar-value", { opacity: 0, duration: 0.2, stagger: 0.18 }, ${f(from + 0.7)});`,
  };
}

const SCENES = {
  sequence: sequenceScene,
  parallel: parallelScene,
  attention: attentionScene,
  qkv: qkvScene,
  bars: barsScene,
  mask: maskScene,
  predict: predictScene,
  books: booksScene,
  transform: transformScene,
  pairs: pairsScene,
};
const HOOK_SCENES = { paper: paperScene, split: splitScene };

// ---------- composition ----------

function buildEpisode(ep) {
  const out = join(BUILD, ep.slug);
  mkdirSync(out, { recursive: true });
  cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
  cpSync(join(HERE, "papers.css"), join(out, "papers.css"));

  const segments = [
    { kind: "hook", text: ep.hook },
    ...ep.beats.map((b) => ({ kind: "beat", text: b.say, beat: b })),
    { kind: "outro", text: ep.outro },
  ];
  const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, cacheDir: join(BUILD, ".tts") });
  writeSoundtrack(segments, total, out, { music: script.music, seed: 100 + ep.episode });

  const scenes = segments.slice(0, -1).map((seg, i) => ({
    ...seg,
    from: i === 0 ? 0 : seg.start - 0.2,
    to: i === segments.length - 2 ? endStart : segments[i + 1].start - 0.2,
  }));

  const parts = scenes.map((sc, i) => {
    const id = `scene-${i}`;
    const s = i === 0 ? HOOK_SCENES[ep.hookScene?.type ?? "paper"](ep, id) : SCENES[sc.beat.scene.type](sc.beat.scene, id);
    return { id, sc, ...s };
  });
  const sceneHtml = parts
    .map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>
        ${p.html}
      </div>`)
    .join("\n");
  const sceneJs = parts.map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { y: 50, opacity: 0, duration: 0.3, ease: "power3.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from, p.sc.to)).join("");

  const cards = scenes
    .slice(1)
    .map((sc, i) => {
      const n = i + 1;
      const big = display(sc.beat.big);
      const size = big.length <= 6 ? 190 : big.length <= 10 ? 150 : big.length <= 16 ? 112 : 96;
      return `      <div id="card-${n}" class="card clip" ${clip(sc.from, sc.to, 10)}>
        <div id="card-${n}-label" class="card-label">${esc(display(sc.beat.label))}</div>
        <div id="card-${n}-big" class="card-big" style="font-size:${size}px">${esc(big)}</div>
      </div>`;
    })
    .join("\n");

  const captions = captionClips(segments, clip);
  const p = ep.paper;
  const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="papers.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="paper-bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="series" class="clip" ${clip(0, endStart, 4)}>${esc(script.series)}</div>
      <div id="episode-label" class="clip" ${clip(0, endStart, 5)}>Ep ${ep.episode} · ${esc(p.short ?? p.title)} (${p.year})</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <h1 id="hook" class="clip" ${clip(0, scenes[0].to, 8)}>${esc(display(ep.hook))}</h1>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">Full episode on the channel</div>
        <p id="end-credit">Source: ${esc(p.authors)}. “${esc(p.title)}”. ${esc(p.venue)}.</p>
        <p id="end-license">All diagrams redrawn for this video. Script in ASD-STE100 Simplified Technical English.</p>
      </div>
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const endStart = ${f(endStart)};
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
      // Hook is on screen from frame 0: that frame is the Shorts thumbnail.
      tl.fromTo("#hook", { rotation: -1 }, { rotation: 0, duration: ${f(scenes[0].to)}, ease: "none" }, 0);
${sceneJs}
${scenes
  .slice(1)
  .map((sc, i) => `      tl.from("#card-${i + 1}", { x: -80, opacity: 0, duration: 0.35, ease: "back.out(1.6)" }, ${f(sc.from)});`)
  .join("\n")}
${CAPTION_TIMELINE}
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.5, stagger: 0.2, ease: "back.out(1.6)" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  writeFileSync(join(out, "index.html"), html);
  console.log(`${ep.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups`);
}

const episodes = script.episodes.filter((e) => !only || String(e.episode) === only || e.slug === only);
if (!episodes.length) throw new Error(`No episode matches ${only}`);
for (const ep of episodes) buildEpisode(ep);
