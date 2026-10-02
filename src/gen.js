// Level generator. Every level is built from a known solution, scrambled, then checked
// with the real engine, so every generated level is solvable. Same seed, same level.
// makeGen(engine) returns {make, TIERS}. Runs in Node and in the browser.
function makeGen(E){
const normalize=E.normalize,trace=E.trace,WL=E.WL;
const R=Math.PI/180;
const RED=[620,700],GRN=[520,570],BLU=[420,480],MONO=[595,605],WHITE=[400,700];
const clone=o=>JSON.parse(JSON.stringify(o));
function mulberry(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
const ri=(rnd,a,b)=>a+Math.floor(rnd()*(b-a+1));
const rr=(rnd,a,b)=>a+rnd()*(b-a);
const pick=(rnd,arr)=>arr[Math.floor(rnd()*arr.length)];
function shuffle(rnd,arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const r5=v=>Math.round(v/5)*5;
const n360=a=>((a%360)+360)%360;
const m180=a=>{a=((a%180)+180)%180;return a>90?a-180:a};
const W=1000,H=600;
const TURNS=[];for(let t=40;t<=130;t+=10){TURNS.push(t,-t)}
const NICE=[0.03,0.05,0.08,0.1,0.15,0.2,0.25,0.3,0.4,0.5,0.6,0.7,0.8,0.9];
const DIALV={zlens:[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5],pol:[0,22.5,45,67.5,90,112.5,135,157.5],hwp:[0,22.5,45,67.5,90,112.5,135,157.5],pbs:[0,22.5,45,67.5,90,112.5,135,157.5],phase:[0,45,90,135,180,225,270,315]};
const DISCT={pol:1,hwp:1,phase:1};

// ---------- geometry
const dv=a=>[Math.cos(a*R),Math.sin(a*R)];
function turnMirror(din,dout){
  const a=dv(din),b=dv(dout);
  return r5(m180(Math.atan2(b[1]-a[1],b[0]-a[0])/R+90));
}
function pSeg(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;let t=l2?((px-x1)*dx+(py-y1)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(px-x1-t*dx,py-y1-t*dy)}
function segInter(ax,ay,bx,by,cx,cy,dx,dy){const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(d)<1e-9)return false;const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d,u=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d;return t>=0&&t<=1&&u>=0&&u<=1}
function segDist(a,b,c,d,e,f,g,h){
  if(segInter(a,b,c,d,e,f,g,h))return 0;
  return Math.min(pSeg(a,b,e,f,g,h),pSeg(c,d,e,f,g,h),pSeg(e,f,a,b,c,d),pSeg(g,h,a,b,c,d));
}
const inB=(x,y,m)=>x>=m&&x<=W-m&&y>=m&&y<=H-m;
function nodeSeg(n,len){
  const a=(n.k==='branch'?turnMirror(n.din,n.dside):turnMirror(n.din,n.dout))*R,h=(len||100)/2;
  return [n.x-Math.cos(a)*h,n.y-Math.sin(a)*h,n.x+Math.cos(a)*h,n.y+Math.sin(a)*h];
}

// ---------- tree of beam paths
// node kinds: turn (mirror), branch (splitter-like, a = straight child, b = side child), goal (leaf)
function growTree(rnd,o){
  const margin=o.margin||55,gap=o.legGap||45;
  for(let att=0;att<(o.tries||600);att++){
    const nodes=[],legs=[];let fail=false;
    const d0=o.d0!==undefined?o.d0:10*ri(rnd,0,35);
    const sx=o.sx||rr(rnd,70,930),sy=o.sy||rr(rnd,70,530);
    const ext=(x,y,d,s,m,par,first)=>{
      if(fail)return null;
      const L=first&&o.firstL?o.firstL:rr(rnd,o.minL||120,o.maxL||300);
      const nx=x+Math.cos(d*R)*L,ny=y+Math.sin(d*R)*L;
      if(!inB(nx,ny,margin)){fail=true;return null}
      const node={x:nx,y:ny,din:d,par,k:'goal'};
      legs.push({x1:x,y1:y,x2:nx,y2:ny,d,len:L,to:node,from:par});
      nodes.push(node);
      if(s>0&&(m===0||rnd()<0.5)){
        node.k='branch';node.dside=n360(d+pick(rnd,TURNS));
        const sa=ri(rnd,0,s-1),sb=s-1-sa,ma=ri(rnd,0,m),mb=m-ma;
        node.a=ext(nx,ny,d,sa,ma,node);node.b=ext(nx,ny,node.dside,sb,mb,node);
      }else if(m>0){
        node.k='turn';node.dout=n360(d+pick(rnd,TURNS));
        node.next=ext(nx,ny,node.dout,s,m-1,node);
      }
      return node;
    };
    const first=ext(sx,sy,d0,o.splits||0,o.turns||0,null,true);
    if(fail)continue;
    if(layoutOk(sx,sy,nodes,legs,gap,o.nodeGap))return {sx,sy,d0,first,nodes,legs};
  }
  return null;
}
function layoutOk(sx,sy,nodes,legs,gap,nodeGap){
  const ng=nodeGap||115;
  for(let i=0;i<nodes.length;i++){
    const a=nodes[i];
    if(Math.hypot(a.x-sx,a.y-sy)<110)return false;
    for(let j=i+1;j<nodes.length;j++){
      const b=nodes[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<(a.k==='goal'||b.k==='goal'?85:ng))return false;
    }
  }
  const share=(p,q)=>p.to===q.to||p.to===q.from||q.to===p.from||(p.from===q.from&&p.from);
  for(let i=0;i<legs.length;i++)for(let j=i+1;j<legs.length;j++){
    const p=legs[i],q=legs[j];if(share(p,q))continue;
    if(segDist(p.x1,p.y1,p.x2,p.y2,q.x1,q.y1,q.x2,q.y2)<gap)return false;
  }
  for(const n of nodes){
    if(n.k==='goal')continue;
    const s=nodeSeg(n);
    for(const l of legs){
      if(l.to===n||l.from===n)continue;
      if(segDist(s[0],s[1],s[2],s[3],l.x1,l.y1,l.x2,l.y2)<24)return false;
    }
    // own legs must not graze the node's other half
    for(const l of legs){
      if(l.to!==n&&l.from!==n)continue;
      const d1=pSeg(l.x1,l.y1,s[0],s[1],s[2],s[3]),d2=pSeg(l.x2,l.y2,s[0],s[1],s[2],s[3]);
      if(Math.min(d1,d2)>1&&false)return false;
    }
  }
  return true;
}

// ---------- walls
function toLocal(w,x,y){const a=-w.a*R,dx=x-w.x,dy=y-w.y;return [dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]}
function wallPtDist(w,x,y){
  const [u,v]=toLocal(w,x,y),du=Math.max(Math.abs(u)-w.w/2,0),dvv=Math.max(Math.abs(v)-w.h/2,0);
  return Math.hypot(du,dvv);
}
function wallHitsSeg(w,x1,y1,x2,y2,m){
  const [u1,v1]=toLocal(w,x1,y1),[u2,v2]=toLocal(w,x2,y2),hu=w.w/2+m,hv=w.h/2+m;
  let t0=0,t1=1;const du=u2-u1,dvv=v2-v1;
  for(const [p,d,h] of [[u1,du,hu],[v1,dvv,hv]]){
    if(Math.abs(d)<1e-9){if(Math.abs(p)>h)return false}
    else{let a=(-h-p)/d,b=(h-p)/d;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return false}
  }
  return true;
}
function wallInBoard(w){
  const c=Math.cos(w.a*R),s=Math.sin(w.a*R);
  for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
    const x=w.x+u*w.w/2*c-v*w.h/2*s,y=w.y+u*w.w/2*s+v*w.h/2*c;
    if(x<8||x>W-8||y<8||y>H-8)return false;
  }
  return true;
}
// keep: {legs:[{x1..y2}], pts:[[x,y,r]], walls:[...]}
function wallClear(w,keep,beamHalf){
  if(!wallInBoard(w))return false;
  for(const l of keep.legs)if(wallHitsSeg(w,l.x1,l.y1,l.x2,l.y2,28+(beamHalf||0)))return false;
  for(const [x,y,r] of keep.pts)if(wallPtDist(w,x,y)<r)return false;
  for(const o of keep.walls)if(Math.hypot(o.x-w.x,o.y-w.y)<(o.h+w.h)/2*0.6+30)return false;
  return true;
}
function addWalls(rnd,sp,keep,count,chord,beamHalf){
  const walls=[];keep.walls=walls;
  if(chord){
    for(let t=0;t<30&&!walls.length;t++){
      const f=rr(rnd,0.3,0.7),cx=chord[0]+(chord[2]-chord[0])*f,cy=chord[1]+(chord[3]-chord[1])*f;
      const ang=Math.atan2(chord[3]-chord[1],chord[2]-chord[0])/R;
      const w={t:'wall',x:Math.round(cx),y:Math.round(cy),w:30,h:5*ri(rnd,40,70),a:Math.round(ang/5)*5,fixed:1};
      if(wallClear(w,keep,beamHalf))walls.push(w);
    }
  }
  for(let t=0;t<200&&walls.length<count;t++){
    const w={t:'wall',x:5*ri(rnd,14,186),y:5*ri(rnd,10,110),w:30,h:5*ri(rnd,20,50),a:15*ri(rnd,0,11),fixed:1};
    if(wallClear(w,keep,beamHalf))walls.push(w);
  }
  for(const w of walls)sp.fix.push(w);
}

// ---------- spec helpers
function newSpec(){return {emit:[],fix:[],mov:[],decoys:[],goals:[],legs:[],pts:[],meta:{},allowFail:0,wall:0}}
function mirrorPiece(n){return {t:'mirror',x:n.x,y:n.y,a:turnMirror(n.din,n.dout)}}
function legList(tree){return tree.legs.map(l=>({x1:l.x1,y1:l.y1,x2:l.x2,y2:l.y2}))}
function nodePts(tree,r){return tree.nodes.map(n=>[n.x,n.y,r||80]).concat([[tree.sx,tree.sy,70]])}
// pick spots on legs: returns [{x,y,d,leg}]
function spots(rnd,tree,count,edge,apart,fromLegs){
  const out=[];
  const legs=(fromLegs||tree.legs).filter(l=>l.len>=2*edge+10);
  if(!legs.length)return null;
  for(let tries=0;tries<200&&out.length<count;tries++){
    const l=pick(rnd,legs),u=rr(rnd,edge,l.len-edge),d=dv(l.d);
    const x=l.x1+d[0]*u,y=l.y1+d[1]*u;
    if(out.some(o=>Math.hypot(o.x-x,o.y-y)<apart))continue;
    if(tree.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<edge))continue;
    out.push({x,y,d:l.d,leg:l});
  }
  return out.length===count?out:null;
}
function emitterAt(tree,band,extra){return Object.assign({t:'emit',x:tree.sx,y:tree.sy,a:tree.d0,band,fixed:1},extra||{})}
function goalPiece(n,band,extra){return Object.assign({t:'goal',x:n.x,y:n.y,band,r:15,fixed:1},extra||{})}
function addMov(sp,p,extra){sp.mov.push(Object.assign({p},extra||{}))}
function makeGoal(sp,p,rl,extra){sp.goals.push(Object.assign({p,rl:rl||[13,16,20,25]},extra||{}))}
function addTreePieces(sp,tree,opt){
  // standard realisation: turn->mirror, branch->kind per opt.branch, goals via opt.goal(node)
  for(const n of tree.nodes){
    if(n.k==='turn')addMov(sp,mirrorPiece(n));
    else if(n.k==='branch'){
      const a=turnMirror(n.din,n.dside);
      opt.branch(n,a);
    }else opt.goal(n);
  }
}

// ---------- assemble / evaluate
function assemble(sp,st){
  const arr=[];
  for(const p of sp.emit)arr.push(clone(p));
  for(const p of sp.fix)arr.push(clone(p));
  sp.mov.forEach((m,i)=>{
    const p=clone(m.p),s=st&&st[i];
    if(s){p.x=s.x;p.y=s.y;if(s.a!==undefined)p.a=s.a;if(s.ax!==undefined)p.ax=s.ax}
    arr.push(p);
  });
  for(const p of sp.decoys)arr.push(clone(p));
  for(const g of sp.goals)arr.push(clone(g.p));
  return arr;
}
function evalRaw(raw){return trace(raw.map(normalize))}
function allLit(res){return res.length>0&&res.every(r=>r.lit)}
const solved=(sp,st)=>allLit(evalRaw(assemble(sp,st)).res);

function snapMov(sp){
  for(const m of sp.mov){
    const p=m.p;
    if(p.rail===undefined){p.x=r5(p.x);p.y=r5(p.y)}
    if(!DISCT[p.t]&&p.t!=='prism'&&!p.norot)p.a=r5(p.a);
    if(DISCT[p.t])p.a=0;
  }
}
function neighbours(sp){
  const out=[];
  sp.mov.forEach((m,i)=>{
    const p=m.p,ds=p.rail!==undefined?(()=>{const c=Math.cos(p.rail*R),s=Math.sin(p.rail*R);return [[5*c,5*s],[-5*c,-5*s]]})():[[5,0],[-5,0],[0,5],[0,-5]];
    for(const [dx,dy] of ds){
      const st=sp.mov.map(mm=>({x:mm.p.x,y:mm.p.y}));
      st[i]={x:p.x+dx,y:p.y+dy};out.push(st);
    }
  });
  return out;
}
function robust(sp){
  let bad=0;
  for(const st of neighbours(sp))if(!allLit(evalRaw(assemble(sp,st)).res)&&++bad>sp.allowFail)return false;
  return true;
}
function tune(sp){
  const maxJ=Math.max(...sp.goals.map(g=>g.rl.length),1);
  for(let j=0;j<maxJ;j++){
    for(const g of sp.goals){g.p.r=g.rl[Math.min(j,g.rl.length-1)];if(!g.dark&&!sp.fixedNeed)g.p.need=0.03}
    if(sp.hook&&!sp.hook(j))continue;
    let res=evalRaw(assemble(sp)).res;
    if(!allLit(res))continue;
    if(!sp.fixedNeed){
      sp.goals.forEach((g,i)=>{if(g.dark)return;const t=0.6*res[i].pct;let n=NICE[0];for(const v of NICE)if(v<=t)n=v;g.p.need=n});
      res=evalRaw(assemble(sp)).res;
      if(!allLit(res))continue;
    }
    if(robust(sp))return true;
  }
  return false;
}

// ---------- scatter movables into a start state
function freeSpot(rnd,sp,taken,minD){
  for(let t=0;t<120;t++){
    const x=5*ri(rnd,12,188),y=5*ri(rnd,12,108);
    if(sp.fix.some(f=>f.t==='wall'&&wallPtDist(f,x,y)<50))continue;
    if(sp.emit.some(e=>Math.hypot(e.x-x,e.y-y)<80))continue;
    if(sp.goals.some(g=>Math.hypot(g.p.x-x,g.p.y-y)<(g.p.r||15)+60))continue;
    if(sp.fix.some(f=>f.t!=='wall'&&Math.hypot(f.x-x,f.y-y)<80))continue;
    if(taken.some(q=>Math.hypot(q.x-x,q.y-y)<minD))continue;
    return [x,y];
  }
  return null;
}
function scatter(rnd,sp){
  const taken=sp.decoys.map(d=>({x:d.x,y:d.y})),st=[];
  for(const m of sp.mov){
    const p=m.p;
    if(m.startPos){st.push({x:m.startPos[0],y:m.startPos[1],a:p.a,ax:p.ax});taken.push({x:m.startPos[0],y:m.startPos[1]});continue}
    let pos=null;
    for(let t=0;t<30&&!pos;t++){
      const q=freeSpot(rnd,sp,taken,95);
      if(q&&Math.hypot(q[0]-p.x,q[1]-p.y)>=110)pos=q;
    }
    if(!pos)return null;
    taken.push({x:pos[0],y:pos[1]});
    const s={x:pos[0],y:pos[1],a:p.a,ax:p.ax};
    if(!DISCT[p.t]&&!p.norot&&p.t!=='prism'){
      let a;do{a=15*ri(rnd,-5,6)}while(Math.abs(m180(a-p.a))<30);s.a=a;
    }
    if(p.t==='prism')s.a=5*ri(rnd,0,23);
    if(DIALV[p.t]&&p.ax!==undefined){
      let v;do{v=pick(rnd,DIALV[p.t])}while(v===p.ax);s.ax=v;
    }
    st.push(s);
  }
  return st;
}
function decoyPieces(rnd,sp,types,count){
  const taken=[];
  for(let i=0;i<count;i++){
    const q=freeSpot(rnd,sp,taken,95);if(!q)return false;
    taken.push({x:q[0],y:q[1]});
    const t=pick(rnd,types);
    sp.decoys.push({t,x:q[0],y:q[1],a:15*ri(rnd,-5,6)});
  }
  return true;
}

function finish(rnd,sp,meta){
  snapMov(sp);
  for(const g of sp.goals){g.p.x=r5(g.p.x);g.p.y=r5(g.p.y)}
  for(const e of sp.emit){e.x=r5(e.x);e.y=r5(e.y)}
  if(!tune(sp))return null;
  const st=scatter(rnd,sp);if(!st)return null;
  if(solved(sp,st))return null;
  // every movable must matter
  for(let i=0;i<sp.mov.length;i++){
    const t=sp.mov.map((m,k)=>k===i?st[k]:null).map((s,k)=>s||{x:sp.mov[k].p.x,y:sp.mov[k].p.y,a:sp.mov[k].p.a,ax:sp.mov[k].p.ax});
    if(solved(sp,t))return null;
  }
  const pieces=assemble(sp,st);
  const base=sp.emit.length+sp.fix.length,sol={};
  sp.mov.forEach((m,i)=>{
    const p=m.p,a=DISCT[p.t]?0:p.a,e=[Math.round(p.x*10)/10,Math.round(p.y*10)/10,a];
    if(p.ax!==undefined&&DIALV[p.t])e.push(p.ax);
    sol[base+i]=e;
  });
  const lv={name:meta.name,hint:meta.hint,pieces,sol};
  if(meta.pol)lv.pol=1;
  if(meta.coh)lv.coh=1;
  return lv;
}

// ---------- families
const NAMES={
  relay:['Dogleg','Switchback','Zigzag','Hairpin','Detour','Ricochet','Slalom','Chicane','Dead reckoning','Long way round','Bank shot','Corkscrew','Backtrack','Crossfire','Labyrinth','Pinball','Scenic route','Looking glass','Hall of mirrors','Round the houses'],
  filter:['Tinted path','Colour gate','Sieve','Narrow band','Sift','Gel stack','Pure tone','Stained glass','Single hue','Colour check','Lens cap','Gel pack','Tint test','Pass band'],
  rail:['On rails','Slide rule','Track team','Sliding scale','Tramline','Drawer','Trombone','Shuttle','Funicular','Gantry','Conveyor','Cable car'],
  fan:['Family tree','Branching out','Fork in the road','Shared load','Delta','Spreading news','Many hands','Cascade','Root system','Splitting hairs','Divide and light','Tributaries','Sunburst','Candelabra','Light sharing','Chain letter','Hydra','Three-way street'],
  sorter:['Spectrum sort','Colour sorter','Sorting hat','Dichroic maze','Split palette','Rainbow rack','Chromatic sort','Prism free','Wavelength lottery','Sort of bright','Colour wheel','Paint chart','Hue and cry','Stained sort','Palette knife','Spectral shelf'],
  combine:['Melting pot','Merge lane','Colour mixer','Funnel','Two become one','Rendezvous','Convergence','Blend','Coalesce','Meeting point','Mixing desk','Union','Slot machine','Rejoin','Through the slit','Bottleneck'],
  prism:['Rainbow chase','Dispersion','Pick a colour','Newton\u2019s trick','Spectral line','Dark side','Glass act','Fringe','Spread the light','Triangle','Roy G. Biv','Cut glass','Crystal clear','Pink Floyd','Chasing rainbows','Dispersal','Glass wedge','Colour fan'],
  orb:['Glass ball','Crystal ball','Marble','Dewdrop','Raindrop','Bubble','Fisheye','Snow globe','Fishbowl','Sphere of influence','Pearl','Bead','Droplet','Orbital','Cat\u2019s eye','Moonstone','Globe trotter','Rolling stone','Water drop','Glass eye','Gumball','Planetarium','Round trip','Full circle','Bauble','Sea glass','Orb weaver','Ball bearing','Pebble','Looking sphere'],
  focus:['Burning glass','Sharp focus','Pinpoint','Magnifier','Bullseye','Hot spot','Fine point','Spotlight','Zoom in','Focal point','Sunbeam','Magnify','Convergent','Tight beam','Laser pointer','Hit the dot','Ignition','Burning question'],
  zoom:['Zoom lens','Squeeze play','Variable focus','Telephoto','Autofocus','Dial a focus','Rack focus','Bellows','Focus puller','Eyepiece','Iris','Adjustable','Pull focus','Macro','Sliding scale II','Rubber lens'],
  spread:['Fan out','Wide angle','Spread thin','Broadcast','Diverge','Peacock','Floodlight','Sprinkler','Starburst','Open wide','Scatter','Umbrella','Spotlight reverse','Wide load'],
  pinhole:['Pinhole camera','Keyhole','Needle\u2019s eye','Spatial filter','Squeeze play','Eye of the storm','Tight spot','Aperture','Narrow gap','Slit lamp','Thread the needle','Cleaned up','Eye of the needle','Single slit'],
  polchain:['Crossed paths','Gradual turn','Step stool','Half-turns','Stair-step','Malus\u2019s ladder','Quarter turns','Polar bear','Slow rotation','Stepping stones','Polarity','Twist and shout','Gentle persuasion','Little by little','Turnstile','Ratchet','Spiral stair','Baby steps'],
  polsplit:['Even odds','Fair split','Polar split','Balance sheet','Dividing line','Twin beams','Sharing out','Axis of evil','Split the difference','Two ways','Coin toss','Halves','Polar fork','Beam splitter','Equal shares','Fifty-fifty','Lopsided','Ratio'],
  mz:['Twin arms','Phase shift','Fringe benefits','Null result','Equal arms','Wave dance','In step','Cancel culture','Echo chamber','Phase two','Quiet port','Out of phase','Destructive','Square dance','Racetrack','Beat the clock','Hush','Wavefront','Dark fringe','Bright fringe'],
  mich:['Mirror image','Interference slide','Arm wrestling','Fringe counter','Slide and see','Two mirrors','Path length','Optical flat','Michelson\u2019s mirrors','Ether wind','Null test','Slide rule II','Standing wave','Tuning fork']
};
const HINT={
  relay:'Bounce the beam around the walls and into the target.',
  filter:'White light in, one color out. A filter passes only its band.',
  rail:'A mirror on a rail slides but cannot turn. Slide it into the beam.',
  fan:'A splitter sends half the light each way. Every target needs some.',
  sorter:'A dichroic mirror reflects its colors and passes the rest. Send each color to its own target.',
  combine:'Merge the beams so every color passes through the slot.',
  orb:'A glass ball bends light like a round prism. Where the beam strikes it sets the angle and the color.',
  prism:'Glass bends each color differently. Find the angle that sends only the target color in.',
  zoom:'This lens squeezes to any focal length. Slide it and set its dial so the focus lands on the target.',
  spread:'A concave lens spreads light apart. Place it so the beam reaches every target.',
  zoomspread:'Squeeze the lens to the right strength and slide it until the beam reaches every target.',
  focus:'The lens focuses parallel light at its focal length behind it. Put the focus on the target.',
  pinhole:'Focus the beam through the gap, then straighten it out again.',
  polchain:'The beam must pass the last polarizer. Turn the axes in small steps.',
  polsplit:'A polarizing splitter divides light by polarization. Balance the halves.',
  mz:'Delay one arm so the right port lights and the other stays dark.',
  mich:'Slide the mirrors along their rails until the detector lights up.'
};
const pickName=(rnd,k)=>pick(rnd,NAMES[k]);

function famRelay(rnd,c){
  const v=c<2?'plain':pick(rnd,['plain','filter','rail','filter','rail']);
  const T=Math.min(6,c+1+ri(rnd,0,1));
  const tree=growTree(rnd,{turns:T,minL:c>3?100:120,maxL:c>3?250:300});
  if(!tree)return null;
  const sp=newSpec();
  const band=pick(rnd,[RED,GRN,BLU]);
  let fb=null;
  if(v==='filter'){fb=pick(rnd,[RED,GRN,BLU]);sp.emit.push(emitterAt(tree,WHITE))}else sp.emit.push(emitterAt(tree,band));
  const turns=tree.nodes.filter(n=>n.k==='turn');
  let railNode=null;
  if(v==='rail')railNode=turns[turns.length-1];
  for(const n of tree.nodes){
    if(n.k==='turn'){
      const p=mirrorPiece(n);
      if(n===railNode){
        const rho=n360(n.din+90),t=5*ri(rnd,8,24)*pick(rnd,[-1,1]),d=dv(rho);
        const ox=Math.round(n.x-t*d[0]),oy=Math.round(n.y-t*d[1]);
        if(!inB(ox,oy,35))return null;
        p.rail=rho;p.range=150;p.norot=1;
        const px=ox+d[0]*t,py=oy+d[1]*t;
        addMov(sp,Object.assign(p,{x:px,y:py}),{startPos:[ox,oy]});
      }else addMov(sp,p);
    }else makeGoal(sp,goalPiece(n,fb||band,fb?{ex:1}:{}),[13,16,20,25]);
  }
  if(fb){
    const s=spots(rnd,tree,1,70,90);if(!s)return null;
    addMov(sp,{t:'filter',x:s[0].x,y:s[0].y,a:r5(m180(s[0].d+90)),band:fb,len:80});
  }
  const goal=tree.nodes.find(n=>n.k==='goal');
  const keep={legs:legList(tree),pts:nodePts(tree,80),walls:[]};
  addWalls(rnd,sp,keep,c<2?1:(c<4?2:3),[tree.sx,tree.sy,goal.x,goal.y]);
  if(c>=3&&rnd()<0.5)decoyPieces(rnd,sp,['mirror'],1);
  const key=v==='plain'?'relay':v;
  return {sp,meta:{name:pickName(rnd,key),hint:HINT[key]}};
}

function famFan(rnd,c){
  const m=[1,1,2,2,3][c-1]+(c===2||c===4?ri(rnd,0,1):0);
  const tree=growTree(rnd,{splits:m,turns:Math.min(4,c-1+ri(rnd,0,1)),minL:110,maxL:260,tries:900});
  if(!tree)return null;
  const sp=newSpec(),band=pick(rnd,[RED,GRN,BLU,MONO]);
  sp.emit.push(emitterAt(tree,band));
  addTreePieces(sp,tree,{
    branch:(n,a)=>addMov(sp,{t:'split',x:n.x,y:n.y,a}),
    goal:n=>makeGoal(sp,goalPiece(n,band),[13,16,20,25])
  });
  const keep={legs:legList(tree),pts:nodePts(tree,80),walls:[]};
  const gs=tree.nodes.filter(n=>n.k==='goal');
  addWalls(rnd,sp,keep,c<2?1:2,[tree.sx,tree.sy,gs[0].x,gs[0].y]);
  if(c>=3&&rnd()<0.5)decoyPieces(rnd,sp,['mirror','split'],1);
  return {sp,meta:{name:pickName(rnd,'fan'),hint:HINT.fan}};
}

function famSorter(rnd,c){
  const m=[1,2,2,3,3][c-1];
  const tree=growTree(rnd,{splits:m,turns:Math.min(3,c-1+ri(rnd,0,1)),minL:120,maxL:260,tries:900});
  if(!tree)return null;
  const sp=newSpec();sp.emit.push(emitterAt(tree,WHITE));
  const count=nd=>nd.k==='goal'?1:nd.k==='turn'?count(nd.next):count(nd.a)+count(nd.b);
  const bands=new Map();
  const edge=i=>i<=0?400:(i>=NW1?700:WL[i]-3.8);
  const NW1=WL.length-1;
  const assign=(nd,lo,hi)=>{
    if(nd.k==='goal'){bands.set(nd,[lo,hi]);return}
    if(nd.k==='turn'){assign(nd.next,lo,hi);return}
    const na=count(nd.a),nb=count(nd.b),tot=hi-lo+1,wb=Math.round(tot*nb/(na+nb));
    if(wb<5||tot-wb<5){bands.fail=true;return}
    if(rnd()<0.5){nd.refl=[lo,lo+wb-1];assign(nd.b,lo,lo+wb-1);assign(nd.a,lo+wb,hi)}
    else{nd.refl=[hi-wb+1,hi];assign(nd.b,hi-wb+1,hi);assign(nd.a,lo,hi-wb)}
  };
  assign(tree.first,0,NW1);if(bands.fail)return null;
  const toBand=r=>[r[0]<=0?400:WL[r[0]]-3.8,r[1]>=NW1?700:WL[r[1]]+3.8];
  addTreePieces(sp,tree,{
    branch:(n,a)=>addMov(sp,{t:'dichro',x:n.x,y:n.y,a,band:toBand(n.refl)}),
    goal:n=>makeGoal(sp,goalPiece(n,toBand(bands.get(n)),{ex:1}),[13,16,20,25])
  });
  const keep={legs:legList(tree),pts:nodePts(tree,80),walls:[]};
  const gs=tree.nodes.filter(n=>n.k==='goal');
  addWalls(rnd,sp,keep,c<2?1:2,[tree.sx,tree.sy,gs[0].x,gs[0].y]);
  if(c>=4&&rnd()<0.5)decoyPieces(rnd,sp,['mirror'],1);
  return {sp,meta:{name:pickName(rnd,'sorter'),hint:HINT.sorter}};
}

function famCombine(rnd,c){
  const nc=c>=4?3:2;
  const bandsAll=shuffle(rnd,[RED,GRN,BLU]).slice(0,nc);
  // common beam: tree chain after the merge point
  const T=Math.min(3,c-1+ri(rnd,0,1));
  const tree=growTree(rnd,{turns:T,minL:140,maxL:260,firstL:5*ri(rnd,40,56)});
  if(!tree)return null;
  const leg0=tree.legs[0],d=dv(tree.d0);
  const sp=newSpec();
  sp.emit.push(emitterAt(tree,bandsAll[0]));
  // dichroics sit on the first leg, side emitters feed them
  const spts=[0.45,0.8].slice(0,nc-1);
  const sides=[];
  for(let k=0;k<nc-1;k++){
    const u=leg0.len*spts[k],px=leg0.x1+d[0]*u,py=leg0.y1+d[1]*u;
    const sd=pick(rnd,[-1,1]),din=n360(tree.d0+sd*90);
    // beam from side emitter travels toward the dichroic, straight along din
    const L=5*ri(rnd,34,56),ex=px-Math.cos(din*R)*L,ey=py-Math.sin(din*R)*L;
    if(!inB(ex,ey,40))return null;
    sides.push({px,py,din,ex,ey});
    sp.emit.push({t:'emit',x:ex,y:ey,a:din,band:bandsAll[k+1],fixed:1});
    addMov(sp,{t:'dichro',x:px,y:py,a:turnMirror(din,tree.d0),band:bandsAll[k+1]});
  }
  // check side emitter spacing against everything
  for(const s of sides){
    if(tree.nodes.some(n=>Math.hypot(n.x-s.ex,n.y-s.ey)<90))return null;
    if(Math.hypot(tree.sx-s.ex,tree.sy-s.ey)<120)return null;
    for(const l of tree.legs.slice(1))if(pSeg(s.ex,s.ey,l.x1,l.y1,l.x2,l.y2)<60)return null;
  }
  if(sides.length===2&&Math.hypot(sides[0].ex-sides[1].ex,sides[0].ey-sides[1].ey)<100)return null;
  for(const n of tree.nodes){
    if(n.k==='turn')addMov(sp,mirrorPiece(n));
    else makeGoal(sp,goalPiece(n,WHITE,{bands:bandsAll.slice()}),[16,20,25,30],{});
  }
  for(const g of sp.goals)delete g.p.band;
  const last=tree.legs[tree.legs.length-1],ld=dv(last.d);
  // slot walls across the last leg
  const sl=ri(rnd,0,1),u0=last.len*0.55;
  const cx=last.x1+ld[0]*u0,cy=last.y1+ld[1]*u0,gapW=5*ri(rnd,14,18),hw=5*ri(rnd,30,40);
  const nx=-ld[1],ny=ld[0];
  const wa=Math.round(last.d/5)*5;
  const w1={t:'wall',x:Math.round(cx+nx*(gapW/2+hw/2)),y:Math.round(cy+ny*(gapW/2+hw/2)),w:30,h:hw,a:wa,fixed:1};
  const w2={t:'wall',x:Math.round(cx-nx*(gapW/2+hw/2)),y:Math.round(cy-ny*(gapW/2+hw/2)),w:30,h:hw,a:wa,fixed:1};
  if(!wallInBoard(w1)||!wallInBoard(w2))return null;
  void sl;
  sp.fix.push(w1,w2);
  const keep={legs:legList(tree).concat(sides.map(s=>({x1:s.ex,y1:s.ey,x2:s.px,y2:s.py}))),pts:nodePts(tree,80),walls:[w1,w2]};
  addWalls(rnd,sp,keep,c<3?0:1,null);
  keep.walls=sp.fix.filter(w=>w.t==='wall');
  return {sp,meta:{name:pickName(rnd,'combine'),hint:HINT.combine}};
}

function famFocus(rnd,c,zoom){
  const S=c>=4?1:0,T=Math.min(4,c-1+ri(rnd,0,1));
  const tree=growTree(rnd,{splits:S,turns:T,minL:150,maxL:280,legGap:70,tries:900});
  if(!tree)return null;
  const sp=newSpec(),band=pick(rnd,[RED,GRN,BLU]);
  const w=5*ri(rnd,8,14);
  sp.emit.push(emitterAt(tree,band,{w,nb:9}));
  const f=zoom?pick(rnd,[100,130,170,230,340]):pick(rnd,c<2?[160]:[100,120,160,200,240,300]);
  addTreePieces(sp,tree,{
    branch:(n,a)=>addMov(sp,{t:'split',x:n.x,y:n.y,a}),
    goal:n=>{
      makeGoal(sp,goalPiece(n,band,{show:1}),[7,9,12,15,19]);
      // lens f before the goal, walking back along the chain
      let rem=f,cur=n,pos=null;
      for(let g=0;g<6;g++){
        const leg=tree.legs.find(l=>l.to===cur);
        const along=leg.len-rem;
        if(along>=75&&rem>=75){const d=dv(leg.d);pos={x:leg.x1+d[0]*along,y:leg.y1+d[1]*along,d:leg.d};break}
        if(along>=75&&rem<75)break;
        rem-=leg.len;cur=cur.par;
        if(!cur||cur.k==='branch')break;
      }
      if(!pos){sp.bad=true;return}
      if(zoom)addMov(sp,{t:'zlens',x:pos.x,y:pos.y,a:r5(m180(pos.d+90)),ax:E.ZF.indexOf(f)*22.5});
      else addMov(sp,{t:'lens',x:pos.x,y:pos.y,a:r5(m180(pos.d+90)),f});
    }
  });
  if(sp.bad)return null;
  for(const m of sp.mov)if(/lens$/.test(m.p.t))for(const o of sp.mov)if(o!==m&&!/lens$/.test(o.p.t)&&Math.hypot(o.p.x-m.p.x,o.p.y-m.p.y)<80)return null;
  const gs=tree.nodes.filter(n=>n.k==='goal');
  const keep={legs:legList(tree),pts:nodePts(tree,80).concat(sp.mov.filter(m=>/lens$/.test(m.p.t)).map(m=>[m.p.x,m.p.y,60])),walls:[]};
  addWalls(rnd,sp,keep,c<3?1:2,[tree.sx,tree.sy,gs[0].x,gs[0].y],w/2);
  return {sp,meta:{name:pickName(rnd,zoom?'zoom':'focus'),hint:zoom?HINT.zoom:HINT.focus}};
}


function famSpread(rnd,c){
  const f=-pick(rnd,c<2?[90]:[60,75,90,110,140]);
  const u1=5*ri(rnd,16,30),Dg=5*ri(rnd,60,90);
  const tree=growTree(rnd,{turns:0,firstL:u1+Dg+60,legGap:60,tries:900});
  if(!tree)return null;
  const sp=newSpec(),band=pick(rnd,[RED,GRN,BLU]);
  const wB=30;
  sp.emit.push(emitterAt(tree,band,{w:wB,nb:25}));
  const l0=tree.legs[0],d=dv(l0.d),n=[-d[1],d[0]];
  const lx=l0.x1+d[0]*u1,ly=l0.y1+d[1]*u1,zoom=c>=3&&rnd()<0.5;
  const lens=zoom?{t:'zlens',x:lx,y:ly,a:r5(m180(l0.d+90)),ax:E.ZF.indexOf(pick(rnd,[-60,-80,-100,-130]))*22.5}:{t:'lens',x:lx,y:ly,a:r5(m180(l0.d+90)),f};
  const fl=zoom?E.ZF[Math.round(lens.ax/22.5)]:f;
  addMov(sp,lens);
  const lat=0.75*(wB/2)*Dg/Math.abs(fl);
  const k=c>=4?3:2,offs=k===2?[-lat,lat]:[-lat,0,lat];
  for(const o of offs){
    const gx=lx+d[0]*Dg+n[0]*o,gy=ly+d[1]*Dg+n[1]*o;
    if(!inB(gx,gy,40))return null;
    makeGoal(sp,{t:'goal',x:gx,y:gy,band,r:24,need:0.05,show:1,fixed:1},[20,24,28,32]);
  }
  const keep={legs:legList(tree),pts:[[tree.sx,tree.sy,70],[lx,ly,60]],walls:[]};
  for(const g of sp.goals)keep.pts.push([g.p.x,g.p.y,60]);
  addWalls(rnd,sp,keep,c<3?1:2,null,wB/2);
  return {sp,meta:{name:pickName(rnd,zoom?'zoom':'spread'),hint:zoom?HINT.zoomspread:HINT.spread}};
}

function famPinhole(rnd,c){
  const f1=5*ri(rnd,20,30),f2=5*ri(rnd,20,30);
  const T=c<3?0:Math.min(2,c-2);
  const need=70+f1+f2+90;
  const tree=growTree(rnd,{turns:T,firstL:need+5*ri(rnd,0,12),minL:150,maxL:260,legGap:70,tries:900});
  if(!tree)return null;
  const sp=newSpec(),band=pick(rnd,[RED,GRN,BLU]);
  const wBeam=5*ri(rnd,12,18);
  sp.emit.push(emitterAt(tree,band,{w:wBeam,nb:11}));
  const l0=tree.legs[0],d=dv(l0.d),u1=70+5*ri(rnd,0,6);
  const lens1={x:l0.x1+d[0]*u1,y:l0.y1+d[1]*u1},slit={x:lens1.x+d[0]*f1,y:lens1.y+d[1]*f1},lens2={x:slit.x+d[0]*f2,y:slit.y+d[1]*f2};
  addMov(sp,{t:'lens',x:lens1.x,y:lens1.y,a:r5(m180(l0.d+90)),f:f1});
  addMov(sp,{t:'lens',x:lens2.x,y:lens2.y,a:r5(m180(l0.d+90)),f:f2});
  const gapW=5*ri(rnd,6,9),hw=5*ri(rnd,30,40),nx=-d[1],ny=d[0],wa=Math.round(l0.d/5)*5;
  const w1={t:'wall',x:Math.round(slit.x+nx*(gapW/2+hw/2)),y:Math.round(slit.y+ny*(gapW/2+hw/2)),w:30,h:hw,a:wa,fixed:1};
  const w2={t:'wall',x:Math.round(slit.x-nx*(gapW/2+hw/2)),y:Math.round(slit.y-ny*(gapW/2+hw/2)),w:30,h:hw,a:wa,fixed:1};
  if(!wallInBoard(w1)||!wallInBoard(w2))return null;
  sp.fix.push(w1,w2);
  for(const n of tree.nodes){
    if(n.k==='turn')addMov(sp,mirrorPiece(n));
    else makeGoal(sp,goalPiece(n,band,{show:1}),[30,36,42,50]);
  }
  const keep={legs:legList(tree),pts:nodePts(tree,80).concat([[lens1.x,lens1.y,60],[lens2.x,lens2.y,60]]),walls:[w1,w2]};
  const before=sp.fix.length;
  addWalls(rnd,sp,keep,c<3?0:1,null,wBeam/2);
  void before;
  return {sp,meta:{name:pickName(rnd,'pinhole'),hint:HINT.pinhole}};
}

function famPolChain(rnd,c){
  const opts=c<2?[[0,1]]:c<4?[[0,1],[0,3],[0,2]]:[[0,3],[0,2],[0,3]];
  const [,k]=pick(rnd,opts);
  const th0=pick(rnd,[0,22.5,45,67.5,90,112.5,135,157.5]);
  const thf=(th0+90)%180;
  const T=Math.min(4,c-1+ri(rnd,0,1));
  const tree=growTree(rnd,{turns:T,minL:210,maxL:300,tries:900});
  if(!tree)return null;
  const sp=newSpec();sp.meta.pol=1;
  sp.emit.push(emitterAt(tree,MONO,{pol:th0}));
  for(const n of tree.nodes){
    if(n.k==='turn')addMov(sp,mirrorPiece(n));
    else makeGoal(sp,goalPiece(n,MONO,{show:1}),[15,18,22]);
  }
  const lastLeg=tree.legs[tree.legs.length-1],dl=dv(lastLeg.d);
  // analyzer fixed 90 deg from the source, 80 before the goal
  const ax0=lastLeg.len>=200?lastLeg.len-85:null;
  if(ax0===null)return null;
  sp.fix.push({t:'pol',x:lastLeg.x1+dl[0]*ax0,y:lastLeg.y1+dl[1]*ax0,a:0,ax:thf,fixed:1});
  const used=[{x:sp.fix[0].x,y:sp.fix[0].y}];
  const sps=spots(rnd,tree,k,70,95);
  if(!sps)return null;
  for(const s of sps)if(used.some(u=>Math.hypot(u.x-s.x,u.y-s.y)<90))return null;
  // axes ordered along the beam path: sort spots by their position in the tree
  const order=s=>tree.legs.indexOf(s.leg)*1000+Math.hypot(s.x-s.leg.x1,s.y-s.leg.y1);
  sps.sort((a,b)=>order(a)-order(b));
  sps.forEach((s,i)=>{
    const ax=(th0+90*(i+1)/(k+1))%180;
    addMov(sp,{t:'pol',x:s.x,y:s.y,a:0,ax,r:30});
  });
  const keep={legs:legList(tree),pts:nodePts(tree,80).concat(sps.map(s=>[s.x,s.y,60])).concat([[sp.fix[0].x,sp.fix[0].y,60]]),walls:[]};
  const goal=tree.nodes.find(n=>n.k==='goal');
  addWalls(rnd,sp,keep,c<3?1:2,[tree.sx,tree.sy,goal.x,goal.y]);
  return {sp,meta:{name:pickName(rnd,'polchain'),hint:HINT.polchain,pol:1}};
}

function famPolSplit(rnd,c){
  const m=c<3?1:2;
  const tree=growTree(rnd,{splits:m,turns:Math.min(2,c-1),minL:210,maxL:300,tries:900});
  if(!tree)return null;
  const sp=newSpec();
  const th0=pick(rnd,[0,45,90,135]);
  sp.emit.push(emitterAt(tree,MONO,{pol:th0}));
  const polIn=new Map();
  const walk=(nd,pol)=>{
    if(nd.k==='goal')return;
    if(nd.k==='turn'){walk(nd.next,pol);return}
    // branch: choose axis & offset so (alpha+off+pol)/2 is on the dial grid
    for(let t=0;t<60;t++){
      const alpha=pick(rnd,DIALV.pbs),off=pick(rnd,c<3?[45]:[45,22.5,67.5]);
      const h=(alpha+off+pol)/2;
      for(const hax of [h,h+90]){
        const hm=((hax%180)+180)%180;
        if(Math.abs(hm/22.5-Math.round(hm/22.5))<1e-9){nd.alpha=alpha;nd.hax=hm;break}
      }
      if(nd.alpha!==undefined)break;
    }
    if(nd.alpha===undefined){sp.bad=true;return}
    walk(nd.a,nd.alpha);walk(nd.b,(nd.alpha+90)%180);
  };
  walk(tree.first,th0);if(sp.bad)return null;
  const hspots=[];
  addTreePieces(sp,tree,{
    branch:(n,a)=>{
      addMov(sp,{t:'pbs',x:n.x,y:n.y,a,ax:n.alpha});
      const leg=tree.legs.find(l=>l.to===n),d=dv(leg.d),u=leg.len-95;
      if(u<70){sp.bad=true;return}
      hspots.push([leg.x1+d[0]*u,leg.y1+d[1]*u]);
      addMov(sp,{t:'hwp',x:leg.x1+d[0]*u,y:leg.y1+d[1]*u,a:0,ax:n.hax,r:30});
    },
    goal:n=>makeGoal(sp,goalPiece(n,MONO,{show:1}),[15,18,22])
  });
  if(sp.bad)return null;
  const keep={legs:legList(tree),pts:nodePts(tree,80).concat(hspots.map(h=>[h[0],h[1],60])),walls:[]};
  const gs=tree.nodes.filter(n=>n.k==='goal');
  addWalls(rnd,sp,keep,c<3?1:2,[tree.sx,tree.sy,gs[0].x,gs[0].y]);
  sp.meta.pol=1;
  return {sp,meta:{name:pickName(rnd,'polsplit'),hint:HINT.polsplit,pol:1}};
}

// hand-built interferometer skeletons
function flipSpec(sp,fx,fy){
  const f=p=>{
    if(fx){p.x=W-p.x;p.a=180-(p.a||0);if(p.startPos)p.startPos[0]=W-p.startPos[0];if(p.rail!==undefined)p.rail=180-p.rail}
    if(fy){p.y=H-p.y;p.a=-(p.a||0);if(p.rail!==undefined)p.rail=-p.rail}
    if(p.a!==undefined&&!DISCT[p.t])p.a=m180(p.a)
  };
  sp.emit.forEach(f);sp.fix.forEach(f);sp.mov.forEach(m=>{f(m.p);if(m.startPos){if(fx)m.startPos[0]=W-m.startPos[0];if(fy)m.startPos[1]=H-m.startPos[1]}});
  sp.decoys.forEach(f);sp.goals.forEach(g=>f(g.p));
}
function searchDials(rnd,sp,idx,cap){
  const sols=[],lists=idx.map(i=>DIALV[sp.mov[i].p.t]);
  const total=lists.reduce((a,l)=>a*l.length,1);
  const cur=sp.mov.map(m=>({x:m.p.x,y:m.p.y,a:m.p.a,ax:m.p.ax}));
  const rec=k=>{
    if(sols.length>=cap)return;
    if(k===idx.length){if(allLit(evalRaw(assemble(sp,cur)).res))sols.push(idx.map(i=>cur[i].ax));return}
    for(const v of lists[k]){cur[idx[k]].ax=v;rec(k+1)}
  };
  rec(0);void total;
  return sols;
}
function famMZ(rnd,c){
  const x0=25*ri(rnd,8,14),y0=25*ri(rnd,3,5),y1=y0+25*ri(rnd,9,13);
  const x1=x0+25*ri(rnd,14,Math.min(24,Math.floor((830-x0)/25)-x0/25*0));
  if(x1>830||y1>450||x1-x0<350)return null;
  const ex=25*ri(rnd,2,3),sp=newSpec();
  sp.coh=1;
  sp.emit.push({t:'emit',x:ex*4,y:y0,a:0,band:MONO,fixed:1});
  sp.fix.push({t:'split',x:x0,y:y0,a:45,fixed:1},{t:'mirror',x:x1,y:y0,a:45,fixed:1},{t:'split',x:x1,y:y1,a:45,fixed:1},{t:'mirror',x:x0,y:y1,a:45,fixed:1});
  // arms: top y0, bottom y1 (x0..x1), left x0, right x1
  const arm=()=>{
    const k=ri(rnd,0,3);
    if(k===0)return [x0+25*ri(rnd,3,Math.max(3,(x1-x0)/25-3)),y0];
    if(k===1)return [x0+25*ri(rnd,3,Math.max(3,(x1-x0)/25-3)),y1];
    if(k===2)return [x0,y0+25*ri(rnd,2,Math.max(2,(y1-y0)/25-2))];
    return [x1,y0+25*ri(rnd,2,Math.max(2,(y1-y0)/25-2))];
  };
  const nFixed=c>=3?ri(rnd,1,2):0,nMov=c<2?1:c<4?2:3;
  const pts=[];
  const free=p=>pts.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>=65);
  const place=()=>{for(let t=0;t<30;t++){const p=arm();if(free(p)){pts.push(p);return p}}return null};
  for(let i=0;i<nFixed;i++){const p=place();if(!p)return null;sp.fix.push({t:'phase',x:p[0],y:p[1],a:0,ax:pick(rnd,DIALV.phase.slice(1)),fixed:1})}
  const idx=[];
  for(let i=0;i<nMov;i++){const p=place();if(!p)return null;idx.push(sp.mov.length);addMov(sp,{t:'phase',x:p[0],y:p[1],a:0,ax:0})}
  const port=pick(rnd,['R','B']),gR={x:x1+200,y:y1},gB={x:x1,y:y1+105};
  if(gB.y>570||gR.x>960)return null;
  const mode=pick(rnd,c<2?['bright']:['bright','dark','half']);
  const mk=(pos,extra)=>makeGoal(sp,Object.assign({t:'goal',x:pos.x,y:pos.y,band:MONO,coh:1,r:15,fixed:1,show:1},extra),[15],{dark:!!extra.dark});
  if(mode==='bright')mk(port==='R'?gR:gB,{need:0.8});
  else if(mode==='dark'){mk(gR,port==='R'?{need:0.8}:{dark:1});mk(gB,port==='R'?{dark:1}:{need:0.8});}
  else {mk(gR,{need:0.4});mk(gB,{need:0.4})}
  sp.fixedNeed=true;
  snapMov(sp);
  const sols=searchDials(rnd,sp,idx,40);
  if(!sols.length)return null;
  const s=pick(rnd,sols);idx.forEach((i,k)=>{sp.mov[i].p.ax=s[k]});
  sp.coh=1;
  const fx=rnd()<0.5,fy=rnd()<0.5;
  if(fx||fy)flipSpec(sp,fx,fy);
  return {sp,meta:{name:pickName(rnd,'mz'),hint:mode==='bright'?'Delay an arm so the beams arrive in step at the lit port.':HINT.mz,coh:1}};
}

