// Shared machinery for the narrated Shorts series: Kokoro voiceover, caption
// timing, an original music bed ducked under the voice, and loudness. Each
// series' build.mjs supplies its own visuals and HTML.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIB = dirname(fileURLToPath(import.meta.url));
const HF_ROOT = join(LIB, "..");
const GAP = 0.45; // silence between narration segments, seconds
const LEAD = 0.25; // narration starts this long after frame 0
const END_HOLD = 6.5; // minimum time the end card stays up

// ---------- text ----------

// "{1226|twelve twenty-six}" shows 1226 on screen and speaks the words.
export const MARKUP = /\{([^|}]+)\|([^}]+)\}/g;
export const display = (text) => text.replace(MARKUP, "$1");
export const spoken = (text) => text.replace(MARKUP, "$2");

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, "");
  if (/^\d/.test(w)) return 2 * w.length; // digits left unspelled: 450 is "four hundred and fifty"
  const groups = w.match(/[aeiouyà-ÿ]+/g)?.length ?? 1;
  return Math.max(1, groups - (w.endsWith("e") && groups > 1 && !w.endsWith("le") ? 1 : 0));
}

// Caption words, each with the spoken text it stands for.
function captionWords(text) {
  const words = [];
  const re = /\{([^|}]+)\|([^}]+)\}(\S*)|(\S+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[4]) words.push({ show: m[4], say: m[4] });
    else words.push({ show: m[1] + m[3], say: m[2] + m[3] });
  }
  return words;
}

// Word timings. Clauses are pinned to the pauses actually found in the audio;
// words inside a clause are spread by syllable count.
export function timeWords(text, start, audio) {
  const words = captionWords(text);
  const weight = (w) => w.say.split(/[\s-]+/).reduce((n, part) => n + syllables(part), 0);
  const clauses = [[]];
  for (const w of words) {
    clauses.at(-1).push(w);
    if (/[.,:;!?]$/.test(w.say)) clauses.push([]);
  }
  if (!clauses.at(-1).length) clauses.pop();

  // Where each clause would end if speech were evenly paced.
  const sizes = clauses.map((c) => c.reduce((n, w) => n + weight(w), 0));
  const total = sizes.reduce((a, b) => a + b, 0);
  let acc = 0;
  const guesses = sizes.slice(0, -1).map((n) => (acc += n) / total * audio.duration);

  // Match each clause boundary to the nearest unused pause, in order. Every
  // boundary must come after the previous one, matched or not.
  const bounds = [{ end: 0, next: 0 }];
  let from = 0;
  for (const guess of guesses) {
    const floor = bounds.at(-1).next + 0.2;
    let best = -1;
    for (let i = from; i < audio.pauses.length; i++) {
      const p = audio.pauses[i];
      if (p.start < floor) continue;
      if (Math.abs((p.start + p.end) / 2 - guess) < 1.2 && (best === -1 || Math.abs(p.start - guess) < Math.abs(audio.pauses[best].start - guess))) best = i;
    }
    if (best === -1) {
      const t = Math.max(guess, floor);
      bounds.push({ end: t, next: t });
    } else {
      bounds.push({ end: audio.pauses[best].start, next: audio.pauses[best].end });
      from = best + 1;
    }
  }
  bounds.push({ end: audio.duration, next: audio.duration });

  return clauses.flatMap((clause, c) => {
    const s0 = bounds[c].next;
    const s1 = Math.max(s0 + 0.2, bounds[c + 1].end);
    const unit = (s1 - s0) / sizes[c];
    let t = s0;
    return clause.map((w) => {
      const s = t;
      t += weight(w) * unit;
      return { ...w, start: start + s, end: start + t };
    });
  });
}

// Groups of at most four words / 24 characters (one caption line), broken after
// punctuation once a group has two or more words.
export function captionGroups(words) {
  const groups = [];
  let cur = [];
  for (const w of words) {
    if (cur.length && [...cur, w].map((x) => x.show).join(" ").length > 24) {
      groups.push(cur);
      cur = [];
    }
    cur.push(w);
    // A lone word like "Then," would only flash on screen; keep it with the next words.
    if (cur.length >= 4 || (cur.length >= 2 && /[.,:;!?]$/.test(w.show))) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

// ---------- audio ----------

// lang overrides the phonemizer language Kokoro would infer from the voice
// prefix, e.g. an Indian voice (hf_/hm_) reading English text with "en-gb".
function tts(text, voice, speed, cacheDir, lang) {
  const dir = cacheDir;
  mkdirSync(dir, { recursive: true });
  const id = lang ? `${voice}|${speed}|${lang}|${text}` : `${voice}|${speed}|${text}`;
  const key = createHash("sha256").update(id).digest("hex").slice(0, 16);
  const out = join(dir, `${key}.wav`);
  if (!existsSync(out)) {
    const langArgs = lang ? ["-l", lang] : [];
    execFileSync("npx", ["hyperframes", "tts", text, "-v", voice, "-s", String(speed), ...langArgs, "-o", out], {
      cwd: HF_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });
  }
  const duration = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString(),
  );
  // Pauses inside the speech, used to pin caption timing.
  const log = spawnSync("ffmpeg", ["-i", out, "-af", "silencedetect=noise=-38dB:d=0.1", "-f", "null", "-"], {
    encoding: "utf8",
  }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const pauses = starts.map((s, i) => ({ start: s, end: ends[i] ?? duration })).filter((p) => p.start > 0.05 && p.end < duration - 0.05);
  return { file: out, duration, pauses };
}

export function mixNarration(segments, total, out) {
  const inputs = segments.flatMap((s) => ["-i", s.audio.file]);
  const delays = segments.map((s, i) => {
    const ms = Math.round(s.start * 1000);
    return `[${i}]adelay=${ms}|${ms}[a${i}]`;
  });
  const mix = `${segments.map((_, i) => `[a${i}]`).join("")}amix=inputs=${segments.length}:normalize=0,apad=whole_dur=${total.toFixed(3)}[out]`;
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", ...inputs,
    "-filter_complex", [...delays, mix].join(";"),
    "-map", "[out]", "-ac", "2", "-ar", "48000", out,
  ]);
}

