import {installRoomModels} from './room-models.js';
import {furnishHall} from './halls.js';
import * as T from './vendor/three.module.js';
import {rooms, levels, ceilingOf, rise, stair, lift, openingsFor, roomAt} from './plan.js';
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
    function flushBatches(target){
      for(const [material,b] of batches){
        const geo=new T.BufferGeometry();
        geo.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
        geo.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));
        geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.idx);
        target.add(new T.Mesh(geo,material));
      }
      batches.clear();
    }
    const fallback=new T.Group();fallback.name='Loading shell';flushBatches(fallback);group.add(fallback);
    for(const opening of doorways){
      if(['single','double'].includes(opening[5]))doors.push(makeDoor(group,level,opening,opening[4],walnut,label));
    }
    daylight(.45,-7.70,4.15,2.24);
    if(level===1){daylight(3.71,4.4,1.58,2.75,Math.PI);daylight(-10,9.0,3.0,2.7,Math.PI);}
    if(level===2){daylight(-11.12,7.58,1.53,3.2,-Math.PI/2);}
    if(level===3){daylight(0,4.35,3.08,3.15,Math.PI);daylight(11.74,-7.64,4.45,2.34);}
    furnishHall({group,level,box,walnut,label});
    if(level===1){
      theatre=buildCinema({group,box,cyl,block,shadow,screens});
      screens.push(addTelevision(group,'television',1.91,1.73,-5.4755,2.53526,1.36514,false,false));
      screens.push(addTelevision(group,'bed',11.65,1.78,-1.511,2.58,1.45125,true,false));
      dressRooms({part,box,cyl,oval,group,label,walnut,items,editorial,featureStock});
      spot(4,2.83,-2.4,13,9);spot(-9.4,3.1,8.8,22,7);
      spot(12,3.1,-2.3,25,8);spot(11.6,2.8,7.4,28,8);
      spot(10.3,2.89,1.45,6,4.6);
    }else if(level===2){
      cove(-5.55,-5.88,3.8,3.04);cove(1.63,-5.88,2.7,3.04);
      listeningStation({group,part,box,cyl,block,sign,shadow,walnut,devices});
      originX=4;
      buildGamingDesk({part,box,tv,speaker,block,shadow,walnut});
      originX=0;
      const gamingProps={part,box,cyl,oval,group,block,label,walnut,shelfBounds,shadow};
      dressGamingRoom(gamingProps);brotherhoodStatue(gamingProps);
      collectibleShelves({group,box,cyl,walnut,block,shelfBounds,label});
      const crtX=14.39,crtZ=-2.25,crtY=1.51,crtWidth=1.48,crtDepth=crtWidth*.57;
      const crt=addTelevision(group,'retro',crtX-crtDepth/2-.003,crtY+.01,crtZ,crtWidth*.91,crtWidth*.91*.75,false,true);
      crt.screen.rotation.y=-Math.PI/2;screens.push(crt);
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

      sign('RETRO GAMING ROOM',12.27,3.065,-1.124,2.52,Math.PI);
      const arcadeLight=new T.PointLight('#a091c5',5,5,1.8);arcadeLight.position.set(12,2.20,-2.48);group.add(arcadeLight);
      spot(4,2.9,-1.8,18,9);spot(-2.9,2.8,4.63,13,7);spot(-8.5,3,9.5,24,8);spot(11.3,3,-6.2,28,9);spot(11.1,2.8,7.25,23,7);
    }
    if(level===3){
      spot(-2,4.9,-2,17,11);spot(3.6,4.8,2,15,9);spot(11,3.1,-4.5,14,8);
    }
    flushBatches(group);
  }
  const roomModels=installRoomModels(floors,obstacles,shelfBounds);
  return {floors,obstacles,occluders,doors,screens,devices,shelfBounds,featureStock,theatre,roomModels};
}
