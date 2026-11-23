import * as THREE from './vendor/three.module.js';

import {shelfCover} from './shelf-render.js';

const textureCache = new Map();
const shellCache = new Map();
const ink = new THREE.MeshBasicMaterial({ color: '#111817' });
const silver = new THREE.MeshStandardMaterial({ color: '#d8dedc', metalness: .38, roughness: .32 });
const makeBox = (w,h,d,material,x=0,y=0,z=0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z); return mesh; };
const hash = value => { let h=2166136261; for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
const wrap = (ctx,text,maxWidth) => { const words=String(text).split(/\s+/); const lines=[]; let line=''; for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;} if(line)lines.push(line);return lines; };
const isSquare = item => item.category==='vinyl'||item.category==='cds';
const isWide = item => item.category==='cassettes';
function dimensions(item){if(item.category==="retro-games"){const {w,h}=caseSpec(item);return [Math.round(260*w/h),260];}return isSquare(item)?[256,256]:isWide(item)?[256,160]:[200,280];}
function drawArt(ctx,item,img,width,height){
  const seed=hash(item.id),hue=seed%360;
  const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,`hsl(${hue} 37% 27%)`);grad.addColorStop(.55,`hsl(${(hue+45)%360} 56% 43%)`);grad.addColorStop(1,`hsl(${(hue+190)%360} 43% 20%)`);
  ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
  if(img){const scale=Math.max(width/img.width,height/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(width-w)/2,(height-h)/2,w,h);}
  else {
    ctx.save();ctx.translate(width*.68,height*.44);ctx.rotate((seed%17-8)*.07);
    ctx.fillStyle='hsla(42,88%,78%,.68)';ctx.beginPath();ctx.arc(0,0,width*.38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='hsla(210,38%,11%,.7)';ctx.fillRect(-width*.6,height*.08,width*1.2,height*.48);
    for(let i=0;i<8;i++){ctx.strokeStyle=`hsla(${(hue+i*36)%360},80%,86%,${.15+i*.02})`;ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(-width*.7+i*23,-height*.45);ctx.lineTo(width*.4+i*10,height*.7);ctx.stroke();}
    ctx.restore();
    const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(0,0,0,.4)');shade.addColorStop(.45,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.8)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#fff8e9';ctx.textAlign='left';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=4;
    ctx.font=`700 ${isSquare(item)?25:isWide(item)?20:26}px Arial`;
    const lines=wrap(ctx,item.title,width-27).slice(0,isWide(item)?2:4);let y=height-19-(lines.length-1)*(isWide(item)?21:27);
    for(const line of lines){ctx.fillText(line.slice(0,30),13,y);y+=isWide(item)?21:27;}
    ctx.shadowBlur=0;ctx.font='600 10px Arial';ctx.fillText((item.creator||'MY ROOM').toUpperCase().slice(0,30),13,23);
  }
  // A small edge mark makes even distant stock feel printed, not a blank color tile.
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillRect(8,8,3,Math.min(28,height*.14));
}
export function coverTexture(item){
  if(textureCache.has(item.id))return textureCache.get(item.id);
  const [width,height]=dimensions(item),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');drawArt(ctx,item,null,width,height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;textureCache.set(item.id,texture);
  if(item.artwork){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{drawArt(ctx,item,img,width,height);texture.needsUpdate=true;};img.onerror=()=>{};img.src=item.artwork;}
  return texture;
}
export function coverDataUrl(item){return coverTexture(item).image.toDataURL('image/png');}
export function isBluRay(item){return ['movies','anime-movies'].includes(item.category)&&Number(item.year)>=2006;}
import {retroPackage} from './game-packages.js';
// Outside width, height and depth in millimetres. One scene unit is one metre.
const formats = {
  vinyl: [315,315,3, 'LP jacket','#403b35'],
  cd: [142,125,10.4,'CD jewel case','#bfc7ca'],
  cassette: [109,69.6,16.8,'Cassette case','#c4c5bc'],
  switch: [21,31,3,'Switch game card','#383a38'],
  ds: [33,35,3.8,'Nintendo DS game card','#484848'],
  nes: [120,133,17,'NES cartridge','#898987'],
  n64: [116,76,19,'Nintendo 64 cartridge','#848583'],
  gb: [57,65,8,'Game Boy cartridge','#888b87'],
  snes: [128,87,20,'SNES cartridge','#95948d'],
  cart: [104,71,17,'Game cartridge','#484846'],
  gba: [60,34,9,'Game Boy Advance cartridge','#315344'],
  dvd: [135,190,14,'DVD case','#202123'],
  bluray: [135,171,12,'Blu-ray case','#1d5da4'],
  game: [135,171,14,'Game disc case','#22599a'],
  book: [145,220,20,'Book','#e2dac9'],
  boxset: [135,190,25,'TV box set','#343336']
};
export function caseSpec(item){
  const kinds={books:'book',manga:'book',vinyl:'vinyl',cds:'cd',cassettes:'cassette',shows:'boxset',anime:'boxset','game-discs':'game',playstation:'game',xbox:'game'};
  let kind=kinds[item.category];
  if(item.category==='retro-games'||item.category==='switch'){
    const pack=retroPackage(item.platform);
    const [width,height,depth,shell]=pack?pack.slice(2):[105,170,11,'#a39fa0'];
    return {w:width/1000,h:height/1000,d:depth/1000,kind:'retail',label:item.format,shell,dimensions:[width,height,depth]};
  }
  if(!kind)kind=isBluRay(item)?'bluray':'dvd';
  let [width,height,depth,label,shell]=formats[kind];
  if(kind==='game'){
    label=item.format || label;
    if(item.category==='xbox')shell='#376e37';
    if(['PlayStation 2','Xbox','Xbox 360'].includes(item.platform)){height=190;depth=14;}
    if(item.platform==='PlayStation'){width=142;height=125;depth=10;shell='#b6b9ba';}
    if(item.platform==='PlayStation Portable'){width=105;height=177;depth=14;shell='#dddfe2';}
  }
  if(kind==='book'){
    [width,height,depth]=item.dimensions || (item.category==='manga'?[127,190,16]:formats.book.slice(0,3));
    label=item.format || 'Book';
  }
  if(kind==='boxset'){
    label=item.category==='anime'?'Anime box set':'Series box set';
    // Four episodes per disc, four discs per inner case, all behind one cover.
    if(Number.isInteger(item.episodeCount) && item.episodeCount>0){
      const discs=Math.ceil(item.episodeCount/4);
      const innerCases=Math.ceil(discs/4);
      depth=8+innerCases*6+discs*2;
    }
  }
  return {w:width/1000,h:height/1000,d:depth/1000,kind,label,shell,dimensions:[width,height,depth]};
}
function shellMaterial(color){if(!shellCache.has(color))shellCache.set(color,new THREE.MeshStandardMaterial({color,metalness:.12,roughness:.42}));return shellCache.get(color);}
const bandCanvas=document.createElement('canvas');bandCanvas.width=512;bandCanvas.height=64;const bg=bandCanvas.getContext('2d');bg.fillStyle='#e5f3ff';bg.fillRect(0,0,512,64);bg.fillStyle='#194a86';bg.font='bold 34px Arial';bg.fillText('BLU-RAY',26,43);const blueBandTexture=new THREE.CanvasTexture(bandCanvas);blueBandTexture.colorSpace=THREE.SRGBColorSpace;
const gameBands={};
for(const [category,title,color] of [['playstation','PlayStation','#194880'],['xbox','XBOX','#327639'],['game-discs','GAME ARCHIVE','#434b52']]){
  const c=document.createElement('canvas');c.width=512;c.height=64;const g=c.getContext('2d');
  g.fillStyle=color;g.fillRect(0,0,512,64);g.fillStyle='#fff';g.font='bold 36px Arial';g.fillText(title,20,44);
  gameBands[category]=new THREE.CanvasTexture(c);gameBands[category].colorSpace=THREE.SRGBColorSpace;
}
const templates=new Map(), printMaterials=new Map();
function printMaterial(map){
  if(!printMaterials.has(map))printMaterials.set(map,new THREE.MeshBasicMaterial({map}));
  return printMaterials.get(map);
}
export function createMediaCase(item,onShelf=false){
  const spec=caseSpec(item);
  if(!templates.has(item.id) || onShelf){
    const tile=onShelf?shelfCover(item.artwork):null;
    const art=tile?.map||coverTexture(item);
    const {w,h,d,kind}=spec, group=new THREE.Group();
    const shell=kind==='book' ? makeBox(w-.003,h-.004,d-.002,shellMaterial(spec.shell)) : makeBox(w,h,d,shellMaterial(spec.shell));group.add(shell);
    const front=d/2+.00013;
    function face(width,height,x,y,map,z=front){
      const geometry=new THREE.PlaneGeometry(width,height);
      if(tile && map===tile.map){
        const uv=geometry.attributes.uv;
        for(let i=0;i<uv.count;i++)uv.setXY(i,tile.u+uv.getX(i)*tile.scale,tile.v+uv.getY(i)*tile.scale);
      }
      const mesh=new THREE.Mesh(geometry,printMaterial(map));
      mesh.position.set(x,y,z);group.add(mesh);
    }
    if(kind==='book'){
      const binding=shellMaterial('#49433b'),board=.0012;
      for(const side of [-1,1])group.add(makeBox(w,h,board,binding,0,0,side*(d-board)/2));
      group.add(makeBox(.002,h,d,binding,-w/2+.001,0,0));
      face(w,h,0,0,art);
    }else if(kind==='cd'){
      face(.120,.120,.007,0,art);
      group.add(makeBox(.008,.122,.0003,ink,-.065,0,front));
    }else if(kind==='game'||kind==='bluray'){
      face(w-.004,h*.89,0,-h*.038,art);
      face(w-.004,h*.067,0,h*.447,kind==='game'?gameBands[item.category]:blueBandTexture);
    }else if(kind==='retail'){
      face(w-.002,h-.002,0,0,art);
      group.add(makeBox(w*.98,.0013,d*.97,shellMaterial(spec.shell),0,h*.499,0));
    }else if(kind==='cassette'){
      face(w*.96,h*.93,0,0,art);
      group.add(makeBox(w*.98,.0015,.0003,silver,0,-h*.47,front+.00015));
    }else{
      face(w*.987,h*.987,0,0,art);
    }
    if(onShelf)return {group,spec,shell};
    templates.set(item.id,group);
  }
  const group=templates.get(item.id).clone();group.userData.itemId=item.id;
  return {group,spec,shell:group.children[0]};
}
