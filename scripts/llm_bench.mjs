// scripts/llm_bench.mjs — standardized benchmark for the local LLM (via LM Studio / MCP bridge).
// Runs a FIXED task suite so different models can be compared apples-to-apples, and appends
// a results row to .agent/llm_bench_results.md.
//
// Usage:
//   node scripts/llm_bench.mjs                         # auto-detect WSL gateway, model=qwen/qwen3.6-35b-a3b
//   node scripts/llm_bench.mjs <model-id>              # benchmark a specific loaded model
//   LLM_URL=http://192.168.32.1:1234 node scripts/llm_bench.mjs <model-id>
//
// Endpoint = LLM_URL env, else http://<wsl-default-gateway>:1234 (LM Studio on the Windows host).
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const MODEL = process.argv[2] || 'qwen/qwen3.6-35b-a3b';
function gateway() {
  try { return execSync("ip route | awk '/default/{print $3; exit}'").toString().trim(); }
  catch { return '127.0.0.1'; }
}
const BASE = (process.env.LLM_URL || `http://${gateway()}:1234`).replace(/\/$/, '');
const URL = `${BASE}/v1/chat/completions`;
const MAX_TOKENS = 6000; // reasoning models need headroom or content comes back empty

const stripFence = (s) => s.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
function parseJson(s) { try { return JSON.parse(stripFence(s)); } catch { return null; } }

async function call(messages) {
  const t = Date.now();
  const res = await fetch(URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, max_tokens: MAX_TOKENS, messages }),
  });
  const d = await res.json();
  const dt = (Date.now() - t) / 1000;
  const m = d.choices?.[0]?.message || {};
  const u = d.usage || {};
  return {
    dt, content: (m.content || '').trim(),
    completion: u.completion_tokens ?? null,
    reasoning: u.completion_tokens_details?.reasoning_tokens ?? 0,
    finish: d.choices?.[0]?.finish_reason,
  };
}

// Fixed suite: mirrors our real offload tasks. `check` returns true on a correct result.
const SUITE = [
  {
    id: 'distractors', desc: '3 misconception distractors for 8+9=17 (JSON int array)',
    messages: [{ role: 'system', content: 'Output ONLY a JSON array of 3 integers.' },
      { role: 'user', content: 'For 8 + 9 = 17, give 3 plausible wrong answers a 2nd grader might pick (common mistakes).' }],
    check: (c) => { const a = parseJson(c); return Array.isArray(a) && a.length === 3 && a.every((x) => Number.isInteger(x)) && !a.includes(17) && new Set(a).size === 3; },
  },
  {
    id: 'sub_batch8', desc: '8 subtraction problems within 20, no negatives (JSON)',
    messages: [{ role: 'system', content: 'Output ONLY a JSON array, no markdown.' },
      { role: 'user', content: 'Generate 8 subtraction problems within 20 (no negative results). Each object {a,b,answer}.' }],
    check: (c) => { const a = parseJson(c); return Array.isArray(a) && a.length === 8 && a.every((o) => o.a - o.b === o.answer && o.a - o.b >= 0); },
  },
  {
    id: 'add_cross8', desc: '8 addition problems within 20 that cross a ten (JSON)',
    messages: [{ role: 'system', content: 'Output ONLY a JSON array, no markdown.' },
      { role: 'user', content: 'Generate 8 addition problems within 20 where the ones digits sum to 10 or more (crossing a ten). Each object {a,b,answer}.' }],
    check: (c) => { const a = parseJson(c); return Array.isArray(a) && a.length === 8 && a.every((o) => o.a + o.b === o.answer && (o.a % 10) + (o.b % 10) >= 10); },
  },
  {
    id: 'narration', desc: 'Kid-friendly 1-sentence step hint (free text)',
    messages: [{ role: 'user', content: 'Write ONE short, cheerful sentence (no math symbols) telling a 6-year-old how to add 8 and 5 by making a ten. Under 20 words.' }],
    check: (c) => c.length > 10 && c.length < 200,
  },
];

(async () => {
  console.log(`Benchmarking ${MODEL} @ ${URL}\n`);
  const rows = [];
  for (const task of SUITE) {
    try {
      const r = await call(task.messages);
      const ok = task.check(r.content);
      rows.push({ id: task.id, ok, ...r });
      const tps = r.completion && r.dt ? (r.completion / r.dt).toFixed(0) : '?';
      console.log(`${ok ? '✅' : '❌'} ${task.id.padEnd(12)} ${r.dt.toFixed(1)}s  reason=${r.reasoning}  out=${r.completion}  ${tps}tok/s  finish=${r.finish}`);
      if (!ok) console.log(`     got: ${r.content.slice(0, 120) || '(empty)'}`);
    } catch (e) {
      rows.push({ id: task.id, ok: false, dt: 0, reasoning: 0, completion: 0, err: e.message });
      console.log(`❌ ${task.id.padEnd(12)} ERROR ${e.message}`);
    }
  }
  const pass = rows.filter((r) => r.ok).length;
  const totS = rows.reduce((s, r) => s + (r.dt || 0), 0);
  const totReason = rows.reduce((s, r) => s + (r.reasoning || 0), 0);
  const totOut = rows.reduce((s, r) => s + (r.completion || 0), 0);
  console.log(`\n${pass}/${rows.length} correct | total ${totS.toFixed(1)}s | reasoning ${totReason}/${totOut} completion tokens`);

  // Append a standardized row to the tracked results log.
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const detail = rows.map((r) => `${r.ok ? '✅' : '❌'}${r.id}(${(r.dt || 0).toFixed(1)}s/${r.reasoning}r)`).join(' ');
  const line = `| ${stamp} | \`${MODEL}\` | ${pass}/${rows.length} | ${totS.toFixed(1)}s | ${totReason} | ${totOut} | ${detail} |\n`;
  const path = '.agent/llm_bench_results.md';
  const header = `# Local LLM benchmark results\n\nStandardized suite in \`scripts/llm_bench.mjs\` (distractors, sub_batch8, add_cross8, narration).\nRun: \`node scripts/llm_bench.mjs <model-id>\`. Lower time + reasoning tokens = better; correctness must stay high.\n\n| when (UTC) | model | correct | total time | reasoning tok | completion tok | per-task (ok/lat/reason) |\n|---|---|---|---|---|---|---|\n`;
  if (!fs.existsSync(path)) fs.writeFileSync(path, header);
  fs.appendFileSync(path, line);
  console.log(`\nAppended to ${path}`);
})();
