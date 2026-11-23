import * as THREE from './vendor/three.module.js';
import { CATEGORIES, ITEMS, categoryById } from './catalog.js';
import { buildInterior } from './interior.js';
import { rooms, rise, stair, inside, roomAt, groundAt } from './plan.js';
import { stockRooms } from './racks.js';
import { createMediaCase, caseSpec, coverDataUrl } from './media.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const intro = $('intro');
const hud = $('hud');
const catalogPanel = $('catalogPanel');
const detailPanel = $('detailPanel');
const prompt = $('inspectPrompt');
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
let ground=0,level=1;
function refreshFloor(){
  level=ground>rise/2?2:1;
  const onStair=inside(stair,camera.position.x,camera.position.z);
  interior.floors.forEach((group,index)=>group.visible=onStair||index===level-1);
  $('floorNumber').textContent=String(level).padStart(2,'0');
  $('floorName').textContent=level===1?'MUSIC, GAMES + CLOTHING':'MEDIA COLLECTION';
  $('entryLocation').textContent='Level '+level+' · '+(onStair?'Staircase':roomAt(level,camera.position.x,camera.position.z)?.name||'Landing');
  $('zoneName').textContent=onStair?'STAIRCASE':(roomAt(level,camera.position.x,camera.position.z)?.name||'Landing').toUpperCase();
}
refreshFloor();
let active=false, uiOpen=false, yaw=-.31, pitch=0, focusedCase=null, selectedCase=null, toastTimer;
let dragLook=false, dragPointer=null, dragLastX=0, dragLastY=0;
const keys=new Set(); const raycaster=new THREE.Raycaster(); const hoverPoint=new THREE.Vector2();let hasPointer=false,suppressClick=false,pressX=0,pressY=0; const clock=new THREE.Clock();
const joystick={x:0,y:0,pointer:null}; let lookPointer=null,lookLastX=0,lookLastY=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function requestLook(){ if(!mobile && !uiOpen && document.pointerLockElement!==canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(()=>showToast('Drag on the scene to look around')); } }
function enter(){ active=true;uiOpen=false;intro.classList.add('hidden');hud.classList.remove('hidden'); }
function pause(){ if(!active||uiOpen)return; intro.classList.remove('hidden');hud.classList.add('hidden');$('enterBtn').firstChild.textContent='Continue '; document.exitPointerLock?.(); }
function showToast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2400);}
function openCatalog(){if(stackOpen)closeStack();uiOpen=true;catalogPanel.classList.remove('hidden');detailPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();renderCatalog();$('searchInput').focus();}
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
  if(album.strAlbumThumb){try{const url=new URL(album.strAlbumThumb);if(url.protocol==='https:'){$('audioArt').src=url.href;$('audioArt').classList.remove('hidden');$('detailArt').classList.add('has-cover');}}catch{}}
}
function openDetail(item){if(!item)return;if(stackOpen)closeStack();currentDetailId=item.id;currentDetailItem=item;uiOpen=true;detailPanel.classList.remove('hidden');catalogPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();
  $('detailArt').style.background=item.accent;$('detailArt').classList.add('has-cover');$('audioArt').classList.remove('hidden');$('audioArt').src=item.artwork||coverDataUrl(item);$('audioExtra').classList.add('hidden');
  $('detailFormat').textContent=item.format;$('detailArtTitle').textContent=item.title;
  $('detailCategory').textContent=categoryById[item.category].label.toUpperCase();$('detailTitle').textContent=item.title;
  $('detailCreator').textContent=item.creator;$('detailYear').textContent=item.year;$('detailFormatValue').textContent=item.format;$('detailSource').textContent=item.source;
  const sourceLink=$('sourceLink');if(item.sourceUrl){sourceLink.href=item.sourceUrl;sourceLink.textContent=item.source.includes('IMDb')?'Open on IMDb':'Open on Spotify';sourceLink.classList.remove('hidden');}else sourceLink.classList.add('hidden');
  $('detailNote').textContent=item.album?`From your Spotify playlist · ${item.featuredTrack} appears on ${item.album}. Format uses the album release year.`:item.source.includes('IMDb')?`From your IMDb watchlist CSV${item.rating?' · IMDb '+item.rating+'/10':''}.`:'From your game collection.';
  if(item.album)enrichAudio(item);
}
function closeDetail(){detailPanel.classList.add('hidden');uiOpen=false;if(active){hud.classList.remove('hidden');}else intro.classList.remove('hidden');}
function arrive(floor,x,z,direction,lookPitch=0){
  selectCase(null);hasPointer=false;
  ground=(floor-1)*rise;camera.position.set(x,ground+1.62,z);yaw=direction;pitch=lookPitch;
  camera.rotation.y=yaw;camera.rotation.x=pitch;keys.clear();
  enter();refreshFloor();camera.updateMatrixWorld();
}
function visitShelf(){
  if(!currentDetailItem)return;
  const dest=destinations.get(currentDetailItem.id);
  closeDetail();arrive(dest.level,dest.x,dest.z,dest.yaw,dest.pitch);
}
$('visitShelf').onclick=visitShelf;
let filter='all',catalogSelection=null;
function renderFilters(){const node=$('filters');node.replaceChildren();for(const c of [{id:'all',label:'ALL'},...CATEGORIES.map(c=>({id:c.id,label:c.short}))]){const b=document.createElement('button');b.type='button';b.className='filter'+(filter===c.id?' active':'');b.textContent=c.label;b.onclick=()=>{filter=c.id;renderFilters();renderCatalog();};node.append(b);}}
function renderCatalog(){catalogSelection=null;$('catalogSelection').classList.add('hidden');const q=$('searchInput').value.trim().toLowerCase();const items=ITEMS.filter(item=>(filter==='all'||item.category===filter)&&(!q||`${item.title} ${item.creator} ${item.year} ${item.category}`.toLowerCase().includes(q)));const grid=$('catalogGrid');grid.replaceChildren();if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Nothing on this shelf. Try another search.';grid.append(empty);return;}
  for(const item of items){const b=document.createElement('button');b.type='button';b.className='catalog-card';b.style.setProperty('--accent',item.accent);const art=document.createElement('div');art.className='catalog-art';art.style.backgroundImage=`linear-gradient(180deg,transparent,rgba(0,0,0,.65)),url("${item.artwork||coverDataUrl(item)}")`;const fmt=document.createElement('small');fmt.textContent=item.format;const title=document.createElement('strong');title.textContent=item.title;art.append(fmt,title);const copy=document.createElement('div');copy.className='catalog-copy';const name=document.createElement('strong');name.textContent=item.title;const meta=document.createElement('span');meta.textContent=`${item.creator} · ${item.year}`;copy.append(name,meta);b.append(art,copy);b.onclick=()=>{
    grid.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed','false');
    b.setAttribute('aria-pressed','true');catalogSelection=item;
    $('catalogSelection').classList.remove('hidden');$('chosenTitle').textContent=item.title;
  };grid.append(b);}}
