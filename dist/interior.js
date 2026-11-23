import * as T from './vendor/three.module.js';
import {rooms, rise, stair, doorways, roomAt} from './plan.js';
import {makeDoor} from './doors.js';

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
const stone=surface('concrete'),floorMat=surface('floor'),walnut=surface('wood'),linen=surface('fabric'),wool=surface('rug');
const iron='#252724', dark='#33322f', cream='#c2b8a3', brass='#ab8660';
const light=new T.MeshBasicMaterial({color:'#ffcb8a',toneMapped:false});
function textureMaterial(draw,w=512,h=256){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map});
}
const landscape=textureMaterial((g,w,h)=>{
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#3f5578');sky.addColorStop(.45,'#ebb298');sky.addColorStop(.7,'#dd9b72');sky.addColorStop(1,'#363c4e');g.fillStyle=sky;g.fillRect(0,0,w,h);
  g.fillStyle='#ffe8b4';g.beginPath();g.arc(333,100,16,0,Math.PI*2);g.fill();
  for(let l=0;l<4;l++){g.fillStyle=['#827787','#665767','#493f4c','#2e303a'][l];g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=6)g.lineTo(x,124+l*24+Math.sin(x*.018+l*2)*23+Math.sin(x*.057+l)*8+random()*6);g.lineTo(w,h);g.fill();}
});
const pixelScreen=textureMaterial((g,w,h)=>{
  g.fillStyle='#4b78ae';g.fillRect(0,0,w,h);
  for(let i=0;i<9;i++){let x=random()*w,y=random()*h*.4;g.fillStyle='#dfded1';g.fillRect(x,y,52,10);g.fillRect(x+10,y-9,22,9);}
  for(let x=0;x<w;x+=8){let hh=Math.sin(x/58)*34+95;g.fillStyle='#456e5c';g.fillRect(x,hh+30,8,h);g.fillStyle='#74914b';g.fillRect(x,hh+30,8,8);}
  g.fillStyle='#db9e54';g.fillRect(0,205,w,51);g.fillStyle='#d24330';g.fillRect(210,175,20,17);g.fillStyle='#27405e';g.fillRect(211,192,20,13);
});
const shadowMat=(()=>{const m=textureMaterial((g,w,h)=>{const v=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);v.addColorStop(0,'rgba(15,10,5,.72)');v.addColorStop(.55,'rgba(15,10,5,.45)');v.addColorStop(1,'rgba(15,10,5,0)');g.fillStyle=v;g.fillRect(0,0,w,h);},96,96);m.transparent=true;m.depthWrite=false;return m})();
export function buildInterior(scene, label){
  const floors=[], obstacles=[], occluders=[], doors=[];
  scene.add(new T.HemisphereLight('#f9e9d7','#716f68',1.38));
  const sun=new T.DirectionalLight('#fff1df',1.55);sun.position.set(-5,9,5);scene.add(sun);
  const fill=new T.DirectionalLight('#b8c9d3',.52);fill.position.set(8,3,-4);scene.add(fill);

  for(let level=1;level<=2;level++){
    const group=new T.Group();group.position.y=(level-1)*rise;scene.add(group);floors.push(group);
    const batches=new Map();
    function part(shape,x,y,z,w,h,d,material,rx=0,ry=0,rz=0){
      const mat=paint(material),base=shapes[shape];
      if(!batches.has(mat))batches.set(mat,{p:[],n:[],uv:[],idx:[]});
      const b=batches.get(mat),start=b.p.length/3;
      dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(w,h,d);dummy.updateMatrix();
      const normalMatrix=new T.Matrix3().getNormalMatrix(dummy.matrix),vec=new T.Vector3();
      for(let i=0;i<base.attributes.position.count;i++){
        vec.fromBufferAttribute(base.attributes.position,i).applyMatrix4(dummy.matrix);const px=vec.x,py=vec.y,pz=vec.z;b.p.push(px,py,pz);
        vec.fromBufferAttribute(base.attributes.normal,i).applyMatrix3(normalMatrix).normalize();b.n.push(vec.x,vec.y,vec.z);
        if(mat===stone||mat===floorMat||mat===walnut||mat===linen||mat===wool){
          const side=Math.abs(vec.x)>.7,top=Math.abs(vec.y)>.7,scale=mat===stone?2.5:mat===walnut?1.3:mat===floorMat?3:.7;
          b.uv.push((side?pz:px)/scale,(top?pz:py)/scale);
        }else b.uv.push(base.attributes.uv.getX(i),base.attributes.uv.getY(i));
      }
      for(const k of base.index.array)b.idx.push(start+k);
    }
    const box=(...args)=>part(args[6]===linen?'cushion':'box',...args), cyl=(...args)=>part('round',...args), oval=(...args)=>part('leaf',...args);
    const block=(x,z,w,d)=>obstacles.push({level,x,z,w,d});
    function shadow(x,z,w,d,y=.012){const m=new T.Mesh(new T.PlaneGeometry(w,d),shadowMat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);group.add(m);}
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
      block(x,z,Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*.6,Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*.6);
    }
    function tv(x,z,w,y,crt=false,reverse=false){const s=reverse?-1:1;box(x,y,z,w,w*(crt?.8:.57),crt?.57:.09,iron);box(x,y+.01,z+s*(crt?.29:.05),w*.91,w*(crt?.64:.49),.012,crt?pixelScreen:landscape);box(x,y-w*.34,z,.09,.2,.1,iron);box(x,y-w*.39,z,w*.48,.045,.25,iron);}
    function cabinet(x,z,w){box(x,.42,z,w,.74,.68,walnut);box(x,.075,z,w-.2,.14,.5,iron);box(x,.81,z,w+.04,.055,.72,dark);for(let i=-1;i<=1;i++)box(x+i*w*.26,.43,z+.352,.014,.6,.008,iron);shadow(x,z,w*1.2,1.3);block(x,z,w,.74);}
    function seat(x,z,w,angle=0){const p=(lx,y,lz,sw,h,sd,m,rx=0)=>box(x+Math.cos(angle)*lx+Math.sin(angle)*lz,y,z-Math.sin(angle)*lx+Math.cos(angle)*lz,sw,h,sd,m,rx,angle);
      p(0,.21,0,w-.12,.2,.68,iron);p(0,.39,0,w,.31,.85,linen);p(0,.77,.4,w,.66,.22,linen,.14);for(const side of [-1,1])p(side*(w/2-.09),.55,.01,.18,.45,.9,linen);
      const count=Math.max(1,Math.round(w/1.05));for(let i=0;i<count;i++){const xx=(i+.5)*((w-.32)/count)-w/2+.16;p(xx,.57,-.035,(w-.35)/count-.015,.12,.64,linen);p(xx,.82,.23,(w-.35)/count-.025,.47,.16,linen,.13);}
      block(x,z,Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*.95,Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*.95);shadow(x,z,w*1.45,1.65);}
    function table(x,z,w,d,y=.53){box(x,y,z,w,.105,d,walnut);for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.12),y/2,z+b*(d/2-.1),.075,y,.075,iron);block(x,z,w,d);shadow(x,z,w*1.4,d*1.5);}
    function speaker(x,y,z){box(x,y+.25,z,.31,.5,.29,walnut);for(const [cy,sz] of [[.18,.2],[.37,.09]])cyl(x,y+cy,z+.15,sz,.024,sz,iron,Math.PI/2);}
    const plan=rooms.filter(r=>r.floor===level);
    const boundaries=new Map();
    function outline(bounds){
      const [x,z,X,Z]=bounds;
      for(const [axis,f,a,b] of [['x',x,z,Z],['x',X,z,Z],['z',z,x,X],['z',Z,x,X]]){const key=axis+f;if(!boundaries.has(key))boundaries.set(key,{axis,f,spans:[]});boundaries.get(key).spans.push([a,b]);}
    }
    for(const r of plan){
      const [x,z,X,Z]=r.bounds,cx=(x+X)/2,cz=(z+Z)/2,w=X-x,d=Z-z;
      box(cx,-.10,cz,w,.20,d,floorMat);box(cx,rise-.09,cz,w,.18,d,stone);
      for(let xx=x+1.8;xx<X-.4;xx+=3.6)box(xx,rise-.27,cz,.28,.35,d,stone);
      for(let zz=z+1.8;zz<Z-.6;zz+=4.5)lightStrip(cx,3.85,zz,Math.min(w*.65,5.3),.12);
      outline(r.bounds);
    }
    outline(stair);
    for(const {axis,f,spans} of boundaries.values()){
      const matching=doorways.filter(([ax,k])=>ax===axis&&k===f);
      const cuts=[...new Set([...spans.flat(),...matching.flatMap(d=>d.slice(2,4))])].sort((a,b)=>a-b);
      for(let i=1;i<cuts.length;i++){const a=cuts[i-1],b=cuts[i],mid=(a+b)/2;if(!spans.some(([lo,hi])=>lo<mid&&mid<hi))continue;
        let door=matching.find(d=>mid>d[2]&&mid<d[3]);if(level===2&&door?.[4]==='Washroom')door=null;
        const x=axis==='x'?f:mid,z=axis==='z'?f:mid,w=axis==='x'?.18:b-a,d=axis==='z'?.18:b-a;
        const bottom=door?2.65:0;box(x,(rise+bottom)/2,z,w,rise-bottom,d,stone);
        if(!door){block(x,z,w,d);occluders.push({level,x,z,w,d});box(x,.065,z,w+.025,.13,d+.025,dark);}
        else{for(const q of [a+.04,b-.04])box(axis==='x'?f:q,1.32,axis==='z'?f:q,axis==='x'?.23:.075,2.64,axis==='z'?.23:.075,walnut);box(x,2.63,z,w+.03,.09,d+.03,walnut);}
      }
    }
    for(const opening of doorways){
      const [axis,wall,a,b,name]=opening;
      if(level===2 && name==='Washroom')continue;
      const mid=(a+b)/2;
      const destination=axis==='x'?roomAt(level,wall+Math.sign(wall)*.3,mid):roomAt(level,mid,wall+.3);
      doors.push(makeDoor(group,level,opening,destination?.name || 'Stairwell',walnut,label,destination?.id==='library'));
    }
    // Mid-flight landing and stair treads occupy a shared double-height opening.
    box(-10,-.075,-3.05,4,.15,2.1,floorMat);
    if(level===1){
      box(-10,rise/2-.07,-8.45,4,.14,1.1,walnut);
      for(let i=0;i<12;i++) for(const [xx,height] of [[-11,(i+1)*rise/24],[-9,rise-i*rise/24]]){let zz=-4.1-(i+.5)*3.8/12;box(xx,height-.08,zz,1.92,.16,3.8/12,walnut);box(xx,height-.012,zz+.15,1.82,.015,.014,brass);}
      box(-10,rise/2,-6,.065,rise,3.8,iron);
      sign('UPSTAIRS  /  MEDIA COLLECTION',-7.89,2.95,-3.15,1.75,Math.PI/2);
    }else{box(-10,rise-.1,-5.5,4,.2,7,stone);lightStrip(-10,3.8,-5.5,2.4,.12);sign('DOWNSTAIRS  /  LOUNGE',-7.89,2.95,-3.15,1.75,Math.PI/2);}

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
      cove(.05,-5.886,7.8,2.93);cove(11.6,-1.12,4.35,2.88,Math.PI);
      rug(0,.55,6.9,5.55);seat(0,2.94,3.8);seat(-2.45,-.28,.94,-.77);seat(2.45,-.28,.94,.77);
      table(0,1.19,2.2,.93);plant(.46,1.13,.55,.59);
      cabinet(-1.4,-5.46,2.98);cabinet(1.55,-5.46,2.37);tv(-1.38,-5.43,2.63,1.88);tv(1.55,-5.45,1.48,1.51,true);
      for(const x of [-2.3,.91]){box(x,.898,-5.27,.39,.085,.23,iron);box(x+.52,.905,-5.22,.20,.077,.12,cream);}
      // The listening station stands south of both music racks, clear of their browsing aisles.
      const playerX=-7.25, playerZ=4.83;
      cabinet(-7.40,playerZ,.90);
      cyl(playerX,.89,playerZ,.43,.04,.43,iron);
      cyl(playerX,.915,playerZ,.15,.012,.15,brass);
      box(playerX+.24,.95,playerZ+.09,.029,.024,.23,cream,0,.31);
      speaker(-7.68,.84,playerZ);
      shelf(.35,5.6,2.8,1.65,'consoles',Math.PI);shelf(3.53,5.6,2.8,1.65,'objects',Math.PI);
      plant(-3.42,-4.45,1.7);plant(3.42,-4.45,1.85);plant(6.55,5.16,1.6);spot(-1,2.7,-4.3,15,10);
      textileRack(-10.5,7.7);textileRack(-9.1,9.4);rug(-9.2,8.7,5.9,3.6);
      box(-4.77,1.28,9.9,1.35,2.56,1.77,walnut);for(let i=0;i<12;i++)box(-5.39+i*.112,1.26,8.98,.125,2.48,.1+(i%2)*.06,linen);block(-4.77,9.9,1.35,1.85);sign('FITTING ROOM',-4.77,2.75,8.93,1.25,Math.PI);
      shelf(-12.53,9.3,2.35,2.35,'empty',Math.PI/2);plant(-12.25,6.68,1.32);spot(-9.4,3.1,8.8,22,7);
      // Bedroom: upholstered bed, folded throw, nightstands, wardrobe, cinema wall.
      rug(11.6,-5.85,4.5,4.15);box(11.65,.32,-5.95,2.38,.53,3.18,walnut);box(11.65,.68,-5.95,2.34,.29,3.13,linen);box(11.65,.88,-5.27,2.35,.13,1.76,'#5d625b');box(11.65,1.0,-7.58,2.55,1.55,.17,walnut);block(11.65,-5.95,2.5,3.4);
      for(const a of [-1,1]){oval(11.65+a*.54,.9,-7,.96,.27,.56,cream);box(11.65+a*1.65,.43,-7.15,.64,.64,.68,walnut);cyl(11.65+a*1.65,.93,-7.15,.21,.38,.21,brass);cyl(11.65+a*1.65,1.16,-7.15,.37,.28,.37,cream);}
      box(14.5,1.4,-5.05,.8,2.8,3.6,walnut);block(14.5,-5.05,.8,3.6);cabinet(12.15,-1.47,3.3);tv(12.15,-1.48,2.9,1.98,false,true);spot(12,3.1,-2.3,25,8);
      // Shower glass, brass shower head, porcelain basin and WC.
      box(12.18,.085,1.95,1.35,.17,1.7,stone);const glass=new T.MeshStandardMaterial({color:'#9eaba1',transparent:true,opacity:.20,depthWrite:false});box(11.53,1.14,2.04,.034,2.2,1.5,glass);box(11.53,2.24,2.04,.05,.045,1.5,iron);block(12.18,2.15,1.2,1.2);
      cyl(12.76,1.45,2.42,.035,1.65,.035,brass);box(12.55,2.26,2.42,.46,.04,.04,brass);cyl(12.33,2.21,2.42,.25,.045,.25,iron);
      cabinet(9.53,-.51,1.57);oval(9.54,.86,-.51,.85,.13,.41,cream);box(9.54,1.08,-.72,.035,.39,.035,iron);box(9.53,1.81,-.88,1.38,.93,.056,brass);box(9.53,1.81,-.845,1.31,.86,.015,'#88908b');
      oval(12.11,.29,-.23,.5,.57,.69,cream);oval(12.11,.52,-.2,.54,.1,.74,cream);box(12.11,.68,-.56,.52,.65,.19,cream);block(12.11,-.24,.58,.72);
      cabinet(11.1,8.46,4.7);box(11.1,.88,8.44,4.78,.12,.8,stone);box(10,.956,8.39,.69,.012,.42,dark);box(10,1.12,8.61,.035,.34,.035,iron);box(10,1.28,8.53,.035,.035,.17,iron);
      box(12.34,1.17,8.43,.69,.45,.46,iron);box(12.33,1.17,8.19,.5,.3,.02,'#54585a');box(13.37,1.07,7.92,.86,2.1,.81,'#8d928d');box(13.37,1.31,7.5,.85,.025,.02,dark);block(13.37,7.92,.86,.81);
      table(11.1,6.6,2.8,.7,.98);for(const xx of [10.45,11.74]){cyl(xx,.63,5.93,.46,.08,.46,walnut);for(const a of [-1,1])for(const b of [-1,1])box(xx+.135*a,.31,5.93+.13*b,.037,.6,.037,iron);block(xx,5.93,.46,.46);}
      lightStrip(11.2,1.97,8.67,3.5,.19);plant(8.6,8.25,1.3);spot(11.6,2.8,7.4,28,8);
    }else{
      cove(0,-5.88,14.8,2.98);
      rug(0,1.05,5.75,3.9);table(0,-1.6,3.35,.83,.94);tv(0,-1.74,.94,1.39);speaker(-1.26,.99,-1.75);speaker(1.26,.99,-1.75);
      seat(-1.05,-.18,.75);seat(1.05,-.18,.75);seat(-2.3,2.35,1.03,-1.12);seat(2.3,2.35,1.03,1.12);table(0,2.4,1.75,.72);plant(.44,2.36,.56,.59);
      table(-8.7,8.6,1.85,.81,.82);seat(-10.06,8.6,.78,-Math.PI/2);plant(-12.2,6.7,1.75);
      shelf(11.5,-1.44,5.1,2.75,'consoles',Math.PI);shelf(11.1,8.52,4.82,2.8,'objects',Math.PI);shelf(13.53,6,2.6,2.42,'objects',-Math.PI/2);
      plant(-3.24,-4.44,1.47);plant(7.2,5.15,1.45);plant(14.23,-6.85,1.5);plant(8.7,8.36,1.4);
      spot(0,2.9,-1.8,18,9);spot(-8.5,3,9.5,24,8);spot(11.3,3,-6.2,28,9);spot(11.1,2.8,7.25,23,7);
    }
    for(const [material,b] of batches){const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));geo.setIndex(b.idx);
      group.add(new T.Mesh(geo,material));
    }
  }
  return {floors,obstacles,occluders,doors};
}
