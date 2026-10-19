# PROMPT G4 — THE FIXED-POSITION FLIGHT ILLUSION

Read docs/06_FLIGHT_TIMELINE.md and examples/flight-timeline.ts and docs/10_INTERACTION_STATE.md.

Build one authoritative timeline state machine and pure `evaluateFlightFrame(time)` for phases: spin deceleration, wheel spin, turntable lowering/fading, jet slight rise, doors opening, landing gear retracting inside hull, doors closing, aircraft hover with tiny bob. The aircraft world anchor **must remain x=0,z=0** the entire time; only small Y rise allowed. Parallax and wind will create apparent velocity later. All door and gear pivots **must** be separate and geometry must visibly move, not just opacity toggle. Deliver a legal return sequence with doors opening, gear extending, closing, jet lowering, base reappearing, camera restore. Test 0,.7,1.8,3,3.6,4.7,5.4,7s, and 10 replays. Pause/resume must not break gears.

Do not implement true-world fighter operations or tactical dynamics; only cinematic art animation.
