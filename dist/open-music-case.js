import * as T from './vendor/three.module.js';
import {caseInserts} from './case-inserts.js';
import {mediumPrint,musicLiner} from './medium-print.js';

function rounded(width,height,r){
  const a=width/2,b=height/2,s=new T.Shape();
  s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);
  s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);
  s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s;
}
function grooveFinish(){
  const c=document.createElement('canvas');c.width=c.height=512;
  const g=c.getContext('2d'),reflect=g.createImageData(512,512),axis=g.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const px=x-255.5,py=255.5-y,r=Math.hypot(px,py)||1,i=(y*512+x)*4;
    const theta=Math.atan2(py,px);
    const lobe=Math.pow(Math.abs(Math.cos(theta-.98)),11);
    const separation=(r-86)%28<1.05&&r>86;
    const striation=(.5+.5*Math.sin(r*2.62))*(3+lobe*5);
    const grey=26+27*lobe+striation-(separation?6:0);
    reflect.data.set([grey,grey+.7,grey+2,255],i);
    axis.data.set([127.5*(1-py/r),127.5*(1+px/r),255,255],i);
  }
  g.putImageData(reflect,0,0);
  const color=new T.CanvasTexture(c);color.colorSpace=T.SRGBColorSpace;color.anisotropy=4;
  const tangents=document.createElement('canvas');tangents.width=tangents.height=512;tangents.getContext('2d').putImageData(axis,0,0);
  const direction=new T.CanvasTexture(tangents);return {color,direction};
}
function grooves(){
  const c=document.createElement('canvas');c.width=c.height=1024;
  const g=c.getContext('2d');g.fillStyle='#888';g.fillRect(0,0,1024,1024);
  for(let r=174;r<507;r+=1.3){
    const land=(r-174)%56<3.6,n=land?55:Math.round(119+23*Math.sin(r*3.4)+12*Math.cos(r*.53));
    g.strokeStyle='rgb('+n+','+n+','+n+')';g.lineWidth=land?1.45:.85;
    g.beginPath();g.arc(512,512,r,0,Math.PI*2);g.stroke();
  }
  const map=new T.CanvasTexture(c);map.anisotropy=4;return map;
}

let pressing;
function recordFinish(){
  if(!pressing)pressing={...grooveFinish(),detail:grooves()};
  return pressing;
}

