// Builds the AI Workbench Workshop pitch Short from script.json into
// build/<slug>/: a US English voiceover, word captions, and animated diagrams
// of the harness (stack, MCP hub, skills, code graph, research pipeline) in a
// dark "workbench" look. Render with `hyperframes render` in the build folder.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
const TOP = 410; // first pixel of the scene area, below the beat card

const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const f = (x) => Number(x.toFixed(3));
const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;
const svg = (body) => `<svg class="overlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${body}</svg>`;

// ---------- scenes: each returns { html, js(from) } ----------

// Hook: an illustrative terminal session starting the harness.
function hookScene(id) {
  const lines = [
    ["cmd", "$ opencode"],
    ["out", "model    open weights, running locally"],
    ["out", "skills   review · test · docs · research"],
    ["out", "mcp      files ✓  git ✓  database ✓"],
    ["out", "project  ~/projects/capstone"],
    ["ok", "ready. what shall we build?"],
  ];
  return {
    html: `<div class="term" style="top:${TOP + 40}px">
          <div class="term-bar"><i></i><i></i><i></i><span>workbench</span></div>
          ${lines.map(([k, t]) => `<div class="tl ${k}">${esc(t)}</div>`).join("")}
          <div class="tl cursor">▍</div>
        </div>
        <div class="note" style="top:${TOP + 700}px">Illustrative session</div>`,
    js: (from) => `
      tl.from("#${id} .tl", { opacity: 0, x: -16, duration: 0.2, stagger: 0.45, ease: "power1.out" }, ${f(from + 0.4)});
      tl.to("#${id} .cursor", { opacity: 0, duration: 0.3, repeat: 9, yoyo: true, ease: "steps(1)" }, ${f(from + 3.2)});`,
  };
}

// The shift: what agents do, and where most of them live.
function shiftScene(s, id) {
  const cards = [["{ }", "Read code"], ["▶", "Run tools"], ["¶", "Draft docs"]];
  return {
    html: `${cards.map(([icon, t], i) => `<div class="tile" style="left:${70 + i * 320}px;top:${TOP + 40}px"><b>${esc(icon)}</b><span>${esc(t)}</span></div>`).join("")}
        <div class="lockbar" style="top:${TOP + 400}px"><b>✕</b><span>Most run on closed platforms</span></div>
        <div class="openbar" style="top:${TOP + 560}px"><b>→</b><span>This workshop: an open one you own</span></div>`,
    js: (from) => `
      tl.from("#${id} .tile", { opacity: 0, y: 30, duration: 0.3, stagger: 0.5, ease: "back.out(1.6)" }, ${f(from + 1.0)});
      tl.from("#${id} .lockbar", { opacity: 0, x: -40, duration: 0.35, ease: "power3.out" }, ${f(from + 4.6)});
      tl.from("#${id} .openbar", { opacity: 0, x: 40, duration: 0.35, ease: "power3.out" }, ${f(from + 6.2)});`,
  };
}

// The harness as layers, built bottom up.
function stackScene(s, id) {
  const layers = [
    ["Workspaces · Git · docs", "every project versioned and documented"],
    ["MCP servers", "approved tools and data"],
    ["Plugins and skills", "repeatable tasks"],
    ["OpenCode harness", "the agent you configure"],
    ["Open models", "local or self-hosted"],
  ];
  return {
    html: layers
      .map(([name, sub], i) => `<div class="layer l${i}" style="top:${TOP + 30 + i * 150}px"><b>${esc(name)}</b><span>${esc(sub)}</span></div>`)
      .join("") + `<div class="foss" style="top:${TOP + 800}px">Free and open source, end to end</div>`,
    js: (from) => `
      tl.from(${JSON.stringify(layers.map((_, i) => `#${id} .l${layers.length - 1 - i}`))}, { opacity: 0, y: 40, duration: 0.3, stagger: 0.9, ease: "back.out(1.4)" }, ${f(from + 2.6)});`,
  };
}

