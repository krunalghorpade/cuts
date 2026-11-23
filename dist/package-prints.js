import * as T from './vendor/three.module.js';

const font='"Helvetica Neue", Arial, sans-serif';
const finishes=['#2e4040','#39333d','#4a3a32','#3b3d33','#273747','#3e3330'];
function palette(item){
  let h=0;
  for(const c of item.id)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;
  return finishes[h%finishes.length];
}
function lines(ctx,text,width,max){
  const result=[];let line='';
  for(const word of String(text||'').split(/\s+/)){
    const next=line?line+' '+word:word;
    if(line && ctx.measureText(next).width>width){
      result.push(line);line=word;
      if(result.length===max)return result;
    }else line=next;
  }
  if(line)result.push(line);
  return result.slice(0,max);
}

export function drawJCard(c,item,img,width,height,source){
  c.fillStyle=palette(item);c.fillRect(0,0,width,height);
  const size=Math.min(height,width*.68);
  if(img){
    const crop=source||[0,0,img.width,img.height];
    c.drawImage(img,...crop,0,0,size,height);
  }
  const margin=width*.035,x=size+margin,w=width-x-margin,spacing=height*.10;
  c.fillStyle='#e6e0d4';c.font='600 '+height*.08+'px '+font;
  const title=lines(c,item.title,w,4);
  title.forEach((s,i)=>c.fillText(s,x,height*.18+i*spacing,w));
  c.fillStyle='#cac2b5';c.font=height*.058+'px '+font;
  lines(c,item.creator,w,2).forEach((s,i)=>c.fillText(s,x,height*.67+i*height*.084,w));
  c.fillStyle='#e8e5df';c.font='600 '+height*.064+'px '+font;c.fillText(String(item.year||''),x,height*.92,w);
}