const frameGeometry=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-.5,-.5,0),new THREE.Vector3(.5,-.5,0),
  new THREE.Vector3(.5,.5,0),new THREE.Vector3(-.5,.5,0)
]);
function makeFrame(color){
  const frame=new THREE.LineLoop(frameGeometry,new THREE.LineBasicMaterial({color,toneMapped:false}));
  frame.visible=false;return frame;
}
const hoverFrame=makeFrame('#fff2cb'),selectionFrame=makeFrame('#ffad56');
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
  openStack(target.userData.stackId,target.userData.index);
}
function openCatalogStack(){
  if(!catalogSelection)return;
  const item=catalogSelection,dest=destinations.get(item.id);if(!dest)return;
  closeCatalog();arrive(dest.level,dest.x,dest.z,dest.yaw,dest.pitch);
  const shell=interactables[dest.level-1].find(obj=>obj.userData.item?.id===item.id);
  if(shell){selectCase(shell);inspect();}
}
$('catalogOpenStack').onclick=openCatalogStack;
$('catalogDetails').onclick=()=>openDetail(catalogSelection);
$('itemCount').textContent=ITEMS.length;$('enterBtn').onclick=enter;$('browseBtn').onclick=openCatalog;$('closeCatalog').onclick=closeCatalog;$('closeDetail').onclick=closeDetail;$('backToStore').onclick=closeDetail;$('searchInput').oninput=renderCatalog;$('touchInspect').onclick=inspect;
renderFilters();renderCatalog();
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
document.addEventListener('keydown',event=>{if($('mapDialog').open)return;if(event.code==='KeyM'&&!(event.target instanceof HTMLInputElement)&&!uiOpen){openMap();return;}if(event.target instanceof HTMLInputElement)return;if(!catalogPanel.classList.contains('hidden')&&event.code==='KeyE'){event.preventDefault();openCatalogStack();return;}keys.add(event.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();if(event.code==='KeyB'&&active&&!uiOpen){event.preventDefault();openCatalog();}if(event.code==='KeyL'&&active&&!uiOpen)requestLook();if(event.code==='KeyE'&&active&&!uiOpen)inspect();if(stackOpen&&['ArrowLeft','KeyA'].includes(event.code)){event.preventDefault();turnStack(-1);}if(stackOpen&&['ArrowRight','KeyD'].includes(event.code)){event.preventDefault();turnStack(1);}if(stackOpen&&event.code==='Enter'){event.preventDefault();openDetail(stacks.get(stackOpen).items[stackIndex]);}if(event.code==='Escape'){if(!detailPanel.classList.contains('hidden'))closeDetail();else if(!catalogPanel.classList.contains('hidden'))closeCatalog();else if(stackOpen)closeStack();else pause();}});
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
  prompt.querySelector('.keycap').textContent=selectedCase?'E':aim?'E':'CLICK';
  if(current)$('promptText').textContent=(selectedCase||aim?'Open stack · ':'Select · ')+current.userData.item.title;
}
const viewerScene=new THREE.Scene();
const viewerCamera=new THREE.OrthographicCamera(-3,3,3,-3,.1,40);viewerCamera.position.set(0,0,5);viewerCamera.lookAt(0,0,0);
viewerScene.add(new THREE.HemisphereLight('#fff5e6','#526278',2.5));
const viewerLight=new THREE.PointLight('#ffffff',4,12);viewerLight.position.set(-2,3,4);viewerScene.add(viewerLight);
const viewerBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:'#0b1110',transparent:true,opacity:.89,depthWrite:false}));viewerBackdrop.position.z=-4;viewerScene.add(viewerBackdrop);
const viewerGroup=new THREE.Group();viewerScene.add(viewerGroup);
let stackOpen=null,stackIndex=0,viewerCases=[],viewerTilt=0,viewerYaw=0,magnified=false;
function updateViewerInfo(){
  const stack=stacks.get(stackOpen);if(!stack)return;
  const item=stack.items[stackIndex],spec=caseSpec(item);
  $('caseSize').textContent=spec.label+' · '+spec.dimensions.join(' × ')+' mm';
  $('caseZoom').setAttribute('aria-pressed',String(magnified));$('caseZoom').textContent=magnified?'Actual proportions':'Magnify';
  $('stackNext').disabled=$('stackPrev').disabled=stack.items.length===1;
  $('stackCategory').textContent=stack.category.short+' / '+(item.source);
  $('stackTitle').textContent=item.title;$('stackMeta').textContent=`${item.creator} · ${item.year} · ${item.format}`;
  $('stackCount').textContent=`${stackIndex+1} / ${stack.items.length}`;
  $('stackDetails').textContent='View item details ↗';
}
function openStack(id,index=0){
  const stack=stacks.get(id);if(!stack)return;
  uiOpen=true;stackOpen=id;stackIndex=index;magnified=false;viewerTilt=0;viewerYaw=0;intro.classList.add('hidden');hud.classList.add('hidden');document.exitPointerLock?.();
  viewerGroup.clear();viewerCases=stack.items.map((item)=>{const result=createMediaCase(item);const g=result.group;g.scale.setScalar(innerWidth<700?6.1:8);viewerGroup.add(g);return g;});
  $('stackOverlay').classList.remove('hidden');document.body.classList.add('stack-active');updateViewerInfo();
}
function closeStack(){stackOpen=null;viewerGroup.clear();viewerCases=[];$('stackOverlay').classList.add('hidden');document.body.classList.remove('stack-active');uiOpen=false;if(active)hud.classList.remove('hidden');else intro.classList.remove('hidden');}
function turnStack(direction){if(!stackOpen)return;const count=viewerCases.length;stackIndex=(stackIndex+direction+count)%count;updateViewerInfo();}
function animateViewer(dt){
  if(!stackOpen)return;
  viewerGroup.rotation.x+=(viewerTilt-viewerGroup.rotation.x)*Math.min(1,dt*7);viewerGroup.rotation.y+=(viewerYaw-viewerGroup.rotation.y)*Math.min(1,dt*7);
  for(let i=0;i<viewerCases.length;i++){
    const g=viewerCases[i],delta=(i-stackIndex+viewerCases.length)%viewerCases.length;
    const visible=delta===0?0:delta===1?1:delta===viewerCases.length-1?-1:2;
    const selectedSpec=caseSpec(stacks.get(stackOpen).items[stackIndex]);
    const common=innerWidth<700?6.1:8;
    const scale=magnified?Math.max(common,Math.min((innerWidth<700?2.1:2.7)/selectedSpec.w,2.7/selectedSpec.h)):common;
    g.scale.setScalar(scale);
    const spread=selectedSpec.w*scale*.84;const tx=visible===0?0:visible===2?0:visible*spread,ty=visible===0?.18:-.07,tz=visible===0?.8:visible===2?-1.7:-.65;
    g.position.x+=(tx-g.position.x)*Math.min(1,dt*9);g.position.y+=(ty-g.position.y)*Math.min(1,dt*9);g.position.z+=(tz-g.position.z)*Math.min(1,dt*9);
    const ry=visible===0?-.09:visible===2?.85:visible*.48;g.rotation.y+=(ry-g.rotation.y)*Math.min(1,dt*9);
  }
}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.15);
  if(active&&!uiOpen&&intro.classList.contains('hidden')){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.55;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.3,-1.28,1.28);updateMovement(dt);camera.rotation.y=yaw;camera.rotation.x=pitch;camera.updateMatrixWorld();updateFocus();}
  renderer.autoClear=false;renderer.clear();renderer.render(scene,camera);
  if(stackOpen){animateViewer(dt);renderer.clearDepth();renderer.render(viewerScene,viewerCamera);}
}animate();
viewerCamera.left=-3*innerWidth/innerHeight;viewerCamera.right=3*innerWidth/innerHeight;viewerCamera.updateProjectionMatrix();
const stackOverlay=$('stackOverlay');
$('caseZoom').onclick=()=>{magnified=!magnified;updateViewerInfo();};
$('closeStack').onclick=closeStack;$('stackPrev').onclick=()=>turnStack(-1);$('stackNext').onclick=()=>turnStack(1);
$('stackDetails').onclick=()=>openDetail(stacks.get(stackOpen).items[stackIndex]);
stackOverlay.addEventListener('wheel',event=>{if(!stackOpen)return;event.preventDefault();if(Math.abs(event.deltaY)>4)turnStack(event.deltaY>0?1:-1);},{passive:false});
let swipeStart=null,lookStart=null;
stackOverlay.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;swipeStart={x:event.clientX,y:event.clientY};});
stackOverlay.addEventListener('pointermove',event=>{if(!swipeStart)return;viewerYaw=clamp((event.clientX-swipeStart.x)*.003,-.35,.35);});
stackOverlay.addEventListener('pointerup',event=>{if(!swipeStart)return;viewerYaw=0;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;if(Math.abs(dx)>35)turnStack(dx<0?1:-1);else if(Math.abs(dy)>25)viewerTilt=clamp(viewerTilt-dy*.003,-.25,.25);swipeStart=null;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,Math.sqrt(900000/(innerWidth*innerHeight))));renderer.setSize(innerWidth,innerHeight);viewerCamera.left=-3*innerWidth/innerHeight;viewerCamera.right=3*innerWidth/innerHeight;viewerCamera.updateProjectionMatrix();});

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
$('mapBtn').onclick=$('introMap').onclick=openMap;$('closeMap').onclick=()=>mapDialog.close();
$('levelOne').onclick=()=>{mapLevel=1;drawMap();};$('levelTwo').onclick=()=>{mapLevel=2;drawMap();};
mapDialog.addEventListener('close',()=>{uiOpen=false;});
