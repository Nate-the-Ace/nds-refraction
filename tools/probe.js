const E=require('../src/engine.js');const {makeGen}=require('../src/gen.js');
const G=makeGen(E);
const fams=process.argv[2]?process.argv[2].split(','):Object.keys(G.FAMS);
const tiers=process.argv[3]?process.argv[3].split(',').map(Number):[1,2,3,4,5];
const N=+process.argv[4]||6;
for(const f of fams){
  for(const t of tiers){
    let ok=0,ms=0;const t0=Date.now();
    for(let s=1;s<=N;s++){const lv=G.make(s,t,f,60);if(lv)ok++}
    console.log(f.padEnd(9),'tier',t,'ok',ok+'/'+N,'avg ms',Math.round((Date.now()-t0)/N));
  }
}
