---
target: src/app/(public)/city/page.tsx
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-13T19-42-23Z
slug: src-app-public-city-page-tsx
---
Method: dual-agent (A: 019ffc9d-afd6-7943-bdba-d9ecd7dd3f90 · B: 019ffc9d-afd7-7dc0-bc94-1ea1318abee3). Detector CLI re-run by parent: `[]` / exit 0. Browser overlay not injected (no mutation API in this session). Live HTML at localhost:3000/city confirmed after the fix.

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Tab current is clear; skeleton missed the page h1 |
| 2 | Match System / Real World | 3 | Cities are the unit; the word 「지역」 is the tab echo |
| 3 | User Control and Freedom | 3 | Tab, search, tiles all exit; no trap |
| 4 | Consistency and Standards | 2 | Page-title token used on a section; sibling indexes have one h1 |
| 5 | Error Prevention | 2 | 「많이 간 도시」 read as a control (home rail pattern) |
| 6 | Recognition Rather Than Recall | 3 | Name + cut; cut is latest video, not a city icon |
| 7 | Flexibility and Efficiency | 2 | Popular-first is right; no in-page jump |
| 8 | Aesthetic and Minimalist Design | 3 | World is quiet; two 20px titles were extra chrome |
| 9 | Error Recovery | 3 | Empty is one line; little error surface |
| 10 | Help and Documentation | 2 | `blurb` / `openMap` not on screen |
| **Total** | | **26/40** | **Acceptable** |

#### Design Specificity Verdict

**LLM assessment**: Specific world, inverted hierarchy. White paper + coral-as-pin + uncropped 16:9 is authored. The failure is stacking two valid patterns (sibling-index `h1` + home-rail `h2`) so 「많이 간 도시」 looks tappable.

**Deterministic scan**: `detect.mjs` on `city/page.tsx` → `[]` / exit 0. TSX path does not run page analyzers.

**Visual overlays**: none. No user-visible overlay.

#### Overall Impression

The page already knew how to split popular vs rest. It then dressed the popular caption as a second page title. That one token misuse (`--t-screen` on an index section) created the fake affordance.

#### What's Working

1. Honest split at 8 places — grid for the cities that carry the data, rows for the tail.
2. World discipline: no coral fields, 16:9 frames, minor rows use `.roll`.
3. City name sits above the frame — scannable for people who arrive by city name.

#### Priority Issues

- **[P0] 「지역」 and 「많이 간 도시」 shared one face** — 20px/700/-0.03em, 12px apart. Home teaches “title + right slot = link”. Fix: keep `h1` as the tab echo; demote both section titles to `.index`.
- **[P1] Popular tiles had no press language** — `Link.block` only. Fix: name → `--wax` on hover/active; do not scale the frame.
- **[P1] Arrival promise is invisible** — map-open lives in `aria-label` only. Left as-is this pass (no new marketing line); tiles still carry the city name.
- **[P2] `last:border-b-0` on the Link** — every row is an only-child, so every hairline vanished. Fix: border on `li`.
- **[P3] Skeleton skipped the page h1** — paint then jump. Fix: 20px bone + index-label row matching the live header.

#### Persona Red Flags

**Jordan**: Two titles; taps the second; nothing happens.
**Casey**: Two 20px lines before the first tile; no press scale on tiles.
**「그 가게 어디였지」**: This is a city picker; search is the header icon. Cut may not be the video they remember.

#### Minor Observations

- Unused i18n: `cityIndex.title`, `regions`, `rowMeta`.
- `xl:max-w-6xl` layout vs page `max-w-lg` — intended column.
- EN 「Most mapped」 is staff language; KO is human.

#### Questions to Consider

1. If the tab already says 「지역」, does the body need to shout it again at 20px?
2. Is 「많이 간 도시」 a sentence or a grid caption?
3. Home taught “title + right = link”. Why reuse that row here with a statistic?
