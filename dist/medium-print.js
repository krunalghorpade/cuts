import * as T from './vendor/three.module.js';

// These designs use the stocked release's own cover when a medium-specific image is unavailable.
const fonts='"Helvetica Neue", Arial, sans-serif';
function crop(g,image,x,y,w,h,focus=.5){
  const s=Math.max(w/image.width,h/image.height);
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  g.drawImage(image,x+(w-image.width*s)/2,y+(h-image.height*s)*focus,image.width*s,image.height*s);
  g.restore();
}
function words(g,value,x,y,max,rows,step){
  const parts=String(value||'').split(/\s+/);let line='',row=0;
  for(const word of parts){
    const next=line?line+' '+word:word;
    if(line&&g.measureText(next).width>max&&row<rows-1){
      g.fillText(line,x,y+step*row,max);row++;line=word;
    }else line=next;
  }
  g.fillText(line,x,y+step*row,max);
}
function coverDesign(g,item,kind,image,w,h,side){
  const tape=kind==='cassette',lp=kind==='vinyl',movie=kind==='dvd'||kind==='bluray';
  g.fillStyle='#ddd9cb';g.fillRect(0,0,w,h);
  if(tape){
    g.fillStyle='#e9e3d2';g.fillRect(0,0,w,h);
    if(image)crop(g,image,0,0,h,h);
    const left=h+w*.035,fit=w-left-w*.04;
    g.fillStyle='#242621';g.font='bold '+h*.32+'px '+fonts;
    words(g,item.title,left,h*.39,fit,1,0);
    g.font=h*.205+'px '+fonts;g.fillText(item.creator||'',left,h*.69,fit);
    g.font='600 '+h*.12+'px '+fonts;g.fillText('SIDE '+side+'   /   '+(item.year||''),left,h*.91,fit);
    return;
  }
  if(image)crop(g,image,0,0,w,h,movie ? .33 : .5);
  const fade=g.createLinearGradient(0,h*.54,0,h);
  fade.addColorStop(0,'rgba(12,14,16,0)');fade.addColorStop(.4,'rgba(12,14,16,.70)');fade.addColorStop(1,'rgba(8,10,12,.94)');
  g.fillStyle=fade;g.fillRect(0,h*.54,w,h*.46);
  g.fillStyle='#fff';g.textAlign='center';g.font='600 '+w*(lp ? .069 : .054)+'px '+fonts;
  g.fillText(item.title,w*.5,h*.735,w*.73);
  g.font='500 '+w*(lp ? .047 : .033)+'px '+fonts;g.fillText(item.creator||'',w*.5,h*.797,w*.65);
  const mark=item.discCaption|| (lp?'33⅓ RPM   •   SIDE '+side:kind==='cd'?'COMPACT DISC':kind==='bluray'?'BLU-RAY DISC':'DVD VIDEO');
  g.font='600 '+w*(item.discCaption ? .048 : lp ? .036 : .024)+'px '+fonts;g.fillText(mark,w*.5,h*.866,w*.45);g.textAlign='left';
}

export function mediumPrint(item,kind,side='A'){
  const canvas=document.createElement('canvas'),tape=kind==='cassette';
  canvas.width=tape?768:640;canvas.height=tape?154:640;
  const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  let live=true,originalReady=false;
  const art=item.mediumArt;
  function paintCover(image){
    if(!live||originalReady)return;
    coverDesign(g,item,kind,image,w,h,side);texture.needsUpdate=true;
  }
  function image(url,draw){
    if(!url)return;const img=new Image();
    img.onload=()=>{if(live)draw(img);};img.src=new URL(url,import.meta.url).href;
  }
  paintCover(null);image(item.artwork,paintCover);
  // A source photograph of side A only belongs on that side.
  if(art?.artwork&&side===(art.side||'A')&&!(tape&&art.layout==='shell')){
    image(art.artwork,img=>{
      originalReady=true;g.clearRect(0,0,w,h);
      if(kind==='vinyl'&&art.layout==='disc'){
        const length=Math.min(img.width,img.height)*.33;
        g.drawImage(img,(img.width-length)/2,(img.height-length)/2,length,length,0,0,w,h);
      }else g.drawImage(img,0,0,w,h);
      texture.needsUpdate=true;
    });
  }
  texture.addEventListener('dispose',()=>{live=false;});
  return texture;
}


// A reversible printed insert for the inside of a jewel lid or J-card.
// Use the known album and track credits without inventing a pressing or track list.
export function musicLiner(item,wide){
  const c=document.createElement('canvas');c.width=768;c.height=wide?480:736;
  const g=c.getContext('2d'),w=c.width,h=c.height,left=w*.075;
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  let live=true;
  function paint(img){
    if(!live)return;
    g.fillStyle='#e4e1d5';g.fillRect(0,0,w,h);
    const sq=Math.min(w*.255,h*.32),top=h*.10;
    if(img)crop(g,img,left,top,sq,sq);
    g.fillStyle='#424039';g.font='500 '+h*.032+'px '+fonts;
    g.fillText(String(item.year||''),left+sq+w*.035,top+sq*.98);
    g.fillStyle='#272823';g.font='600 '+h*.069+'px '+fonts;
    words(g,item.title,left,h*.56,w-left*2,2,h*.075);
    g.fillStyle='#585951';g.font=h*.049+'px '+fonts;g.fillText(item.creator||'',left,h*.72,w-left*2);
    if(item.featuredTrack){
      g.font=h*.031+'px '+fonts;g.fillText('Playlist track',left,h*.84);
      g.fillStyle='#30312c';g.font=h*.043+'px '+fonts;g.fillText(item.featuredTrack,left,h*.91,w-left*2);
    }
    map.needsUpdate=true;
  }
  paint(null);
  if(item.artwork){const img=new Image();img.onload=()=>paint(img);img.src=new URL(item.artwork,import.meta.url).href;}
  map.addEventListener('dispose',()=>{live=false;});return map;
}