function famMich(rnd,c){
  const sx=25*ri(rnd,10,16),sy=25*ri(rnd,8,12);
  const La=25*ri(rnd,8,13),Lb=25*ri(rnd,5,8),Lc=25*ri(rnd,6,8);
  const sp=newSpec();
  sp.coh=1;
  if(sy-Lc<60||sy+Lb>560||sx+La>940)return null;
  sp.emit.push({t:'emit',x:sx-25*ri(rnd,6,9),y:sy,a:0,band:MONO,fixed:1});
  sp.fix.push({t:'split',x:sx,y:sy,a:45,fixed:1});
  const ta=5*ri(rnd,8,20)*pick(rnd,[-1,1]),tb=5*ri(rnd,8,20)*pick(rnd,[-1,1]);
  // rail A slides along x, mirror faces the beam; rail B slides along y
  addMov(sp,{t:'mirror',x:sx+La,y:sy,a:90,rail:0,range:150,norot:1},{startPos:[sx+La-ta,sy]});
  addMov(sp,{t:'mirror',x:sx,y:sy+Lb,a:0,rail:90,range:150,norot:1},{startPos:[sx,sy+Lb-tb]});
  sp.mov[0].p.x=sx+La;sp.mov[1].p.y=sy+Lb;
  makeGoal(sp,{t:'goal',x:sx,y:sy-Lc,band:MONO,coh:1,r:15,need:0.8,show:1,fixed:1},[15]);
  sp.fixedNeed=true;
  if(c>=2&&rnd()<0.8){
    // a fixed phase plate in one arm, a movable one in the other
    const k=pick(rnd,[0,1]);
    if(k===0)sp.fix.push({t:'phase',x:sx+La/2,y:sy,a:0,ax:pick(rnd,DIALV.phase.slice(1)),fixed:1});
    else sp.fix.push({t:'phase',x:sx,y:sy+Lb/2,a:0,ax:pick(rnd,DIALV.phase.slice(1)),fixed:1});
  }
  // rails: starts/solutions. find a solution by scanning rail positions
  const m0=sp.mov[0],m1=sp.mov[1];
  const base0={x:m0.p.x,y:m0.p.y,a:m0.p.a},base1={x:m1.p.x,y:m1.p.y,a:m1.p.a};
  const found=[];
  for(let t0=-100;t0<=100;t0+=25)for(let t1=-150;t1<=150&&found.length<8;t1+=5){
    const st=[{x:base0.x+t0,y:base0.y,a:base0.a},{x:base1.x,y:base1.y+t1,a:base1.a}];
    if(allLit(evalRaw(assemble(sp,st)).res))found.push([t0,t1]);
  }
  if(!found.length)return null;
  const [t0,t1]=pick(rnd,found);
  m0.p.x=base0.x+t0;m1.p.y=base1.y+t1;
  // rail origin is the start position; keep the solution within reach of it
  m0.startPos=[m0.p.x-ta,sy];m1.startPos=[sx,m1.p.y-tb];
  const fx=rnd()<0.5,fy=rnd()<0.5;
  if(fx||fy)flipSpec(sp,fx,fy);
  return {sp,meta:{name:pickName(rnd,'mich'),hint:HINT.mich,coh:1}};
}


