import {furnishUpper} from './upper-gallery.js';
import {furnishHall} from './halls.js';
import * as T from './vendor/three.module.js';
import {rooms, levels, ceilingOf, rise, stair, stairStart, stairEnd, lift, openingsFor, roomAt} from './plan.js';
import {makeDoor} from './doors.js';
import {addTelevision} from './displays.js';
import {buildCinema} from './cinema.js';
import {listeningStation,arcadeCabinets} from './media-rooms.js';
import {collectibleShelves} from './collectibles.js';
import {buildGamingDesk} from './gaming-desk.js';

let seed=22711;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function surface(type) {
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d');
  const rgb={concrete:[119,117,113],floor:[88,87,83],wood:[94,69,51],fabric:[133,123,109],rug:[129,113,90]}[type];
  const pixels=g.createImageData(256,256);
  const noise=Array.from({length:16},()=>Array.from({length:16},()=>random()));
  function broad(x,y){
    const a=Math.floor(x)%16,b=Math.floor(y)%16,u=x%1,v=y%1;
    return (noise[a][b]*(1-u)+noise[(a+1)%16][b]*u)*(1-v)+(noise[a][(b+1)%16]*(1-u)+noise[(a+1)%16][(b+1)%16]*u)*v;
  }
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4;
    let n=(random()-.5)*17+(broad(x/16,y/16)-.5)*10+(broad(x/64,y/64)-.5)*13;
    if(type==='wood')n+=7*Math.sin(y*.77+Math.sin(x/45)*1.6)+7*Math.sin(y*.16+Math.sin(x/53));
    if(type==='fabric'||type==='rug')n+=(x%3===0?12:-4)+(y%3===0?10:-3);
    for(let k=0;k<3;k++)pixels.data[i+k]=rgb[k]+n;
    pixels.data[i+3]=255;
  }
  g.putImageData(pixels,0,0);
  if(type==='concrete'){
    g.fillStyle='rgba(24,20,16,.4)';g.fillRect(0,0,1.5,256);g.fillRect(0,0,256,1);
    for(const x of [15,241])for(const y of [19,237]){g.beginPath();g.arc(x,y,1.7,0,Math.PI*2);g.fill();}
  }
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=2;
  return new T.MeshStandardMaterial({map:tex,roughness:type==='floor'?.48:.85});
}
const colors=new Map();
function paint(color){if(typeof color!=='string')return color;if(!colors.has(color))colors.set(color,new T.MeshStandardMaterial({color,roughness:.72}));return colors.get(color);}
const shapes={box:new T.BoxGeometry(),round:new T.CylinderGeometry(.5,.5,1,20),leaf:new T.SphereGeometry(.5,8,6),cone:new T.CylinderGeometry(.44,.5,1,20)};
// A softened box retains flat upholstered faces and rounds the seams at their edges.
const cushion = new T.BoxGeometry(1,1,1,8,8,8);
const cushionPoint=new T.Vector3(), core=new T.Vector3(), edge=new T.Vector3();
for(let i=0;i<cushion.attributes.position.count;i++){
  cushionPoint.fromBufferAttribute(cushion.attributes.position,i);
  core.copy(cushionPoint).clampScalar(-.4,.4);edge.subVectors(cushionPoint,core).normalize();
  cushionPoint.copy(core).addScaledVector(edge,.1);
  cushion.attributes.position.setXYZ(i,cushionPoint.x,cushionPoint.y,cushionPoint.z);
  cushion.attributes.normal.setXYZ(i,edge.x,edge.y,edge.z);
}
shapes.cushion=cushion;
const dummy=new T.Object3D();
function tileMaterial(file,roughness){
  const map=new T.TextureLoader().load(new URL('./art/'+file+'.webp',import.meta.url).href);
  map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
  return new T.MeshStandardMaterial({map,roughness});
}
const stone=tileMaterial('basalt',.82),glassBlock=tileMaterial('glass-block',.27);
glassBlock.emissive.set('#c9dcc0');glassBlock.emissiveMap=glassBlock.map;glassBlock.emissiveIntensity=.43;
glassBlock.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec2 cell=floor(vMapUv),pane=vMapUv*.18;
    float sky=.66+.20*sin(pane.x+pane.y*.52)+.10*cos(pane.x*1.9-pane.y)+.10*fract(sin(dot(cell,vec2(59.12,18.14)))*984.17);
    diffuseColor.rgb*=vec3(sky*.90,sky,sky*.87);`);
};
const floorMat=surface('floor'),walnut=surface('wood'),linen=surface('fabric'),wool=surface('rug');
const iron='#252724', dark='#33322f', cream='#c2b8a3', brass='#ab8660';
const light=new T.MeshBasicMaterial({color:'#ffcb8a',toneMapped:false});
function textureMaterial(draw,w=512,h=256){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map});
}
const shadowMat=(()=>{const m=textureMaterial((g,w,h)=>{const v=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);v.addColorStop(0,'rgba(15,10,5,.72)');v.addColorStop(.55,'rgba(15,10,5,.45)');v.addColorStop(1,'rgba(15,10,5,0)');g.fillStyle=v;g.fillRect(0,0,w,h);},96,96);m.transparent=true;m.depthWrite=false;return m})();
// Soft patterned daylight in front of glazed masonry. Shared alpha map keeps the
// glass-block shadows inexpensive on phones as well as on desktop.
const sunPatch=textureMaterial((ctx,w,h)=>{
  ctx.clearRect(0,0,w,h);
  const wash=ctx.createLinearGradient(0,0,0,h);
  wash.addColorStop(0,'rgba(255,232,174,.32)');wash.addColorStop(.61,'rgba(255,223,154,.20)');wash.addColorStop(1,'rgba(255,221,160,0)');
  ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='destination-out';
  ctx.filter='blur(2px)';ctx.strokeStyle='rgba(0,0,0,.69)';ctx.lineWidth=3;
  for(let i=-2;i<16;i++){ctx.beginPath();ctx.moveTo(i*w/13,0);ctx.lineTo(i*w/13+w*.14,h);ctx.stroke();}
  for(let i=1;i<9;i++){ctx.fillStyle='rgba(0,0,0,.52)';ctx.fillRect(0,i*h/10,w,2.5);}
  const feather=ctx.createLinearGradient(0,0,w,0);
  feather.addColorStop(0,'#000');feather.addColorStop(.12,'transparent');feather.addColorStop(.88,'transparent');feather.addColorStop(1,'#000');
  ctx.fillStyle=feather;ctx.fillRect(0,0,w,h);
},512,256);
sunPatch.transparent=true;sunPatch.depthWrite=false;sunPatch.blending=T.AdditiveBlending;
import {dressRooms} from './room-props.js';
import {dressGamingRoom} from './modern-room.js';
import {brotherhoodStatue} from './brotherhood-statue.js';
import {buildRetroShowcase} from './retro-showcase.js';

export function buildInterior(scene,label,items,editorial){
  const featureStock=new Map();
  let theatre;
  const shelfBounds=[], floors=[], obstacles=[], occluders=[], doors=[], screens=[], devices=[];
  scene.add(new T.HemisphereLight('#f9e9d7','#716f68',1.38));
  const sun=new T.DirectionalLight('#fff1df',1.55);sun.position.set(-5,9,5);scene.add(sun);
  const fill=new T.DirectionalLight('#b8c9d3',.52);fill.position.set(8,3,-4);scene.add(fill);

  for(const level of levels){
    const group=new T.Group();group.position.y=(level-1)*rise;scene.add(group);floors.push(group);
    const batches=new Map(),doorways=openingsFor(level);
    let originX=0;
    function part(shape,x,y,z,w,h,d,material,rx=0,ry=0,rz=0,pose=null){
      const mat=paint(material),base=typeof shape==='string'?shapes[shape]:shape;
      if(!batches.has(mat))batches.set(mat,{p:[],n:[],uv:[],idx:[]});
      const b=batches.get(mat),start=b.p.length/3;
      dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(w,h,d);dummy.updateMatrix();
      if(pose)dummy.matrix.premultiply(pose);
      dummy.matrix.elements[12]+=originX;
      const normalMatrix=new T.Matrix3().getNormalMatrix(dummy.matrix),vec=new T.Vector3();
      for(let i=0;i<base.attributes.position.count;i++){
        vec.fromBufferAttribute(base.attributes.position,i).applyMatrix4(dummy.matrix);const px=vec.x,py=vec.y,pz=vec.z;b.p.push(px,py,pz);
        vec.fromBufferAttribute(base.attributes.normal,i).applyMatrix3(normalMatrix).normalize();b.n.push(vec.x,vec.y,vec.z);
        if(mat.userData.metresPerTile||mat===glassBlock||mat===stone||mat===floorMat||mat===walnut||mat===linen||mat===wool){
          const side=Math.abs(vec.x)>.7,top=Math.abs(vec.y)>.7,scale=mat.userData.metresPerTile||(mat===glassBlock?.245:mat===stone?2.5:mat===walnut?1.3:mat===floorMat?3:.7);
          b.uv.push((side?pz:px)/scale,(top?pz:py)/scale);
        }else b.uv.push(base.attributes.uv.getX(i),base.attributes.uv.getY(i));
      }
      if(base.index){for(const k of base.index.array)b.idx.push(start+k);}
      else{for(let i=0;i<base.attributes.position.count;i++)b.idx.push(start+i);}
    }
    const box=(...args)=>part(args[6]===linen?'cushion':'box',...args), cyl=(...args)=>part('round',...args), oval=(...args)=>part('leaf',...args);
    const block=(x,z,w,d)=>obstacles.push({level,x:x+originX,z,w,d});
    function shadow(x,z,w,d,y=.012){const m=new T.Mesh(new T.PlaneGeometry(w,d),shadowMat);m.rotation.x=-Math.PI/2;m.position.set(x+originX,y,z);group.add(m);}
    function daylight(x,z,w,d,angle=0){
      const beam=new T.Mesh(new T.PlaneGeometry(w,d),sunPatch);
      beam.rotation.order='YXZ';beam.rotation.set(-Math.PI/2,angle,0,'YXZ');
      beam.position.set(x,.038,z);group.add(beam);
    }
    function sign(name,x,y,z,w,angle=0){const tag=label(group,name,x,y,z,w,.21,{height:96,width:768,bg:'#302c26',color:'#f1d7ad',size:56});tag.rotation.y=angle;}
    function lightStrip(x,y,z,w,d){box(x,y,z,w,.08,d,iron);box(x,y-.048,z,w*.96,.018,d*.6,light);}
    function cove(x,z,width,height,angle=0){
      const wash=textureMaterial((g,w,h)=>{const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'rgba(255,192,112,.65)');grad.addColorStop(.14,'rgba(235,150,70,.23)');grad.addColorStop(1,'rgba(225,142,65,0)');g.fillStyle=grad;g.fillRect(0,0,w,h);},32,128);
      wash.transparent=true;wash.depthWrite=false;wash.blending=T.AdditiveBlending;
      const halo=new T.Mesh(new T.PlaneGeometry(width,1.08),wash);halo.position.set(x,height-.54,z);halo.rotation.y=angle;group.add(halo);
      box(x,height+.045,z,width,.085,.13,walnut,0,angle);box(x,height,z,width-.04,.021,.095,light,0,angle);
    }
    function spot(x,y,z,power,dist){const l=new T.PointLight('#ffbd78',power,dist,1.7);l.position.set(x,y,z);group.add(l);}
    function plant(x,z,h=1.3,y=0){
      part('cone',x,y+h*.15,z,h*.32,h*.3,h*.32,'#49443a');cyl(x,y+h*.5,z,.026,h*.54,.026,'#62583a');
      for(let i=0;i<28;i++){let a=i*2.4,rad=h*(.08+.19*random()),ly=y+h*(.43+.54*random());
        oval(x+Math.cos(a)*rad,ly,z+Math.sin(a)*rad,h*.17,h*.31,h*.023,['#374d29','#58683c','#76874e','#2f4023'][i%4],Math.sin(a)*.8,a,Math.cos(a)*.8);}
    }
    function shelf(x,z,w,h,kind,angle=0){
      const piece=(lx,ly,lz,sw,sh,sd,m)=>box(x+Math.cos(angle)*lx+Math.sin(angle)*lz,ly,z-Math.sin(angle)*lx+Math.cos(angle)*lz,sw,sh,sd,m,0,angle);
      piece(0,h/2,-.23,w,h,.07,dark);for(const side of [-1,1])piece(side*w/2,h/2,0,.065,h,.56,iron);
      for(let r=0;r<=4;r++){const sy=.12+r*(h-.15)/4;piece(0,sy,0,w,.065,.6,walnut);if(r===4)break;
        if(kind!=='empty'){for(let k=0;k<4;k++){const px=w*((k+.5)/4-.5);if(kind==='objects'&&(k+r)%2===0){piece(px,sy+.24,0,.13,.36,.12,brass);piece(px,sy+.47,0,.22,.18,.17,cream);piece(px,sy+.055,0,.42,.07,.21,iron);}else{piece(px,sy+.112,0,w*.17,.15,.32,(k+r)%2?cream:iron);piece(px,sy+.2,0,w*.11,.045,.25,dark);piece(px+.08,sy+.12,.164,.035,.018,.012,light);}}}
      }
      piece(0,h-.06,.24,w-.1,.018,.04,light);
      shelfBounds.push({level,x:x+originX,z,w:Math.abs(Math.cos(angle))*(w+.07)+Math.abs(Math.sin(angle))*.6,d:Math.abs(Math.sin(angle))*(w+.07)+Math.abs(Math.cos(angle))*.6,bottom:0,top:h+.04});
      block(x,z,Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*.6,Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*.6);
    }
    function tv(x,z,w,y,crt=false,reverse=false,surface=.8375){
      const sign=reverse?-1:1,depth=crt?w*.57:.065;
      const screenW=w*.91*(crt?1:1.4),screenH=crt?screenW*3/4:w*.49*1.4;
      const rim=.012,bodyW=crt?w:screenW+rim*2,bodyH=crt?w*.8:screenH+rim*2;
      box(x,y,z,bodyW,bodyH,depth,iron);
      const screenZ=z+sign*(depth/2+.002),room=roomAt(level,x+originX,z).id;
      screens.push(addTelevision(group,room,x+originX,y+(crt?.01:0),screenZ,screenW,screenH,reverse,crt));
      const bottom=y-bodyH/2;
      box(x,(bottom+surface)/2,z,.09,bottom-surface,.09,iron);
      box(x,surface+.02,z,bodyW*.40,.04,crt?.42:.32,iron);
    }
    function cabinet(x,z,w){box(x,.42,z,w,.74,.68,walnut);box(x,.075,z,w-.2,.14,.5,iron);box(x,.81,z,w+.04,.055,.72,dark);for(let i=-1;i<=1;i++)box(x+i*w*.26,.43,z+.352,.014,.6,.008,iron);shadow(x,z,w*1.2,1.3);block(x,z,w,.74);}
    function seat(x,z,w,angle=0,fabric=linen){const p=(lx,y,lz,sw,h,sd,m,rx=0)=>part(m===fabric?'cushion':'box',x+Math.cos(angle)*lx+Math.sin(angle)*lz,y,z-Math.sin(angle)*lx+Math.cos(angle)*lz,sw,h,sd,m,rx,angle);
      p(0,.21,0,w-.12,.2,.68,iron);p(0,.39,0,w,.31,.85,fabric);p(0,.77,.4,w,.66,.22,fabric,.14);for(const side of [-1,1])p(side*(w/2-.09),.55,.01,.18,.45,.9,fabric);
      const count=Math.max(1,Math.round(w/1.05));for(let i=0;i<count;i++){const xx=(i+.5)*((w-.32)/count)-w/2+.16;p(xx,.57,-.035,(w-.35)/count-.015,.12,.64,fabric);p(xx,.82,.23,(w-.35)/count-.025,.47,.16,fabric,.13);}
      block(x,z,Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*.95,Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*.95);shadow(x,z,w*1.45,1.65);}
    function table(x,z,w,d,y=.53){box(x,y,z,w,.105,d,walnut);for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.12),y/2,z+b*(d/2-.1),.075,y,.075,iron);block(x,z,w,d);shadow(x,z,w*1.4,d*1.5);}
    function speaker(x,y,z){box(x,y+.25,z,.31,.5,.29,walnut);for(const [cy,sz] of [[.18,.2],[.37,.09]])cyl(x,y+cy,z+.15,sz,.024,sz,iron,Math.PI/2);}
    const plan=rooms.filter(r=>r.floor===level),height=ceilingOf(level);
    const boundaries=new Map();
    function outline(bounds){
      const [x,z,X,Z]=bounds;
      for(const [axis,f,a,b] of [['x',x,z,Z],['x',X,z,Z],['z',z,x,X],['z',Z,x,X]]){
        const key=axis+f;
        if(!boundaries.has(key))boundaries.set(key,{axis,f,spans:[]});
        boundaries.get(key).spans.push([a,b]);
      }
    }
    for(const r of plan){
      const [x,z,X,Z]=r.bounds,cx=(x+X)/2,cz=(z+Z)/2,w=X-x,d=Z-z;
      outline(r.bounds);
      if(r.id==='cinema')continue;
      box(cx,-.10,cz,w,.20,d,floorMat);
      box(cx,height+.08,cz,w,.16,d,walnut);
      for(let xx=x+.42;xx<X-.15;xx+=.48)box(xx,height-.006,cz,.010,.014,d,'#493b2e');
      for(let zz=z+1.25;zz<Z-.6;zz+=4.5)lightStrip(cx,height-.17,zz,Math.min(w*.60,5.3),.078);
    }
    outline(stair);outline(lift);
    for(const {axis,f,spans} of boundaries.values()){
      const matching=doorways.filter(([ax,k])=>ax===axis&&k===f);
      const cuts=[...new Set([...spans.flat(),...matching.flatMap(d=>d.slice(2,4))])].sort((a,b)=>a-b);
      for(let i=1;i<cuts.length;i++){
        const a=cuts[i-1],b=cuts[i],mid=(a+b)/2;
        if(!spans.some(([lo,hi])=>lo<mid&&mid<hi))continue;
        const opening=matching.find(d=>mid>d[2]&&mid<d[3]);
        const kind=opening?.[5];
        const x=axis==='x'?f:mid,z=axis==='z'?f:mid,w=axis==='x'?.18:b-a,d=axis==='z'?.18:b-a;
        if(kind==='glass'){
          const sill=.36,head=height-.36;
          box(x,sill/2,z,w,sill,d,stone);
          box(x,(head+sill)/2,z,w,head-sill,d,glassBlock);
          box(x,(height+head)/2,z,w,height-head,d,stone);
          box(x,sill,z,w+.038,.065,d+.038,walnut);
          block(x,z,w,d);occluders.push({level,x,z,w,d});
          continue;
        }
        const clear=kind==='open'?(opening[4]==='Reading area'?height:2.78):opening?2.65:0;
        if(height>clear)box(x,(height+clear)/2,z,w,height-clear,d,stone);
        if(!opening){
          block(x,z,w,d);occluders.push({level,x,z,w,d});
          box(x,.065,z,w+.025,.13,d+.025,dark);
        }else if(kind==='single'||kind==='double'){
          for(const q of [a+.035,b-.035])box(axis==='x'?f:q,1.32,axis==='z'?f:q,axis==='x'?.215:.06,2.64,axis==='z'?.215:.06,walnut);
          box(x,2.63,z,w+.03,.08,d+.03,walnut);
        }
      }
    }
    for(const opening of doorways){
      if(['single','double'].includes(opening[5]))doors.push(makeDoor(group,level,opening,opening[4],walnut,label));
    }
    daylight(.45,-7.70,4.15,2.24);
    if(level===1){daylight(3.71,4.4,1.58,2.75,Math.PI);daylight(-10,9.0,3.0,2.7,Math.PI);}
    if(level===2){daylight(-11.12,7.58,1.53,3.2,-Math.PI/2);}
    if(level===3){daylight(0,4.35,3.08,3.15,Math.PI);daylight(11.74,-7.64,4.45,2.34);}
    // The north landing belongs to each level. Two flights turn around the southern landing.
    box(-10,-.075,-8.12,4,.15,1.76,floorMat);
    if(level<levels.length){
      box(-10,rise/2-.085,-2.70,4,.17,1.40,stone);
      const run=(stairEnd-stairStart)/12;
      for(let i=0;i<12;i++){
        const z=stairStart+(i+.5)*run;
        for(const [x,h] of [[-11,(i+1)*rise/24],[-9,rise-i*rise/24]]){
          box(x,h-.074,z,1.93,.148,run+.01,stone);
          box(x,h-.023,z-run*.46,1.88,.017,.025,brass);
        }
      }
      for(const [x,low,high] of [[-10.065,.92,rise/2+.92],[-9.935,rise+.92,rise/2+.92]]){
        const slope=high-low;
        box(x,(low+high)/2,(stairEnd+stairStart)/2,.046,.055,Math.hypot(stairEnd-stairStart,slope),walnut,-Math.atan2(slope,stairEnd-stairStart));
        for(let j=0;j<5;j++){
          const t=j/4;
          box(x,low+slope*t-.47,stairStart+(stairEnd-stairStart)*t,.026,.91,.026,iron);
        }
      }
    }else{
      box(-10,height+.08,-5.5,4,.16,7,walnut);box(-3.475,height+.08,-10.2,2.45,.16,2.4,stone);
    }
    furnishHall({group,level,part,box,cyl,oval,block,seat,table,plant,walnut,stone,brass,iron,light,label});

    function rug(x,z,w,d){
      box(x,.016,z,w,.019,d,wool);for(const k of [-1,1]){
        box(x,.028,z+k*(d/2-.1),w-.13,.009,.03,'#524e44');box(x+k*(w/2-.1),.028,z,.03,.009,d-.13,'#524e44');
      }
    }
    function textileRack(x,z){
      for(const a of [-1,1]){box(x+a*1.35,.9,z,.047,1.8,.047,iron);box(x+a*1.35,.065,z,.15,.08,.7,iron);}
      box(x,1.77,z,2.76,.047,.047,brass);
      const tones=['#b3a389','#383e37','#c5bba7','#625d4e','#8b7668','#454645'];
      for(let i=0;i<14;i++){
        const xx=x-1.21+i*.18,h=.65+random()*.25;
        cyl(xx,1.7,z,.021,.12,.021,brass);
        oval(xx,1.51,z,.14,.21,.59,walnut);
        part('cone',xx,1.42-h*.5,z,.15,h,.54,tones[i%6]);
        for(const s of [-1,1])oval(xx,1.34,z+s*.24,.13,.34,.15,tones[i%6],s*-.34);
      }block(x,z,2.8,.72);shadow(x,z,3.2,1.2);
    }
    if(level===1){
      theatre=buildCinema({group,box,cyl,block,shadow,screens});
      cove(1.93,-5.88,3.42,3.05);
      cabinet(1.91,-5.53,3.10);tv(1.91,-5.51,1.99,1.73);
      speaker(.58,.84,-5.44);speaker(3.25,.84,-5.44);
      rug(3.60,.65,4.66,4.43);seat(3.2,2.12,2.63);seat(5.48,-.40,.87,.70);
      table(3.33,.42,1.64,.66);plant(3.72,.42,.48,.59);plant(.57,-4.30,1.48);spot(4,2.83,-2.4,13,9);
      textileRack(-10.5,7.7);textileRack(-9.1,9.4);rug(-9.2,8.7,5.9,3.6);
      box(-4.77,1.28,9.9,1.35,2.56,1.77,walnut);for(let i=0;i<12;i++)box(-5.39+i*.112,1.26,8.98,.125,2.48,.1+(i%2)*.06,linen);block(-4.77,9.9,1.35,1.85);sign('FITTING ROOM',-4.77,2.75,8.93,1.25,Math.PI);
      shelf(-12.53,9.3,2.35,2.35,'empty',Math.PI/2);plant(-12.25,6.68,1.32);spot(-9.4,3.1,8.8,22,7);
      // Bedroom: upholstered bed, folded throw, nightstands, wardrobe, cinema wall.
      rug(11.6,-5.85,4.5,4.15);box(11.65,.32,-5.95,2.38,.53,3.18,walnut);box(11.65,.68,-5.95,2.34,.29,3.13,linen);box(11.65,.88,-5.27,2.35,.13,1.76,'#5d625b');box(11.65,1.0,-7.58,2.55,1.55,.17,walnut);block(11.65,-5.95,2.5,3.4);
      for(const a of [-1,1]){oval(11.65+a*.54,.9,-7,.96,.27,.56,cream);box(11.65+a*1.65,.43,-7.15,.64,.64,.68,walnut);cyl(11.65+a*1.65,.93,-7.15,.21,.38,.21,brass);cyl(11.65+a*1.65,1.16,-7.15,.37,.28,.37,cream);}
      box(14.5,1.4,-5.05,.8,2.8,3.6,walnut);block(14.5,-5.05,.8,3.6);cabinet(12.15,-1.47,4.04);spot(12,3.1,-2.3,25,8);
      // Shower glass, brass shower head, porcelain basin and WC.
      box(12.18,.085,1.95,1.35,.17,1.7,stone);const glass=new T.MeshStandardMaterial({color:'#9eaba1',transparent:true,opacity:.20,depthWrite:false});box(11.53,1.14,2.04,.034,2.2,1.5,glass);box(11.53,2.24,2.04,.05,.045,1.5,iron);block(12.18,2.15,1.2,1.2);
      cyl(12.76,1.45,2.42,.035,1.65,.035,brass);box(12.55,2.26,2.42,.46,.04,.04,brass);cyl(12.33,2.21,2.42,.25,.045,.25,iron);
      cabinet(9.53,-.51,1.57);oval(9.54,.86,-.51,.85,.13,.41,cream);box(9.54,1.08,-.72,.035,.39,.035,iron);box(9.53,1.81,-.88,1.38,.93,.056,brass);box(9.53,1.81,-.845,1.31,.86,.015,'#88908b');
      oval(12.11,.29,-.23,.5,.57,.69,cream);oval(12.11,.52,-.2,.54,.1,.74,cream);box(12.11,.68,-.56,.52,.65,.19,cream);block(12.11,-.24,.58,.72);
      cabinet(11.1,8.46,4.7);box(11.1,.88,8.44,4.78,.12,.8,stone);box(10,.956,8.39,.69,.012,.42,dark);box(10,1.12,8.61,.035,.34,.035,iron);box(10,1.28,8.53,.035,.035,.17,iron);
      box(12.34,1.17,8.43,.69,.45,.46,iron);box(12.33,1.17,8.19,.5,.3,.02,'#54585a');box(13.37,1.07,7.92,.86,2.1,.81,'#8d928d');box(13.37,1.31,7.5,.85,.025,.02,dark);block(13.37,7.92,.86,.81);
      table(11.1,6.6,2.8,.7,.98);for(const xx of [10.45,11.74]){cyl(xx,.63,5.93,.46,.08,.46,walnut);for(const a of [-1,1])for(const b of [-1,1])box(xx+.135*a,.31,5.93+.13*b,.037,.6,.037,iron);block(xx,5.93,.46,.46);}
      dressRooms({part,box,cyl,oval,group,label,walnut,items,editorial,featureStock});
      lightStrip(11.2,1.97,8.67,3.5,.19);plant(8.6,8.25,1.3);spot(11.6,2.8,7.4,28,8);
    }else if(level===2){
      cove(-5.55,-5.88,3.8,3.04);cove(1.63,-5.88,2.7,3.04);
      listeningStation({group,part,box,cyl,block,sign,shadow,walnut,devices});
      originX=4;
      rug(0,.32,5.65,4.62);
      buildGamingDesk({part,box,tv,speaker,block,shadow,walnut});
      originX=0;
      const gamingProps={part,box,cyl,oval,group,block,label,walnut,shelfBounds,shadow};
      dressGamingRoom(gamingProps);brotherhoodStatue(gamingProps);
      collectibleShelves({group,box,cyl,walnut,block,shelfBounds,label});
      rug(-3.73,3.23,4.02,3.89);
      seat(-3.73,4.59,2.43);seat(-4.80,2.05,1.01,-2.51);seat(-2.60,2.05,1.01,2.51);
      table(-3.73,3.30,1.38,.63);plant(-3.42,3.28,.38,.59);
      table(-9.04,8.78,2.19,1.02,.82);
      for(const x of [-9.70,-8.39]){seat(x,7.88,.65,Math.PI);seat(x,9.69,.65);}
      plant(-12.24,6.76,1.62);plant(-.62,5.51,1.37);
      // The east wall faces the west doorway. The centre of the glass sits on its sightline.
      const crtX=14.39,crtZ=-2.25,crtY=1.51,crtWidth=1.48,crtDepth=crtWidth*.57;
      box(crtX,.41,crtZ,.81,.75,1.91,walnut);box(crtX,.824,crtZ,.87,.063,1.99,dark);block(crtX,crtZ,.87,1.99);
      box(crtX,crtY,crtZ,crtDepth,crtWidth*.8,crtWidth,iron);
      box(crtX,.883,crtZ,.53,.072,.73,iron);
      const crt=addTelevision(group,'retro',crtX-crtDepth/2-.003,crtY+.01,crtZ,crtWidth*.91,crtWidth*.91*.75,false,true);
      crt.screen.rotation.y=-Math.PI/2;screens.push(crt);
      for(let i=0;i<5;i++)box(crtX-crtDepth/2-.004,1.015,crtZ+.42+i*.043,.009,.015,.029,'#7d807d');
      box(crtX-crtDepth/2-.006,1.015,crtZ+.65,.011,.012,.016,'#7eae75');
      buildRetroShowcase({part,box,cyl,oval,group,block,label,walnut,shelfBounds});
      // Keep the whole doorway-to-screen cone clear, including the edges of the CRT.
      // The two coin-ops share the east wall farther north, facing the seating area.
      const arcadeGroup=new T.Group();
      const arcadeX=15.90,arcadeZ=6.17;
      arcadeGroup.rotation.y=Math.PI/2;arcadeGroup.position.set(arcadeX,0,arcadeZ);arcadeGroup.updateMatrix();group.add(arcadeGroup);
      const oriented=shape=>(x,y,z,w,h,d,m,rx=0,ry=0,rz=0)=>part(shape,x,y,z,w,h,d,m,rx,ry,rz,arcadeGroup.matrix);
      arcadeCabinets({group:arcadeGroup,box:oriented('box'),cyl:oriented('round'),label,devices,
        block:(x,z,w,d)=>{block(arcadeX+z,arcadeZ-x,d,w);shelfBounds.push({level,x:arcadeX+z,z:arcadeZ-x,w:d,d:w,bottom:0,top:2.05});},
        shadow:(x,z,w,d)=>shadow(arcadeX+z,arcadeZ-x,d,w)});

      const arcadeRug='#303045';
      box(11.72,.022,-4.69,5.82,.022,4.68,arcadeRug);
      for(let i=0;i<8;i++)for(let j=0;j<5;j++){
        const x=9.30+i*.68+(j%2)*.18,z=-6.58+j*.90;
        box(x,.035,z,.105,.004,.021,(i+j)%2?'#527e7d':'#98738e',0,-.56);
        box(x+.062,.036,z+.012,.047,.004,.019,'#b99867',0,.64);
      }
      for(const h of [3.31,3.38])box(12.1,h,-1.106,5.4,.018,.016,h<3.35?'#4f8c92':'#98769b');
      sign('RETRO GAMING ROOM',12.27,3.065,-1.124,2.52,Math.PI);
      const arcadeLight=new T.PointLight('#a091c5',5,5,1.8);arcadeLight.position.set(12,2.20,-2.48);group.add(arcadeLight);shelf(11.1,8.52,4.82,2.8,'objects',Math.PI);shelf(13.53,6,2.6,2.42,'objects',-Math.PI/2);
      plant(7.2,5.15,1.45);plant(14.23,-6.85,1.5);plant(8.7,8.36,1.4);
      spot(4,2.9,-1.8,18,9);spot(-2.9,2.8,4.63,13,7);spot(-8.5,3,9.5,24,8);spot(11.3,3,-6.2,28,9);spot(11.1,2.8,7.25,23,7);
    }
    if(level===3){
      furnishUpper({group,part,box,cyl,oval,block,seat,table,rug,plant,walnut,linen,stone,cream,iron,brass,label});
      spot(-2,4.9,-2,17,11);spot(3.6,4.8,2,15,9);spot(11,3.1,-4.5,14,8);
    }
    for(const [material,b] of batches){const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.idx);
      group.add(new T.Mesh(geo,material));
    }
  }
  return {floors,obstacles,occluders,doors,screens,devices,shelfBounds,featureStock,theatre};
}
