import * as THREE from './vendor/three.module.js';

const textureCache = new Map();
const shellCache = new Map();
const ink = new THREE.MeshBasicMaterial({ color: '#111817' });
const silver = new THREE.MeshStandardMaterial({ color: '#d8dedc', metalness: .38, roughness: .32 });
const clearPlastic = new THREE.MeshStandardMaterial({ color: '#b8c8d2', metalness: .28, roughness: .24, transparent: true, opacity: .8 });
const makeBox = (w,h,d,material,x=0,y=0,z=0) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z); return mesh; };
const hash = value => { let h=2166136261; for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
const wrap = (ctx,text,maxWidth) => { const words=String(text).split(/\s+/); const lines=[]; let line=''; for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;} if(line)lines.push(line);return lines; };
const isSquare = item => item.category==='vinyl'||item.category==='cds';
const isWide = item => item.category==='cassettes';
function dimensions(item){return isSquare(item)?[256,256]:isWide(item)?[256,160]:item.category==='cartridges'?[240,200]:[200,280];}
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
    ctx.shadowBlur=0;ctx.font='600 10px Arial';ctx.fillText((item.creator||'THE LOWER LEVEL').toUpperCase().slice(0,30),13,23);
  }
  // A small edge mark makes even distant stock feel printed, not a blank color tile.
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillRect(8,8,3,Math.min(28,height*.14));
}
export function coverTexture(item){
  if(textureCache.has(item.id))return textureCache.get(item.id);
  const [width,height]=dimensions(item),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');drawArt(ctx,item,null,width,height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;textureCache.set(item.id,texture);
  if(item.artwork){const img=new Image();img.onload=()=>{drawArt(ctx,item,img,width,height);texture.needsUpdate=true;};img.onerror=()=>{};img.src=item.artwork;}
  return texture;
}
export function coverDataUrl(item){return coverTexture(item).image.toDataURL('image/png');}
export function isBluRay(item){return item.category==='movies'&&Number(item.year)>=2006;}
export function caseSpec(item){
  if(item.category==='vinyl')return {w:.76,h:.76,d:.048,aw:.735,ah:.735,ay:0,shell:'#2c2925',kind:'vinyl'};
  if(item.category==='cds')return {w:.61,h:.61,d:.045,aw:.565,ah:.565,ay:0,shell:'#cad1d1',kind:'cd'};
  if(item.category==='cassettes')return {w:.62,h:.38,d:.115,aw:.55,ah:.21,ay:.055,shell:'#ded6c5',kind:'cassette'};
  if(item.category==='cartridges')return {w:.52,h:.43,d:.13,aw:.37,ah:.27,ay:-.015,shell:'#858b8a',kind:'cartridge'};
  if(item.category==='game-discs')return {w:.54,h:.70,d:.078,aw:.49,ah:.61,ay:-.025,shell:'#1d5aa2',kind:'game'};
  if(item.category==='shows')return {w:.57,h:.72,d:.145,aw:.51,ah:.62,ay:-.02,shell:'#252628',kind:'boxset'};
  return {w:.54,h:.70,d:.078,aw:.49,ah:.61,ay:-.025,shell:isBluRay(item)?'#1e5da8':'#242527',kind:isBluRay(item)?'bluray':'dvd'};
}
function shellMaterial(color){if(!shellCache.has(color))shellCache.set(color,new THREE.MeshStandardMaterial({color,metalness:.12,roughness:.42}));return shellCache.get(color);}
const bandCanvas=document.createElement('canvas');bandCanvas.width=512;bandCanvas.height=64;const bg=bandCanvas.getContext('2d');bg.fillStyle='#e5f3ff';bg.fillRect(0,0,512,64);bg.fillStyle='#194a86';bg.font='bold 34px Arial';bg.fillText('BLU-RAY',26,43);const blueBandTexture=new THREE.CanvasTexture(bandCanvas);blueBandTexture.colorSpace=THREE.SRGBColorSpace;
const gameCanvas=document.createElement('canvas');gameCanvas.width=512;gameCanvas.height=64;const gg=gameCanvas.getContext('2d');gg.fillStyle='#e9f1ff';gg.fillRect(0,0,512,64);gg.fillStyle='#205591';gg.font='bold 33px Arial';gg.fillText('GAME DISC',26,43);const gameBandTexture=new THREE.CanvasTexture(gameCanvas);gameBandTexture.colorSpace=THREE.SRGBColorSpace;
export function createMediaCase(item,{compact=false}={}){
  const spec=caseSpec(item),group=new THREE.Group();group.userData.itemId=item.id;
  const shell=makeBox(spec.w,spec.h,spec.d,shellMaterial(spec.shell));group.add(shell);
  const art=new THREE.Mesh(new THREE.PlaneGeometry(spec.aw,spec.ah),new THREE.MeshBasicMaterial({map:coverTexture(item),side:THREE.DoubleSide}));art.position.set(0,spec.ay,spec.d/2+.003);group.add(art);
  const pickables=[art,shell];
  if(spec.kind==='bluray'||spec.kind==='game'){
    const banner=new THREE.Mesh(new THREE.PlaneGeometry(spec.aw,.065),new THREE.MeshBasicMaterial({map:spec.kind==='game'?gameBandTexture:blueBandTexture}));banner.position.set(0,spec.h/2-.042,spec.d/2+.005);group.add(banner);pickables.push(banner);
    group.add(makeBox(spec.w,.025,spec.d,clearPlastic,0,spec.h/2-.012,0));
  } else if(spec.kind==='dvd'||spec.kind==='boxset'){
    group.add(makeBox(.025,spec.h,.008,ink,-spec.w/2+.012,0,spec.d/2+.004));
  } else if(spec.kind==='cd'){
    group.add(makeBox(.025,spec.h,.009,silver,-spec.w/2+.012,0,spec.d/2+.005));
    group.add(makeBox(spec.w,.012,.009,clearPlastic,0,spec.h/2-.01,spec.d/2+.005));
  } else if(spec.kind==='vinyl'){
    group.add(makeBox(.014,spec.h,.06,ink,-spec.w/2+.007,0,-.005));
    if(!compact){const record=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.008,48),ink);record.rotation.x=Math.PI/2;record.position.set(.12,0,-.026);group.add(record);}
  } else if(spec.kind==='cartridge'){
    group.add(makeBox(spec.w*.8,.055,spec.d,shellMaterial('#777f7e'),0,spec.h/2-.013,0));
    group.add(makeBox(.08,.07,spec.d,shellMaterial('#666d6e'),-spec.w/2+.045,spec.h/2-.034,0));
    group.add(makeBox(.08,.07,spec.d,shellMaterial('#666d6e'),spec.w/2-.045,spec.h/2-.034,0));
  } else if(spec.kind==='cassette'){
    group.add(makeBox(spec.w-.04,.04,.008,shellMaterial('#948e81'),0,-.075,spec.d/2+.006));
    if(!compact)for(const x of [-.15,.15]){const spool=new THREE.Mesh(new THREE.TorusGeometry(.052,.012,8,24),ink);spool.position.set(x,-.095,spec.d/2+.012);group.add(spool);}
  }
  if(!compact){group.add(makeBox(spec.w-.01,.008,spec.d+.008,clearPlastic,0,-spec.h/2+.012,0));}
  return {group,pickables,spec};
}