function famGlass(rnd,c,kind){
  const sp=newSpec();
  const ex=5*ri(rnd,14,24),ey=5*ri(rnd,30,90),d0=pick(rnd,[-20,-10,0,10,20]);
  const d=dv(d0),D=5*ri(rnd,35,65),off=5*ri(rnd,-8,8);
  const orb=kind==='orb',gr=orb?5*ri(rnd,8,12):60;
  const offs=orb?(rnd()<0.5?-1:1)*5*Math.round(rr(rnd,0.45,0.9)*gr/5):off;
  const px=ex+d[0]*D-d[1]*offs,py=ey+d[1]*D+d[0]*offs;
  if(!inB(px,py,80))return null;
  const prism=orb?{t:'orb',x:px,y:py,a:0,r:gr,norot:1}:{t:'prism',x:px,y:py,a:5*ri(rnd,0,23),r:60};
  const em={t:'emit',x:ex,y:ey,a:d0,band:WHITE,fixed:1};
  const pr=clone(prism);
  const t0=evalRaw([em,pr]);
  const lastSeg=i=>{const r=t0.rays.filter(q=>q.i===i);return r.length>=3?r[r.length-1]:null};
  const lo=lastSeg(3),hi=lastSeg(36);
  if(!lo||!hi)return null;
  const ang=q=>Math.atan2(q.y2-q.y1,q.x2-q.x1)/R;
  if(Math.abs(m180(ang(lo)-ang(hi)))<4)return null;
  const iw=ri(rnd,8,32),seg=lastSeg(iw);if(!seg)return null;
  let sx=seg.x1,sy=seg.y1,dir=ang(seg);
  const nm=c<=2?ri(rnd,0,1):(c<5?ri(rnd,1,2):2);
  sp.emit.push(em);addMov(sp,prism);
  if(orb)sp.allowFail=2;
  const pts=[[px,py,80],[ex,ey,70]];
  const legs=[{x1:ex,y1:ey,x2:px,y2:py}];
  for(let k=0;k<nm;k++){
    const L=rr(rnd,130,260),dd=dv(dir),qx=sx+dd[0]*L,qy=sy+dd[1]*L;
    if(!inB(qx,qy,60))return null;
    const t=pick(rnd,TURNS),a=turnMirror(dir,dir+t),u=dv(a);
    const dot=dd[0]*u[0]+dd[1]*u[1],rx=2*dot*u[0]-dd[0],ry=2*dot*u[1]-dd[1];
    addMov(sp,{t:'mirror',x:qx,y:qy,a});
    legs.push({x1:sx,y1:sy,x2:qx,y2:qy});pts.push([qx,qy,90]);
    sx=qx;sy=qy;dir=Math.atan2(ry,rx)/R;
  }
  const dd=dv(dir),Lg=rr(rnd,170,300),gx=sx+dd[0]*Lg,gy=sy+dd[1]*Lg;
  if(!inB(gx,gy,45))return null;
  for(const q of pts)if(Math.hypot(q[0]-gx,q[1]-gy)<90)return null;
  legs.push({x1:sx,y1:sy,x2:gx,y2:gy});
  const g={t:'goal',x:gx,y:gy,band:WHITE,r:12,ex:1,show:0,fixed:1};
  makeGoal(sp,g,[10,12,14,17,20,24]);
  sp.hook=()=>{
    const gp=sp.goals[0].p;gp.band=WHITE;gp.need=0.03;delete gp.ex;
    const tr=evalRaw(assemble(sp));
    const arr=new Set();
    for(const q of tr.rays)if(Math.hypot(q.x2-gp.x,q.y2-gp.y)<=gp.r+0.5)arr.add(q.i);
    if(arr.size<4||arr.size>16)return false;
    const a=[...arr];const lo2=Math.min(...a),hi2=Math.max(...a);
    gp.band=[Math.max(400,WL[lo2]-1),Math.min(700,WL[hi2]+1)];gp.ex=1;
    return true;
  };
  const keep={legs,pts:pts.map(q=>[q[0],q[1],q[2]]),walls:[]};
  addWalls(rnd,sp,keep,c<3?1:2,[ex,ey,gx,gy],20);
  return {sp,meta:{name:pickName(rnd,orb?'orb':'prism'),hint:orb?HINT.orb:HINT.prism}};
}

