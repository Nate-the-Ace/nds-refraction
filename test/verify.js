// Checks that every level has a working solution and is not solved at the start.
const E = require('../src/engine.js');
const { LEVELS: HAND } = require('../src/levels.js');
const { GEN_LEVELS } = require('../src/levels_gen.js');
const LEVELS = HAND.concat(GEN_LEVELS);
let bad = 0;
const names = new Set();
LEVELS.forEach((lv, n) => {
  const ps = JSON.parse(JSON.stringify(lv.pieces)).map(E.normalize);
  const start = E.trace(ps).res;
  if (start.length && start.every(r => r.lit)) { console.log(`FAIL ${n + 1} ${lv.name}: solved at start`); bad++; }
  if (names.has(lv.name)) { console.log(`FAIL ${n + 1} ${lv.name}: duplicate name`); bad++; }
  names.add(lv.name);
  for (const k in lv.sol) {
    if (lv.pieces[k].fixed) { console.log(`FAIL ${n + 1} ${lv.name}: solution moves a fixed piece`); bad++; }
    const s = lv.sol[k];
    ps[k].x = s[0]; ps[k].y = s[1]; ps[k].a = s[2] * Math.PI / 180;
    if (s.length > 3) ps[k].ax = s[3];
  }
  const res = E.trace(ps).res;
  const ok = res.every(r => r.lit);
  if (!ok) bad++;
  if (n < 25 || !ok) console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(n + 1).padStart(3)} ${lv.name}`);
});
console.log(`${LEVELS.length} levels, ${bad ? bad + ' failing' : 'all solvable'}`);
process.exit(bad ? 1 : 0);
