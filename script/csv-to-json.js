#!/usr/bin/env node
/**
 * Pre-processes question CSV files into a JSON format readable by Foundry's vm.parseJson.
 *
 * Usage: node script/csv-to-json.js
 * Output: questions/questions.json
 */
const fs = require("fs");
const path = require("path");

const questionsDir = path.join(__dirname, "..", "questions");

function parseCsv(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const rows = data.split(/\r?\n/).filter((r) => r.trim() !== "");
  const questions = [];
  const responses = []; // flat: [r0_0, r0_1, r0_2, r0_3, r1_0, ...]

  for (const row of rows) {
    const cols = row.split(",");
    questions.push(cols[0]);
    // Always pad to 4 responses
    responses.push(cols[1] || "");
    responses.push(cols[2] || "");
    responses.push(cols[3] || "");
    responses.push(cols[4] || "");
  }

  return { questions, responses };
}

const pack1 = parseCsv(path.join(questionsDir, "fav4.csv"));
const pack2 = parseCsv(path.join(questionsDir, "thisThat.csv"));
const pack3 = parseCsv(path.join(questionsDir, "finishPhrase.csv"));
const pack4 = parseCsv(path.join(questionsDir, "combo.csv"));

const output = { pack1, pack2, pack3, pack4 };

const outPath = path.join(questionsDir, "questions.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Written ${outPath}`);
console.log(`  pack1: ${pack1.questions.length} questions (fav4.csv)`);
console.log(`  pack2: ${pack2.questions.length} questions (thisThat.csv)`);
console.log(`  pack3: ${pack3.questions.length} questions (finishPhrase.csv)`);
console.log(`  pack4: ${pack4.questions.length} questions (combo.csv)`);
