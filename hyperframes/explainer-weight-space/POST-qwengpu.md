# qgpu (Qwen runs CUDA) explainer: post kit and sources

Video: `renders/qwengpu-cuda-in-weights.mp4` (1:24, 1080×1920; under the 3-minute Shorts limit).
Built from `script-qwengpu.json` with the dark explainer engine of this folder, in qgpu's own blue.
Source: github.com/vixhal-baraiya/qwenGPU, README at commit e2695f6 (1 November 2026). Code MIT.

## Every number in the video

| On screen / spoken | Value | Where in the README |
|---|---|---|
| Layers | 45 compiled GPU layers in front of Qwen3.5-2B's 24 (69 in all), none learned | Intro |
| GPU | 4 lanes, 15 registers per lane, 4-stage pipeline, 32-block program ROM, 126 words of global memory | "How it works: The GPU" |
| Features | integer arithmetic, comparisons and predicates, branches, loops, global and shared memory, atomicAdd, __syncthreads, warp shuffles | "The GPU" |
| State | registers and memory in Gated DeltaNet recurrent state; one-hot keys, each row a memory cell | "Gated DeltaNet as GPU state" |
| Launch | host compiles CUDA → PTX → machine blocks and writes PROG/MEM/EXEC setup tokens; the model generates EXEC and VAL tokens | "A launch", "What runs where" |
| Exactness | every launch exact in the author's runs, checked token for token with `--check` | "Results" |
| Real GPU | reference interpreter matched an NVIDIA Tesla T4 on 49 of 49 test kernels | "Results" |
| Text | next-token distribution within a KL of about 7e-4 of the original Qwen | "Results", "The merge" |
| Normal mode | 20 of 24 sampled chat questions answered with GPU-computed numbers | "Results" |
| Advanced mode | Qwen's own CUDA correct for 4 of 5 questions on the first try; "A 2B model's CUDA is still unreliable" | "Results" |
| Speed | tens to a few hundred tokens per launch, about 10–15 tokens per second on Apple silicon (MPS) | "Results" |

Discrepancy: the README text says 126 words of global memory; the panel in its demo GIF says
127 words. The video uses the README text. Registers: the README says 15 per lane and, elsewhere,
16 per lane with one always reading zero, which agree.

Illustrations, labelled in the video: the dot-product values (a = [1, 2, 3, 4], b = [5, 6, 7, 8]),
the token sequence (token names are the README's), and the memory-row diagram. The layer stack is
redrawn from the project's demo. The demo video itself was not used: decoding an untrusted media
file from the repository was blocked in this session, so everything is redrawn.

All results are the author's, from the README; they have not been independently verified.

## Caption / title (under 100 characters)

```
Someone compiled a GPU into an LLM's weights. It runs real CUDA. #AI #CUDA #LLM #Shorts
```

## Description

```
qgpu ("Qwen runs CUDA") is an experimental model: Qwen3.5-2B with a small SIMT GPU compiled directly into its weights.

• 45 extra transformer layers sit in front of Qwen's own 24. None of their weights are learned: a compiler computes every one.
• The GPU: 4 lanes, 15 registers per lane, a 4-stage pipeline and 126 words of memory, with branches, loops, shared memory, atomicAdd and warp shuffles.
• Registers and memory live in the recurrent state of Qwen's Gated DeltaNet layers: each row is one memory cell.
• The host compiles CUDA to PTX and loads it as tokens. Then the model generates the launch itself, one token per step and value.

Results reported by the author:
• Every launch exact, checked token by token; the reference matched a real NVIDIA T4 on 49 of 49 kernels.
• Qwen's normal text barely changes (next-token KL about 7e-4).
• Normal mode: 20 of 24 chat questions computed on the GPU. Advanced mode (Qwen writes the CUDA): 4 of 5 correct first try.
• It is slow: about 10–15 tokens per second, tens to hundreds of tokens per launch. A proof of concept, not a fast GPU.

Project: https://github.com/vixhal-baraiya/qwenGPU (MIT; merged weights Apache-2.0, as Qwen3.5)
Built on Qwenputer by Divyansh Agrawal: https://github.com/divagr18/qwenputer

Diagrams redrawn for this video; the dot product and token sequence are illustrations.
Voice: AI text-to-speech (English, male). Music: original.

#AI #CUDA #GPU #LLM #Shorts
```

## Pinned comment

```
Last week an LLM edited another model's weights by reasoning. This week a compiler writes every weight of a GPU inside one.
Is "programs as weights" the future, or a beautiful party trick? 👇
```