function back(c,item,spec,w,h){
  const margin=w*.075,usable=w-2*margin,tone=palette(item);
  if(spec.kind==='cassette'){
    c.fillStyle='#e8e4d7';c.fillRect(0,0,w,h);
    c.fillStyle=tone;c.fillRect(0,0,w*.034,h);
    // The cassette rear panel is the short fold of the J-card, above the tape reels.
    c.fillStyle='#252a27';c.font='600 '+w*.065+'px '+font;
    c.fillText(item.title,margin,h*.40,usable);
    c.font=w*.045+'px '+font;c.fillText([item.creator,item.year].filter(Boolean).join('   ·   '),margin,h*.72,usable);
    return;
  }
  const fontSize=n=>n*Math.min(w,h);
  c.fillStyle='#e9e5da';c.fillRect(0,0,w,h);
  c.fillStyle=tone;c.fillRect(0,0,w,h*.22);
  c.fillStyle='#fffdf4';c.font='600 '+fontSize(.071)+'px '+font;
  const titleLines=lines(c,item.title,usable,2);
  titleLines.forEach((s,i)=>c.fillText(s,margin,h*.105+i*fontSize(.078),usable));
  c.fillStyle='#282b29';c.font='600 '+fontSize(.047)+'px '+font;
  c.fillText(item.creator||'',margin,h*.315,usable);
  c.font=fontSize(.034)+'px '+font;
  const attrs=[item.year,item.platform||item.genres?.slice(0,2).join(' / ')].filter(Boolean);
  c.fillText(attrs.join('   ·   '),margin,h*.375,usable);
  c.fillStyle=tone;c.fillRect(margin,h*.428,usable,Math.max(.6,h*.002));
  c.fillStyle='#303330';c.font=fontSize(.036)+'px '+font;
  const lineH=fontSize(.053);
  const available=Math.max(1,Math.floor(h*.34/lineH));
  const desc=lines(c,item.description||item.featuredTrack||'',usable,available);
  desc.forEach((s,i)=>c.fillText(s,margin,h*.503+i*lineH,usable));
  c.fillStyle=tone;c.fillRect(0,h*.86,w,h*.14);
  c.fillStyle='#f6efe2';c.font='600 '+fontSize(.034)+'px '+font;
  c.fillText(spec.label.toUpperCase(),margin,h*.925,w*.53);
  c.textAlign='right';c.font=fontSize(.030)+'px '+font;c.fillText('MY ROOM',w-margin,h*.925,w*.27);c.textAlign='left';
}
function spine(c,item,spec,w,h){
  c.fillStyle=palette(item);c.fillRect(0,0,w,h);
  c.save();c.translate(w/2,0);c.rotate(Math.PI/2);c.textBaseline='middle';
  const fontsize=Math.min(h*.10,w*.59);
  c.fillStyle='#f7f3e9';c.font='600 '+fontsize+'px '+font;
  c.fillText(item.title,h*.05,0,h*.74);
  c.fillStyle='#c4bba6';c.font='500 '+Math.min(fontsize*.75,h*.041)+'px '+font;
  c.textAlign='right';c.fillText(String(item.year||''),h*.95,0,h*.13);c.restore();
}
function createMap(canvas){
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function drawAt(canvas,x,y,w,h,graphic){
  const c=canvas.getContext('2d');c.save();c.translate(x,y);
  c.beginPath();c.rect(0,0,w,h);c.clip();graphic(c,w,h);c.restore();
}
function atlasSheet(width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  return {canvas,map:createMap(canvas)};
}
function boxUV(page,x,y,w,h){
  const {width,height}=page.canvas;
  return {map:page.map,u:(x+.5)/width,v:1-(y+h-.5)/height,sx:(w-1)/width,sy:(h-1)/height};
}
const labelSheets=[],cassetteSheets=[];
const labelSlots=new Map(),cassetteSlots=new Map();

export function shelfInserts(item,spec){
  if(labelSlots.has(item.id))return labelSlots.get(item.id);
  const index=labelSlots.size,pageIndex=Math.floor(index/256),cell=index%256;
  const page=labelSheets[pageIndex]??=atlasSheet(1024,768);
  const x=(cell%16)*64,y=Math.floor(cell/16)*48;
  drawAt(page.canvas,x,y,48,48,(c,w,h)=>{
    if(spec.kind==='cassette'){c.scale(1,4);back(c,item,spec,w,h/4);}
    else back(c,item,spec,w,h);
  });
  drawAt(page.canvas,x+48,y,16,48,(c,w,h)=>spine(c,item,spec,w,h));
  page.map.needsUpdate=true;
  const prints={back:boxUV(page,x,y,48,48),spine:boxUV(page,x+48,y,16,48)};
  labelSlots.set(item.id,prints);return prints;
}
export function shelfJCard(item,cover){
  if(cassetteSlots.has(item.id))return cassetteSlots.get(item.id);
  const index=cassetteSlots.size,pageIndex=Math.floor(index/128),cell=index%128;
  const page=cassetteSheets[pageIndex]??=atlasSheet(1024,320);
  const x=(cell%16)*64,y=Math.floor(cell/16)*40;
  function print(img=null,crop=null){
    drawAt(page.canvas,x,y,64,40,(c,w,h)=>drawJCard(c,item,img,w,h,crop));page.map.needsUpdate=true;
  }
  print();
  cover.ready.then(map=>{
    const img=map.image;if(!img)return;
    print(img,[cover.u*img.width,(1-cover.v-cover.sy)*img.height,cover.sx*img.width,cover.sy*img.height]);
  });
  const tile=boxUV(page,x,y,64,40);cassetteSlots.set(item.id,tile);return tile;
}
export function detailInserts(item,spec){
  const h=512,w=Math.max(128,Math.round(h*spec.w/spec.h));
  const backH=spec.kind==='cassette'?Math.round(w*26.4/104):h;
  const spineWidth=Math.max(20,Math.min(512,Math.round(h*spec.d/spec.h)));
  const page=atlasSheet(w+spineWidth+4,h);
  drawAt(page.canvas,0,0,w,backH,(c,a,b)=>back(c,item,spec,a,b));
  drawAt(page.canvas,w+4,0,spineWidth,h,(c,a,b)=>spine(c,item,spec,a,b));
  page.map.needsUpdate=true;
  return {back:boxUV(page,0,0,w,backH),spine:boxUV(page,w+4,0,spineWidth,h),map:page.map};
}
