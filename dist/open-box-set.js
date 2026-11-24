import * as T from './vendor/three.module.js';
import {caseInserts} from './case-inserts.js';
import {createOpticalCase} from './open-game-case.js';
import {mediumPrint} from './medium-print.js';
import {discSpread,seasonThickness} from './box-set-layout.js';

const clamp=t=>Math.max(0,Math.min(1,t));
function ease(t){t=clamp(t);return t*t*(3-2*t);}
const mix=T.MathUtils.lerp;
const font='"Helvetica Neue", Arial, sans-serif';

// The season cover and its pull spine are printed separately. A series poster
// can still identify a specific season when there is no separate season poster.
function seasonPaper(item,season,reverse=false){
  const canvas=document.createElement('canvas');canvas.width=448;canvas.height=640;
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const ctx=canvas.getContext('2d');let live=true;
  function paint(img){
    if(reverse){
      ctx.fillStyle='#ece9df';ctx.fillRect(0,0,448,640);
      ctx.fillStyle='#242629';ctx.fillRect(0,0,448,142);
      ctx.fillStyle='#faf8ef';ctx.font='600 33px '+font;ctx.fillText(item.title,24,62,400);
      ctx.font='24px '+font;ctx.fillText(season.label,25,109,400);
      if(img){
        const scale=Math.min(151/img.width,225/img.height);
        ctx.drawImage(img,24,174,img.width*scale,img.height*scale);
      }
      ctx.fillStyle='#353638';ctx.font='600 20px '+font;
      if(season.episodes)ctx.fillText(season.episodes+' episodes',198,202,227);
      ctx.font='17px '+font;
      const words=String(item.description||'').split(/\s+/);let line='',n=0;
      for(const word of words){
        const next=line?line+' '+word:word;
        if(ctx.measureText(next).width>221&&line){
          ctx.fillText(line,198,241+n*25,221);line='';if(++n===11)break;
        }
        line=line?line+' '+word:word;
      }
      if(line&&n<11)ctx.fillText(line,198,241+n*25,221);
      ctx.fillStyle='#323538';ctx.fillRect(0,577,448,63);ctx.fillStyle='#f7f4e9';ctx.font='18px '+font;
      ctx.fillText(season.label,24,615,390);map.needsUpdate=true;return;
    }
    ctx.fillStyle='#252827';ctx.fillRect(0,0,448,640);
    if(img){
      const fit=Math.max(448/img.width,554/img.height);
      ctx.save();ctx.beginPath();ctx.rect(0,0,448,554);ctx.clip();
      ctx.drawImage(img,(448-img.width*fit)/2,(554-img.height*fit)/2,img.width*fit,img.height*fit);ctx.restore();
    }
    ctx.fillStyle='#161819';ctx.fillRect(0,550,448,90);ctx.fillStyle='#f4f2eb';
    ctx.font='600 31px '+font;ctx.fillText(season.label,21,590,406);
    ctx.font='18px '+font;ctx.fillStyle='#c0c0b8';ctx.fillText(item.title,22,620,402);map.needsUpdate=true;
  }
  paint(null);
  if(season.artwork){const img=new Image();img.onload=()=>{if(live)paint(img);};img.src=new URL(season.artwork,import.meta.url).href;}
  map.addEventListener('dispose',()=>{live=false;});return map;
}

function spinePrint(item,season,selected){
  const c=document.createElement('canvas');c.width=768;c.height=96;
  const ctx=c.getContext('2d');
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
  let live=true;
  function paint(img){
    ctx.fillStyle=selected?'#eeeadd':'#262b2e';ctx.fillRect(0,0,768,96);
    ctx.fillStyle=selected?'#222425':'#edece3';ctx.font='600 55px '+font;
    ctx.fillText(season.label,24,66,395);
    if(img){
      const cut=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-cut)/2,(img.height-cut*.36)*.28,cut,cut*.36,576,0,192,96);
    }
    ctx.fillStyle=selected?'#66665e':'#c4c5bd';ctx.font='500 33px '+font;ctx.textAlign='right';
    ctx.fillText(item.title,553,62,188);ctx.textAlign='left';tex.needsUpdate=true;
  }
  paint(null);
  if(season.artwork){const img=new Image();img.onload=()=>{if(live)paint(img);};img.src=new URL(season.artwork,import.meta.url).href;}
  tex.addEventListener('dispose',()=>{live=false;});return tex;
}

