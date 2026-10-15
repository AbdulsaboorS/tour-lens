# tour-lens

An AI tour guide that sees what you see. During a self-guided apartment tour you point your phone
at something, tap, and ask about it. It answers out loud from that unit's actual records and shows
where the answer came from. If what the camera sees doesn't match the records, it says so and
flags it for the leasing team.

I was researching the verticals EliseAI operates in and honestly expected to find this somewhere.
I didn't, so I built it. It's a concept demo that extends AI-Guided Tours. Not affiliated with
EliseAI, and the property, units and people are made up.

Also instead of just a prototype, I figured why not a mini launch video that showcases it lol

https://github.com/user-attachments/assets/60fdf31c-f1bf-4836-8c22-4deb8b3e48c0

- **Demo video file (1 min):** [docs/media/tour-lens.mp4](docs/media/tour-lens.mp4)
- **Try it:** https://tour-lens.feedback-signal.workers.dev (access code in my message)
- **The product write-up:** [docs/writeup.md](docs/writeup.md)

## Try it

Open https://tour-lens.feedback-signal.workers.dev on your phone and enter the access code I sent
you. Pick **Walk the sample unit**: footage of a staged unit stands in for your camera. Drag to
look around, switch rooms with the chips up top, then tap the button and ask out loud, or tap a
suggested question. Try the laundry first.

It runs on free model tiers, so an answer can take a few extra seconds when they're busy. If a
suggested question can't get through, the app plays a saved real answer and labels it.

## How it works

1. Tap and ask. The app grabs one camera frame and your audio.
2. The Worker transcribes the question (Whisper). A vision model (Mistral Small 3.1) says what's
   in frame and answers yes/no visual checks. It never states facts.
3. A routing model (gpt-oss-120b on Cerebras) picks which records answer the question.
4. Code pulls those records from `worker/records.ts`, flags any place the camera contradicts
   them, and writes the line shown on screen from the records it cited.
5. The same model phrases the spoken answer from that briefing only, and Deepgram Aura says it.
6. Holds run only after you tap Confirm. The recap collects everything for the leasing team.

## What's in the repo

- `worker/`: the API. `records.ts` is the unit's records, `index.ts` decides the facts,
  `cerebras.ts` and `workers-ai.ts` call the models.
- `src/`: the phone web app. `Walk.tsx` is the sample tour.
- `docs/`: the product write-up, research and the demo video.
- `videos/`: the demo film, made in code with Remotion. `scripts/capture.ts` runs the tour through
  the live app and saves what it really said.
- `AGENTS.md`, `docs/agents/`: notes for the AI coding agents I built this with.
- `tools/oxlint/`: lint rules the code has to pass.

## Credits

Footage in the film and the sample tour: "The washing machine that is being operated" by
Fitrah 9131 (CC BY-SA 3.0) and "Viennese apartment" by UE4Arch.com (CC BY-SA 4.0), both from
Wikimedia Commons, trimmed, cropped and slowed. The film and room stills are shared under
CC BY-SA 4.0. Details in `videos/public/clips/README.md`.