const FAMS={zoom:(r,c)=>famFocus(r,c,true),spread:famSpread,prism:(r,c)=>famGlass(r,c,'prism'),orb:(r,c)=>famGlass(r,c,'orb'),relay:famRelay,fan:famFan,sorter:famSorter,combine:famCombine,focus:famFocus,pinhole:famPinhole,polchain:famPolChain,polsplit:famPolSplit,mz:famMZ,mich:famMich};
const MIN_TIER={zoom:1,spread:1,prism:1,orb:1,relay:1,fan:1,sorter:1,combine:2,focus:1,pinhole:2,polchain:1,polsplit:1,mz:1,mich:2};
function familiesFor(c){return Object.keys(FAMS).filter(k=>MIN_TIER[k]<=c)}

// ---------- public
// make(seed,tier,family?) -> level or null. Tier 1..5.
function make(seed,tier,family,maxTries){
  const rnd=mulberry(seed*7919+tier*104729);
  const fams=family?[family]:familiesFor(tier);
  for(let t=0;t<(maxTries||160);t++){
    const f=family||pick(rnd,fams);
    let r=null;
    try{r=FAMS[f](rnd,tier)}catch(e){r=null}
    if(!r)continue;
    // interferometers and rails carry their own state
    r.sp.meta=Object.assign({},r.sp.meta,r.meta);
    const lv=finish(rnd,r.sp,{name:r.meta.name,hint:r.meta.hint,pol:r.sp.meta.pol||r.meta.pol,coh:r.sp.coh||r.meta.coh});
    if(lv){lv.family=f;return lv}
  }
  return null;
}
return {make,FAMS,familiesFor,mulberry};
}
if(typeof module!=='undefined')module.exports={makeGen};
