# Local LLM benchmark results

Standardized suite in `scripts/llm_bench.mjs` (distractors, sub_batch8, add_cross8, narration).
Run: `node scripts/llm_bench.mjs <model-id>`. Lower time + reasoning tokens = better; correctness must stay high.

| when (UTC) | model | correct | total time | reasoning tok | completion tok | per-task (ok/lat/reason) |
|---|---|---|---|---|---|---|
| 2026-07-19 03:41 | `qwen/qwen3.6-35b-a3b` | 4/4 | 63.5s | 6640 | 6893 | ✅distractors(4.1s/407r) ✅sub_batch8(20.4s/2002r) ✅add_cross8(25.0s/2561r) ✅narration(14.0s/1670r) |
