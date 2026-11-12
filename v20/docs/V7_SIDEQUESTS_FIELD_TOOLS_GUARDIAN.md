# Dabt PRO v7.0 — Side Quests, Field Tools & Guardian Finale

## Scope
This release advances the Phaser 4 adventure runtime from the v6.5 baseline.

### Side quests
- One persistent optional side quest in each world, introduced by the guide NPC.
- The player collects any two relics from that world, then returns to the guide.
- Quest state is stored separately for the island and planetary campaign.
- Reward: **بوصلة المدّ** in Treasure Island; **ماسح الأطياف** in Planet Journey.

### Field tool use
- Press **T** near an unsolved clue after receiving the tool.
- The tool surfaces the authored environmental clue/introduction as a field hint.
- It does not reveal the answer or mark the encounter solved.
- Quest status and tool ownership appear in the travel journal and HUD.

### Final guardian
- Completing the last area's ordinary clues opens a final sequence-recall challenge.
- Island and planetary worlds use different authored four-symbol sequences.
- The sequence is shown briefly, hidden, then recalled by clicking/tapping the symbols.
- Three attempts are available per encounter; successful completion is persisted.
- Existing area completion and campaign exit then proceed.

### Persistence
- Save namespace advanced to `dabt-pro-phaser-v70`.
- On first load, v6.0 save data is migrated forward so existing progress/relics are retained.
- New quest, tool and guardian flags are stored locally in browser LocalStorage.

## Validation
- `node --check engine-phaser/src/main.js` — PASS
- `node qa/test_phaser_v55.mjs` — PASS
- `node qa/test_v60_campaign.mjs` — PASS
- `node qa/test_v70_quests_guardian.mjs` — PASS
- ZIP integrity — to be checked at packaging.

## Known limitations
- Validation is source-level. No claim is made of a successful Vite production build or interactive browser/device playthrough in this environment.
- The field tools provide authored hints; they are not physics-based scanning systems.
- The guardian is a sequence-memory encounter, not a real-time combat boss.
- This release does not yet add bespoke painted backgrounds for all 15 campaign areas.
