# Adaptive training and nutrition

Reviewed 27 October 2026. This is Cat Power's implementation, not a programme authored or endorsed by the named coaches. No proprietary course materials were accessed.

## Public material consulted

- [Fabrício Pacholok](https://fabriciopacholok.com.br/): execution, recovery, recording loads and planned progression. The public page distinguishes progression from frequently replacing a programme.
- [Hany Rambod / Evogen](https://www.evogennutrition.com/blogs/news/rest-period-timing): rest during heavy work and execution. [Increasing weight](https://www.evogennutrition.com/blogs/news/increase-the-weight) discusses repetition ranges and sufficient rest.
- [Chris Aceto, bylined article](https://www.muscleandfitness.com/nutrition/gain-mass/eat-yourself-huge-2/): reviewing the response to food intake over weeks. We use that general feedback principle, not its aggressive meal changes or claims about carbohydrate timing.
- [Milos Sarcev's JYM demonstration](https://jymsupplementscience.com/blogs/articles/pounding-chest-with-milos-sarcev-giant-sets): different equipment and angles for the chest. This app uses controlled variant blocks, not the demonstrated competitive giant-set routine or supplement protocol.
- [Matt Jansen, first-person article](https://www.projectad.me/blogs/news/matt-jansen-s-pre-contest-training-program-during-the-final-phase-of-prep): warm-up and context-dependent effort. Its contest-preparation failure/forced-repetition scheme is not used.
- [Júlio Balestrin public beginner-training series](https://www.youtube.com/playlist?list=PLx6UfnuK_tlah9Vxgr3RduwmOhzZ8jloB): located from indexed programme metadata. A verifiable transcript was unavailable; no numerical rule is attributed to its videos.
- [Ricardo Pannain / Team Pannain](https://teampannain.com/): public description of combined training and nutrition services. The public page does not disclose the individual prescription; no specific set/repetition rule is attributed to him.
- [Rubens Gomes / Overall Team](https://overallteam.com.br/): public description of periodic training and diet reviews. Private worksheets were not consulted.
- [Kassiano et al., 2022 systematic review](https://pubmed.ncbi.nlm.nih.gov/35438660/): systematic variation may be useful; excessive random changes can compromise adaptation.
- [Iraki et al., 2019 nutrition review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/): protein, distribution of intake, energy balance and conservative adjustments according to experience. The existing gain-mass target of 2 g protein/kg lies within its 1.6–2.2 g/kg range.

## App-specific decisions

The four-session A/B/C/D sequence still follows completed, identified training. Generic imported strength sessions require classification; cardio does not advance strength rotation.

Within each exercise slot, completed records with real repetition sets determine exposure. There is no calendar-based variant rotation. Machines and cables are preferred for a first block when present in the existing illustrated catalogue. Compounds stay for six exposures and isolation/core for four. These counts are engineering defaults, not a shared prescription from the coaches. After three complete normal-recovery exposures, with the same first-set load and reported RIR of 1–3, a failure to exceed the first exposure's first-set repetitions can bring the next variant forward. This is a simple review signal, not a diagnosis of physiological stagnation.

An active draft pins exercise identities, including across imports and reloads. Saved workouts retain actual variant IDs, sets, RIR and recovery. Manual substitution is refused when that slot already contains entered sets. Loads and comparisons remain specific to the same exercise ID and machine model; no conversion between equipment is inferred.

Double progression requires the upper repetition target in every planned set at the same weight and at least one reported repetition in reserve. Failure is not a reason to increase load. A six-week gap produces a lower initial suggestion. A tired-day check-in reduces proposed volume and initial load while preserving entered rows; a pain check-in suppresses load suggestions and shows stop/evaluation guidance. Calendar-based fifth-week reduced effort is retained as a baseline, with its status explained as a proposal.

The progress view compares recorded first working sets within the same variant. It groups logged sets by the slot's principal focus. It does not infer hypertrophy or muscle mass from scale weight, heart rate or lifted tonnage.

Food targets continue to use the stored profile and explicit goal. A trend review needs six distinct dated weights spanning at least 14 days, plus measurements in both recent weeks. Applying a 150 kcal change requires the user to report approximate adherence, is limited to once per 14 days, and is bounded to an accumulated ±600 kcal adjustment. The exact thresholds are app defaults. Watch calories are not automatically added to the target. Suggestions are recalculated locally when the user opens the relevant view or saves data; there is no remote monitoring service.

## Verification

`npm test`, `npm run build`, `npx cap sync android`, `git diff --check`. Regression fixtures cover exposure blocks, comparable plateau signals, draft preservation, RIR/recovery save/reload/edit, pain/failure behavior, nutrition data requirements, adherence, repeat-adjustment cooldown, bounds, and both existing workout/watch workflows. Health Connect responses are mocked; no physical phone or watch is available here.