export function createOpenMusicCase(item,spec,closed){
  const root=new T.Group(),mm=new T.Group();root.add(mm);mm.scale.setScalar(.001);
  root.name=item.title+' · '+spec.label;
  const geometries=new Set(),materials=new Set(),textures=[];
  const mount=caseInserts(closed,geometries);
  function mat(color,roughness=.5,metalness=0,extra={}){
    const m=new T.MeshStandardMaterial({color,roughness,metalness,...extra});materials.add(m);return m;
  }
  function group(parent,name,x=0,y=0,z=0){
    const o=new T.Group();o.name=name;o.position.set(x,y,z);parent.add(o);return o;
  }
  function mesh(parent,name,geometry,material,x=0,y=0,z=0){
    geometries.add(geometry);const o=new T.Mesh(geometry,material);o.name=name;
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function box(parent,name,w,h,d,m,x,y,z){
    return mesh(parent,name,new T.BoxGeometry(w,h,d),m,x,y,z);
  }
  function plate(parent,name,w,h,d,m,x,y,z,r=2){
    const geo=new T.ExtrudeGeometry(rounded(w,h,r),{depth:d,bevelEnabled:false,curveSegments:6});
    geo.translate(0,0,-d/2);return mesh(parent,name,geo,m,x,y,z);
  }
  function ring(parent,name,inner,outer,m,x,y,z,steps=96){
    return mesh(parent,name,new T.RingGeometry(inner,outer,steps),m,x,y,z);
  }
  function torus(parent,name,r,t,m,x,y,z){
    return mesh(parent,name,new T.TorusGeometry(r,t,6,96),m,x,y,z);
  }
  function label(side){
    const map=mediumPrint(item,spec.kind,side);textures.push(map);
    return mat('#ffffff',.75,0,{map,alphaTest:.1});
  }
  let articulate;
  if(spec.kind==='vinyl'){
    const jacket=closed.clone(true);jacket.position.set(0,0,0);jacket.updateMatrixWorld(true);
    jacket.position.sub(new T.Box3().setFromObject(jacket).getCenter(new T.Vector3()));
    jacket.name='Printed record jacket';root.add(jacket);
    const disc=group(mm,'12-inch LP'),r=150,bore=3.6,labelR=50;
    if(item.mediumArt?.side==='B')disc.rotation.y=Math.PI;
    const finish=recordFinish(),texture=finish.detail;
    const wax=new T.MeshPhysicalMaterial({map:finish.color,roughness:.54,metalness:.32,bumpMap:texture,bumpScale:.12,
      roughnessMap:texture,anisotropy:.78,anisotropyMap:finish.direction});
    materials.add(wax);
    const edge=mat('#17181b',.26,.21);
    torus(disc,'Rounded record edge',r-.67,.68,edge,0,0,0);
    torus(disc,'Spindle bore',bore+.31,.32,edge,0,0,0);
    for(const side of [1,-1]){
      const face=group(disc,side===1?'Side A':'Side B');if(side<0)face.rotation.y=Math.PI;
      ring(face,'Playing surface',bore,r-.45,wax,0,0,.68,192);
      ring(face,'Paper center label',bore,labelR,label(side===1?'A':'B'),0,0,.78,128);
      torus(face,'Pressed label edge',labelR+.28,.19,edge,0,0,.69);
      torus(face,'Runout groove',labelR+6,.13,edge,0,0,.70);
    }
    // Keep the LP between the jacket faces until its trailing edge has cleared the opening.
    articulate=t=>{disc.position.x=(spec.w*500+r+8)*t;};
  }else{
    const w=109,h=69.6,d=16.8;
    const clear=mat('#bdd0d4',.20,.14,{transparent:true,opacity:.42,depthWrite:false});
    const body=mat('#2f3031',.56),trim=mat('#191b1c',.43),lip=mat('#9ca8ab',.27,.19);
    const paper=mat('#dad5c6',.89),hub=mat('#eee8d8',.43),oxide=mat('#644331',.74),steel=mat('#adadaa',.30,.68);
    const base=group(mm,'Back tray'),hinge=group(mm,'Long-edge hinge',0,-h/2+1,0);
    const lid=group(hinge,'Clear lid and folded J-card',0,h/2-1,d/2-1);
    plate(base,'Rear tray plastic',w-1,h-1,1.55,clear,0,0,-d/2+.85,2.3);
    mount(base,'MAT_BACK',0,0,-d/2-.03);
    for(const sx of [-1,1]){
      box(base,'Case sidewall',1.1,h-3,d*.64,clear,sx*(w/2-1),0,-d*.16);
      box(lid,'Lid sidewall',1.15,h-3,4.2,clear,sx*(w/2-1.15),0,-1.7);
      box(base,'Hinge ear',2.2,5.0,6.3,lip,sx*(w/2-1.6),-h/2+3,-.15);
      box(base,'Cassette keeper',3,4.4,5,clear,sx*41,h/2-3.2,-3.8);
    }
    plate(lid,'Transparent lid face',w-1,h-1,.86,clear,0,0,.28);
    plate(lid,'J-card paper backing',104.7,65.5,.36,paper,0,0,-.24,.8);
    mount(lid,'MAT_FRONT',0,0,.84);
    const liner=musicLiner(item,true);textures.push(liner);
    mesh(lid,'J-card inside',new T.PlaneGeometry(104.4,65.3),mat('#fff',.86,0,{map:liner}),0,0,-.45).rotation.x=Math.PI;
    box(lid,'Folded J-card spine',104.6,1.0,5.4,paper,0,-32.6,-2.7);
    const tape=group(base,'Compact audio cassette',0,0,-1);
    // Both shells have through-holes. The supply and take-up hubs show through the adhesive label.
    const shell=rounded(100,63,2.5);
    for(const x of [-21.2,21.2]){
      const hole=new T.Path();hole.absarc(x,4,6.2,0,Math.PI*2,true);shell.holes.push(hole);
    }
    const geo=new T.ExtrudeGeometry(shell,{depth:9,bevelEnabled:true,bevelSize:.38,bevelThickness:.38,bevelSegments:2,curveSegments:12});
    geo.translate(0,0,-4.5);mesh(tape,'Two-piece ABS shell',geo,body);
    const front=group(tape,'Side A');
    const faceZ=5.12;
    plate(front,'Label recess',92.4,38.5,.31,trim,0,6,4.91,2);
    const window=plate(front,'Reel window',67,15.5,.32,lip,0,3.6,faceZ,3);
    plate(window,'Window cavity',64.8,13.6,.16,trim,0,0,.25,2.8);
    for(const sx of [-1,1]){
      const x=sx*21.2,y=4;
      ring(front,'Tape wound on hub',6.1,sx<0?9.1:7.1,oxide,x,y,faceZ+.51,48);
      ring(front,'Ivory spool',3.6,6.0,hub,x,y,faceZ+.55,48);
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3;
        const tooth=box(front,'Spindle drive tooth',1.05,1.55,.47,hub,x+Math.sin(angle)*3.43,y+Math.cos(angle)*3.43,faceZ+.54);
        tooth.rotation.z=-angle;
      }
    }
    for(const [sx,sy] of [[-1,1],[1,1],[-1,-1],[1,-1]]){
      const x=sx*46.1,y=sy*27.5;
      ring(front,'Fastener',.68,1.32,steel,x,y,faceZ,16);
      const slot=box(front,'Fastener slot',1.6,.30,.2,trim,x,y,faceZ+.08);slot.rotation.z=.66*sx;
    }
    const bridge=new T.Shape();bridge.moveTo(-35,-29);bridge.lineTo(35,-29);bridge.lineTo(30.7,-18.2);bridge.lineTo(-30.7,-18.2);bridge.closePath();
    mesh(front,'Head-access bridge',new T.ExtrudeGeometry(bridge,{depth:1.5,bevelEnabled:false}),trim,0,0,4.91);
    for(const sx of [-1,1])ring(front,'Capstan guide',1.25,2.05,lip,sx*27.5,-25.8,6.46,24);
    box(front,'Magnetic tape at playback head',34,.65,1.7,oxide,0,-30,3.32);
    const ink=label('A');mesh(front,'Printed cassette label',new T.PlaneGeometry(88,17.65),ink,0,20.55,faceZ+.54);
    if(item.mediumArt?.layout==='shell'){
      const map=new T.TextureLoader().load(new URL(item.mediumArt.artwork,import.meta.url).href);
      map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;textures.push(map);
      const surface=mat('#ffffff',.57,0,{map,alphaTest:.22});
      mesh(front,'Scanned cassette face',new T.PlaneGeometry(100,63.0),surface,0,0,6.58);
    }
    articulate=t=>{hinge.rotation.x=t*Math.PI*.90;};
  }
  function setOpen(t){articulate(T.MathUtils.clamp(t,0,1));}
  return {group:root,textures,setOpen,dispose(){
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const tex of textures)tex.dispose();
    root.clear();
  }};
}
