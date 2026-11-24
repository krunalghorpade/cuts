import * as T from './vendor/three.module.js';

// Measurements in millimetres. Three.js scenes outside this model use metres.
const cartridges = {
  'Game Boy':[57,65,8,'pocket'], 'Game Boy Color':[57,65,8,'pocket'],
  'Game Boy Advance':[60,35,8,'advance'], 'Nintendo DS':[33,35,3.8,'card'],
  'Nintendo 3DS':[35,35,3.8,'card'], 'Nintendo Switch':[21.4,31.2,3.5,'switch'],
  'Nintendo Entertainment System':[120,133,17,'nes'],
  'Super Nintendo Entertainment System':[128,87,19,'snes'],
  'Nintendo 64':[116,76,18.5,'n64'], 'Sega Genesis':[110,70,16,'megadrive'],
  'Famicom':[108,69,17,'megadrive']
};
const paperCartons=new Set(['Game Boy','Game Boy Color','Game Boy Advance','Nintendo Entertainment System',
  'Famicom','Super Nintendo Entertainment System','Nintendo 64']);

function rounded(w,h,r){
  const x=w/2,y=h/2,s=new T.Shape(); r=Math.min(r,x,y);
  s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);
  s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);
  s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);s.closePath();
  return s;
}
function poly(points){
  const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;
}
function cartridgeProfile(w,h,family){
  const x=w/2,y=h/2;
  if(family==='n64'){
    const s=new T.Shape();s.moveTo(-x+2,-y);s.lineTo(x-2,-y);s.lineTo(x,-y+2);
    s.lineTo(x,y-16);s.quadraticCurveTo(x,y-11,x-7,y-9);
    s.quadraticCurveTo(0,y+9,-x+7,y-9);s.quadraticCurveTo(-x,y-10,-x,y-16);
    s.lineTo(-x,-y+2);s.closePath();return s;
  }
  if(family==='pocket')return poly([[-x+1,-y],[x-1,-y],[x,-y+1],[x,y-8],[x-5,y-8],[x-5,y-1],[x-6,y],[-x+1,y],[-x,y-1],[-x,-y+1]]);
  if(family==='advance')return poly([[-x+2,-y],[x-2,-y],[x-2,y-7],[x,y-7],[x,y-1],[x-1,y],[-x+1,y],[-x,y-1],[-x,y-7],[-x+2,y-7]]);
  if(family==='card'||family==='switch')return poly([[-x+1,-y],[x-.8,-y],[x,-y+.8],[x,y-1],[x-1,y],[-x+3,y],[-x,y-3],[-x,-y+1]]);
  return rounded(w,h,family==='snes'?3:2);
}
function shellColor(platform){
  if(platform.startsWith('Xbox'))return platform==='Xbox'?'#365425':'#417e25';
  if(platform==='PlayStation 3'||platform==='Nintendo Switch')return '#aab2b4';
  if(platform==='PlayStation 4'||platform==='PlayStation 5')return '#234e98';
  return '#383b40';
}
// Sample the plastic just inside the outline of a cut-out scan. Pokémon game paks,
// for example, came in distinct coloured shells. The label itself stays untouched.
function cartridgeRimColor(image){
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,80,80);
  const pixels=ctx.getImageData(0,0,80,80).data,channels=[[],[],[]];
  for(let y=17;y<62;y+=3)for(const direction of [-1,1]){
    let x=direction>0?0:79;
    while(x>=0&&x<80&&pixels[(y*80+x)*4+3]<230)x+=direction;
    x+=direction*3;
    if(x<0||x>=80)continue;
    const p=4*(y*80+x);
    if(pixels[p+3]<230)continue;
    for(let c=0;c<3;c++)channels[c].push(pixels[p+c]);
  }
  if(!channels[0].length)return null;
  const rgb=channels.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length*.55)]/255);
  return new T.Color().setRGB(...rgb,T.SRGBColorSpace);
}
const clamp=n=>Math.max(0,Math.min(1,n));

