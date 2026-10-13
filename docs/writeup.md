# Tour Lens: let the self-guided tour see

I applied for a PM role at EliseAI. Instead of only telling you how I think about product, I
built the feature I'd want to ship first. This is the one-pager behind the demo video.

## The gap

On an AI-Guided Tour the prospect is alone in the unit with a question. Today they text it or
call it in, and they have to describe the thing in words: "the washer in the closet, is it
stacked?" That's slow, and most people won't bother. The question dies, and so does the
moment when they were most interested.

Phone camera assistants (ChatGPT, Gemini Live) can see the washer, but they don't know this
building. They'll tell you what an LG washer usually is, not what the spec sheet for Unit 4B
says, and not that pods are allowed under section 6 of the handbook.

No tour product I could find does camera + voice + answers from the property's own records +
leasing actions. Notes are in `research.md`.

## What it does

Hold the button, point at something, ask out loud.

1. **Washer:** "What's this, and can I use pods?" The answer comes from the spec sheet and the
   handbook, with both sources shown.
2. **Records mismatch:** the spec sheet says it's an LG washer. The camera sees a Samsung.
   The agent says so, and flags it for the leasing team instead of repeating the listing.
3. **Window:** "What's the view like? Is there a better one?" It answers for 4B, then compares
   against the other open units.
4. **Couch:** "Will a couch like this fit?" It gives the real wall length from the floor plan,
   instead of eyeballing.
5. **Desk:** "Can I work from home here?" It gives the internet provider, speeds and the
   coworking lounge.
6. **Hold:** "Hold this for me." It asks first, then holds only after the prospect taps Confirm.
7. **Recap:** the leasing team gets what the prospect pointed at, what they asked, any records
   flags, and the outcome.

## The one rule

The model looks and talks. Code decides the facts.

The vision model only routes. It says what it sees, picks which records apply, and answers
yes/no visual checks ("is this washer an LG?"). Plain code pulls those records, compares the
checks against what the records claim, and hands the speaking model a briefing. The speaking
model can only use what's in that briefing. Every answer shows its sources. Holds and
applications never run on the model's say-so.

That's the thing that makes it shippable for operators. A wrong rent number on a tour is a trust and
compliance problem, not a funny hallucination.

## Why EliseAI, and why now

- AI-Guided Tours already owns the moment: the prospect is unlocked into the unit and talking
  to Elise. The unlock event tells you which unit they're in, so "what's the view like" has a
  right answer.
- Elise already has the property data (CRM/PMS sync) and VoiceAI. This feature mostly connects
  pieces that exist.
- Apollo shows the direction: agentic, text and voice. Vision is the missing sense.
- Elise says it touches 1 in 6 US apartments. At that scale even a small lift in tour-to-application rate is a lot of leases.

## What I'd measure

Main metric: **tour to application rate**, Tour Lens tours vs regular AI-Guided Tours, same
properties, randomized by booking.

Supporting:
- Questions asked per tour (do people ask more when they can just point?)
- Share of answers with a cited record vs "records don't cover it" (that's the data coverage gap)
- Records flags per property, and how many got fixed (listing quality as a side effect)
- Holds started from the tour, and hold to application conversion
- Leasing team follow-up time when a recap exists vs when it doesn't

Guardrails: answer latency (p50 under 3 seconds), wrong-fact reports, opt-out rate.

## Risks and how I'd handle them

- **Wrong facts.** Handled by design: code owns facts, and the model can only cite. Ship with a
  thumbs down on every answer that goes straight to the operator.
- **Stale records.** The mismatch flag turns this into a feature. Tours become free listing audits.
- **Privacy.** Cameras in someone's future home. Frames go only to the model call, aren't stored,
  and the prospect sees a clear camera indicator. Never on occupied units.
- **Fair housing.** Answers are limited to unit and policy facts. No neighborhood "vibe" opinions.
- **Cost.** One frame and one utterance per question, at low image detail. That's a few cents per question.

## What I'd build next

1. Live voice you can interrupt (realtime audio) instead of push-to-talk.
2. Pull records from the PMS instead of a file, and let the leasing team fix a flagged record in one tap.
3. Use the Engrain map position to know which room you're in without asking.
4. Push the recap into the CRM lead so the follow-up text references what they actually asked about.

## How this demo is built

A phone web app (React) and a Cloudflare Worker. Cloudflare Workers AI handles transcription
(Whisper), vision routing and phrasing (Mistral Small 3.1) and speech (Deepgram Aura), so the
demo costs nothing to run. About 4 to 6 seconds per question today. A production version would
use a faster realtime model and stream the voice. The property, units and people are made up. The "unit" is my house.
