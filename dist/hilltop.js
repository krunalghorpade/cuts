import * as T from './vendor/three.module.js';
import {rooms,rise,ceilingOf,openingsFor,stair,lift} from './plan.js';

export const gardenArrival=[5.04,-26.5,Math.PI];
const TAU=Math.PI*2;
const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
const footprint=rooms.filter(r=>r.floor===1).map(r=>r.bounds).concat([stair,lift]);
const contains=(r,x,z,pad=0)=>x>r[0]-pad&&x<r[2]+pad&&z>r[1]-pad&&z<r[3]+pad;
const pool=[-8.7,-20.5,.75,-15.8];
const beds=[[7.6,-21.3,11.7,-19.75],[10.1,-15.5,15.1,-12.85],[-11.7,-13.45,-6.9,-12.02],[-9.5,-22.8,-3.9,-21.65],[17.5,-3.5,21.5,-1.9],[-17.9,3.6,-15.3,6.8],[3.5,12.5,7.3,14.1]];
const trees=[[12.4,-14.18,5.15],[-13.1,-18.1,6.1],[-16.8,1.2,6.5],[16.9,5.0,5.8],[3.6,15.7,6.4],[21,-12.5,6.2],[-10.5,17.6,5.1],[-2.6,-30.1,4.2]];
function mountain(x,z){
 const r=Math.hypot(x,z);
 const valley=-17*smooth(29,70,r);
 const foothills=(1.4*Math.sin(x*.072+z*.041)+1.8*Math.cos(z*.066-x*.032))*smooth(28,48,r);
 const ridges=smooth(54,92,r)*(19+10*Math.sin(x*.043+z*.029)+9*Math.cos(z*.053-x*.019)+6*Math.sin(x*.093-z*.074));
 const far=smooth(100,165,r)*(12+10*Math.cos(x*.024+z*.018)+9*Math.sin(z*.036-x*.033));
 return -.075+valley+foothills+ridges+far;
}
export function isGarden(x,z){return !footprint.some(b=>contains(b,x,z))&&Math.hypot(x,z)<53;}
export function gardenGround(x,z){
 if(!isGarden(x,z))return null;
 const threshold=x>4.08&&x<6&&z>=-10.2&&z<=-8.97;
 if(!threshold&&footprint.some(b=>contains(b,x,z,.32)))return null;
 if(contains(pool,x,z,.20)||beds.some(b=>contains(b,x,z,.16))||trees.some(([a,b])=>Math.hypot(a-x,b-z)<.33))return null;
 if(x>3.52&&x<6.56&&z>=-28&&z<-9)return .025;
 return mountain(x,z);
}
function generator(){let n=0x382a45f7;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
const vertexVaryings='varying vec3 gardenPoint; varying vec3 gardenNormal;\n';
const lighting=`
uniform vec3 gardenSun;uniform vec3 gardenHorizon;
uniform float gardenDay;uniform float gardenDirect;uniform float gardenWarm;
float blocksSun(vec3 p,vec3 lo,vec3 hi){
 vec3 ray=1./(gardenSun+vec3(.00011));vec3 a=(lo-p)*ray,b=(hi-p)*ray,n=min(a,b),f=max(a,b);
 float l=max(n.x,max(n.y,n.z)),h=min(f.x,min(f.y,f.z));return step(max(l,.04),h)*smoothstep(0.,.15,h-max(l,0.));
}
`;
const shadeFragment=`
 vec3 N=normalize(gardenNormal),P=gardenPoint;
 float skyLight=(.58+.42*clamp(N.y*.5+.5,0.,1.))*(.36+.61*gardenDay);
 float direct=max(dot(N,gardenSun),0.)*gardenDirect,shade=0.;
 if(P.y<1.1&&length(P.xz)<48.&&gardenDirect>.01){
  shade=max(blocksSun(P+N*.025,vec3(-8.,0.,-9.),vec3(8.,14.85,6.)),blocksSun(P+N*.025,vec3(8.,0.,-9.),vec3(15.,14.85,-1.)));
  shade=max(shade,blocksSun(P+N*.025,vec3(3.2,2.84,-12.7),vec3(7.15,3.12,-9.1)));
 }
 vec3 ambient=mix(vec3(.25,.38,.61),vec3(.87,.96,1.02),gardenDay);
 vec3 directColor=mix(vec3(1.04,1.,.93),vec3(1.24,.81,.54),gardenWarm);
 float wash=exp(-.52*length(P-vec3(4.95,2.55,-10.05)))+.35*exp(-.4*length(P-vec3(12.,1.5,-12.2)));
 float waterGlow=exp(-.42*abs(P.z+17.5)-.26*abs(P.x+4.)-.65*abs(P.y))*.34;
 vec3 lamps=(vec3(1.6,.88,.36)*wash+vec3(.17,.55,.70)*waterGlow)*(1.-gardenDay);
 diffuseColor.rgb*=ambient*skyLight+direct*(1.-.82*shade)*directColor*1.65+lamps;
 float haze=1.-exp(-max(0.,length(cameraPosition-P)-24.)*.0058);
 diffuseColor.rgb=mix(diffuseColor.rgb,gardenHorizon,haze*.85);
`;
function makeSky(group,uniforms){
 const vertexShader=`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragmentShader=`varying vec3 ray;uniform vec3 gardenSun;uniform vec3 gardenHorizon;uniform float gardenDay;uniform float gardenDirect;uniform float gardenWarm;uniform float twilight;
 float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
 void main(){
 vec3 d=normalize(ray);float h=max(d.y,0.),s=dot(d,gardenSun);
 vec3 col=mix(gardenHorizon,mix(vec3(.012,.022,.052),vec3(.14,.33,.59),gardenDay),pow(h,.56));
 col+=vec3(.83,.39,.13)*(gardenWarm+.25)*pow(max(0.,s),18.)*.28*(gardenDirect+twilight*.55);
 col+=vec3(1.,.83,.58)*smoothstep(.99988,.99998,s)*gardenDirect*4.;
 vec2 p=d.xz/max(.17,d.y+.13)*2.5+vec2(2.,7.);
 float w=noise(p*1.6)*.54+noise(p*3.8)*.28+noise(p*9.)*.18;
 col=mix(col,mix(vec3(.055,.071,.11),vec3(.89,.86,.78),gardenDay),smoothstep(.52,.75,w)*smoothstep(-.02,.23,h)*.36);
 vec2 sp=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*320.;
 float stars=step(.992,hash21(floor(sp)))*(1.-smoothstep(.03,.29,length(fract(sp)-.5)));
 col+=vec3(.62,.72,.85)*stars*(1.-gardenDay)*(1.-twilight)*smoothstep(.02,.28,d.y);
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`;
 const sky=new T.Mesh(new T.SphereGeometry(244,40,20),new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,side:T.BackSide,depthWrite:false,fog:false}));
 sky.name='Hill country sky';sky.renderOrder=-50;sky.frustumCulled=false;group.add(sky);
}
export function installHilltop(scene){
 const group=new T.Group();group.name='Hilltop house and grounds';group.userData.exterior=true;scene.add(group);
 const random=generator(),uniforms={gardenSun:{value:new T.Vector3(.4,.75,.52).normalize()},gardenHorizon:{value:new T.Color('#c1cdd2')},gardenDay:{value:1},gardenDirect:{value:1},gardenWarm:{value:0},twilight:{value:0},gardenTime:{value:0}};
 makeSky(group,uniforms);
 const loader=new T.TextureLoader();
 function repeat(name){const m=loader.load(new URL('./art/'+name,import.meta.url).href);m.colorSpace=T.SRGBColorSpace;m.wrapS=m.wrapT=T.RepeatWrapping;m.anisotropy=4;return m;}
 function finish(color,map,metres=2,extra={}){
  const m=new T.MeshBasicMaterial({color,map:map||null,fog:false,...extra});
  m.onBeforeCompile=s=>{
   Object.assign(s.uniforms,uniforms);
   s.vertexShader=vertexVaryings+s.vertexShader.replace('#include <project_vertex>',`
    mat4 shellModel=modelMatrix;
    #ifdef USE_INSTANCING
    shellModel=modelMatrix*instanceMatrix;
    #endif
    gardenPoint=(shellModel*vec4(transformed,1.)).xyz;
    vec3 squares=vec3(dot(shellModel[0].xyz,shellModel[0].xyz),dot(shellModel[1].xyz,shellModel[1].xyz),dot(shellModel[2].xyz,shellModel[2].xyz));
    gardenNormal=normalize(mat3(shellModel)*(normal/max(vec3(.00001),squares)));
    #include <project_vertex>`);
   s.fragmentShader=vertexVaryings+lighting+s.fragmentShader.replace('#include <map_fragment>',map?`
    vec3 axis=abs(normalize(gardenNormal));
    vec2 projected=axis.y>.68?gardenPoint.xz:(axis.x>axis.z?vec2(gardenPoint.z,gardenPoint.y):gardenPoint.xy);
    diffuseColor*=texture2D(map,projected/`+metres.toFixed(3)+');\n':'#include <map_fragment>').replace('#include <color_fragment>','#include <color_fragment>\n'+shadeFragment);
  };m.customProgramCacheKey=()=>'hilltop-v2-'+(map?metres:'solid');return m;
 }
 const concrete=repeat('exterior-concrete.webp'),wood=repeat('cinema-walnut.webp');
 const mat={wall:finish('#e3e2d8',concrete,2.52),fascia:finish('#c4c5ba',concrete,1.27),stone:finish('#cdc4b9',repeat('basalt.webp'),2.32),wood:finish('#eabf92',wood,2.4),slate:finish('#c9cbc2',repeat('cinema-slate.webp'),1.5),
  dark:finish('#353c38'),pale:finish('#cec8b7'),metal:finish('#81908b'),soil:finish('#484637'),moss:finish('#687e51'),pv:finish('#263a4b'),pvLine:finish('#758a95'),bark:finish('#8c7c68',wood,.94),pane:finish('#87a699',null,2,{transparent:true,opacity:.76,depthWrite:false}),bulb:new T.MeshBasicMaterial({color:'#ffd58c',fog:false,toneMapped:false}),leaf:finish('#ffffff',null,2,{side:T.DoubleSide,vertexColors:true}),blade:finish('#ffffff',null,2,{side:T.DoubleSide,vertexColors:true})};
 const unit=new T.BoxGeometry(),rod=new T.CylinderGeometry(1,1,1,8),batches=new Map(),dummy=new T.Object3D();
 const upperGlass=new T.Group();upperGlass.name='Upper storey exterior glass';group.add(upperGlass);
 function instance(geometry,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,color=null,target=group){
  if(!batches.has(target))batches.set(target,new Map());const gs=batches.get(target);
  if(!gs.has(geometry))gs.set(geometry,new Map());const ms=gs.get(geometry);
  if(!ms.has(material))ms.set(material,[]);
  dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz,'YXZ');dummy.scale.set(sx,sy,sz);dummy.updateMatrix();ms.get(material).push([dummy.matrix.clone(),color]);
 }
 function box(x,y,z,w,h,d,m,target){instance(unit,m,x,y,z,w,h,d,0,0,0,null,target);}
 function geo(pos,colors,indices){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 function terrain(){
  const pos=[0,mountain(0,0),0],colors=[],idx=[],sectors=128,rings=86;
  const olive=new T.Color('#99a169'),forest=new T.Color('#476d4d'),hill=new T.Color('#69836b'),c=new T.Color();
  function swatch(x,z){const v=.42+Math.sin(.10*x+.033*z)*.12+Math.cos(.14*z-.07*x)*.09+Math.sin(x*.37)*Math.cos(z*.32)*.05+random()*.13;c.copy(olive).lerp(forest,v).lerp(hill,smooth(38,100,Math.hypot(x,z))*.65);colors.push(c.r,c.g,c.b);}
  swatch(0,0);
  for(let j=1;j<=rings;j++)for(let i=0;i<sectors;i++){
   const radius=233*Math.pow(j/rings,1.55),a=TAU*i/sectors,x=radius*Math.cos(a),z=radius*Math.sin(a);pos.push(x,mountain(x,z),z);swatch(x,z);
   const b=1+(j-1)*sectors+i,n=1+(j-1)*sectors+(i+1)%sectors;
   if(j===1)idx.push(0,n,b);else idx.push(b-sectors,n,b,b-sectors,n-sectors,n);
  }
  const mesh=new T.Mesh(geo(pos,colors,idx),finish('#fff',null,2,{vertexColors:true}));mesh.name='Meadow and surrounding ridgelines';group.add(mesh);
 }
 terrain();
 // Clad only the outside of each storey's footprint, leaving each authored aperture clear.
 function cladFloor(level){
  const rects=rooms.filter(r=>r.floor===level).map(r=>r.bounds).concat([stair,lift]);
  const y=(level-1)*rise,h=ceilingOf(level),openings=openingsFor(level).slice();
  if(level===1)openings.push(['z',6,-3.96,-.40,'Cinema lightwell','cinema-glass']);
  const xs=[...new Set(rects.flatMap(b=>[b[0],b[2]]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(b=>[b[1],b[3]]))].sort((a,b)=>a-b);
  const occupied=(x,z)=>rects.some(b=>contains(b,x,z));
  function wall(axis,f,a,b,sign){
   const alongZ=axis==='x',apertures=openings.filter(o=>o[0]===axis&&o[1]===f&&o[3]>a&&o[2]<b);
   const breaks=[...new Set([a,b,...apertures.flatMap(o=>[Math.max(a,o[2]),Math.min(b,o[3])])])].sort((l,r)=>l-r);
   function strip(lo,hi,low,high,m,depth=.16,offset=.16,target=group){
    if(hi-lo<.005||high-low<.005)return;const c=(lo+hi)/2,dist=f+sign*offset;
    box(alongZ?dist:c,y+(low+high)/2,alongZ?c:dist,alongZ?depth:hi-lo,high-low,alongZ?hi-lo:depth,m,target);
   }
   for(let i=1;i<breaks.length;i++){
    const lo=breaks[i-1],hi=breaks[i],mid=(lo+hi)/2,op=apertures.find(o=>mid>o[2]&&mid<o[3]);
    if(op){
     const glazed=['glass','cinema-glass'].includes(op[5]),bottom=glazed?(op[5]==='glass'?.36:.40):0,top=glazed?(op[5]==='glass'?h-.36:3.07):2.65;
     strip(lo,hi,0,bottom,mat.wall);strip(lo,hi,top,h,mat.wall);
     if(glazed){
      strip(lo,hi,bottom-.065,bottom+.015,mat.pale,.26,.21);strip(lo,hi,top-.015,top+.065,mat.dark,.19,.15);
      if(level>1){
       strip(lo,hi,bottom,top,mat.pane,.025,.08,upperGlass);
       for(let p=op[2]+.27;p<hi;p+=.27)if(p>lo)strip(p-.008,p+.008,bottom,top,mat.metal,.032,.1,upperGlass);
       for(let v=bottom+.27;v<top;v+=.27)strip(lo,hi,v-.008,v+.008,mat.metal,.032,.1,upperGlass);
      }
     }
    }else strip(lo,hi,0,h,level===1&&((alongZ&&f===-12)||(!alongZ&&f===-11.4))?mat.stone:mat.wall);
   }
   strip(a,b,h-.17,h+.12,mat.fascia,.52,.17);strip(a,b,h-.19,h-.15,mat.dark,.29,.17);
  }
  for(const x of xs)for(let i=1;i<zs.length;i++){
   const z=(zs[i-1]+zs[i])/2,negative=occupied(x-.015,z),positive=occupied(x+.015,z);
   if(negative!==positive)wall('x',x,zs[i-1],zs[i],negative?1:-1);
  }
  for(const z of zs)for(let i=1;i<xs.length;i++){
   const x=(xs[i-1]+xs[i])/2,negative=occupied(x,z-.015),positive=occupied(x,z+.015);
   if(negative!==positive)wall('z',z,xs[i-1],xs[i],negative?1:-1);
  }
  for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
   const x=(xs[i]+xs[i-1])/2,z=(zs[j]+zs[j-1])/2;if(!occupied(x,z))continue;
   if(level<3&&(rooms.some(r=>r.floor===level+1&&contains(r.bounds,x,z))||contains(stair,x,z)||contains(lift,x,z)))continue;
   box(x,y+h+.035,z,xs[i]-xs[i-1],.12,zs[j]-zs[j-1],mat.moss);
  }
 }
 for(const level of [1,2,3])cladFloor(level);
 // Deep entrance portal and brise-soleil on the north-facing private wing.
 box(5.16,2.985,-10.9,4.48,.27,3.77,mat.wall);box(5.16,2.83,-10.91,4.16,.045,3.45,mat.wood);
 box(7.24,1.425,-11.42,.24,2.85,2.65,mat.wall);
 for(const x of [3.55,6.54])box(x,2.798,-10.76,.032,.025,2.07,mat.bulb);
 box(5.16,3.15,-12.62,4.4,.16,.21,mat.fascia);box(5.17,3.17,-12.3,4.06,.13,.55,mat.soil);
 for(const h of [3.77,14.35]){
  box(11.45,h,-9.82,5.55,.14,1.66,mat.wood);box(11.45,h+.11,-10.61,5.65,.17,.12,mat.fascia);
  for(let x=8.85;x<14.2;x+=.30)box(x,h-.07,-9.88,.048,.23,1.5,mat.wood);
 }
 for(let x=3.11;x<7.94;x+=.23)box(x,6.35,-9.27,.062,3.70,.16,mat.wood);
 for(let x=2.96;x<7.88;x+=.22)box(x,11.5,-9.25,.058,5.18,.145,mat.wood);
 for(let z=-7.86;z<-2.22;z+=.27)box(15.28,5.99,z,.13,3.22,.052,mat.wood);
 // Modules are raised on rails above the green roof.
 for(let j=0;j<2;j++)for(let i=0;i<5;i++){
  const x=-5.9+i*1.61,z=.3+j*2.3,y=15.26,tilt=-.19;
  instance(unit,mat.metal,x,y,z,1.55,.070,2.02,tilt);instance(unit,mat.pv,x,y+.042,z,1.48,.022,1.95,tilt);
  for(let k=1;k<4;k++)instance(unit,mat.pvLine,x-.74+k*.37,y+.061,z,.014,.009,1.88,tilt);
  for(let k=1;k<6;k++){const v=-.97+k*.32;instance(unit,mat.pvLine,x,y+.062-Math.sin(tilt)*v,z+v*Math.cos(tilt),1.47,.008,.01,tilt);}
  for(const xx of [-.52,.52])box(x+xx,15.02,z+.35,.035,.52,1.1,mat.dark);
 }
 for(let i=0;i<20;i++)for(let j=0;j<2;j++)box(4.32+j*1.43,.008,-27.52+i*.935,1.40,.06,.909,mat.slate);
 for(let i=0;i<6;i++)box(3.0-i*.88,.002,-16.14,.861,.053,1.11,mat.slate);
 for(const b of beds){const x=(b[0]+b[2])/2,z=(b[1]+b[3])/2,w=b[2]-b[0],d=b[3]-b[1];
  box(x,.16,z,w+.09,.40,d+.09,mat.fascia);box(x,.363,z,w-.17,.045,d-.17,mat.soil);
 }
 const [px,pz,pX,pZ]=pool,w=pX-px,d=pZ-pz,cx=(px+pX)/2,cz=(pz+pZ)/2;
 for(const x of [px-.14,pX+.14])box(x,.050,cz,.29,.16,d+.56,mat.pale);
 for(const z of [pz-.14,pZ+.14])box(cx,.050,z,w,.16,.29,mat.pale);
 for(let i=0;i<20;i++)box(px-.30+i*.53,.017,pz-.62,.518,.075,.62,mat.wood);
 for(const z of [pz+.65,pz+.99]){
  instance(rod,mat.metal,pX-.32,.30,z,.029,.56,.029);instance(rod,mat.metal,pX+.14,.30,z,.029,.56,.029);box(pX-.09,.58,z,.49,.055,.055,mat.metal);
 }
 const water=new T.Mesh(new T.PlaneGeometry(w,d),new T.ShaderMaterial({uniforms,
 vertexShader:`varying vec3 pWorld;void main(){pWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(pWorld,1.);}`,
 fragmentShader:`varying vec3 pWorld;uniform vec3 gardenSun;uniform vec3 gardenHorizon;uniform float gardenDay;uniform float gardenTime;
 void main(){vec2 p=pWorld.xz;float t=gardenTime*.00042;
 float s=sin(p.x*3.5+p.y*4.4+t)*.035+sin(p.x*13.2-p.y*6.8+t*2.)*.014;
 float r=sin(p.y*7.5-p.x*1.65+t)*.031+cos(p.x*5.6+p.y*6.-t)*.020;
 vec3 n=normalize(vec3(s,1.,r)),eye=normalize(cameraPosition-pWorld),ref=reflect(-eye,n);
 float fres=pow(1.-max(dot(n,eye),0.),2.),glint=pow(max(dot(ref,gardenSun),0.),128.);
 float rays=.5+.5*sin(p.x*9.8+p.y*14.+2.8*sin(p.y*7.8-p.x*8.+t)+t);
 vec3 bed=mix(vec3(.008,.09,.095),vec3(.045,.275,.245),gardenDay)*(.85+.3*pow(rays,8.));
 float horizon=smoothstep(.02,.30,ref.y+.04*sin(ref.x*16.));
 vec3 reflections=mix(gardenHorizon*vec3(.33,.53,.46),gardenHorizon*.94,horizon);
 gl_FragColor=vec4(mix(bed,reflections,.24+.64*fres)+vec3(1.,.85,.6)*glint*gardenDay,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:T.DoubleSide}));
 water.rotation.x=-Math.PI/2;water.position.set(cx,.065,cz);water.name='Garden lap pool';group.add(water);
 for(const [x,z] of [[3.12,-25.2],[6.94,-22.1],[3.12,-18.1],[6.94,-15.35],[-8.45,-21.17],[.66,-21.17],[16.5,-6.8]]){
  box(x,.245,z,.11,.60,.14,mat.dark);box(x,.472,z,.114,.058,.144,mat.bulb);box(x,.527,z,.17,.058,.18,mat.dark);
 }
 function colorArray(colors,hex,amount=1){const c=new T.Color(hex).multiplyScalar(amount);colors.push(c.r,c.g,c.b);}
 function grassModel(broad){
  const pos=[],col=[],ind=[];
  for(let j=0;j<(broad?17:13);j++){
   const a=random()*TAU,length=.35+random()*.68,reach=(broad?.58:.36)*length,sw=(broad?.066:.025)*(.5+random()),vx=Math.cos(a),vz=Math.sin(a);
   const x=(random()-.5)*.19,z=(random()-.5)*.19,leaf=broad?['#789356','#93a368','#65894d','#55794b'][j%4]:['#739158','#9da367','#85965b','#b4ae75'][j%4];
   const s=pos.length/3;
   for(let k=0;k<4;k++){
    const t=k/3,rad=reach*(t*t+.12*t),y=length*(t*(broad?1.75:1.5)-t*t*(broad?1.05:.61)),half=sw*(k===3?.035:k===0?.34:k===1?1:.68);
    for(const side of [-1,1]){
     pos.push(x+vx*rad-vz*half*side,y,z+vz*rad+vx*half*side);colorArray(col,leaf,.50+t*.58);
    }
    if(k>0){const p=s+2*k;ind.push(p-2,p-1,p,p-1,p+1,p);}
   }
  }
  return geo(pos,col,ind);
 }
 const gardenLeaves=grassModel(true),blades=grassModel(false);
 for(const b of beds){
  const count=Math.ceil((b[2]-b[0])*(b[3]-b[1])*8);
  for(let i=0;i<count;i++){
   const x=b[0]+.13+random()*(b[2]-b[0]-.26),z=b[1]+.13+random()*(b[3]-b[1]-.26),size=.36+random()*.81;
   instance(i%4===0?blades:gardenLeaves,mat.blade,x,.39,z,size,size*(.7+random()*.49),size,0,random()*TAU);
  }
 }
 for(let i=0;i<42;i++){const size=.29+random()*.32;instance(gardenLeaves,mat.blade,3.2+random()*3.91,3.24,-12.26+(random()-.5)*.43,size,size,size,0,random()*TAU);}
 for(let i=0;i<1700;i++){
  const a=random()*TAU,r=16+Math.sqrt(random())*34,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(!isGarden(x,z)||contains([-11,-28.5,16,-8],x,z,1)||footprint.some(b=>contains(b,x,z,.8))||beds.some(b=>contains(b,x,z,.4)))continue;
  const size=.20+random()*.42;
  instance(blades,mat.blade,x,mountain(x,z),z,size,size,size,0,random()*TAU);
 }
 // Each near canopy is a branching crown of loose sprays, with gaps between the individual leaves.
 const axisY=new T.Vector3(0,1,0);
 function limb(a,b,rad){
  const v=b.clone().sub(a),rot=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(axisY,v.clone().normalize()),'YXZ');
  instance(rod,mat.bark,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,rad,v.length(),rad,rot.x,rot.y,rot.z);
 }
 function leafSpray(){
  const p=[],c=[],idx=[],palette=['#4e753e','#769444','#98ac55','#6d823b','#8c9e50','#547d43'];
  for(let j=0;j<64;j++){
   const angle=random()*TAU,theta=Math.acos(random()*2-1),dist=Math.cbrt(random());
   const x=dist*Math.sin(theta)*Math.cos(angle),y=dist*Math.cos(theta)*.53,z=dist*Math.sin(theta)*Math.sin(angle);
   const twig=angle+(random()-.5)*2,span=.18+random()*.33,half=.032+random()*.043;
   for(let k=0;k<7;k++){
    const t=k/7,side=k%2===0?-1:1,az=twig+side*(.45+random()*.66),len=.12+random()*.11;
    const X=x+Math.cos(twig)*span*t,Z=z+Math.sin(twig)*span*t,Y=y+Math.sin(t*2)*.065;
    const dx=Math.cos(az),dz=Math.sin(az),tilt=(random()-.6)*len,base=p.length/3;
    p.push(X,Y,Z,X+dx*len*.49-dz*half,Y+tilt*.42,Z+dz*len*.49+dx*half,
     X+dx*len*.54,Y+tilt*.48+.014,Z+dz*len*.54,X+dx*len*.55+dz*half,Y+tilt*.55,Z+dz*len*.55-dx*half,X+dx*len,Y+tilt,Z+dz*len);
    const tint=palette[j%palette.length],light=(.7+random()*.3)*(y*.16+.93);
    for(const mul of [.72,.95,1.12,.88,1.03])colorArray(c,tint,light*mul);
    idx.push(base,base+1,base+2,base,base+2,base+3,base+1,base+4,base+2,base+2,base+4,base+3);
   }
  }
  return geo(p,c,idx);
 }
 const spray=leafSpray();
 function broadleaf(x,z,h){
  const y=mountain(x,z),base=new T.Vector3(x,y,z),fork=new T.Vector3(x+.06,y+h*.37,z+.035);
  limb(base,fork,h*.026);
  for(let k=0;k<7;k++){
   const a=k*TAU/7+random()*.51,rad=h*(.12+.15*random());
   const bend=new T.Vector3(x+Math.cos(a)*rad*.57,y+h*(.55+random()*.13),z+Math.sin(a)*rad*.57);
   const end=new T.Vector3(x+Math.cos(a)*rad,y+h*(.70+random()*.23),z+Math.sin(a)*rad);
   limb(fork,bend,h*.015);limb(bend,end,h*.009);
   for(let j=0;j<4;j++){
    const aa=a+(j-1.4)*1.07,rr=h*(.10+.09*random()),s=h*(.18+random()*.09);
    const tip=new T.Vector3(end.x+Math.cos(aa)*rr,end.y+(random()-.24)*h*.14,end.z+Math.sin(aa)*rr);
    limb(end,tip,h*.0048);instance(spray,mat.leaf,tip.x,tip.y,tip.z,s,s*(.8+random()*.3),s,0,random()*TAU);
   }
  }
 }
 for(const [x,z,h] of trees)broadleaf(x,z,h);
 // Low-poly distant crowns share geometry. Irregular tiers and several hues survive at the skyline.
 function forestCrown(conifer){
  const p=[],c=[],idx=[],sides=9;
  for(let b=0;b<(conifer?4:5);b++){
   const a=b*2.4,offset=conifer?.06:b===4?0:.23;
   const x=Math.cos(a)*offset,z=Math.sin(a)*offset;
   const y=conifer?.24+b*.15:.42+.12*random()+(b===4?.17:0);
   const w=(conifer?.33-.055*b:.23+random()*.12),h=conifer?.40:.40+random()*.10,start=p.length/3;
   for(let j=0;j<3;j++)for(let k=0;k<sides;k++){
    const ang=k*TAU/sides+(j===1?.17:0),r=w*[.87,1.04,.04][j]*(.82+random()*.22);
    p.push(x+Math.cos(ang)*r,y+[0,.17,1][j]*h+(random()-.5)*.05,z+Math.sin(ang)*r);
    colorArray(c,conifer?'#486449':'#627f4f',[.56,.86,1.07][j]*(.84+random()*.19));
    if(j<2){const v=start+j*sides+k,n=start+j*sides+(k+1)%sides;idx.push(v,n+sides,n,v,v+sides,n+sides);}
   }
  }
  return geo(p,c,idx);
 }
 const crowns=[forestCrown(false),forestCrown(true)];
 for(let i=0;i<2250;i++){
  const a=random()*TAU,r=34+Math.sqrt(random())*156,x=r*Math.cos(a),z=r*Math.sin(a),h=3.2+random()*5.1;
  const forestDensity=Math.sin(x*.035+z*.052)+.62*Math.cos(z*.063-x*.029);
  if(r<51&&forestDensity<.5||forestDensity<-.88&&random()>.18)continue;
  const s=h*(.68+random()*.33),t=forestDensity>.32&&random()>.29?0:1;
  instance(crowns[t],mat.leaf,x,mountain(x,z)-.15,z,s,h,s,0,random()*TAU);
 }
 // Soft contact at the base of planted canopies and at the facade reads even under diffuse sky.
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d'),rad=ctx.createRadialGradient(32,32,0,32,32,32);
 rad.addColorStop(0,'rgba(22,31,20,.49)');rad.addColorStop(.42,'rgba(23,33,20,.26)');rad.addColorStop(1,'rgba(23,32,20,0)');ctx.fillStyle=rad;ctx.fillRect(0,0,64,64);
 const contact=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,fog:false});
 const flat=new T.PlaneGeometry(1,1);
 for(const [x,z,h] of trees)if(!beds.some(b=>contains(b,x,z)))instance(flat,contact,x,mountain(x,z)+.017,z,h*.9,h*.85,1,-Math.PI/2);
 for(const [x,z,w,d] of [[1,-9.52,16,1.8],[11.5,-9.55,7.5,2],[5.25,-11.9,4.2,2.7]])instance(flat,contact,x,.053,z,w,d,1,-Math.PI/2);
 for(const [owner,geometries] of batches)for(const [geometry,materials] of geometries)for(const [m,entries] of materials){
  const inst=new T.InstancedMesh(geometry,m,entries.length);
  entries.forEach(([matrix,color],i)=>{inst.setMatrixAt(i,matrix);if(color)inst.setColorAt(i,color);});
  inst.computeBoundingSphere();owner.add(inst);
 }
 const night=new T.Color('#40556e'),dawn=new T.Color('#e7ad89'),horizon=new T.Color('#becdd2');
 function update(solar,now,outside=false){
  uniforms.gardenTime.value=now;
  upperGlass.visible=outside;
  if(!solar)return;
  uniforms.gardenSun.value.copy(solar.direction);uniforms.gardenDay.value=solar.daylight;uniforms.gardenDirect.value=solar.direct;
  uniforms.gardenWarm.value=solar.warmth;uniforms.twilight.value=solar.twilight;
  uniforms.gardenHorizon.value.copy(night).lerp(horizon,solar.daylight).lerp(dawn,.62*solar.twilight);
 }
 return {group,update};
}
