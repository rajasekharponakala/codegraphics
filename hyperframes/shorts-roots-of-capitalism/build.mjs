// Builds one HyperFrames composition per part of script.json into build/<slug>/:
// Kokoro voiceover over an original music bed (soundtrack.wav), word-timed
// captions, Mollweide maps and the chosen card style. Render each folder with
// `hyperframes render`.
//
//   node build.mjs                    all parts, style from script.json
//   node build.mjs --part 3           one part (number or slug)
//   node build.mjs --style brutal     override the style (glass | brutal)
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoGraticule, geoPath } from "d3-geo";
import { geoMollweide } from "d3-geo-projection";
import { feature, mesh } from "topojson-client";
import { CAPTION_TIMELINE, captionClips, display, esc, narrate, writeSoundtrack } from "../lib/shorts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const HF_ROOT = join(HERE, "..");
const BUILD = join(HERE, "build");
const W = 1080;
const H = 1920;
// Where each map's view box is fitted: above the card, below the header.
const MAP_BOX = [
  [50, 360],
  [1030, 1020],
];

const PLACES = {
  London: [-0.13, 51.51],
  Bristol: [-2.59, 51.45],
  Liverpool: [-2.98, 53.41],
  Glasgow: [-4.25, 55.86],
  Plymouth: [-4.14, 50.38],
  Amsterdam: [4.9, 52.37],
  Seville: [-5.98, 37.39],
  Venice: [12.33, 45.44],
  Genoa: [8.93, 44.41],
  Sicily: [14.1, 37.5],
  Crete: [24.9, 35.2],
  Rhodes: [28.0, 36.2],
  Cyprus: [33.2, 35.0],
  Madeira: [-16.9, 32.75],
  "Canary Islands": [-15.5, 28.1],
  "Cape Verde": [-23.6, 15.1],
  "São Tomé": [6.6, 0.3],
  Elmina: [-1.35, 5.08],
  "West Africa": [-5, 9],
  Jamaica: [-77.3, 18.1],
  "Saint-Domingue": [-72.4, 19.0],
  Barbados: [-59.55, 13.15],
  Pernambuco: [-35.0, -8.05],
  Mexico: [-99.13, 19.43],
  Acapulco: [-99.88, 16.85],
  Potosí: [-65.75, -19.58],
  Manila: [120.98, 14.6],
  India: [78.0, 22.0],
};

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const script = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
const style = argValue("--style") ?? script.style ?? "glass";
const only = argValue("--part");
if (!["glass", "brutal"].includes(style)) throw new Error(`Unknown style: ${style}`);

const world50 = JSON.parse(readFileSync(join(HF_ROOT, "node_modules/world-atlas/countries-50m.json"), "utf8"));
const LAND = feature(world50, world50.objects.land);
const BORDERS = mesh(world50, world50.objects.countries, (a, b) => a !== b);

// ---------- maps ----------

