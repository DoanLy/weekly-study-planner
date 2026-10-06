import { neon } from "@neondatabase/serverless";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Usage: node --env-file=.env.local scripts/fill-speaking-answers.mjs <dataFile.mjs> [--force]
// dataFile default-exports an array of { part, topic, question, answer } objects.
// part: "part1" | "part2" | "part3". answer is an HTML string.
// By default only fills questions whose userNote is currently empty.

const FORCE = process.argv.includes("--force");
const dataArg = process.argv[2];
if (!dataArg) {
  throw new Error("Missing data file argument");
}

const dataModule = await import(pathToFileURL(resolve(dataArg)).href);
const entries = dataModule.default;

const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

// Build lookups per part. Entries may match by question text (default)
// or by topic name when { matchBy: "topic" } and { topic } are provided.
const byQuestion = { part1: new Map(), part2: new Map(), part3: new Map() };
const byTopic = { part1: new Map(), part2: new Map(), part3: new Map() };
for (const e of entries) {
  if (!byQuestion[e.part]) throw new Error(`Bad part: ${e.part}`);
  if (e.matchBy === "topic") {
    byTopic[e.part].set(norm(e.topic), e.answer);
  } else {
    byQuestion[e.part].set(norm(e.question), e.answer);
  }
}
const lookup = byQuestion; // keep legacy variable name for question matching

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT data FROM app_data WHERE id = 'planner'`;
const data = rows[0]?.data;
if (!data) throw new Error("No planner row found");

const st = data.speakingTopics || { part1: [], part2: [], part3: [] };

let matched = 0, filled = 0, skippedFilled = 0, unmatched = 0;
const usedQ = { part1: new Set(), part2: new Set(), part3: new Set() };
const usedT = { part1: new Set(), part2: new Set(), part3: new Set() };

for (const part of ["part1", "part2", "part3"]) {
  const qMap = byQuestion[part];
  const tMap = byTopic[part];
  if (!qMap.size && !tMap.size) continue;
  for (const topic of st[part] || []) {
    const tKey = norm(topic.name);
    const topicAnswer = tMap.has(tKey) ? tMap.get(tKey) : null;
    for (const q of topic.questions || []) {
      const qKey = norm(q.text);
      let answer = null;
      if (qMap.has(qKey)) { answer = qMap.get(qKey); usedQ[part].add(qKey); }
      else if (topicAnswer !== null) { answer = topicAnswer; usedT[part].add(tKey); }
      if (answer === null) continue;
      matched += 1;
      const hasAnswer = (q.userNote || "").trim();
      if (hasAnswer && !FORCE) {
        skippedFilled += 1;
      } else {
        q.userNote = answer;
        filled += 1;
      }
    }
  }
  for (const key of qMap.keys()) {
    if (!usedQ[part].has(key)) { unmatched += 1; console.log(`  [UNMATCHED ${part} Q] ${key}`); }
  }
  for (const key of tMap.keys()) {
    if (!usedT[part].has(key)) { unmatched += 1; console.log(`  [UNMATCHED ${part} TOPIC] ${key}`); }
  }
}

if (filled > 0) {
  const updated = { ...data, speakingTopics: st };
  await sql`
    UPDATE app_data SET data = ${JSON.stringify(updated)}::jsonb, updated_at = now()
    WHERE id = 'planner'
  `;
}

console.log(`matched=${matched} filled=${filled} skipped(already answered)=${skippedFilled} unmatched(data entries)=${unmatched}`);
console.log(filled > 0 ? "DB updated." : "No DB write (nothing to fill).");
