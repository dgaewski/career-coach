---
type: user-profile
name: ""                              # your name
tracks: []                            # your target tracks — any labels you choose (e.g. backend, ml, product-design, icu)
level-band: [entry, early]            # which levels are in scope: entry | early | mid | senior
employment-types: [full-time]         # full-time | co-op | internship | contract
exclude: []                           # never-ingest domains/keywords (e.g. [power, utility])
resume-version: ""                    # e.g. 2026-06
# --- optional fields (delete a line to leave it unset = no constraint) ---
# comp-floor: 0                       # flag/deprioritize roles below this salary
# comp-target: 0                      # negotiation anchor for /coach
# work-auth: citizen                  # citizen | needs-sponsorship
# clearance: none                     # none | eligible | active
# work-mode: [remote, hybrid, onsite]
# relocate: willing                   # willing | no
# pivot: {from: "", into: []}         # career trajectory, e.g. {from: power, into: [robotics]}
geo-zones:                            # your regions + match weight (0–1); mark one home: true
  - {slug: home-metro, label: "Home metro", score: 1.0, home: true}
  - {slug: remote,     label: "Remote",     score: 1.0}
---
One-line positioning statement the coach uses (edit me).
