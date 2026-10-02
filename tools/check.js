// independent re-verification of generated levels using only the public level format
const E=require('../src/engine.js');const {makeGen}=require('../src/gen.js');
const G=makeGen(E);
const N=+process.argv[2]||20;let bad=0,n=0;
for(const t of [1,2,3,4,5])for(let s=1;s<=N;s++){
  const lv=G.make(s,t);if(!lv){console.log('NULL',t,s);bad++;continue}n++;
  const ps=JSON.parse(JSON.stringify(lv.pieces)).map(E.normalize);
  const st=E.trace(ps).res;
  if(st.every(r=>r.lit))console.log('SOLVED AT START',lv.family,t,s),bad++;
  for(const k in lv.sol){const q=lv.sol[k];ps[k].x=q[0];ps[k].y=q[1];ps[k].a=q[2]*Math.PI/180;if(q.length>3)ps[k].ax=q[3]}
  const res=E.trace(ps).res;
  if(!res.every(r=>r.lit))console.log('SOL FAILS',lv.family,t,s),bad++;
  for(const k in lv.sol){if(lv.pieces[k].fixed)console.log('FIXED IN SOL',lv.family,t,s),bad++}
}
console.log('checked',n,'bad',bad);
