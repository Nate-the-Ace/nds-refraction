// Checks that every level has a working solution and is not solved at the start.
const E = require('../src/engine.js');
const { LEVELS } = require('../src/levels.js');
let bad = 0;
LEVELS.forEach((lv, n) => {
  const ps = JSON.parse(JSON.stringify(lv.pieces)).map(E.normalize);
  const start = E.trace(ps).res;
  if (start.length && start.every(r => r.lit)) { console.log(`FAIL ${n + 1} ${lv.name}: solved at start`); bad++; }
  for (const k in lv.sol) {
    const s = lv.sol[k];
    ps[k].x = s[0]; ps[k].y = s[1]; ps[k].a = s[2] * Math.PI / 180;
    if (s.length > 3) ps[k].ax = s[3];
  }
  const res = E.trace(ps).res;
  const ok = res.every(r => r.lit);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(n + 1).padStart(2)} ${lv.name}`);
});
process.exit(bad ? 1 : 0);
