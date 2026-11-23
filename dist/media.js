import * as THREE from './vendor/three.module.js';

import {shelfCover,gamePrintAspect} from './shelf-render.js';
import {makePackage,disposePrint} from './packaging.js';
import {drawJCard} from './package-prints.js';
import {retroPackage} from './game-packages.js';

const textureCache = new Map();
const hash = value => { let h=2166136261; for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
const wrap = (ctx,text,maxWidth) => { const words=String(text).split(/\s+/); const lines=[]; let line=''; for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;} if(line)lines.push(line);return lines; };
const isSquare = item => item.category==='vinyl'||item.category==='cds';
const isWide = item => item.category==='cassettes';
function dimensions(item){if(item.category==="retro-games"){const {w,h}=caseSpec(item);return [Math.round(260*w/h),260];}return isSquare(item)?[256,256]:isWide(item)?[256,160]:[200,280];}
function drawArt(ctx,item,img,width,height){
  const seed=hash(item.id),hue=seed%360;
  const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,`hsl(${hue} 37% 27%)`);grad.addColorStop(.55,`hsl(${(hue+45)%360} 56% 43%)`);grad.addColorStop(1,`hsl(${(hue+190)%360} 43% 20%)`);
  ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
  if(img && item.category==='cassettes'){drawJCard(ctx,item,img,width,height);return;}
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
// Outside width, height and depth in millimetres. One scene unit is one metre.
const formats = {
  vinyl: [315,315,3, 'LP jacket','#403b35'],
  cd: [142,125,10.4,'CD jewel case','#bfc7ca'],
  cassette: [109,69.6,16.8,'Cassette case','#c4c5bc'],
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
const bands=new Map();
function formatBand(item){
  const game=item.category==='playstation'||item.category==='xbox'||item.category==='game-discs';
  const label=game?(item.platform||'Game disc'):'Blu-ray Disc';
  if(bands.has(label))return bands.get(label);
  const c=document.createElement('canvas');c.width=512;c.height=48;
  const g=c.getContext('2d'),base=game?(item.category==='xbox'?'#307237':'#25446b'):'#225fa2';
  const grad=g.createLinearGradient(0,0,0,48);grad.addColorStop(0,base);grad.addColorStop(1,game?base:'#184a88');
  g.fillStyle=grad;g.fillRect(0,0,512,48);g.fillStyle='#edf2fa';g.textBaseline='middle';
  g.font=(game?'600 31px':'italic 600 28px')+' "Helvetica Neue", Arial, sans-serif';
  g.textAlign=game?'left':'center';g.fillText(label,game?18:256,25,475);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;bands.set(label,map);return map;
}
const scanMaps=new Map(),scanLoader=new THREE.TextureLoader();
function gameScan(path,onShelf){
  const aspect=gamePrintAspect(path);
  if(onShelf){
    const tile=shelfCover(path);
    return tile && {...tile,aspect};
  }
  let entry=scanMaps.get(path);
  if(!entry){
    const map=scanLoader.load(new URL(path,import.meta.url).href);
    map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
    entry={map,users:0};scanMaps.set(path,entry);
  }
  entry.users++;
  return {map:entry.map,aspect,release(){
    entry.users--;
    // The carousel can acquire the same edition again synchronously when it turns.
    queueMicrotask(()=>{
      if(entry.users===0 && scanMaps.get(path)===entry){
        scanMaps.delete(path);disposePrint(entry.map);
      }
    });
  }};
}

export function createMediaCase(item,onShelf=false){
  const spec=caseSpec(item);
  const scans={};
  if(item.launchboxUrl){
    for(const [slot,path] of [['MAT_FRONT',item.artwork],['MAT_BACK',item.boxBack],['MAT_SPINE',item.boxSpine]]){
      if(path){
        const scan=gameScan(path,onShelf);
        if(scan)scans[slot]=scan;
      }
    }
  }
  const cover=scans.MAT_FRONT||(onShelf && shelfCover(item.artwork,item.category==='vinyl'))||{map:coverTexture(item)};
  return makePackage(item,spec,onShelf,cover,formatBand(item),scans);
}
