/* River puzzle progression tuning — visual/game rules remain unchanged. */
(function () {
  const original = rvMake;
  rvMake = function (lv) {
    const n = [3, 4, 4, 5, 5, 6, 6][lv - 1];
    // Level 7 keeps a two-item boat limit: more entities and rules should not
    // accidentally make the expert board easier than level 6.
    const cap = [1, 2, 1, 2, 2, 2, 2][lv - 1];
    if (lv === 1) return original(lv);
    let best = null;
    // Level 3 is a four-entity, one-seat crossing challenge. The former
    // three-rule threshold made it unsatisfiable for this relationship set,
    // silently falling back to the level-1 board.
    const minRules = lv === 3 ? 2 : Math.min(n - 1, 2 + (lv / 3 | 0));
    for (let t = 0; t < 240; t++) {
      const it = shuffle(Object.keys(RV)).slice(0, n);
      const conf = RV_EAT.filter(([a, b]) => it.includes(a) && it.includes(b))
        .map(([a, b]) => [it.indexOf(a), it.indexOf(b)]);
      if (conf.length < minRules) continue;
      const path = rvPath(n, cap, conf, 0);
      if (!path) continue;
      const min = path.length - 1;
      if (min <= 2 * n - 1 && cap > 1 && t < 180) continue;
      if (!best || min > best.min || (min === best.min && conf.length > best.conf.length)) {
        best = { it, cap, conf, min };
      }
    }
    // Retain a legal original board if random search ever fails; never silently
    // replace a later level with the introductory 3-entity puzzle.
    return best || original(lv);
  };
})();