// Any language: chips orbiting the workbench.
function langsScene(s, id) {
  const langs = ["Python", "JavaScript", "TypeScript", "Java", "C / C++", "Go", "Rust", "Your language"];
  const cx = 540, cy = TOP + 400, r = 330;
  const chips = langs
    .map((l, i) => {
      const a = (i / langs.length) * Math.PI * 2 - Math.PI / 2;
      return `<div class="chip ${i === langs.length - 1 ? "chip-alt" : ""}" style="left:${f(cx + r * Math.cos(a))}px;top:${f(cy + r * Math.sin(a) * 0.85)}px">${esc(l)}</div>`;
    })
    .join("");
  const spokes = langs
    .map((_, i) => {
      const a = (i / langs.length) * Math.PI * 2 - Math.PI / 2;
      return `<line class="spoke" x1="${cx}" y1="${cy}" x2="${f(cx + (r - 70) * Math.cos(a))}" y2="${f(cy + (r - 70) * Math.sin(a) * 0.85)}" />`;
    })
    .join("");
  return {
    html: `${svg(spokes)}<div class="hub" style="left:${cx}px;top:${cy}px">Workbench</div>${chips}`,
    js: (from) => `
      tl.from("#${id} .chip", { opacity: 0, scale: 0.5, duration: 0.25, stagger: 0.35, ease: "back.out(2)" }, ${f(from + 1.4)});
      tl.from("#${id} .spoke", { opacity: 0, duration: 0.25, stagger: 0.35 }, ${f(from + 1.4)});`,
  };
}

// MCP: the harness in the middle, approved connections around it.
function mcpScene(s, id) {
  const ends = [["Files", 170, TOP + 120], ["Database", 910, TOP + 120], ["APIs", 170, TOP + 680], ["Your scripts", 910, TOP + 680]];
  const cx = 540, cy = TOP + 400;
  return {
    html: `${svg(ends.map(([, x, y]) => `<line class="wire" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`).join(""))}
        <div class="hub big" style="left:${cx}px;top:${cy}px">OpenCode</div>
        ${ends.map(([n, x, y]) => `<div class="node" style="left:${x}px;top:${y}px">${esc(n)}<em>✓ approved</em></div>`).join("")}
        <div class="note" style="top:${TOP + 860}px">Model Context Protocol: an open standard for connecting AI tools</div>`,
    js: (from) => `
      document.querySelectorAll("#${id} .wire").forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, ${f(from + 0.6)} + i * 0.5);
      });
      tl.from("#${id} .node", { opacity: 0, scale: 0.6, duration: 0.3, stagger: 0.5, ease: "back.out(2)" }, ${f(from + 0.9)});
      tl.from("#${id} .node em", { opacity: 0, duration: 0.25, stagger: 0.2 }, ${f(from + 4.8)});`,
  };
}

// Skills: a skills folder and what each skill does.
function skillsScene(s, id) {
  const skills = [["code-gen", "write code to the project's conventions"], ["code-review", "find bugs before you push"], ["testing", "write and run the tests"], ["docs", "keep README and docs in step"], ["research", "search, read and cite papers"]];
  return {
    html: `<div class="term" style="top:${TOP + 30}px">
          <div class="term-bar"><i></i><i></i><i></i><span>.opencode/skills</span></div>
          ${skills.map(([n, d]) => `<div class="tl skill"><b>${esc(n)}/</b><span>${esc(d)}</span></div>`).join("")}
        </div>
        <div class="note" style="top:${TOP + 780}px">Each skill: a short, versioned instruction file you write once and reuse</div>`,
    js: (from) => `
      tl.from("#${id} .skill", { opacity: 0, x: -20, duration: 0.25, stagger: 0.55, ease: "power2.out" }, ${f(from + 0.8)});`,
  };
}

// Code as a graph: modules and their dependencies.
function graphScene(s, id) {
  const nodes = {
    app: [540, TOP + 90], api: [300, TOP + 280], ui: [780, TOP + 280], auth: [160, TOP + 500], db: [420, TOP + 520],
    models: [660, TOP + 520], utils: [900, TOP + 500], tests: [540, TOP + 740],
  };
  const edges = [["app", "api"], ["app", "ui"], ["api", "auth"], ["api", "db"], ["api", "models"], ["ui", "models"], ["ui", "utils"], ["models", "db"], ["tests", "db"], ["tests", "models"], ["auth", "db"]];
  const lines = edges.map(([a, b]) => `<line class="edge" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" />`).join("");
  const dots = Object.entries(nodes)
    .map(([n, [x, y]]) => `<div class="gnode ${n === "db" ? "hot" : ""}" style="left:${x}px;top:${y}px">${n}</div>`)
    .join("");
  return {
    html: `${svg(lines)}${dots}<div class="note" style="top:${TOP + 860}px">Illustration · \"db\" is used by five modules: change it with care</div>`,
    js: (from) => `
      tl.from("#${id} .gnode", { opacity: 0, scale: 0.4, duration: 0.25, stagger: 0.18, ease: "back.out(2)" }, ${f(from + 0.5)});
      document.querySelectorAll("#${id} .edge").forEach((p, i) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + " " + len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.35, ease: "power1.out" }, ${f(from + 1.8)} + i * 0.18);
      });
      tl.to("#${id} .gnode.hot", { scale: 1.18, duration: 0.3, repeat: 3, yoyo: true, ease: "sine.inOut" }, ${f(from + 4.2)});`,
  };
}

