# State gate / event matrix

| Current | Event | Result | Notes |
|---|---|---|---|
| SHOWROOM | SELECT_PART | INSPECT | valid ID |
| INSPECT | DESELECT_PART | SHOWROOM | camera restored |
| SHOWROOM | TOGGLE_EXPLODE | EXPLODED | progress →1 |
| EXPLODED | SET_EXPLODE_PROGRESS(0) | SHOWROOM | restore rest poses |
| EXPLODED | START_FLIGHT | BLOCKED | disable CTA and explain |
| INSPECT | START_FLIGHT | BLOCKED | deselect first |
| SHOWROOM | START_FLIGHT | FLIGHT_TRANSITION | fully assembled |
| FLIGHT_TRANSITION | PAUSE_FLIGHT | paused transition | no pose jump |
| FLIGHT_TRANSITION | COMPLETE_FLIGHT | HOVER | gear inside, doors closed |
| HOVER | RETURN_TO_SHOWROOM | RETURN_TRANSITION | legal gear-extend choreography |
| RETURN_TRANSITION | COMPLETE_RETURN | SHOWROOM | platform visible and restored |
| ERROR | RETRY | LOADING | attempts reload |

Invariant: `anchorX = anchorZ = 0` for all flight poses. `platformOpacity > 0` cannot mean model is parented to platform. The UI does not directly mutate renderer refs.
