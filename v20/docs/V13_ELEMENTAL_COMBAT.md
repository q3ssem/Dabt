# V13 — Elemental Combat & Environmental Tactics

## Implemented
- Player can select water, light, energy, or fire and apply it to a nearby guardian.
- Water slows the guardian, light briefly stuns it, energy disables it, and fire damages it.
- Fire requires two successful hits to defeat the basic guardian.
- Defeated state is persisted per world area.
- Enemy AI respects temporary slow, stun, and disable states.
- Pure combat rules are separated from Phaser scene code and covered by deterministic tests.

## Controls
- Keyboard 1–4 selects an element; E applies the selected element to a nearby guardian.
- Touch element buttons select an element; the E touch control applies it when in range.

## Boundaries
- The same guardian currently has a shared elemental response table; bespoke enemy resistances and multi-enemy encounters remain future work.
- Water/light/energy are temporary control effects, not damage.
- No claim is made that every element puzzle or boss is already integrated with these combat effects.
- Browser/device playtesting remains a release gate.