// Research in the AI era: a pipeline that ends with a human check.
function researchScene(s, id) {
  const steps = [
    ["Search", "literature via open indexes (arXiv, OpenAlex)"],
    ["Read", "summaries that cite page and figure"],
    ["Reproduce", "rerun the paper's code and data"],
    ["Write", "draft in LaTeX or Markdown, with references"],
    ["Verify", "you check every claim and citation"],
  ];
  return {
    html: steps
      .map(([n, d], i) => `<div class="step ${i === steps.length - 1 ? "human" : ""}" style="top:${TOP + 20 + i * 170}px"><i>${i + 1}</i><b>${esc(n)}</b><span>${esc(d)}</span></div>`)
      .join(""),
    js: (from) => `
      tl.from("#${id} .step", { opacity: 0, x: -40, duration: 0.3, stagger: 1.0, ease: "power3.out" }, ${f(from + 1.4)});`,
  };
}

// What you take home: a checklist.
function outcomesScene(s, id) {
  const items = ["A working, portable AI workbench", "Documented configuration", "Reusable skills", "At least one custom MCP or automation", "Ready for projects, hackathons, internships"];
  return {
    html: items.map((t, i) => `<div class="check" style="top:${TOP + 30 + i * 150}px"><i>✓</i>${esc(t)}</div>`).join(""),
    js: (from) => `
      tl.from("#${id} .check", { opacity: 0, y: 24, duration: 0.3, stagger: 0.75, ease: "back.out(1.6)" }, ${f(from + 0.6)});
      tl.from("#${id} .check i", { scale: 0, duration: 0.25, stagger: 0.75, ease: "back.out(3)" }, ${f(from + 0.8)});`,
  };
}

// Who it's for.
function audienceScene(s, id) {
  const people = [["UG", "Undergraduates", "projects · hackathons · internships"], ["ENG", "Engineers", "real codebases · automation"], ["FAC", "Faculty", "research · papers · teaching labs"]];
  return {
    html: people
      .map(([icon, who, use], i) => `<div class="persona" style="top:${TOP + 30 + i * 250}px"><b>${icon}</b><div><strong>${esc(who)}</strong><span>${esc(use)}</span></div></div>`)
      .join(""),
    js: (from) => `
      tl.from("#${id} .persona", { opacity: 0, x: 60, duration: 0.35, stagger: 0.8, ease: "power3.out" }, ${f(from + 0.4)});`,
  };
}

const SCENES = { shift: shiftScene, stack: stackScene, langs: langsScene, mcp: mcpScene, skills: skillsScene, graph: graphScene, research: researchScene, outcomes: outcomesScene, audience: audienceScene };

// ---------- composition ----------

const out = join(BUILD, script.slug);
mkdirSync(out, { recursive: true });
cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
cpSync(join(HERE, "workbench.css"), join(out, "workbench.css"));

const segments = [
  { kind: "intro", text: script.hookSay, label: script.kicker, big: script.hook },
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
  return { id, sc, ...(i === 0 ? hookScene(id) : SCENES[sc.scene.type](sc.scene, id)) };
});

const sceneHtml = parts.map((p) => `      <div id="${p.id}" class="scene clip" ${clip(p.sc.from, p.sc.to, 2)}>\n        ${p.html}\n      </div>`).join("\n");
const sceneJs = parts
  .map((p, i) => (i > 0 ? `\n      tl.from("#${p.id}", { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f(p.sc.from)});` : "") + p.js(p.sc.from))
  .join("");
const cards = scenes
  .map((sc, i) => {
    const big = display(sc.big);
    const size = i === 0 ? 84 : big.length <= 8 ? 140 : big.length <= 14 ? 104 : 86;
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
    <link rel="stylesheet" href="workbench.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
      <div id="bg" class="clip" ${clip(0, total, 0)}></div>
${sceneHtml}
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-kicker">${esc(e.kicker)}</div>
        <div id="end-title">${esc(e.title)}</div>
        <div id="end-sub">${esc(e.subtitle)}</div>
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
${scenes.map((sc, i) => `      tl.from("#card-${i}", { y: -30, opacity: 0, duration: 0.35, ease: "back.out(1.6)" }, ${f(sc.from)});`).join("\n")}
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
for (const sc of scenes) console.log(`  ${(sc.scene?.type ?? "hook").padEnd(9)} ${(sc.to - sc.from).toFixed(1)}s`);
