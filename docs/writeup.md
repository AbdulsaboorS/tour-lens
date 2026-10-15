# Tour Lens: letting the self-guided tour see

I was doing research into the verticals EliseAI operates in, and I was honestly expecting to find
this feature somewhere. Point your phone at something during a tour, ask about it, get a real
answer. I couldn't find it at EliseAI or at any of the other tour products. So I built it.

## The problem

Self-guided tours have a lot of ambiguity. You're alone in the unit, you see a washer, or some
space, and you start wondering. Would my washer fit here? How big is this room? Is that included?
Today you'd have to text or call the question in and describe the thing in words. That takes time
and it's annoying, so I assume most people won't bother.

When someone is there answering your questions, the whole experience feels different. There's a
sense of comfort and trust. That's what I wanted the self-guided tour to have.

Camera assistants like ChatGPT and Gemini Live can see the washer, but they don't know the
building. They'll tell you what a washer like that usually is, not what Unit 4B's spec sheet says.

## What it does

Point your phone at something, tap, and ask out loud. It answers from the unit's own records and
shows the source. In the demo:

- **"What kind of washer is this? Can I use pods?"** The spec sheet says top-load, the camera sees a
  front-loader. Instead of repeating the listing, it says so and flags it for the leasing team.
- **"Does this furniture come with it? How big is this room?"** Staging only, and the real size
  from the floor plan.
- **"Can you hold it for me?"** It asks first, and only holds after you tap Confirm.
- **Recap:** the leasing team gets what the prospect pointed at, what they asked, any flags, and
  how the tour ended.

## The one rule

It only says what the records say. A wrong rent number on a tour isn't a funny AI mistake, it's a
trust and compliance problem for the operator.

So the model looks and talks, and code decides the facts. The vision model only says what's in
frame. A routing model only picks which records apply. Plain code pulls those records, checks them
against what the camera saw, and hands the speaking model a briefing it can't go outside of. Even
the short line on screen comes from the records, not the model.

## Why EliseAI

AI-Guided Tours already owns the moment: the prospect is unlocked into the unit and talking to
Elise. The Engrain map already knows where they're standing. Tour Lens adds what they're looking
at, using property data and VoiceAI that Elise already has.

## What was hard

Voice latency is always annoying to work with. Every question goes through transcription,
vision, routing, phrasing and speech. I've worked on voice AI before, and we ran evals on each
step to see where the time and the mistakes were. It's good enough for a prototype now, about 3
to 5 seconds a question on free model tiers.

The other surprise: models are great at talking and bad at short exact text. The on-screen
headline kept coming out as "No couch" or rounding "14 ft 2 in" to "14 ft". So I moved that into
code too. Same rule as everything else.

## What I'd do next

Fine tune the experience and get it into beta alongside self-guided tours as soon as possible.
Real tours will teach more than more demo work.

1. **Use Jev for the decisions.** Jev is TypeSafe AI's "System One" model: instead of writing text,
   it returns typed decisions (yes/no, pick one, score) in well under a second. That's exactly the
   middle of this pipeline. The vision model would just describe the frame, and Jev would decide
   which records apply and whether the camera contradicts them. It's the one thing I'd add first
   and the biggest latency win. (TypeSafe's speed numbers are their own, so I'd eval it on our checks.)
2. Run it next to regular AI-Guided Tours at a few properties with good records.
3. Pull records from the PMS, and let the leasing team fix a flagged record in one tap.
4. Live voice you can interrupt, and push the recap into the CRM lead.

## What I'd measure

**Tour to application rate**, Tour Lens tours vs regular AI-Guided Tours at the same properties.
Also questions per tour, how often the records can't answer (the data gap), flags fixed per
property, and holds started on tour. Guardrails: answer time, wrong-fact reports, opt-outs.

## Risks

- **Wrong facts:** code owns the facts, plus a thumbs down on every answer that goes to the operator.
- **Privacy:** frames only go to the model call and aren't stored. Never used in occupied units.
- **Fair housing:** answers stick to unit and policy facts. No opinions on the neighborhood.

## How the demo is built

A phone web app (React) on a Cloudflare Worker. Whisper transcribes and Mistral Small 3.1 looks
(Cloudflare Workers AI), gpt-oss-120b on Cerebras routes and phrases, and Deepgram Aura speaks.
The property and people are made up. The film uses openly licensed footage, and every answer in
it is real output from the live app.