export function createBoxSet(item,spec,closed,index,page){
  const season=item.seasons[index],root=new T.Group(),shell=new T.Group(),carrier=new T.Group();
  shell.name='Collector box';carrier.name=season.label;root.add(shell,carrier);
  const {w,h,d}=spec,wall=.00125,iw=w-.005,ih=h-.005;
  const all=item.seasons,gap=Math.min(.0008,(d-wall*2)/(all.length*5));
  const room=d-2*wall-gap*(all.length+1),weights=all.map(s=>seasonThickness(s));
  const total=weights.reduce((a,b)=>a+b,0);
  const slots=[];let rear=-d/2+wall+gap;
  for(const weight of weights){
    const depth=room*weight/total;slots.push({d:depth,z:rear+depth/2});rear+=depth+gap;
  }
  const selected=slots[index],geometry=new Set(),materials=new Set(),textures=[];
  function material(color,roughness=.65,extra={}){
    const m=new T.MeshStandardMaterial({color,roughness,...extra});materials.add(m);return m;
  }
  function part(parent,name,g,m,x=0,y=0,z=0){
    geometry.add(g);const mesh=new T.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function panel(parent,name,x,y,z,w,h,d,mat){return part(parent,name,new T.BoxGeometry(w,h,d),mat,x,y,z);}
  function paper(parent,name,w,h,map,x,y,z){
    return part(parent,name,new T.PlaneGeometry(w,h),material('#fff',.73,{map}),x,y,z);
  }
  const board=material('#29292a',.88),edge=material('#8f8371',.93),lining=material('#343333',.94);
  const taper=material('#24272a',.40);
  for(const s of [-1,1]){
    panel(shell,'Wrapped bookboard',0,0,s*(d-wall)/2,w,h,wall,board);
    panel(shell,'Folded board',0,s*(h-wall)/2,0,w,wall,d,board);
    panel(shell,'Paperboard edge',w/2+.00005,s*(h-wall)/2,0,.00028,wall*.87,d,edge);
  }
  panel(shell,'Closed end',-(w-wall)/2,0,0,wall,h,d,board);
  const prints=new T.Group();prints.scale.setScalar(.001);shell.add(prints);
  const mount=caseInserts(closed,geometry);
  mount(prints,'MAT_FRONT',0,0,d*500+.12);mount(prints,'MAT_BACK',0,0,-d*500-.12);
  const flap=new T.Group();flap.name='Hinged end flap';flap.position.set(w/2,0,-d/2);shell.add(flap);
  panel(flap,'Collector flap',0,0,d/2,wall,h,d,board);
  panel(flap,'Flap lining',-wall*.55,0,d/2,wall*.18,h-.003,d-.001,lining);

  function spine(parent,i,slot,selectedFace){
    const map=spinePrint(item,all[i],selectedFace);textures.push(map);
    const face=paper(parent,'Season spine',ih*.965,slot.d*.90,map,0,0,0);
    face.userData.seasonIndex=i;
    // The long axis of the printed strip runs along the height of its case.
    face.rotation.order='YXZ';face.rotation.y=selectedFace?-Math.PI/2:Math.PI/2;
    face.rotation.z=Math.PI/2;return face;
  }
  for(let i=0;i<slots.length;i++){
    if(i===index)continue;
    const slot=slots[i],o=panel(shell,'Stored '+all[i].label,0,0,slot.z,iw,ih,slot.d,taper);
    o.userData.seasonIndex=i;
    spine(shell,i,slot,false).position.set(iw/2+.00015,0,slot.z);
  }

  const nums=discSpread(season,page),cover=seasonPaper(item,season),reverse=seasonPaper(item,season,true);textures.push(cover,reverse);
  function disc(n){
    return mediumPrint({...item,artwork:season.artwork,mediumArt:season.labels.get(n),
      creator:season.label,discCaption:season.unknownCount?'Disc':'Disc '+n},season.format);
  }
  const film={...item,platform:'',artwork:season.artwork};
  const isBlu=season.format==='bluray';
  const seasonSpec={kind:isBlu?'bluray':'dvd',w:iw,h:ih,d:selected.d,shell:isBlu?'#24558a':'#303336'};
  const coverMat=material('#ffffff',.61,{map:cover});
  const reverseMat=material('#ffffff',.8,{map:reverse});
  const right=disc(nums[nums.length-1]),left=nums.length===2?disc(nums[0]):null;
  const inside=createOpticalCase(film,seasonSpec,right,owned=>(parent,slot,x,y,z)=>{
    if(!['MAT_FRONT','MAT_BACK','MAT_LINER'].includes(slot))return;
    const inset=slot==='MAT_LINER'?13:3;
    const g=new T.PlaneGeometry(iw*1000-inset,ih*1000-inset);owned.add(g);
    const face=new T.Mesh(g,slot==='MAT_FRONT'?coverMat:reverseMat);face.position.set(x,y,z);
    if(slot!=='MAT_FRONT')face.rotation.y=Math.PI;parent.add(face);
  },null,left);
  carrier.add(inside.group);
  inside.group.position.sub(inside.closedBounds.getCenter(new T.Vector3()));
  const strip=spine(carrier,index,selected,true);strip.position.x=-iw/2-.00021;
  textures.push(...inside.textures);
  const origin=new T.Vector3(),target=new T.Vector3(),boxA=new T.Box3(),boxB=new T.Box3();
  let framing=0;
  function setOpen(amount){
    const t=amount*3,reveal=ease(t),pull=clamp(t-1),open=ease(t-2);
    // Clear the mouth along the case's own axis before turning its cover to the viewer.
    const out=ease(pull/.53),turn=ease((pull-.51)/.49);
    shell.rotation.y=mix(-1.42*reveal,-.42,turn);
    const offset=w*.54+d*.33;
    shell.position.x=-turn*offset-open*(w*2.4+d*.55);
    flap.rotation.y=reveal*1.91;
    origin.set(iw*1.07*out,0,selected.z).applyAxisAngle(Y,shell.rotation.y).add(shell.position);
    target.set(offset+.012+open*iw*.33,0,.014);
    carrier.position.lerpVectors(origin,target,turn);
    carrier.rotation.y=mix(shell.rotation.y+Math.PI,.05,turn);
    inside.setOpen(open);
    strip.visible=open<.04;
    shell.visible=open<.999;
    framing=open;
  }
  function measure(){
    root.updateMatrixWorld(true);
    boxB.setFromObject(carrier);
    if(framing>=.999)return boxB;
    boxA.setFromObject(shell).union(boxB);
    boxA.min.lerp(boxB.min,framing);boxA.max.lerp(boxB.max,framing);return boxA;
  }
  setOpen(0);
  return {group:root,textures,setOpen,measure,seasonIndex:index,page,boxSet:true,dispose(){
    inside.dispose();for(const g of geometry)g.dispose();for(const m of materials)m.dispose();
    for(const tex of textures)if(!inside.textures.includes(tex))tex.dispose();root.clear();
  }};
}
const Y=new T.Vector3(0,1,0);
