const W=1000,H=600,NW=40,LG=6;
const WL=[];for(let i=0;i<NW;i++)WL.push(400+300*i/(NW-1));
const ior=wl=>1.35+3e4/(wl*wl);
const D2R=Math.PI/180;
function wlRGB(wl){
  let r=0,g=0,b=0;
  if(wl<440){r=(440-wl)/60;b=1}else if(wl<490){g=(wl-440)/50;b=1}else if(wl<510){g=1;b=(510-wl)/20}
  else if(wl<580){r=(wl-510)/70;g=1}else if(wl<645){r=1;g=(645-wl)/65}else{r=1}
  const f=wl<420?0.3+0.7*(wl-380)/40:1;
  const c=v=>Math.round(255*Math.pow(Math.max(0,v*f),0.8));
  return [c(r),c(g),c(b)];
}
const DISC={pol:1,hwp:1,phase:1};
const DIALS={pol:{step:22.5,mod:180,name:'Axis'},hwp:{step:22.5,mod:180,name:'Axis'},pbs:{step:22.5,mod:180,name:'Axis'},phase:{step:45,mod:360,name:'Phase'}};
function normalize(p){
  p.a=(p.a||0)*D2R;
  const L={mirror:100,split:100,filter:80,lens:110,pbs:90,dichro:100};
  if(L[p.t])p.len=p.len||L[p.t];
  if(p.t==='prism')p.r=p.r||60;
  if(DISC[p.t]){p.r=p.r||30;p.norot=1}
  if(p.t==='goal')p.r=p.r||15;
  if(p.t==='lens'&&p.f===undefined)p.f=160;
  if(DIALS[p.t]&&p.ax===undefined)p.ax=0;
  if(p.t==='emit'||p.t==='filter'||p.t==='goal'||p.t==='dichro')p.band=p.band||[400,700];
  if(p.t==='emit'){p.pol=(p.pol||0);p.nb=p.w?(p.nb||9):1;p.w=p.w||0}
  p.ox=p.x;p.oy=p.y;
  if(p.rail!==undefined&&p.range===undefined)p.range=150;
  return p;
}
function segsOf(p){
  const c=Math.cos(p.a),s=Math.sin(p.a);
  if(p.len&&p.t!=='prism'&&p.t!=='wall'){
    const h=p.len/2;return [{x1:p.x-c*h,y1:p.y-s*h,x2:p.x+c*h,y2:p.y+s*h,k:p.t,p}];
  }
  if(p.t==='prism'){
    const v=[0,1,2].map(k=>{const q=p.a+k*2*Math.PI/3;return [p.x+Math.cos(q)*p.r,p.y+Math.sin(q)*p.r]});
    return [0,1,2].map(k=>({x1:v[k][0],y1:v[k][1],x2:v[(k+1)%3][0],y2:v[(k+1)%3][1],k:'glass',p}));
  }
  if(p.t==='wall'){
    const hw=p.w/2,hh=p.h/2;
    const v=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([u,w])=>[p.x+u*c-w*s,p.y+u*s+w*c]);
    return [0,1,2,3].map(k=>({x1:v[k][0],y1:v[k][1],x2:v[(k+1)%4][0],y2:v[(k+1)%4][1],k:'wall',p}));
  }
  return [];
}
const BOX=[[0,0,W,0],[W,0,W,H],[W,H,0,H],[0,H,0,0]].map(([a,b,c,d])=>({x1:a,y1:b,x2:c,y2:d,k:'wall',p:null}));
function trace(pieces){
  const segs=[],goals=[],emit=[],discs=[];
  for(const p of pieces){
    if(p.t==='goal')goals.push(p);else if(p.t==='emit')emit.push(p);else if(DISC[p.t])discs.push(p);else segs.push(...segsOf(p));
  }
  segs.push(...BOX);
  const st=goals.map(()=>({inc:new Float32Array(NW),re:new Float32Array(NW),im:new Float32Array(NW)}));
  const out=[],stack=[],ev=[];
  let minI=NW;const emitted=[];
  for(const e of emit){
    const dx=Math.cos(e.a),dy=Math.sin(e.a),px=-dy,py=dx;
    for(let i=0;i<NW;i++)if(WL[i]>=e.band[0]&&WL[i]<=e.band[1]){
      minI=Math.min(minI,i);emitted.push(i);
      for(let k=0;k<e.nb;k++){
        const off=e.nb>1?(k/(e.nb-1)-0.5)*e.w:0;
        stack.push({x:e.x+dx*16+px*off,y:e.y+dy*16+py*off,dx,dy,i,I:1/e.nb,K:e.nb,ins:null,d:0,pol:e.pol*D2R,ph:0,vp:0});
      }
    }
  }
  const mk=(r,o)=>Object.assign({x:r.x,y:r.y,dx:r.dx,dy:r.dy,i:r.i,I:r.I,K:r.K,ins:r.ins,d:r.d+1,pol:r.pol,ph:r.ph,vp:r.vp},o);
  let guard=0;
  while(stack.length&&guard++<60000){
    const r=stack.pop();
    if(r.d>30||r.I<0.01)continue;
    let bt=1e9,bs=null,bg=-1,bd=null;
    for(const s of segs){
      const ex=s.x2-s.x1,ey=s.y2-s.y1,den=r.dx*ey-r.dy*ex;
      if(Math.abs(den)<1e-9)continue;
      const qx=s.x1-r.x,qy=s.y1-r.y;
      const t=(qx*ey-qy*ex)/den,u=(qx*r.dy-qy*r.dx)/den;
      if(t>1e-4&&u>=0&&u<=1&&t<bt){bt=t;bs=s;bg=-1;bd=null}
    }
    for(const d of discs){
      const fx=d.x-r.x,fy=d.y-r.y,t=fx*r.dx+fy*r.dy;
      if(t>1e-4&&Math.abs(fx*r.dy-fy*r.dx)<=d.r&&t<bt){bt=t;bd=d;bs=null;bg=-1}
    }
    for(let gi=0;gi<goals.length;gi++){
      const g=goals[gi],fx=r.x-g.x,fy=r.y-g.y;
      const b=fx*r.dx+fy*r.dy,cc=fx*fx+fy*fy-g.r*g.r,disc=b*b-cc;
      if(disc>0){const t=-b-Math.sqrt(disc);if(t>1e-4&&t<bt){bt=t;bs=null;bg=gi;bd=null}}
    }
    const hx=r.x+r.dx*bt,hy=r.y+r.dy*bt;
    const lamg=WL[r.i]/LG;
    const nn=r.ins?ior(WL[r.i]):1,dph=2*Math.PI*bt*nn/lamg;
    const ph=r.ph+dph,vp=r.vp+dph;
    out.push({x1:r.x,y1:r.y,x2:hx,y2:hy,i:r.i,I:r.I,K:r.K,pol:r.pol,vp0:r.vp,ph0:r.ph,n:nn});
    if(bg>=0){const s=st[bg],a=Math.sqrt(r.I);s.inc[r.i]+=r.I;s.re[r.i]+=a*Math.cos(ph);s.im[r.i]+=a*Math.sin(ph);continue}
    if(bd){
      const b2=Object.assign({},r,{x:hx,y:hy,ph,vp}),p=bd;
      if(p.t==='phase')stack.push(mk(b2,{ph:ph+p.ax*D2R}));
      else if(p.t==='pol'){const c=Math.cos(r.pol-p.ax*D2R);stack.push(mk(b2,{I:r.I*c*c,pol:p.ax*D2R}))}
      else stack.push(mk(b2,{pol:2*p.ax*D2R-r.pol}));
      continue;
    }
    if(!bs)continue;
    const k=bs.k,p=bs.p;
    if(k==='wall')continue;
    const base=Object.assign({},r,{x:hx,y:hy,ph,vp});
    if(k==='filter'){
      if(WL[r.i]>=p.band[0]&&WL[r.i]<=p.band[1])stack.push(mk(base,{}));
      continue;
    }
    const sl=Math.hypot(bs.x2-bs.x1,bs.y2-bs.y1),ex=(bs.x2-bs.x1)/sl,ey=(bs.y2-bs.y1)/sl;
    let nx=-ey,ny=ex;
    if(nx*r.dx+ny*r.dy>0){nx=-nx;ny=-ny}
    const dn=r.dx*nx+r.dy*ny;
    const rx=r.dx-2*dn*nx,ry=r.dy-2*dn*ny;
    if(k==='mirror'){stack.push(mk(base,{dx:rx,dy:ry,ph:ph+Math.PI}));continue}
    if(k==='dichro'){
      if(WL[r.i]>=p.band[0]&&WL[r.i]<=p.band[1])stack.push(mk(base,{dx:rx,dy:ry,ph:ph+Math.PI}));
      else stack.push(mk(base,{}));
      continue;
    }
    if(k==='split'){
      stack.push(mk(base,{dx:rx,dy:ry,I:r.I/2,ph:ph+Math.PI/2}));
      stack.push(mk(base,{I:r.I/2}));
      continue;
    }
    if(k==='pbs'){
      const c=Math.cos(r.pol-p.ax*D2R),T=c*c;
      if(T>0.005)stack.push(mk(base,{I:r.I*T,pol:p.ax*D2R}));
      if(1-T>0.005)stack.push(mk(base,{dx:rx,dy:ry,I:r.I*(1-T),pol:p.ax*D2R+Math.PI/2}));
      continue;
    }
    if(k==='lens'){
      const fx=-nx,fy=-ny;
      const dd=r.dx*fx+r.dy*fy,dt=r.dx*ex+r.dy*ey;
      const slope=dt/dd,h=(hx-p.x)*ex+(hy-p.y)*ey;
      const s2=slope-h/p.f;
      let ux=fx+s2*ex,uy=fy+s2*ey;const ul=Math.hypot(ux,uy);ux/=ul;uy/=ul;
      stack.push(mk(base,{dx:ux,dy:uy}));continue;
    }
    if(k==='glass'){
      const n=ior(WL[r.i]);
      const inside=r.ins===p,n1=inside?n:1,n2=inside?1:n,eta=n1/n2;
      const ci=-dn,kk=1-eta*eta*(1-ci*ci);
      if(kk<0){ev.push({x:hx,y:hy,nx,ny,dx:r.dx,dy:r.dy,ox:rx,oy:ry,i:r.i,tir:1});stack.push(mk(base,{dx:rx,dy:ry}))}
      else{
        const f=eta*ci-Math.sqrt(kk),ox=eta*r.dx+f*nx,oy=eta*r.dy+f*ny;
        ev.push({x:hx,y:hy,nx,ny,dx:r.dx,dy:r.dy,ox,oy,i:r.i,tir:0});
        stack.push(mk(base,{dx:ox,dy:oy,ins:inside?null:p}));
      }
    }
  }
  const res=goals.map((g,gi)=>evalGoal(g,st[gi]));
  let refI=minI;for(const i of emitted)if(Math.abs(i-20)<Math.abs(refI-20))refI=i;
  return {rays:out,res,minI,ev,refI};
}
function evalGoal(g,s){
  const bands=g.bands||[g.band],need=g.need||0.2;
  let inN=0,hit=0,outside=0,sum=0,incSum=0;
  for(let i=0;i<NW;i++){
    const w=WL[i];let inb=false;
    for(const b of bands)if(w>=b[0]&&w<=b[1]){inb=true;break}
    const en=g.coh?s.re[i]*s.re[i]+s.im[i]*s.im[i]:s.inc[i];
    if(inb){inN++;sum+=en;incSum+=s.inc[i];if(en>=need)hit++}else outside+=s.inc[i];
  }
  const pct=inN?sum/inN:0;
  if(g.dark){
    const inc=inN?incSum/inN:0;
    return {prog:inc>=0.3?1:0,pct,lit:inc>=0.3&&pct<=0.05,bad:inc>=0.3&&pct>0.05};
  }
  const prog=inN?hit/inN:0;
  return {prog,pct,lit:prog>=0.7&&(!g.ex||outside<=2),bad:!!g.ex&&outside>2};
}
if(typeof module!=='undefined')module.exports={W,H,NW,WL,ior,wlRGB,normalize,trace,segsOf,DIALS,DISC};
