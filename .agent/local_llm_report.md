# Local LLM Offload — Cost, Accuracy & Speed Report

**Setup:** LM Studio on the Windows host (RTX 4090 + RTX 3090, 192 GB RAM, i9-13900K), reached from
WSL via an MCP bridge (`/home/katiyar/software/mcp/local_bridge.py`, tool `query_local_model`) and the
OpenAI-compatible endpoint `http://<wsl-gateway>:1234/v1`.

**How to reproduce:** `node scripts/llm_bench.mjs <model-id>` — a fixed 4-task suite (misconception
distractors, 8-item subtraction batch, 8-item addition-crossing-ten batch, kid-friendly narration).
Raw rows are appended to `.agent/llm_bench_results.md`.

## Benchmark results (2026-07-18/19)

| model | correct | total time | reasoning tok | output tok | throughput |
|---|---|---|---|---|---|
| **qwen3-coder-30b-a3b-instruct** (chosen) | **4/4 (100%)** | **3.3 s** | **0** | 372 | ~110–145 tok/s |
| qwen/qwen3.6-35b-a3b (reasoning) | 4/4 (100%) | 63.5 s | 6,640 | 6,893 | ~70–108 tok/s |
| gemma-4-26b-a4b-it (reasoning) | 4/4 (100%) | 110.9 s | 7,031 | 7,344 | ~46–77 tok/s |

Per-task (qwen3-coder): distractors 0.8 s / 13 tok · sub-batch-8 1.2 s / 163 tok · add-cross-8 1.1 s /
163 tok · narration 0.3 s / 33 tok. **Zero reasoning overhead**, clean JSON, no fence/parse cleanup needed.

### Key findings
- **Accuracy:** all three models scored 4/4 on the suite; distractors were pedagogically sound
  (e.g. `8+9`→`[16,18,15]`: forgot-carry / 9+9 slip / miscount). Math batches were 100% arithmetically correct.
- **Speed:** qwen3-coder is **~19× faster** than qwen3.6 and **~33× faster** than gemma-4 for the same suite,
  because it is a **non-reasoning instruct model**. The other two are reasoning models whose "thinking"
  **cannot be disabled** (`/no_think` and `enable_thinking:false` were ignored) — ~96 % of their output
  tokens are hidden reasoning, and that dominates latency.
- **Decision:** use **qwen3-coder-30b-a3b-instruct** for all bulk generation offload.

## Token savings (cloud budget)

Every generation task delegated to the local model costs **0 cloud tokens** — the work runs on the owner's
GPUs. The savings equal the output (plus prompt) tokens we would otherwise have spent on the cloud model.

Illustrative, using measured qwen3-coder output sizes:

| offload job | approx items | ~local tokens | ~local time | cloud tokens spent |
|---|---|---|---|---|
| Misconception distractor bank | 500 sets | ~7.5 k | ~1 min | **0** |
| Problem banks (add/sub/mult) | 1,000 problems | ~20 k | ~2–3 min | **0** |
| Narration / hint variants | 300 lines | ~10 k | ~1.5 min | **0** |

The cloud agent's role shrinks to **orchestration + verification** (spec the task, run `npm test` /
validators on the output, integrate) rather than emitting the bulk text itself. For a reasoning model the
same jobs would additionally burn ~15–20× tokens in "thinking," which is exactly why we avoid them here.

## When to use / not use
- **Use:** offline/batch content generation where quality matters but latency doesn't (distractor banks,
  problem sets, narration drafts, test fixtures).
- **Don't use:** anything in the kid's real-time game loop or latency-sensitive path.
- **Always verify** generated math with `npm test` (the reachability + correctness guards) before shipping —
  the local model is a drafting aid, never the source of truth.
- **If offline/unreachable:** the agent does the work itself; nothing in the shipped app depends on the local LLM.

## Caveats
- Numbers are from a 4-task micro-suite (small sample); treat as directional, re-run `llm_bench.mjs` for
  bigger jobs. Throughput depends on quant (Q8_0 here) and whether the model fits fully in VRAM — running two
  ~30B Q8 models at once exceeds 48 GB VRAM and forces CPU offload (gemma-4's first run was contended/unstable
  until loaded alone).
