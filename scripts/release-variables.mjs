// Turns a GitHub release into HyperFrames variables for hyperframes/release-card.
// Reads RELEASE_TAG, RELEASE_NAME, RELEASE_BODY and REPO from the environment and
// writes the JSON object to the path given as the first argument.
import { writeFileSync } from "node:fs";

const MAX_LINE = 56;

function clean(line) {
  return line
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/[`*_]/g, "")
    .replace(/\s+(by\s+@\S+\s+)?in\s+https?:\/\/\S+$/i, "") // GitHub auto notes suffix
    .replace(/\s+\(#\d+\)$/, "")
    .trim();
}

function truncate(text) {
  return text.length > MAX_LINE ? `${text.slice(0, MAX_LINE - 1).trimEnd()}…` : text;
}

const tag = process.env.RELEASE_TAG || "v0.0.0";
const body = process.env.RELEASE_BODY || "";
const bullets = body
  .split(/\r?\n/)
  .filter((line) => /^\s*[-*+]\s+\S/.test(line))
  .map(clean)
  .filter(Boolean)
  .map(truncate);

const fallback = ["See the release notes for details", "", ""];
const highlights = bullets.length ? bullets : fallback;

const variables = {
  repo: process.env.REPO || "",
  version: tag,
  title: truncate(process.env.RELEASE_NAME?.trim() || `Release ${tag}`),
  highlight1: highlights[0] ?? "",
  highlight2: highlights[1] ?? "",
  highlight3: highlights[2] ?? "",
};

const out = process.argv[2] || "variables.json";
writeFileSync(out, `${JSON.stringify(variables, null, 2)}\n`);
console.log(JSON.stringify(variables, null, 2));
