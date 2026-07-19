# Local LLM benchmark results

Standardized suite in `scripts/llm_bench.mjs` (distractors, sub_batch8, add_cross8, narration).
Run: `node scripts/llm_bench.mjs <model-id>`. Lower time + reasoning tokens = better; correctness must stay high.

| when (UTC) | model | correct | total time | reasoning tok | completion tok | per-task (ok/lat/reason) |
|---|---|---|---|---|---|---|
| 2026-07-19 03:41 | `qwen/qwen3.6-35b-a3b` | 4/4 | 63.5s | 6640 | 6893 | ✅distractors(4.1s/407r) ✅sub_batch8(20.4s/2002r) ✅add_cross8(25.0s/2561r) ✅narration(14.0s/1670r) |
| 2026-07-19 06:56 | `qwen3-coder-30b-a3b-instruct` | 4/4 | 3.3s | 0 | 372 | ✅distractors(0.8s/0r) ✅sub_batch8(1.2s/0r) ✅add_cross8(1.1s/0r) ✅narration(0.3s/0r) |
| 2026-07-19 07:14 | `gemma-4-26b-a4b-it` | 1/4 | 188.3s | 2755 | 2778 | ❌distractors(119.0s/0r) ❌sub_batch8(8.8s/0r) ❌add_cross8(0.0s/0r) ✅narration(60.5s/2755r) |
| 2026-07-19 07:23 | `gemma-4-26b-a4b-it` | 4/4 | 110.9s | 7031 | 7344 | ✅distractors(31.8s/1974r) ✅sub_batch8(9.8s/597r) ✅add_cross8(33.1s/2102r) ✅narration(36.2s/2358r) |
