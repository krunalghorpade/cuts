import * as T from './vendor/three.module.js';

// A life-size, unarmed Brotherhood T-60 exhibition figure, in cast metal on a low plinth.
export function brotherhoodStatue({part,box,block,shelfBounds,label,group}){
  const x=7.30,z=1.59,angle=-Math.PI/2;
  const pose=new T.Matrix4().makeRotationY(angle).setPosition(x,.13,z);
  const iron='#545955',brass='#9b8a69',dark='#323735',silver='#9b9b8b',edge='#757972',rust='#806552';
  const shape=(g,a,b,c,w,h,d,m,rx=0,ry=0,rz=0)=>part(g,a,b,c,w,h,d,m,rx,ry,rz,pose);
  const plate=(...args)=>shape('cushion',...args),oval=(...args)=>shape('leaf',...args),disc=(...args)=>shape('round',...args);
  const spherical=new T.SphereGeometry(.5,18,12);
  function hose(points,r,material){
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    shape(new T.TubeGeometry(path,16,r,8,false),0,0,0,1,1,1,material);
  }
  function breastPlate(outline,depth,material,y,z){
    const path=new T.Shape();outline.forEach(([a,b],i)=>i?path.lineTo(a,b):path.moveTo(a,b));path.closePath();
    shape(new T.ExtrudeGeometry(path,{depth,bevelEnabled:true,bevelThickness:.018,bevelSize:.016,bevelSegments:2}),0,y,z,1,1,1,material);
  }
  box(x,.064,z,.83,.128,1.16,'#41443f');box(x,.135,z,.79,.020,1.12,'#706f61');
  for(const s of [-1,1]){
    const leg=s*.207,f=s>0?.045:-.066;
    plate(leg,.093,f+.072,.265,.16,.388,iron);plate(leg,.08,f+.194,.264,.095,.177,edge,-.05);
    plate(leg,.175,f-.021,.190,.155,.190,dark);oval(leg,.38,f,.216,.38,.204,dark);
    plate(leg+s*.025,.41,f+.090,.194,.355,.103,edge,-.09,0,-s*.045);
    plate(leg+s*.09,.42,f-.04,.065,.306,.125,iron,-.03,0,-s*.06);
    disc(leg-s*.084,.37,f-.096,.028,.278,.028,brass,-.06);
    oval(leg,.601,f,.235,.197,.218,dark);
    plate(leg,.613,f+.106,.205,.166,.087,iron,-.09,0,s*.07);
    shape(spherical,leg-s*.019,.846,f-.009,.293,.434,.272,iron,.055,0,s*.055);
    plate(leg-s*.032,.864,f+.119,.238,.283,.064,edge,.09,0,s*.085);
    for(let k=0;k<3;k++)plate(leg,.76+k*.08,f+.155,.107,.008,.008,rust,0,0,s*.18);
    oval(s*.158,1.02,0,.28,.23,.245,dark);
  }
  plate(0,1.015,.05,.42,.145,.253,iron);plate(0,.972,.155,.18,.213,.089,edge,-.10);
  plate(0,1.226,-.007,.41,.31,.260,dark);
  for(let i=0;i<4;i++)plate(0,1.125+i*.06,.123,.305+i*.025,.033,.056,i%2?iron:edge,-.16);
  plate(0,1.465,-.015,.534,.374,.349,iron);
  breastPlate([[-.274,.088],[-.22,.17],[-.07,.16],[0,.10],[.07,.16],[.22,.17],[.274,.088],[.18,-.075],[0,-.14],[-.18,-.075]],.045,edge,1.474,.147);
  plate(0,1.441,.204,.085,.127,.065,iron,-.12);
  for(const s of [-1,1]){
    plate(s*.176,1.518,.22,.137,.055,.015,silver,0,0,s*.17);
    oval(s*.354,1.511,-.025,.268,.23,.279,dark);
    shape(spherical,s*.366,1.584,-.012,.348,.256,.379,iron,0,0,-s*.22);
    plate(s*.382,1.546,.132,.218,.138,.079,edge,.24,0,-s*.19);
    for(let k=0;k<3;k++)disc(s*(.307+.052*k),1.541,.17,.016,.009,.016,brass,Math.PI/2);
    oval(s*.411,1.355,0,.164,.279,.164,dark,0,0,s*.14);
    plate(s*.430,1.350,.045,.15,.197,.139,iron,0,0,s*.16);
    disc(s*.447,1.225,-.003,.126,.094,.126,silver,0,0,Math.PI/2);
    oval(s*.449,1.097,.034,.185,.250,.189,iron,-.13,0,-s*.04);
    plate(s*.449,1.105,.118,.138,.190,.071,edge,-.15);
    plate(s*.452,.958,.057,.119,.108,.126,dark,-.11);
    for(let k=0;k<4;k++)plate(s*(.403+.029*k),.91,.087,.024,.089,.047,iron,-.18);
    oval(s*.389,.95,.102,.036,.084,.047,dark,0,0,-s*.2);
  }
  // Power pack, fluted neck seal, brow, smoked twin lenses and respirator.
  plate(0,1.47,-.219,.396,.390,.176,dark);
  for(const s of [-1,1]){disc(s*.14,1.50,-.313,.093,.31,.093,iron);disc(s*.14,1.671,-.313,.095,.035,.095,brass);}
  for(let i=0;i<4;i++)disc(0,1.66+i*.022,0,.237,.018,.232,dark);
  shape(spherical,0,1.865,-.005,.310,.324,.297,edge);
  plate(0,1.974,-.012,.068,.087,.255,iron);
  for(const s of [-1,1]){
    plate(s*.073,1.889,.125,.123,.046,.041,iron,-.15,0,-s*.19);
    oval(s*.071,1.851,.138,.099,.039,.026,'#242b28',-.2,0,-s*.16);
    plate(s*.117,1.808,.081,.07,.116,.091,iron,.18,0,-s*.14);
    disc(s*.146,1.846,-.040,.082,.035,.082,dark,0,0,Math.PI/2);
    hose([[s*.054,1.776,.183],[s*.110,1.732,.172],[s*.159,1.748,.086],[s*.147,1.811,-.032]],.016,dark);
    for(let k=0;k<4;k++)disc(s*(.080+.014*k),1.750-.006*Math.sin(k),.169-k*.010,.033,.009,.033,brass,0,0,.80*s);
  }
  plate(0,1.807,.145,.101,.106,.080,iron,-.14);disc(0,1.767,.181,.085,.041,.085,dark,Math.PI/2);
  for(let i=0;i<4;i++)plate(-.023+i*.015,1.767,.204,.004,.045,.005,edge);
  // Stencilled Brotherhood wheel, wings and vertical sword on the chest plate.
  const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d');
  g.translate(96,105);g.fillStyle='#cbbca4';g.strokeStyle='#cbbca4';g.lineWidth=8;
  for(let k=0;k<10;k++){g.save();g.rotate(k*Math.PI/5);g.fillRect(-7,-43,14,12);g.restore();}
  g.beginPath();g.arc(0,0,31,0,Math.PI*2);g.stroke();
  for(const s of [-1,1])for(let k=0;k<3;k++){g.beginPath();g.moveTo(s*25,-5+k*11);g.lineTo(s*(80-k*9),-52+k*18);g.lineTo(s*(71-k*9),-29+k*16);g.closePath();g.fill();}
  g.fillRect(-4,-68,8,103);g.fillRect(-14,-45,28,5);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  shape(new T.PlaneGeometry(),-.139,1.474,.221,.085,.085,1,new T.MeshBasicMaterial({map,alphaTest:.4}));
  const tag=label(group,'BROTHERHOOD OF STEEL  /  T-60',x-.418,.077,z,.75,.065,{bg:'#343936',color:'#d9c9ad',height:76,width:768,size:45});tag.rotation.y=angle;
  block(x,z,.83,1.16);shelfBounds.push({level:2,x,z,w:.90,d:1.20,bottom:0,top:2.19});
}