export function createOpenGameCase(item,spec,mediumIndex=0){
  const game=item.gameMedia,kind=game?.kind;
  if(!['disc','cartridge','umd'].includes(kind))return null;
  const model=new T.Group(),stage=new T.Group();stage.scale.setScalar(.001);model.add(stage);
  model.name=item.title+' · open package';
  const w=spec.w*1000,h=spec.h*1000,d=spec.d*1000,platform=item.platform||'';
  const entry=game.media?.[mediumIndex],textures=[],materials=new Set(),geometries=new Set();
  const loader=new T.TextureLoader(),animators=[];
  let disposed=false;
  function mat(color,roughness=.55,metalness=0,options={}){
    const m=new T.MeshStandardMaterial({color,roughness,metalness,...options});materials.add(m);return m;
  }
  const shell=mat(shellColor(platform),.36),shadow=mat('#25272a',.77),rim=mat(shellColor(platform),.28);
  rim.color.multiplyScalar(1.28);
  const polymer=mat('#383a3c',.48),well=mat('#343639',.72),nickel=mat('#b9bdc0',.29,.71);
  const cardStock=mat('#c1bba6',.91),cutEdge=mat('#998f74',.9);
  function joint(parent,name,x=0,y=0,z=0){
    const part=new T.Group();part.name=name;part.position.set(x,y,z);parent.add(part);return part;
  }
  function mesh(parent,name,g,m,x=0,y=0,z=0){
    geometries.add(g);const part=new T.Mesh(g,m);part.name=name;part.position.set(x,y,z);parent.add(part);return part;
  }
  function bar(parent,name,width,height,depth,m,x,y,z){
    return mesh(parent,name,new T.BoxGeometry(width,height,depth),m,x,y,z);
  }
  function slab(parent,name,shape,depth,bevel,m,x,y,z){
    const g=new T.ExtrudeGeometry(shape,{depth:Math.max(.01,depth-2*bevel),bevelEnabled:bevel>0,
      bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:8,steps:1});
    g.translate(0,0,-depth/2+bevel);return mesh(parent,name,g,m,x,y,z);
  }
  function plate(parent,name,width,height,depth,m,x,y,z,r=1.2){
    return slab(parent,name,rounded(width-.3,height-.3,r),depth,Math.min(.16,depth*.18),m,x,y,z);
  }
  function drum(parent,name,radius,depth,m,x,y,z){
    const g=new T.CylinderGeometry(radius,radius,depth,72);g.rotateX(Math.PI/2);return mesh(parent,name,g,m,x,y,z);
  }
  function annulus(parent,name,inner,outer,m,x,y,z,segments=96){
    return mesh(parent,name,new T.RingGeometry(inner,outer,segments),m,x,y,z);
  }
  function hoop(parent,name,radius,wire,m,x,y,z){
    return mesh(parent,name,new T.TorusGeometry(radius,wire,5,84),m,x,y,z);
  }
  function printMaterial(path,extra={},ready){
    const m=mat('#ffffff',.67,0,{...extra,visible:false});
    const tex=loader.load(new URL(path,import.meta.url).href,t=>{
      if(disposed)return;
      if(ready)ready(t.image);
      m.visible=true;
    });
    tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;m.map=tex;textures.push(tex);return m;
  }
  function print(parent,name,path,width,height,x,y,z,reverse=false,onImage){
    if(!path)return;
    const part=mesh(parent,name,new T.PlaneGeometry(width,height),null,x,y,z);
    part.material=printMaterial(path,{alphaTest:.22},img=>{
      const k=(img.width/img.height)/(width/height);
      part.scale.set(Math.min(1,k),Math.min(1,1/k),1);
      onImage?.(img);
    });
    if(reverse)part.rotation.y=Math.PI;return part;
  }
  function ejectHub(parent,r,z){
    const hubBody=mat('#35383a',.35);
    drum(parent,'Hub · socket',r*.94,1.1,hubBody,0,0,z);
    hoop(parent,'Hub · ring',r-.6,.38,rim,0,0,z+.8);
    for(let i=0;i<8;i++){
      const a=(i+.5)*Math.PI/4;
      const finger=plate(parent,'Hub · flexible lug',1.8,3.2,.75,rim,Math.sin(a)*(r-1.9),Math.cos(a)*(r-1.9),z+1.02,.6);
      finger.rotation.z=-a;
    }
    drum(parent,'Hub · button',r*.48,1.3,hubBody,0,0,z+.45);
  }
  function opticalDisc(parent,radius,hole,z){
    const disc=joint(parent,'Optical medium',0,0,z);
    const foil=mat('#d5d7da',.3,.67),blank=mat('#ced1d5',.36,.52);
    annulus(disc,'Reflective substrate',hole,radius,foil,0,0,-.5).rotation.y=Math.PI;
    for(const [r,tube] of [[radius-.44,.45],[hole+.31,.31]])hoop(disc,'Polycarbonate edge',r,tube,foil,0,0,0);
    annulus(disc,'Label side',hole,radius-.22,blank,0,0,.48);
    if(entry?.artwork){
      const ink=printMaterial(entry.artwork,{alphaTest:.18,roughness:.53});
      annulus(disc,'LaunchBox · printed disc',hole,radius-.46,ink,0,0,.54);
    }else{
      hoop(disc,'Mirror band',radius*.32,.22,foil,0,0,.53);
      hoop(disc,'Outer track',radius-.93,.21,foil,0,0,.53);
    }
    return disc;
  }
  function cartridge(parent,maxW,maxH){
    const [cw,ch,thickness,family]=cartridges[platform]||[52,50,7,'generic'];
    const size=Math.min(1,maxW/cw,maxH/ch);
    const cart=joint(parent,'Removable game cartridge');cart.scale.setScalar(size);
    const ink=family==='pocket'? '#a5a6a0':family==='snes'||family==='n64'||family==='nes'?'#999a96':'#37383c';
    const unpainted=mat(ink,.52),lip=mat(ink,.33);lip.color.multiplyScalar(.77);
    const body=cartridgeProfile(cw,ch,family),edge=Math.min(thickness*.065,.48);
    slab(cart,'Injection-moulded shell',body,thickness,edge,unpainted,0,0,0);
    const seam=slab(cart,'Two-piece casing joint',body,.36,.1,lip,0,0,-thickness*.18);
    seam.scale.set(1.002,1.002,1);
    const labelWidths={pocket:.79,advance:.77,card:.86,switch:.86,nes:.70,n64:.64,snes:.71,megadrive:.73};
    const labelHeights={pocket:.55,advance:.70,card:.79,switch:.75,nes:.68,n64:.59,snes:.64,megadrive:.68};
    const lw=cw*(labelWidths[family]||.76),lh=ch*(labelHeights[family]||.67);
    const cy=family==='pocket'?-ch*.055:family==='nes'?ch*.11:0;
    if(entry?.layout==='shell' && entry.artwork){
      print(cart,'LaunchBox · full cartridge face',entry.artwork,cw+.16,ch+.16,0,0,thickness/2+.13,false,img=>{
        const tone=cartridgeRimColor(img);
        if(tone){unpainted.color.copy(tone);lip.color.copy(tone).multiplyScalar(.77);}
      });
    }else{
      plate(cart,'Recessed label bed',lw+1.2,lh+1.2,.30,lip,0,cy,thickness/2+.1,1.2);
      plate(cart,'Label field',lw,lh,.22,unpainted,0,cy,thickness/2+.29,1);
      if(entry?.artwork)print(cart,'LaunchBox · cartridge label',entry.artwork,lw,lh,0,cy,thickness/2+.52);
      if(family==='pocket'||family==='advance'||family==='nes'||family==='snes'){
        const y=ch*.41;
        for(let i=0;i<3;i++)bar(cart,'Finger grip',cw*.53,.4,.26,lip,0,y+i*.78,thickness/2+.12);
      }
    }
    if(entry?.backArtwork){
      print(cart,'LaunchBox · cartridge reverse',entry.backArtwork,cw,ch,0,0,-thickness/2-.14,true);
    }else{
      const compact=['card','switch'].includes(family);
      const ww=cw*.77,hh=compact?ch*.31:thickness*.57;
      const block=bar(cart,'Connector recess',ww,hh,Math.min(1.6,thickness*.25),shadow,0,-ch*.5+hh/2,-thickness/2+.1);
      const gold=mat('#a58a51',.33,.67),pins=family==='switch'?15:compact?17:24;
      for(let i=0;i<pins;i++){
        const px=(i+.5)*ww/pins-ww/2;
        bar(cart,'Connector contact',ww/pins*.63,hh*.74,.15,gold,px,block.position.y,block.position.z-Math.min(1.6,thickness*.25)/2-.02);
      }
      if(!compact){
        for(const x of [-.32,.32])drum(cart,'Shell fastener',1.25,.18,lip,x*cw,-ch*.27,-thickness/2-.02);
      }
    }
    return {cart,width:cw*size,height:ch*size,thickness:thickness*size};
  }
  function umd(parent,z){
    const disk=joint(parent,'Universal Media Disc',0,0,z);
    const ivory=mat('#e2e0d5',.39),clear=mat('#b4bfbe',.30,.23);
    const shape=new T.Shape();
    shape.moveTo(-30,-26);shape.quadraticCurveTo(-33,-26,-33,-21);shape.lineTo(-33,0);
    shape.absarc(0,0,33,Math.PI,0,true);shape.lineTo(33,-21);shape.quadraticCurveTo(33,-26,29,-26);shape.closePath();
    slab(disk,'UMD protective caddy',shape,4,.34,ivory,0,0,0);
    if(entry?.artwork && entry.layout==='shell'){
      print(disk,'LaunchBox · UMD caddy',entry.artwork,66,59,0,3.5,2.1);
    }else{
      drum(disk,'Transparent UMD window',28.5,.55,clear,0,2,2.05);
      const centre=joint(disk,'UMD disc well',0,2,2.45);
      opticalDisc(centre,27.8,4.3,0);
      hoop(centre,'UMD window lip',28.0,.75,ivory,0,0,.9);
    }
  }
  function routedRib(parent,points,radius,finish){
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
    return mesh(parent,'Moulded relief',new T.TubeGeometry(path,points.length*6,radius,4,false),finish,0,0,0);
  }
  function bookletMount(cover,jewel){
    if(jewel){
      const clear=mat('#c6cac7',.23,.12),paper=mat('#d3d2c7',.86);
      // A front booklet shows its plain paper reverse inside a clear jewel lid.
      plate(cover,'Reverse of front booklet',w-15,h-6,1.15,paper,-3.4,0,-1.6,.65);
      for(const sign of [-1,1]){
        plate(cover,'Clear booklet stop',5.2,18,1.8,clear,-w*.46,sign*h*.31,-2.64,2);
        plate(cover,'Clear corner tab',7.2,9.2,1.55,clear,w*.405,sign*h*.42,-2.52,2.5);
      }
      for(let i=0;i<12;i++)bar(cover,'Jewel hinge fluting',.37,h-7,.45,clear,w/2-3.1-i*.54,0,-1.45);
      return;
    }
    const x=w*.43,y=h*.42,z=-1.18;
    const guide=mat(shellColor(platform),.30);guide.color.multiplyScalar(1.45);
    for(const sign of [-1,1]){
      routedRib(cover,[[-x,y*sign*.65,z],[-x,y*sign*.95,z],[-x+2,y*sign,z],[-x+11,y*sign,z]],.48,guide);
      routedRib(cover,[[x-10,y*sign,z],[x-2,y*sign,z],[x,y*sign*.96,z],[x,y*sign*.72,z]],.48,guide);
    }
    if(platform==='PlayStation 2'){
      const mount=joint(cover,'Memory card holder',2,h*.236,-1.26);
      plate(mount,'Card outline',46,31,.65,well,0,0,0,2.4);
      plate(mount,'Bay floor',40,24,.42,shell,0,-.4,-.48,1.4);
      for(const side of [-1,1]){
        bar(mount,'Holder side clip',3,24,2.9,rim,side*21.6,0,-1.25);
        bar(mount,'Retention tab',5,4.2,1.35,guide,side*20.8,5.7,-3.02);
      }
      bar(mount,'Memory card stop',43,2.4,2.7,shell,0,13.25,-1.5);
    }
  }
  function clamshell(){
    const jewel=platform==='PlayStation';
    const inside=jewel?well:shell;
    const back=joint(stage,'Tray half',w/2,0,-d/2+1.25);
    plate(back,'Back panel',w-1.7,h-1.5,2,inside,0,0,0,2);
    const depth=jewel?2.4:Math.max(2.6,d*.35);
    const frame=(p,m,dir)=>{
      const z=dir*depth/2;
      for(const side of [-1,1]){
        bar(p,'Raised top and bottom lip',w-3,1.5,depth,m,0,side*(h/2-1.7),z);
        bar(p,'Sidewall',1.5,h-4.5,depth,m,side*(w/2-1.5),0,z);
      }
    };
    frame(back,rim,1);
    print(back,'Retail back insert',item.boxBack,w-4,h-4,0,0,-1.08,true);
    const hinge=joint(stage,'Living hinge'),cover=joint(hinge,'Lid',w/2,0,d/2-1.25);
    plate(cover,'Cover panel',w-1.8,h-1.6,1.8,inside,0,0,0,2);
    frame(cover,rim,-1);
    bookletMount(cover,jewel);
    print(cover,'Retail front insert',item.artwork,w-3.7,h-4,0,0,1.03);
    for(const s of [-1,1]){
      plate(cover,'Booklet spring',6.5,12,1.4,rim,w*.38,s*h*.315,-1.84,1.6);
      bar(cover,'Booklet retaining lip',6,4,2.2,shell,w*.38-1.8,s*h*.315,-2.63);
      bar(back,'Latch socket',2.8,9,2.5,inside,w/2-3.3,s*h*.28,depth*.7);
      bar(cover,'Snap latch',2.5,7.4,2.6,rim,w/2-3.6,s*h*.28,-depth*.7);
    }
    bar(back,'Spine web',Math.max(4,d*.53),h-4,1.2,inside,-w/2+1.6,0,2.4);
    for(let i=0;i<4;i++){
      const pin=mesh(stage,'Hinge knuckle',new T.CylinderGeometry(1.5,1.5,h*.18,12),rim,1,(i-1.5)*h*.225,0);
      pin.position.z=.15;
    }
    if(kind==='disc'){
      const r=/GameCube/.test(platform)?40:Math.min(60,w*.46,h*.465);
      const holder=joint(back,'Disc retainer',jewel?2:0,jewel?0:-h*.025,1.55);
      drum(holder,'Circular well',r+2.5,.9,well,0,0,0);
      hoop(holder,'Stepped tray moulding',r+2.8,.54,rim,0,0,.48);
      if(h/2-r>9){
        for(const side of [-1,1])for(const sy of [-1,1]){
          routedRib(holder,[[side*r*.72,sy*r*.72,.20],[side*r*.84,sy*r*.86,.20],[side*w*.407,sy*h*.421,.20]],.64,rim);
        }
      }
      if(jewel)for(let i=0;i<14;i++)bar(back,'Jewel tray hinge ribs',.41,h-6,1.25,rim,-w/2+1.7+i*.55,0,1.54);
      hoop(holder,'Raised well rim',r+1.7,.82,rim,0,0,.56);
      for(const sign of [-1,1]){
        const lift=drum(holder,'Finger recess',Math.min(7,r*.13),.75,shadow,sign*(r-2)*.74,(r-2)*.67,.44);
        lift.scale.y=.82;
      }
      opticalDisc(holder,r,7.5,1.55);
      ejectHub(holder,7.5,2.1);
    }else if(kind==='umd'){
      plate(back,'UMD tray pocket',72,69,1.6,well,0,-3,1.3,10);
      const pocket=joint(back,'UMD well',0,-6,1.7);umd(pocket,2.5);
      for(const sign of [-1,1])plate(back,'Caddy lock',4,9,3,rim,sign*34,-9,3.2,1);
    }else{
      const holder=joint(back,'Game card tray',0,0,1.25);
      const {cart,width:cw,height:ch,thickness:cd}=cartridge(holder,w*.83,h*.82);
      plate(holder,'Moulded card well',cw+5.5,ch+5.5,1.15,well,0,0,0,2.7);
      cart.position.z=.72+cd/2;
      for(const sign of [-1,1]){
        plate(holder,'Game card clip',2.1,ch*.35,cd+1,rim,sign*(cw/2+1.1),0,cd/2,1);
        plate(holder,'Lower stop',cw*.22,2.5,cd+1,rim,sign*cw*.30,-ch/2-1.4,cd/2,.8);
      }
      if(platform==='Nintendo DS'){
        const legacy=joint(back,'GBA slot',0,-h*.36,2.25);
        plate(legacy,'GBA slot recess',62,14,1,well,0,0,0,2);
        for(const side of [-1,1])bar(legacy,'GBA slot rail',3.1,14,3.1,rim,side*30,0,1.4);
      }
    }
    animators.push(t=>{hinge.rotation.y=-t*Math.PI*.963;});
  }
  function carton(){
    const sideOpening=w>h*1.10;
    const cartonBody=joint(stage,'Printed carton');
    const thick=.72;
    plate(cartonBody,'Printed paperboard front',w,h,thick,cardStock,0,0,d/2,1);
    plate(cartonBody,'Carton rear',w,h,thick,cardStock,0,0,-d/2,1);
    print(cartonBody,'Retail front panel',item.artwork,w-.6,h-.6,0,0,d/2+.44);
    print(cartonBody,'Retail back panel',item.boxBack,w-.6,h-.6,0,0,-d/2-.44,true);
    bar(cartonBody,'Left folded edge',thick,h,d,cutEdge,-w/2,0,0);
    bar(cartonBody,'Lower folded edge',w,thick,d,cutEdge,0,-h/2,0);
    if(sideOpening)bar(cartonBody,'Upper folded edge',w,thick,d,cutEdge,0,h/2,0);
    else bar(cartonBody,'Right folded edge',thick,h,d,cutEdge,w/2,0,0);
    if(item.boxSpine){
      const side=joint(cartonBody,'Printed spine',-w/2-.42,0,0);
      side.rotation.y=-Math.PI/2;print(side,'Retail spine insert',item.boxSpine,d-.5,h-.5,0,0,0);
    }
    const flap=joint(cartonBody,'Paperboard tuck flap',sideOpening?w/2:0,sideOpening?0:h/2,-d/2);
    if(sideOpening)bar(flap,'Side flap',thick,h-2,d,cardStock,0,0,d/2);
    else bar(flap,'Top flap',w-2,thick,d,cardStock,0,0,d/2);
    const tray=joint(stage,'Pull-out fitted insert');
    const tw=w-4.8,th=h-4.8;
    const floor=-d/2+1.5;
    plate(tray,'Cardboard insert floor',tw,th,1.35,cardStock,0,0,floor,1);
    const {cart,width:cw,height:ch,thickness:cd}=cartridge(tray,tw-6,th-6);
    const lipZ=floor+3,frameZ=floor+Math.min(cd*.56,6.2);
    // The raised paperboard surround is cut from a single sheet, with a thumb
    // notch and an inset below its edge where the cartridge sits.
    const aperture=rounded(tw-3.4,th-3.4,1.5);
    const ax=Math.min(cw+5,tw-5)/2,ay=Math.min(ch+6,th-5)/2;
    const hole=new T.Path(),notch=Math.min(7,(tw/2-ax)*.58);
    hole.moveTo(-ax,-ay);hole.lineTo(-ax,ay);hole.lineTo(ax,ay);hole.lineTo(ax,notch);
    hole.absarc(ax,0,notch,Math.PI/2,-Math.PI/2,true);hole.lineTo(ax,-ay);hole.closePath();
    aperture.holes.push(hole);
    slab(tray,'Die-cut paper aperture',aperture,.78,.09,mat('#d4cfb9',.9),0,0,frameZ);
    for(const sign of [-1,1]){
      bar(tray,'Fold return',1.1,ay*2-3,frameZ-floor,cutEdge,sign*ax,0,(frameZ+floor)/2);
      if(th-2*ay>12)bar(tray,'Fold score',tw-8,.35,.17,cutEdge,0,sign*(th/2-5.3),frameZ+.51);
    }
    for(const side of [-1,1]){
      bar(tray,'Folded tray wall',1.4,th-2,5.3,cutEdge,side*(tw/2-.8),0,lipZ);
      bar(tray,'Folded tray wall',tw,1.4,5.3,cutEdge,0,side*(th/2-.8),lipZ);
      plate(tray,'Fitted support',3,ch*.60,3.6,cutEdge,side*(cw/2+1.65),0,floor+2.2,.6);
      plate(tray,'End support',cw*.36,3,4.1,cardStock,side*cw*.23,-ch/2-1.7,floor+2.6,.7);
    }
    cart.position.z=floor+1.25+cd/2;
    animators.push(t=>{
      const a=clamp(t/.32)*1.57;
      if(sideOpening)flap.rotation.y=a;else flap.rotation.x=-a;
      const travel=clamp((t-.16)/.84);
      if(sideOpening){tray.position.set(travel*(w+7),0,-travel*2);}
      else{
        // Lift clear of the box, move over, then settle the tray beside it.
        const lift=clamp(travel/.42),across=clamp((travel-.37)/.43),settle=clamp((travel-.72)/.28);
        tray.position.set(across*(w+8),(lift-settle)*(h+5),0);
      }
    });
  }
  if(kind==='cartridge'&&paperCartons.has(platform))carton();else clamshell();
  function setOpen(progress){for(const update of animators)update(clamp(progress));}
  setOpen(1);model.updateMatrixWorld(true);
  const raw=new T.Box3().setFromObject(model),centre=raw.getCenter(new T.Vector3());
  stage.position.sub(centre);model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model);
  setOpen(0);model.updateMatrixWorld(true);
  const closedBounds=new T.Box3().setFromObject(model);
  setOpen(1);model.updateMatrixWorld(true);
  return {group:model,bounds,closedBounds,textures,setOpen,dispose(){
    if(disposed)return;disposed=true;
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
    model.clear();
  }};
}
