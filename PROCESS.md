# Process overview

## What I built

A Career Central prototype: student-ID-gated coaching bookings, five
guides, a curated jobs directory, and a community show-of-hands — expanded
from a single booking slice into a small hub.

## How I got here

I started narrow: a login-gated booking flow for financial/contract
queries, each booking landing on its own confirmation page rather than a
shared board, for privacy
([`70c4965`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-p-venkatram/commit/70c4965)).

To explore a fuller product vision, I ran Wix's AI site-builder through its
own onboarding questions and used the brief it generated as a starting
prompt. It came back wanting job listings, "Wix Groups," and a fabricated
student success story — none of which fit this stack or the course's
honesty bar. Before building, I set three guardrails: real external
job-board links instead of invented postings, a native join/leave
interest-tally instead of literal Wix Groups, and an explicitly-labelled
illustrative testimonial with no real name or photo
([`577c248`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-p-venkatram/commit/577c248)).

Getting the look right took several rounds I had to call out directly: a
nav that wrapped at normal widths, a "symmetric" pass that stranded an odd
card alone in guides and centred a page I wanted left-aligned instead, and
a raw student ID leaking into the nav. Each fix was checked against a live
localhost run, not just the 119-test suite.

I checked ANU's real Career Central site myself for the flow it actually
offers, which shaped what this adds rather than duplicates. Facts in the
guides (ANU+ mechanics, the super rate, the job-board URLs) were checked
while writing them, but a fuller fact-check pass is still outstanding
before this ships.
