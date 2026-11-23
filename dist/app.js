import * as THREE from './vendor/three.module.js';
import { CATEGORIES, ITEMS, categoryById, playlists, imdbList, gameList } from './catalog.js';
import { buildInterior } from './interior.js';
import { rooms, rise, stair, inside, roomAt, groundAt } from './plan.js';
import { createCasePreview } from './case-preview.js';
import { stockRooms } from './racks.js';
import { caseSpec, coverDataUrl } from './media.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const intro = $('intro');
const hud = $('hud');
const catalogPanel = $('catalogPanel');
const detailPanel = $('detailPanel');
const prompt = $('inspectPrompt');
const preview=createCasePreview($('casePreview'));
$('previewReset').onclick=preview.reset;
const mobile = matchMedia('(pointer: coarse)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#63584a');
scene.fog = new THREE.FogExp2('#63584a', 0.012);
const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, 0.08, 80);
camera.position.set(-3.5, 1.62, 4.1);
camera.rotation.order = 'YXZ';
camera.rotation.y = -.31;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Math.sqrt(900000/(innerWidth*innerHeight))));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}
function textTexture(text, opts = {}) {
  const c = document.createElement('canvas'); c.width = opts.width || 1024; c.height = opts.height || 256;
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#1f3024'; g.fillRect(0, 0, c.width, c.height);
  if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = 7; g.strokeRect(14, 14, c.width - 28, c.height - 28); }
  g.fillStyle = opts.color || '#efb777'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${opts.size || 90}px Arial, sans-serif`; g.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 65);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function label(parent, text, x, y, z, w, h, opts = {}) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, opts), transparent: false, side: THREE.DoubleSide }));
  plane.position.set(x, y, z); parent.add(plane); return plane;
}

const interior=buildInterior(scene,label);
const {stacks,interactables,destinations}=stockRooms(interior,box,label);
for(const door of interior.doors)interactables[door.level-1].push(...door.faces);
let ground=0,level=1;
function refreshFloor(){
  level=ground>rise/2?2:1;
  const onStair=inside(stair,camera.position.x,camera.position.z);
  interior.floors.forEach((group,index)=>group.visible=onStair||index===level-1);
  $('entryLocation').textContent='Level '+level+' · '+(onStair?'Staircase':roomAt(level,camera.position.x,camera.position.z)?.name||'Landing');
}
refreshFloor();
let active=false, uiOpen=false, yaw=-.31, pitch=0, focusedCase=null, selectedCase=null, toastTimer;
let dragLook=false, dragPointer=null, dragLastX=0, dragLastY=0;
const keys=new Set(); const raycaster=new THREE.Raycaster(); const hoverPoint=new THREE.Vector2();let hasPointer=false,suppressClick=false,pressX=0,pressY=0; const clock=new THREE.Clock();
const joystick={x:0,y:0,pointer:null}; let lookStart=null,lookPointer=null,lookLastX=0,lookLastY=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function requestLook(){ if(!mobile && !uiOpen && document.pointerLockElement!==canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(()=>showToast('Drag on the scene to look around')); } }
function enter(){ active=true;uiOpen=false;intro.classList.add('hidden');hud.classList.remove('hidden'); }
function pause(){ if(!active||uiOpen)return; active=false;keys.clear();intro.classList.remove('hidden');hud.classList.add('hidden');$('enterBtn').textContent='Continue exploring'; document.exitPointerLock?.(); }
function showToast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2400);}
function openCatalog(){preview.hide();currentDetailId=null;uiOpen=true;catalogPanel.classList.remove('hidden');detailPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();renderCatalog();$('searchInput').focus();}
function closeCatalog(){catalogPanel.classList.add('hidden');uiOpen=false;if(active){hud.classList.remove('hidden');}else intro.classList.remove('hidden');}
const audioCache=new Map();let currentDetailId=null,currentDetailItem=null;
async function enrichAudio(item){
  const extra=$('audioExtra');if(!item.album||item.creator==='Various Artists')return;
  const artist=item.creator.split(',')[0],key=artist+'|'+item.album;
  if(!audioCache.has(key)){
    const url=new URL('https://www.theaudiodb.com/api/v1/json/123/searchalbum.php');
    url.searchParams.set('s',artist);url.searchParams.set('a',item.album);
    audioCache.set(key,fetch(url,{mode:'cors'}).then(response=>response.ok?response.json():null).then(data=>data?.album?.[0]||null).catch(()=>null));
  }
  const album=await audioCache.get(key);if(currentDetailId!==item.id||!album)return;
  extra.replaceChildren();
  if(album.strGenre){const tag=document.createElement('strong');tag.textContent=album.strGenre.toUpperCase();extra.append(tag);}
  if(album.strDescriptionEN){const desc=document.createElement('p');desc.textContent=album.strDescriptionEN.slice(0,270)+(album.strDescriptionEN.length>270?'…':'');extra.append(desc);}
  if(extra.childNodes.length)extra.classList.remove('hidden');
}
const sections=new Map();
for(const {category,items} of stacks.values()){
  if(!sections.has(category.id))sections.set(category.id,[]);
  sections.get(category.id).push(...items);
}
let detailItems=[], detailIndex=-1, fromCatalog=false;
function openDetail(item){
  if(!item)return;
  fromCatalog=!catalogPanel.classList.contains('hidden');
  detailItems=sections.get(item.category);
  detailIndex=detailItems.findIndex(entry=>entry.id===item.id);
  if(detailIndex<0)return;
  uiOpen=true;keys.clear();
  catalogPanel.classList.add('hidden');intro.classList.add('hidden');
  detailPanel.classList.remove('hidden');document.exitPointerLock?.();
  showDetailItem();
  $('closeDetail').focus({preventScroll:true});
}
function turnItem(direction){
  const next=detailIndex+direction;
  if(next<0 || next>=detailItems.length)return;
  detailIndex=next;showDetailItem(direction);
}
function showDetailItem(direction=0){
  const item=detailItems[detailIndex];
  currentDetailId=item.id;currentDetailItem=item;
  const prev=detailItems[detailIndex-1], next=detailItems[detailIndex+1];
  $('itemPrev').disabled=!prev;$('itemNext').disabled=!next;
  $('itemPrev').title=prev?prev.title:'First item';
  $('itemNext').title=next?next.title:'Last item';
  $('itemPosition').textContent=(detailIndex+1)+' / '+detailItems.length;
  detailPanel.scrollTop=0;
  preview.show(item,prev,next,direction);
  $('audioExtra').classList.add('hidden');
  $('detailSize').textContent=caseSpec(item).dimensions.join(' × ')+' mm';
  $('detailCategory').textContent=categoryById[item.category].label;$('detailTitle').textContent=item.title;
  $('detailCreator').textContent=item.creator;$('detailYear').textContent=item.year;$('detailFormatValue').textContent=caseSpec(item).label;$('detailSource').textContent=item.source;
  const sourceLink=$('sourceLink');
  sourceLink.classList.toggle('hidden', !item.sourceUrl);
  if(item.sourceUrl){
    sourceLink.href=item.sourceUrl;
    sourceLink.textContent=item.album?'Open on Spotify':'Open on '+item.source;
  }
  const listNames=(item.playlists || []).map(id=>playlists[id]).filter(Boolean);
  $('detailNote').textContent=item.album
    ? [item.featuredTrack, listNames.join(', ')].filter(Boolean).join(' · ')
    : [item.platforms?.join(', ') || item.platform, item.episodeCount!=null ? item.episodeCount+' episodes' : '', (item.genres||[]).join(', ')].filter(Boolean).join(' · ');
  if(item.album)enrichAudio(item);
}
$('itemPrev').onclick=()=>turnItem(-1);
$('itemNext').onclick=()=>turnItem(1);
function closeDetail(returnToCatalog=fromCatalog){
  preview.hide();currentDetailId=null;currentDetailItem=null;
  detailPanel.classList.add('hidden');detailItems=[];detailIndex=-1;fromCatalog=false;
  if(returnToCatalog){
    uiOpen=true;catalogPanel.classList.remove('hidden');
    $('catalogDetails').focus({preventScroll:true});
    return;
  }
  uiOpen=false;
  if(active)hud.classList.remove('hidden');else intro.classList.remove('hidden');
}
function arrive(floor,x,z,direction,lookPitch=0){
  selectCase(null);hasPointer=false;
  ground=(floor-1)*rise;camera.position.set(x,ground+1.62,z);yaw=direction;pitch=lookPitch;
  camera.rotation.y=yaw;camera.rotation.x=pitch;keys.clear();
  enter();refreshFloor();camera.updateMatrixWorld();
}
function visitShelf(){
  if(!currentDetailItem)return;
  const dest=destinations.get(currentDetailItem.id);
  closeDetail(false);arrive(dest.level,dest.x,dest.z,dest.yaw,dest.pitch);
}
$('visitShelf').onclick=visitShelf;
let filter='all',catalogSelection=null;
function renderFilters(){
  const node=$('filters');
  node.replaceChildren();
  for(const c of [{id:'all',label:'All'},...CATEGORIES]){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=c.label;
    button.setAttribute('aria-pressed',String(filter===c.id));
    button.onclick=()=>{filter=c.id;renderFilters();renderCatalog();};
    node.append(button);
  }
}
function renderCatalog(){
  catalogSelection=null;
  $('catalogSelection').classList.add('hidden');
  const q=$('searchInput').value.trim().toLowerCase();
  const grid=$('catalogGrid');
  grid.replaceChildren();
  grid.scrollTop=0;
  for(const item of ITEMS){
    if(filter!=='all' && item.category!==filter) continue;
    if(q && ![item.title,item.creator,item.year,categoryById[item.category].label].join(' ').toLowerCase().includes(q)) continue;
    const card=document.createElement('button');
    card.type='button';card.className='catalog-card';card.setAttribute('aria-pressed','false');
    const image=document.createElement('img');
    image.className='catalog-art';image.alt='';image.loading='lazy';
    image.src=item.artwork || coverDataUrl(item);
    const copy=document.createElement('div');copy.className='catalog-copy';
    const title=document.createElement('strong');title.textContent=item.title;
    const meta=document.createElement('span');
    meta.textContent=[item.creator,item.year].filter(Boolean).join(' · ');
    copy.append(title,meta);card.append(image,copy);
    card.onclick=()=>{
      grid.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed','false');
      card.setAttribute('aria-pressed','true');catalogSelection=item;
      $('chosenTitle').textContent=item.title;
      $('catalogSelection').classList.remove('hidden');
    };
    grid.append(card);
  }
  if(!grid.childElementCount){
    const empty=document.createElement('p');empty.className='empty-state';
    empty.textContent=q?'No matches.':'This shelf is empty.';
    if(!q && ['cartridges','game-discs'].includes(filter)){
      const link=document.createElement('a');
      link.href=gameList;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='View My Games on RAWG';
      empty.append(document.createElement('br'),link);
    }
    grid.append(empty);
  }
}
const sourceList=$('sourceLists');
for(const [title,url] of [['IMDb watchlist (CSV export)',imdbList],['My Games on RAWG',gameList],...Object.entries(playlists).map(([id,name])=>[name,'https://open.spotify.com/playlist/'+id])]){
  const a=document.createElement('a');a.href=url;a.textContent=title;a.target='_blank';a.rel='noopener noreferrer';sourceList.append(a);
}
$('dismissPanel').onclick=()=>detailPanel.classList.contains('hidden')?closeCatalog():closeDetail();
const frameGeometry=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-.5,-.5,0),new THREE.Vector3(.5,-.5,0),
  new THREE.Vector3(.5,.5,0),new THREE.Vector3(-.5,.5,0)
]);
function makeFrame(color){
  const frame=new THREE.LineLoop(frameGeometry,new THREE.LineBasicMaterial({color,toneMapped:false}));
  frame.visible=false;return frame;
}
const hoverFrame=makeFrame('#bebebe'),selectionFrame=makeFrame('#ffffff');
function outline(frame,shell){
  if(!shell){frame.visible=false;return;}
  if(frame.parent!==shell.parent)shell.parent.add(frame);
  const {w,h,d}=shell.userData.spec;
  frame.visible=true;frame.scale.set(w+.0007,h+.0007,1);frame.position.z=d/2+.00085;
}
function selectCase(shell){selectedCase=shell;outline(selectionFrame,shell);}
function inspect(){
  const target=selectedCase||focusedCase;
  if(!target){showToast('Select a case on the shelf');return;}
  openDetail(target.userData.item);
}
$('catalogDetails').onclick=()=>openDetail(catalogSelection);
$('itemCount').textContent=ITEMS.length;$('enterBtn').onclick=enter;$('browseBtn').onclick=openCatalog;$('closeCatalog').onclick=closeCatalog;$('closeDetail').onclick=()=>closeDetail();$('searchInput').oninput=renderCatalog;$('touchInspect').onclick=inspect;
renderFilters();
canvas.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse')return;
  hoverPoint.set(event.clientX,event.clientY);hasPointer=true;
  if(dragLook&&Math.hypot(event.clientX-pressX,event.clientY-pressY)>5)suppressClick=true;
});
canvas.addEventListener('pointerleave',()=>{hasPointer=false;});
canvas.addEventListener('click',event=>{
  if(!active||uiOpen||suppressClick)return;
  const locked=document.pointerLockElement===canvas;
  selectCase(pickStackAt(locked?innerWidth/2:event.clientX,locked?innerHeight/2:event.clientY));
});
canvas.addEventListener('dblclick',()=>{if(active&&!uiOpen&&!mobile)requestLook();});
document.addEventListener('pointerlockchange',()=>{if(!mobile&&active&&!uiOpen&&document.pointerLockElement!==canvas)pause();});
document.addEventListener('mousemove',event=>{if(uiOpen||!active)return;if(document.pointerLockElement===canvas){yaw-=event.movementX*.0021;pitch=clamp(pitch-event.movementY*.0021,-1.28,1.28);}else if(dragLook){yaw-=(event.clientX-dragLastX)*.0045;pitch=clamp(pitch-(event.clientY-dragLastY)*.0045,-1.28,1.28);dragLastX=event.clientX;dragLastY=event.clientY;}});
canvas.addEventListener('pointerdown',event=>{suppressClick=false;pressX=event.clientX;pressY=event.clientY;if(!active||uiOpen||mobile||document.pointerLockElement===canvas)return;dragLook=true;dragPointer=event.pointerId;dragLastX=event.clientX;dragLastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
function endDrag(event){if(event.pointerId===dragPointer){dragLook=false;dragPointer=null;}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',event=>{
  if($('mapDialog').open)return;
  if(currentDetailItem){
    if(event.key==='Escape')closeDetail();
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();turnItem(event.key==='ArrowLeft'?-1:1);
    }
    return;
  }
  if(!catalogPanel.classList.contains('hidden')){
    if(event.key==='Escape'){event.preventDefault();closeCatalog();$('browseBtn').focus();}
    else if(event.code==='KeyE' && !(event.target instanceof HTMLInputElement)){
      event.preventDefault();openDetail(catalogSelection);
    }
    return;
  }
  if(event.code==='KeyM'){openMap();return;}
  if(!active||uiOpen)return;
  keys.add(event.code);
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='KeyB'){event.preventDefault();openCatalog();}
  if(event.code==='KeyL')requestLook();
  if(event.code==='KeyE'&&!event.repeat)inspect();
  if(event.key==='Escape')pause();
});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
const joyEl=$('joystick'),stickEl=$('stick');
function updateJoy(e){const r=joyEl.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=len>39?39/len:1;joystick.x=dx*scale/39;joystick.y=-dy*scale/39;stickEl.style.left=`calc(50% + ${dx*scale}px)`;stickEl.style.top=`calc(50% + ${dy*scale}px)`;}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joystick.pointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joystick.pointer)updateJoy(e);});
function releaseJoy(e){if(e.pointerId!==joystick.pointer)return;joystick.pointer=null;joystick.x=joystick.y=0;stickEl.style.left='50%';stickEl.style.top='50%';}joyEl.addEventListener('pointerup',releaseJoy);joyEl.addEventListener('pointercancel',releaseJoy);
const lookEl=$('lookPad');lookEl.addEventListener('pointerdown',e=>{e.preventDefault();lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;lookStart={x:e.clientX,y:e.clientY,moved:false};lookEl.setPointerCapture(e.pointerId);});lookEl.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||uiOpen)return;if(lookStart&&Math.hypot(e.clientX-lookStart.x,e.clientY-lookStart.y)>12)lookStart.moved=true;yaw-=(e.clientX-lookLastX)*.005;pitch=clamp(pitch-(e.clientY-lookLastY)*.005,-1.25,1.25);lookLastX=e.clientX;lookLastY=e.clientY;});lookEl.addEventListener('pointerup',e=>{if(e.pointerId!==lookPointer)return;if(lookStart&&!lookStart.moved&&active&&!uiOpen){const id=pickStackAt(e.clientX,e.clientY);selectCase(id);}lookPointer=null;lookStart=null;});lookEl.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
function tryMove(x,z){
  const h=groundAt(x,z,ground);
  if(h===null||Math.abs(h-ground)>.44)return;
  const onStair=inside(stair,x,z);
  if(onStair && z< -4.1 && z> -7.9 && Math.abs(x+10)<.24)return;
  const floor=h>rise/2?2:1;
  if(interior.obstacles.some(o=>o.level===floor && Math.abs(x-o.x)<o.w/2+.19 && Math.abs(z-o.z)<o.d/2+.19))return;
  if(interior.doors.some(door=>door.level===floor && door.blocks(x,z)))return;
  camera.position.x=x;camera.position.z=z;ground=h;
}
let bob=0;function updateMovement(dt){let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joystick.y;let s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;const len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3.5;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let i=0;i<steps;i++){tryMove(camera.position.x+dx/steps,camera.position.z);tryMove(camera.position.x,camera.position.z+dz/steps);}
  bob+=Math.hypot(dx,dz)*5;camera.position.y=ground+1.62+(len>.03?Math.sin(bob)*.022:0);refreshFloor();
}
function pickStackAt(clientX,clientY){
  raycaster.setFromCamera(new THREE.Vector2(clientX/innerWidth*2-1,-clientY/innerHeight*2+1),camera);
  const hit=raycaster.intersectObjects(interactables[level-1],false).find(h=>h.distance<8.0);
  if(!hit?.object.userData.item)return null;
  const p=camera.position,q=hit.point;
  for(const wall of interior.occluders){
    if(wall.level!==level)continue;
    const t=wall.w<wall.d?(wall.x-p.x)/(q.x-p.x):(wall.z-p.z)/(q.z-p.z);
    if(t>0&&t<1&&Math.abs(p.x+(q.x-p.x)*t-wall.x)<=wall.w/2&&Math.abs(p.z+(q.z-p.z)*t-wall.z)<=wall.d/2)return null;
  }
  return hit.object;

}
function updateFocus(){
  const aim=mobile||document.pointerLockElement===canvas;
  focusedCase=aim?pickStackAt(innerWidth/2,innerHeight/2):hasPointer?pickStackAt(hoverPoint.x,hoverPoint.y):null;
  outline(hoverFrame,focusedCase===selectedCase?null:focusedCase);
  canvas.style.cursor=focusedCase?'pointer':'';
  if(selectedCase && (selectedCase.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position)>5 || !interactables[level-1].includes(selectedCase)))selectCase(null);
  const current=selectedCase||focusedCase;
  prompt.classList.toggle('hidden',!current);
  prompt.querySelector('.keycap').textContent=mobile?'':selectedCase||aim?'E':'Click';
  if(current)$('promptText').textContent=(selectedCase||aim?'View item · ':'Select · ')+current.userData.item.title;
}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.15);
  if(active&&!uiOpen){
    for(const door of interior.doors)door.update(dt,level,camera.position.x,camera.position.z);
  }
  if(active&&!uiOpen&&intro.classList.contains('hidden')){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.55;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.3,-1.28,1.28);updateMovement(dt);camera.rotation.y=yaw;camera.rotation.x=pitch;camera.updateMatrixWorld();updateFocus();}
  if(!currentDetailItem){renderer.autoClear=false;renderer.clear();renderer.render(scene,camera);}
  preview.render();
}animate();
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,Math.sqrt(900000/(innerWidth*innerHeight))));
  renderer.setSize(innerWidth,innerHeight);
});

const mapDialog=$('mapDialog');
let mapLevel=1;
function drawMap(){
  const board=$('planBoard');board.replaceChildren();
  const add=(bounds,name,action,current=false)=>{
    const [x,z,X,Z]=bounds,button=document.createElement('button');
    button.type='button';button.textContent=name;button.onclick=action;
    button.style.left=(x+13)/28*100+'%';button.style.top=(z+9)/20*100+'%';
    button.style.width=(X-x)/28*100+'%';button.style.height=(Z-z)/20*100+'%';
    if(current)button.className='here';board.append(button);
  };
  const current=roomAt(level,camera.position.x,camera.position.z)?.id;
  for(const r of rooms.filter(r=>r.floor===mapLevel)){
    add(r.bounds,r.name,()=>{mapDialog.close();arrive(r.floor,...r.spawn);},r.id===current);
  }
  add(stair,'Stairs',()=>{mapDialog.close();arrive(mapLevel,mapLevel===1?-11:-9,-3.04,0);});
  $('levelOne').setAttribute('aria-pressed',String(mapLevel===1));$('levelTwo').setAttribute('aria-pressed',String(mapLevel===2));
}
function openMap(){
  if(uiOpen)return;uiOpen=true;keys.clear();document.exitPointerLock?.();mapLevel=level;drawMap();mapDialog.showModal();
}
$('mapBtn').onclick=openMap;$('closeMap').onclick=()=>mapDialog.close();
$('levelOne').onclick=()=>{mapLevel=1;drawMap();};$('levelTwo').onclick=()=>{mapLevel=2;drawMap();};
mapDialog.addEventListener('close',()=>{uiOpen=false;});