// Lays the music bed (music.py) under the narration. A sidechain compressor keyed
// on the voice ducks the music while the narrator speaks and lets it back up in
// the gaps and over the end card.
export function addMusic(narration, total, seed, out, gainDb = -12) {
  const bed = join(dirname(out), "music.wav");
  const python = process.env.HYPERFRAMES_PYTHON || "python3";
  execFileSync(python, ["-I", join(LIB, "music.py"), "--seconds", total.toFixed(3), "--seed", String(seed), "--out", bed]);
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-i", narration, "-i", bed,
    "-filter_complex",
    `[0]asplit=2[voice][key];[1]volume=${gainDb}dB[music];` +
      "[music][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=700[ducked];" +
      "[voice][ducked]amix=inputs=2:normalize=0[out]",
    "-map", "[out]", "-ac", "2", "-ar", "48000", out,
  ]);
}

// Brings the final mix to YouTube's -14 LUFS with one fixed gain (so the ducking
// shape is kept) and a limiter catching peaks above about -1 dBFS.
export function normalize(input, out) {
  const log = spawnSync("ffmpeg", ["-i", input, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const integrated = Number(log.slice(log.lastIndexOf("Summary:")).match(/I:\s+(-?[\d.]+) LUFS/)[1]);
  const gain = (-14 - integrated).toFixed(2);
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-i", input,
    "-af", `volume=${gain}dB,alimiter=limit=0.89:level=disabled`,
    "-ac", "2", "-ar", "48000", out,
  ]);
}

// ---------- timeline ----------

// Speaks each segment ({ text }) and lays them end to end. Adds audio, start and
// end to each segment; returns when the end card starts and the total length.
export function narrate(segments, { voice, speed, cacheDir, lang }) {
  let t = LEAD;
  for (const seg of segments) {
    seg.audio = tts(spoken(seg.text), voice, speed, cacheDir, lang);
    seg.start = t;
    seg.end = t + seg.audio.duration;
    t = seg.end + GAP;
  }
  const outro = segments.at(-1);
  const endStart = outro.start - 0.3;
  const total = Math.max(outro.end + 1.5, endStart + END_HOLD);
  return { endStart, total };
}

// narration.wav, then (unless music is false) the ducked bed, then soundtrack.wav at -14 LUFS.
export function writeSoundtrack(segments, total, outDir, { music, seed }) {
  mixNarration(segments, total, join(outDir, "narration.wav"));
  let mix = join(outDir, "narration.wav");
  if (music !== false) {
    addMusic(mix, total, seed, join(outDir, "mix.wav"), music?.gainDb ?? -12);
    mix = join(outDir, "mix.wav");
  }
  normalize(mix, join(outDir, "soundtrack.wav"));
}

// Word-highlight captions for every segment except the hook (whose text is on screen).
export function captionClips(segments, clip) {
  const f = (x) => Number(x.toFixed(3));
  const groups = segments
    .filter((s) => s.kind !== "hook")
    .flatMap((s) => captionGroups(timeWords(s.text, s.start, s.audio)));
  const html = groups
    .map((g, i) => {
      const start = g[0].start - 0.05;
      const next = groups[i + 1];
      const end = next && next[0].start - g.at(-1).end < 0.6 ? next[0].start - 0.05 : g.at(-1).end + 0.25;
      const words = g
        .map((w, j) => `<span class="w" id="cap-${i}-w${j}" data-t0="${f(w.start)}" data-t1="${f(w.end)}">${esc(w.show)}</span>`)
        .join(" ");
      return `      <div id="cap-${i}" class="caption clip" ${clip(start, end, 40)}>${words}</div>`;
    })
    .join("\n");
  return { html, count: groups.length };
}

// Timeline script that lights each caption word while it is spoken.
export const CAPTION_TIMELINE = `      document.querySelectorAll(".caption .w").forEach((w) => {
        tl.set(w, { attr: { "data-on": "1" } }, Number(w.dataset.t0));
        tl.set(w, { attr: { "data-on": "0" } }, Number(w.dataset.t1));
      });`;
