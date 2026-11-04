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

---

# Full version (all eight experiments)

Video: `renders/weight-space-programming-full.mp4` (2:00, 1080×1920; under the 3-minute Shorts limit).
Built from `script-full.json` with the same voice, look and caveats; four chapters: Read, Fix, Write, Improve, then Limits.

## Additional numbers and their sources

| On screen / spoken | Value | Where in the post |
|---|---|---|
| Exp 1: weights given to Astra | 17,253 per network, no game named | Experiment 1 setup |
| Exp 1: Astra's answers | Breakout 99%, Pong 96%, Pac-Man 96%, Freeway answered "Frogger", a traffic-crossing variant, 97% (counted correct by the authors) | assets/traces/exp1_games.json |
| Exp 2: shapes | named circle, square, triangle; drew outlines although the models generate filled shapes | Experiment 2 text |
| Exp 3: copying heads | Python 2.1, 3.1, 3.5 · Romaji 3.3 · English 3.1, all matching the measured heads; language right in both attempts | Experiment 3 table and Figure 1 |
| Exp 7: sycophancy | not identified from weights in 4 attempts; with attention patterns, found in all 3 pairs | Experiment 7 text |
| Exp 7: head 10.2 | honest 94.3% question / 0.75% user's answer · sycophant 3.5% / 85.7% | Figure 2 |
| Exp 4: car | PPO never succeeds in 256 episodes; Astra's edit to 3.5% of 171,664 weights succeeds in 1,024 of 1,024 | Experiment 4 |
| Exp 5: scores | Breakout 15.8 / 25.3 / 517.4 · Seaquest 5.6 / 88.9 / 53.1 · Asterix 25.8 / 55.2 / 53.2 (PPO 100M / PPO 500M / Astra) | Experiment 5 table |
| Exp 6: Go | 1,480,274 weights; win rate vs two small PPO networks 54.1% / 54.9% with no test runs, 84.0% / 80.8% with 50; with 50 it beats the equal-sized PPO trained on 20 million games | Experiment 6; assets/gohand/gohand.json |

Assets from the post (used with your go-ahead; the post states no content licence): the four
game clips (assets/which_game/*.gif, converted to MP4) and the Kinetix car scene
(assets/carjump_scene.svg). They are credited on screen. The Go board is an illustration.

## Caption / title (under 100 characters)

```
An AI read and rewrote other AIs' weights, no training. 8 experiments, explained #AI #LLM
```

## Description

```
Can a frontier model read and rewrite neural network weights directly, without training? MIT CSAIL researchers tested GPT-6 Astra in eight experiments.

READ
• Named which game each of four networks was trained on from 17,253 raw weights (Breakout 99%, Pong 96%, Pac-Man 96%, Freeway: "Frogger" traffic crossing, 97%).
• Named the shape three diffusion models draw (it drew outlines; the models make filled shapes).
• From only the middle layers, named each small language model's training language and found every copying head.
• Could NOT spot a sycophantic model from weights alone; with attention patterns, found it in all 3 pairs.

FIX
• A car network that always stalled on a ramp: editing 3.5% of its weights took it from 0 to 1,024 of 1,024 successes.

WRITE
• Game networks written from scratch beat PPO trained for 100M steps in Breakout, Seaquest and Asterix; against 500M steps, only in Breakout (517.4 vs 25.3).
• A 1.5M-weight Go network: with 50 test runs it beat an equal-sized PPO network trained on 20M games.

IMPROVE
• Editing 0.016% of Qwen3.5-0.8B's weights removed reasoning loops: MATH-500 7.9% → 48.1%, IFEval 21.0% → 62.3%. It needed 50 test runs; 10 or 25 gave small gains.

LIMITS
• On Gemma 3 270M, which rarely loops, the edits did not help: "Editing weights could remove an obstacle that hid an ability, but it could not add an ability the model lacked."
• Early results in a blog post, not peer-reviewed. Full logs are public.

Source: Takehi, Teoh, Zhang, Khattab (MIT CSAIL). "Sparks of Weight-Space Programming: LLMs can natively read & write neural network weights", 2 November 2026.
https://rikiyat.github.io/blog/weight-space-programming/
Logs: https://github.com/RikiyaT/lm_understand-logs

Game clips and the car scene are from the authors' post; other charts are redrawn from their numbers. The Go board, loop text and code diff are illustrations.
Voice: AI text-to-speech (English, male). Music: original.

#AI #LLM #MachineLearning #Interpretability #Shorts
```

## Pinned comment

```
Reading weights: mostly yes. Writing small networks: yes. Teaching a model new skills by editing weights: not yet.
Which result surprised you most? 👇
```
