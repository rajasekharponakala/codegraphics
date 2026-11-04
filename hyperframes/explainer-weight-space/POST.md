# Weight-Space Programming explainer: post kit and sources

Video: `renders/weight-space-programming.mp4` (59 s, 1080×1920).
Source: Takehi, Teoh, Zhang, Khattab (MIT CSAIL), "Sparks of Weight-Space Programming: LLMs can
natively read & write neural network weights", blog post, 2 November 2026,
https://rikiyat.github.io/blog/weight-space-programming/ (read from the page's source in the
public repo github.com/rikiyat/rikiyat.github.io, commit e35f074).

## Every number in the video

| On screen / spoken | Value | Where in the post |
|---|---|---|
| Weights changed | 131,072 of 0.8 billion (0.016%) | Experiment 8, last paragraph; Astra's final report |
| Where | 64 MLP output columns in each of layers 15 and 19 | Experiment 8 text; Astra's final report (assets/mathedit/trajectories.json) |
| Answers hitting the 32,768-token limit | 93.0% base → 33.1% edited | Experiment 8 table |
| MATH-500 | 7.9% → 48.1% (6.1×) | Experiment 8 table, 50 forward passes |
| GSM8K | 13.8% → 67.1% | Experiment 8 table |
| IFEval (instruction following) | 21.0% → 62.3% (3.0×) | Experiment 8 table |
| MATH-500 by forward-pass budget | 0: 7.9 · 10: 12.3 · 25: 14.1 · 50: 48.1 | Experiment 8 table; assets/mathedit/benchmarks.json |
| Control, Gemma 3 270M, MATH-500 | 6.8% base, 7.0% after 50 passes (never more than 7.7%) | "Additional experiment" table |
| Quote | "Editing weights could remove an obstacle that hid an ability, but it could not add an ability the model lacked." | "Additional experiment" paragraph |

Shown as illustrations, and labelled so in the video:
- The looping text ("Wait, let me check this again.") is an example of a reasoning loop, not
  a quote from the model's output.
- The weight-edit diff is a simplified description of the edit; the exact edit and neuron
  indices are in the authors' logs.
- The layer grid shows where the edit is, not the real number of columns.

Context the video keeps from the post (the tweet leaves it out):
- "Without gradients or training" is accurate, but the edit needed 50 forward passes (test runs
  on practice problems). With 10 or 25 the gains were small.
- The edit stops loops; it does not add maths ability. On Gemma 3 270M, which rarely loops,
  it did not help. In the authors' 50-pass run, 576 of the 579 rescued practice problems had
  previously hit the token limit.
- This is a blog post with "very early results", not a peer-reviewed paper. The logs are public
  (github.com/RikiyaT/lm_understand-logs) and the edited model was rebuilt and re-evaluated
  at Hugging Face.
- "GPT-6 Astra" is named as the authors name it; the video says nothing else about that model.

Licence: the post states no licence for its content (the site's MIT licence covers the website
theme). All diagrams are redrawn from the published numbers; one sentence is quoted with credit.

## Caption / title (under 100 characters)

```
An AI fixed another AI by editing 0.016% of its weights. No training. #AI #LLM #Shorts
```

## Description

```
MIT CSAIL researchers asked GPT-6 Astra to make Qwen3.5-0.8B better at math by editing its weights directly: no gradient descent, no training.

• It changed 131,072 of 0.8 billion weights (0.016%), in two layers.
• The small model often got stuck in reasoning loops: 93% of its answers ran out of tokens. Astra traced the loops to one direction in layers 15 and 19 and subtracted it.
• The authors report MATH-500 rising from 7.9% to 48.1%, GSM8K from 13.8% to 67.1%, and instruction following (IFEval) from 21.0% to 62.3%.

What to keep in mind:
• It needed 50 forward passes (test runs on practice problems). With 10 or 25, gains were small.
• On Gemma 3 270M, a model that rarely loops, the edits did not help. The authors: "Editing weights could remove an obstacle that hid an ability, but it could not add an ability the model lacked."
• Early results in a blog post, not peer-reviewed. The full logs are public.

Source: Takehi, Teoh, Zhang, Khattab (MIT CSAIL). "Sparks of Weight-Space Programming: LLMs can natively read & write neural network weights", 2 November 2026.
https://rikiyat.github.io/blog/weight-space-programming/
Logs: https://github.com/RikiyaT/lm_understand-logs

Diagrams redrawn for this video from the authors' published numbers; the loop text and code diff are illustrations.
Voice: AI text-to-speech (English, male). Music: original.

#AI #LLM #MachineLearning #Interpretability #Shorts
```

## Pinned comment

```
The fix stopped the loops; it did not teach new maths. On a model that rarely loops (Gemma 3 270M), it did nothing.
So is this "programming weights", or a very good debugger? 👇
```

## Before posting

- [ ] Watch once with sound.
- [ ] Check the post and logs links open.
- [ ] Optional: tag the authors when sharing on X.