function renderMap(map, id) {
  const [w, s, e, n] = map.view;
  const projection = geoMollweide().rotate([-(w + e) / 2, 0]).precision(0.2);
  const edge = [];
  for (let i = 0; i <= 12; i++) {
    const x = w + ((e - w) * i) / 12;
    const y = s + ((n - s) * i) / 12;
    edge.push([x, s], [x, n], [w, y], [e, y]);
  }
  projection.fitExtent(MAP_BOX, { type: "MultiPoint", coordinates: edge });
  projection.clipExtent([
    [-40, -40],
    [W + 40, H + 40],
  ]);
  const path = geoPath(projection).digits(1);
  const graticule = geoGraticule().step([10, 10])();

  const points = (map.points ?? []).map((name) => {
    const ll = PLACES[name];
    if (!ll) throw new Error(`Unknown place: ${name}`);
    const [x, y] = projection(ll);
    return { name, x, y };
  });
  const routes = (map.routes ?? []).map(([a, b], i) => ({
    id: `${id}-route-${i}`,
    d: path({ type: "LineString", coordinates: [PLACES[a], PLACES[b]] }),
  }));

  // Place each label beside its pin, trying four corners and skipping any that
  // would overlap a label or pin already placed.
  const placed = points.map((p) => ({ x0: p.x - 14, y0: p.y - 14, x1: p.x + 14, y1: p.y + 14 }));
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const pointSvg = points
    .map((p, i) => {
      const width = p.name.length * 19 + 8;
      const corners = [
        { dx: 22, dy: -20, anchor: "start" },
        { dx: -22, dy: -20, anchor: "end" },
        { dx: 22, dy: 46, anchor: "start" },
        { dx: -22, dy: 46, anchor: "end" },
      ];
      const box = (c) => {
        const x0 = c.anchor === "start" ? p.x + c.dx : p.x + c.dx - width;
        return { x0, y0: p.y + c.dy - 32, x1: x0 + width, y1: p.y + c.dy + 6 };
      };
      const fits = (c) => {
        const b = box(c);
        return b.x0 > 20 && b.x1 < W - 20 && !placed.some((o) => overlaps(o, b));
      };
      const c = corners.find(fits) ?? corners[p.x < W - 260 ? 0 : 1];
      placed.push(box(c));
      return `<g class="pin" id="${id}-pin-${i}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
          <circle class="pin-halo" r="26" /><circle class="pin-dot" r="11" />
          <text class="pin-label" x="${c.dx}" y="${c.dy}" text-anchor="${c.anchor}">${esc(p.name)}</text>
        </g>`;
    })
    .join("\n");

  return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
        <rect class="map-space" width="${W}" height="${H}" />
        <path class="map-ocean" d="${path({ type: "Sphere" })}" />
        <path class="map-graticule" d="${path(graticule)}" />
        <path class="map-land" d="${path(LAND)}" />
        <path class="map-borders" d="${path(BORDERS)}" />
        ${routes.map((r) => `<path class="map-route" id="${r.id}" d="${r.d}" />`).join("\n        ")}
        ${pointSvg}
      </svg>`;
}

// ---------- composition ----------

function buildPart(part) {
  const out = join(BUILD, part.slug);
  mkdirSync(out, { recursive: true });
  cpSync(join(HERE, "vendor"), join(out, "vendor"), { recursive: true });
  cpSync(join(HERE, "shorts.css"), join(out, "shorts.css"));

  const segments = [
    { kind: "hook", text: part.hook, map: part.hookMap },
    ...part.beats.map((b) => ({ kind: "beat", text: b.say, map: b.map, beat: b })),
    { kind: "outro", text: script.outro },
  ];
  const { endStart, total } = narrate(segments, { voice: script.voice, speed: script.speed, cacheDir: join(BUILD, ".tts") });
  writeSoundtrack(segments, total, out, { music: script.music, seed: part.part });

  // Scenes: each segment owns the screen from its start to the next segment's start.
  const scenes = segments.slice(0, -1).map((seg, i) => {
    const from = i === 0 ? 0 : seg.start - 0.2;
    const to = segments[i + 1].start - 0.2;
    return { ...seg, from, to };
  });

  const f = (x) => Number(x.toFixed(3));
  const clip = (start, end, track) => `data-start="${f(start)}" data-duration="${f(end - start)}" data-track-index="${track}"`;

  const maps = scenes
    .map((sc, i) => {
      // Overlap the next scene by the crossfade length.
      const end = i === scenes.length - 1 ? endStart + 0.6 : sc.to + 0.6;
      return `      <div id="map-${i}" class="map clip" ${clip(sc.from, end, 1 + (i % 2))}>
        ${renderMap(sc.map, `map-${i}`)}
      </div>`;
    })
    .join("\n");

  const hook = scenes[0];
  const beats = scenes.slice(1);
  const cards = beats
    .map((sc, i) => {
      const n = i + 1;
      const big = display(sc.beat.big);
      const size = big.length <= 6 ? 210 : big.length <= 10 ? 160 : big.length <= 15 ? 128 : 104;
      return `      <div id="card-${n}" class="card clip" ${clip(sc.from, sc.to, 10)}>
        <div id="card-${n}-label" class="card-label">${esc(display(sc.beat.label))}</div>
        <div id="card-${n}-big" class="card-big" style="font-size:${size}px">${esc(big)}</div>
      </div>`;
    })
    .join("\n");

  const captions = captionClips(segments, clip);

  const html = `<!doctype html>
<!-- Generated by build.mjs from script.json. Edit those, not this file. -->
<html lang="en" data-style="${style}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="shorts.css" />
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="${W}" data-height="${H}">
${maps}
      <div id="scrim" class="clip" ${clip(0, total, 3)}></div>
      <div id="series" class="clip" ${clip(0, endStart, 4)}>The Roots of Capitalism</div>
      <div id="part-label" class="clip" ${clip(0, endStart, 5)}>Part ${part.part} of ${script.parts.length} · ${esc(part.title)}</div>
      <div id="progress-track" class="clip" ${clip(0, endStart, 6)}></div>
      <div id="progress" class="clip" ${clip(0, endStart, 7)}></div>
      <h1 id="hook" class="clip" ${clip(0, hook.to, 8)}>${esc(display(part.hook))}</h1>
${cards}
${captions.html}
      <div id="end-card" class="clip" ${clip(endStart, total, 30)}>
        <div id="end-title">Read the full study</div>
        <p id="end-credit">Adapted from <em>The Roots of Capitalism: Slavery and the Sugar Trade</em> by Prabir Purkayastha, Tricontinental: Institute for Social Research, Studies on Historical Materialism no. 1.</p>
        <p id="end-license">Licensed CC BY-NC 4.0 (creativecommons.org/licenses/by-nc/4.0). Text condensed and narrated for video. Map data: Natural Earth. thetricontinental.org</p>
      </div>
      <audio id="soundtrack" src="soundtrack.wav" ${clip(0, total, 50)}></audio>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      const scenes = ${JSON.stringify(scenes.map((s) => ({ from: f(s.from), to: f(s.to) })))};
      const endStart = ${f(endStart)};

      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: endStart, ease: "none" }, 0);
      // Hook is on screen from frame 0: that frame is the Shorts thumbnail.
      tl.fromTo("#hook", { scale: 1 }, { scale: 1.03, duration: scenes[0].to, ease: "none" }, 0);

      scenes.forEach((sc, i) => {
        const map = "#map-" + i;
        const end = i === scenes.length - 1 ? endStart + 0.6 : sc.to + 0.6;
        if (i > 0) tl.fromTo(map, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.inOut" }, sc.from);
        tl.fromTo(map + " .map-svg", { scale: 1 }, { scale: 1.07, duration: end - sc.from, ease: "none", transformOrigin: "50% 35%" }, sc.from);
        tl.from(map + " .pin", { scale: 0, opacity: 0, duration: 0.45, stagger: 0.15, ease: "back.out(2.2)", transformOrigin: "0 0" }, sc.from + 0.3);
        document.querySelectorAll(map + " .map-route").forEach((route, j) => {
          const len = route.getTotalLength();
          route.style.strokeDasharray = len + " " + len;
          tl.fromTo(route, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" }, sc.from + 0.6 + j * 0.5);
        });
        if (i > 0) {
          tl.from("#card-" + i, { y: 60, opacity: 0, duration: 0.55, ease: "power3.out" }, sc.from);
          tl.from("#card-" + i + "-big", { scale: 0.85, duration: 0.6, ease: "back.out(1.7)", transformOrigin: "left center" }, sc.from + 0.1);
        }
      });

${CAPTION_TIMELINE}
      tl.from("#end-card > *", { y: 30, opacity: 0, duration: 0.6, stagger: 0.25, ease: "power3.out" }, endStart);

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  writeFileSync(join(out, "index.html"), html);
  console.log(`${part.slug}: ${total.toFixed(1)}s, ${captions.count} caption groups, style ${style}`);
}

const parts = script.parts.filter((p) => !only || String(p.part) === only || p.slug === only);
if (!parts.length) throw new Error(`No part matches ${only}`);
for (const part of parts) buildPart(part);
