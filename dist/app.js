import * as THREE from './vendor/three.module.js';
import { CATEGORIES, ITEMS, itemById, categoryById } from './catalog.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const intro = $('intro');
const hud = $('hud');
const catalogPanel = $('catalogPanel');
const detailPanel = $('detailPanel');
const prompt = $('inspectPrompt');
const mobile = matchMedia('(pointer: coarse)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c6cdca');
scene.fog = new THREE.FogExp2('#c6cdca', 0.006);
const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, 0.08, 80);
camera.position.set(0, 1.62, 11.3);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const mat = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const concrete = mat('#858d8d');
const wallPaint = mat('#d6dbd6');
const ceilingPaint = mat('#d9ded9');
const darkMetal = mat('#c0c9ca', 0.55, 0.28);
const wood = mat('#858f91', 0.8);
const brass = mat('#65869d', 0.5, 0.35);
const trim = mat('#879699', 0.5, 0.25);
const glow = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });
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

scene.add(new THREE.HemisphereLight('#ffffff', '#a8b2af', 2.15));
const lightPositions = [[-6,-7],[0,-7],[6,-7],[-6,1],[0,1],[6,1],[0,9]];
for (const [x,z] of lightPositions) {
  const light = new THREE.PointLight('#ffffff', 2.5, 11, 2); light.position.set(x, 3.8, z); scene.add(light);
  box(scene, x, 4.14, z, 2.3, .11, .33, trim);
  box(scene, x, 4.04, z, 2.12, .035, .21, glow('#ecf5f2', 1.3));
}
box(scene, 0, -.16, 0, 20, .3, 28, concrete);
box(scene, 0, 4.48, 0, 20, .28, 28, ceilingPaint);
box(scene, -10.02, 2.2, 0, .18, 4.5, 28, wallPaint);
box(scene, 10.02, 2.2, 0, .18, 4.5, 28, wallPaint);
box(scene, 0, 2.2, -14.02, 20, 4.5, .18, wallPaint);
box(scene, 0, 2.2, 14.02, 20, 4.5, .18, wallPaint);
for (let x = -10; x <= 10; x += 1) box(scene, x, .004, 0, .014, .004, 28, mat('#999f9e'));
for (let z = -14; z <= 14; z += 1) box(scene, 0, .005, z, 20, .004, .014, mat('#999f9e'));
for (let z = -12; z <= 12; z += 4) {
  box(scene, -9.85, 1.24, z, .1, 2.48, .1, darkMetal);
  box(scene, 9.85, 1.24, z, .1, 2.48, .1, darkMetal);
}
for (let x = -8; x <= 8; x += 4) box(scene, x, 4.25, 0, .08, .08, 28, darkMetal);
for (let z = -12; z <= 12; z += 6) box(scene, 0, 4.23, z, 20, .08, .08, darkMetal);
for (let x = -9; x <= 9; x += 2) box(scene, x, 4.31, 0, .014, .008, 28, mat('#b8bfbc'));
for (let z = -13; z <= 13; z += 2) box(scene, 0, 4.31, z, 20, .008, .014, mat('#b8bfbc'));
label(scene, 'MUST SEE MOVIES', -5.1, 3.37, -13.89, 7.5, .74, {bg:'#3a8b9a', color:'#ffffff', size:100});
label(scene, 'NEW RELEASES', 5.25, 3.37, -13.88, 7.5, .74, {bg:'#65a34b', color:'#ffffff', size:100});

// Stairwell, counter and analog details make the room read as a lived-in store.
box(scene, 0, 2.7, 13.82, 3.5, 2.7, .12, mat('#111813'));
label(scene, 'EXIT / STREET LEVEL', 0, 3.63, 13.7, 3.5, .33, {bg:'#1c2c20', color:'#dcac78', size:55});
const counter = new THREE.Group(); counter.position.set(6.5,0,10.2); scene.add(counter);
box(counter,0,.58,0,3.2,1.16,1.3,wood); box(counter,0,1.19,0,3.4,.15,1.48,trim);
box(counter,0,.6,.67,2.85,.57,.025,brass); label(counter,'CHECKOUT',0,.69,.69,2.2,.24,{bg:'#4c382b',color:'#e6b782',size:58});
box(counter,.76,1.42,-.1,.67,.35,.42,trim); box(counter,.76,1.44,.12,.49,.22,.015,glow('#a2b990',.45));
const speaker = new THREE.Group(); speaker.position.set(-8.9,0,11.2); scene.add(speaker);
box(speaker,0,.85,0,.68,1.7,.57,trim);
for (const y of [.56,1.21]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.21,.026,8,30),brass); ring.position.set(0,y,.298); speaker.add(ring); const disk = new THREE.Mesh(new THREE.CircleGeometry(.16,30),mat('#0a0d0b')); disk.position.set(0,y,.301); speaker.add(disk); }
for (const x of [-8.95,8.95]) for (const z of [-8,0,8]) { box(scene,x,3.25,z,.08,.08,2.2,brass); }

const coverCache = new Map();
function coverTexture(item) {
  if (coverCache.has(item.id)) return coverCache.get(item.id);
  const c = document.createElement('canvas'); c.width = 192; c.height = 256;
  const g = c.getContext('2d'); g.scale(.5,.5); const base = item.accent;
  g.fillStyle = base; g.fillRect(0,0,384,512);
  g.fillStyle = 'rgba(13,22,18,.16)'; g.beginPath(); g.arc(320,335,200,0,Math.PI*2); g.fill();
  g.strokeStyle='rgba(13,22,18,.23)'; g.lineWidth=24; g.beginPath(); g.arc(320,335,128,0,Math.PI*2); g.stroke();
  g.fillStyle='#17231c'; g.font='bold 25px Arial'; g.fillText(item.format,27,45);
  g.fillRect(26,64,80,5);
  g.font='bold 47px Arial'; let words=item.title.split(' '), lines=[], line='';
  for (const word of words) { const next = line ? line + ' ' + word : word; if (g.measureText(next).width > 330 && line) { lines.push(line); line=word; } else line=next; }
  if (line) lines.push(line); if (lines.length > 4) { lines=lines.slice(0,4); lines[3]+='…'; }
  let yy=204; for (const l of lines) { g.fillText(l,26,yy); yy+=52; }
  g.font='bold 19px Arial'; g.fillText(item.creator.toUpperCase().slice(0,29),27,463);
  g.fillText(item.year,27,488);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy=2; coverCache.set(item.id,t); return t;
}
const interactables=[]; const obstacles=[];
const islands = new Map();
const coverMaterials = new Map();
const fillerMaterials = new Map();
function itemMaterial(item){
  if(!coverMaterials.has(item.id)) coverMaterials.set(item.id,new THREE.MeshBasicMaterial({map:coverTexture(item),side:THREE.DoubleSide}));
  return coverMaterials.get(item.id);
}
function fillerMaterial(category,index){
  const key=category.id+':'+index%8;
  if(!fillerMaterials.has(key)){
    const c=document.createElement('canvas');c.width=192;c.height=256;const g=c.getContext('2d');
    const palette=['#4c6c76','#9d6a67','#677b63','#b88c60','#657d91','#8c7890','#9f9c76','#6f6c64'];
    g.fillStyle=palette[index%8];g.fillRect(0,0,192,256);g.fillStyle='rgba(255,255,255,.22)';
    g.fillRect(13,18,166,3);g.fillRect(13,225,166,3);g.beginPath();g.arc(150,145,80,0,Math.PI*2);g.fill();
    g.fillStyle='#f3f1e5';g.font='bold 17px Arial';g.fillText(category.short,15,51);
    g.fillStyle='rgba(240,245,232,.58)';g.fillRect(17,81,74+(index%4)*17,10);g.fillRect(17,101,105-(index%3)*12,7);g.fillRect(17,184,55+(index%5)*14,5);g.fillStyle='#f3f1e5';g.font='bold 15px Arial';g.fillText('ARCHIVE EDITION',15,214);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    fillerMaterials.set(key,new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
  }
  return fillerMaterials.get(key);
}
function islandAt(x){
  if(islands.has(x))return islands.get(x);
  const rack=new THREE.Group();rack.position.set(x,0,-2);scene.add(rack);
  box(rack,0,1.42,0,.36,2.82,13.3,mat('#a9b4b6'));
  for(const y of [.22,.87,1.52,2.17,2.82]){
    box(rack,0,y,0,1.18,.06,13.5,darkMetal);
    for(const side of [-1,1])box(rack,side*.57,y+.04,0,.025,.05,13.5,brass);
  }
  for(const z of [-6.77,6.77])box(rack,0,1.47,z,1.18,2.94,.09,mat('#9baaad'));
  box(rack,0,2.95,0,1.2,.15,13.7,trim);
  obstacles.push({minX:x-.65,maxX:x+.65,minZ:-8.88,maxZ:4.88});
  islands.set(x,rack);return rack;
}
function createFace(category,itemsOverride=null){
  const rack=islandAt(category.rack.x),side=category.rack.side;
  const entries=itemsOverride||ITEMS.filter(item=>item.category===category.id);
  const displayCount=Math.min(entries.length,80), positions=new Map();
  for(let i=0;i<displayCount;i++)positions.set(Math.floor((i+.5)*80/displayCount),entries[i]);
  for(let row=0;row<4;row++)for(let slot=0;slot<20;slot++){
    const index=row*20+slot,item=positions.get(index),width=item?.category==='vinyl' ? .57 : item?.category==='cassettes' ? .55 : .52;
    const height=item?.category==='cassettes' ? .39 : item?.category==='cds' ? .52 : .57;
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),item?itemMaterial(item):fillerMaterial(category,index+row*2));
    plane.position.set(side*.611,[.22,.87,1.52,2.17][row]+height/2+.025,-6.22+slot*.655);
    plane.rotation.y=side*Math.PI/2;
    rack.add(plane);
    if(item){plane.userData.itemId=item.id;interactables.push(plane);}
  }
  const sign=label(rack,category.short,0,0,0,3.7,.39,{bg:'#eff2ed',color:'#33494a',border:category.accent,size:70});
  sign.rotation.y=side*Math.PI/2;sign.position.set(side*.65,3.17,0);
  const end=label(rack,category.short,side*.29,2.57,6.83,.54,.25,{bg:category.accent,color:'#ffffff',size:75});
  end.rotation.y=0;
}
CATEGORIES.forEach(category=>createFace(category));
createFace({id:'featured',short:'STAFF PICKS',accent:'#eb8b56',rack:{x:7.35,side:1}},ITEMS.filter(item=>item.category==='movies').slice(0,80));
// Densely stocked wall shelves frame the long center aisles.
for(let row=0;row<3;row++){
  box(scene,0,.64+row*.66,-13.73,19,.055,.5,darkMetal);
  for(let slot=0;slot<34;slot++){
    const category=CATEGORIES[(slot+row)%CATEGORIES.length];
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(.42,.53),fillerMaterial(category,slot+row));
    plane.position.set(-9.3+slot*.56,.94+row*.66,-13.43);scene.add(plane);
  }
}
for(const x of [-7.5,-2.5,2.5,7.5])for(const z of [-10,-4,2,8]){
  box(scene,x,4.12,z,2.55,.07,.85,mat('#abb7b9'));
  box(scene,x,4.07,z,2.34,.025,.66,new THREE.MeshBasicMaterial({color:'#f9ffff'}));
}

// A few wall posters and a display plinth enrich the walks between shelves.
label(scene,'SIDE A / SIDE B',-6,2.5,13.87,2.65,.5,{bg:'#4b3840',color:'#f2c0ad',size:80});
label(scene,'PLAY IT AGAIN',6,2.5,13.87,2.65,.5,{bg:'#284039',color:'#d1e2b3',size:80});
for(const x of [-9.7,9.7]) for(const z of [-10,-3,4]) {
  const poster=label(scene, z===-10?'TAKE YOUR TIME':z===-3?'FIND A FAVORITE':'STAY A WHILE',0,0,0,2.8,.58,{bg:'#3b3b30',color:'#dfb683',border:'#847056',size:62});
  poster.rotation.y=x<0?Math.PI/2:-Math.PI/2; poster.position.set(x,2.2,z);
}

let active=false, uiOpen=false, yaw=0, pitch=0, focusedItem=null, toastTimer;
let dragLook=false, dragPointer=null, dragLastX=0, dragLastY=0;
const keys=new Set(); const raycaster=new THREE.Raycaster(); const center=new THREE.Vector2(0,0); const clock=new THREE.Clock();
const joystick={x:0,y:0,pointer:null}; let lookPointer=null,lookLastX=0,lookLastY=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function requestLook(){ if(!mobile && !uiOpen && document.pointerLockElement!==canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(()=>showToast('Drag on the scene to look around')); } }
function enter(){ active=true;uiOpen=false;intro.classList.add('hidden');hud.classList.remove('hidden'); }
function pause(){ if(!active||uiOpen)return; intro.classList.remove('hidden');hud.classList.add('hidden');$('enterBtn').firstChild.textContent='Return to the basement '; document.exitPointerLock?.(); }
function showToast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2400);}
function openCatalog(){uiOpen=true;catalogPanel.classList.remove('hidden');detailPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();renderCatalog();$('searchInput').focus();}
function closeCatalog(){catalogPanel.classList.add('hidden');uiOpen=false;if(active){hud.classList.remove('hidden');}else intro.classList.remove('hidden');}
const audioCache=new Map();let currentDetailId=null;
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
function openDetail(item){if(!item)return;currentDetailId=item.id;uiOpen=true;detailPanel.classList.remove('hidden');catalogPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();
  $('detailArt').style.background=item.accent;$('detailArt').classList.remove('has-cover');$('audioArt').classList.add('hidden');$('audioArt').removeAttribute('src');$('audioExtra').classList.add('hidden');
  $('detailFormat').textContent=item.format;$('detailArtTitle').textContent=item.title;
  $('detailCategory').textContent=categoryById[item.category].label.toUpperCase();$('detailTitle').textContent=item.title;
  $('detailCreator').textContent=item.creator;$('detailYear').textContent=item.year;$('detailFormatValue').textContent=item.format;$('detailSource').textContent=item.source;
  const sourceLink=$('sourceLink');if(item.sourceUrl){sourceLink.href=item.sourceUrl;sourceLink.textContent=item.source.includes('IMDb')?'Open on IMDb':'Open on Spotify';sourceLink.classList.remove('hidden');}else sourceLink.classList.add('hidden');
  $('detailNote').textContent=item.album?`From your Spotify playlist · ${item.featuredTrack} appears on ${item.album}. Format uses the album release year.`:item.source==='IMDb watchlist'?`From your IMDb watchlist CSV${item.rating?' · IMDb '+item.rating+'/10':''}.`:'Sample game entry until you provide a game list.';
  if(item.album)enrichAudio(item);
}
function closeDetail(){detailPanel.classList.add('hidden');uiOpen=false;if(active){hud.classList.remove('hidden');}else intro.classList.remove('hidden');}
let filter='all';
function renderFilters(){const node=$('filters');node.replaceChildren();for(const c of [{id:'all',label:'ALL'},...CATEGORIES.map(c=>({id:c.id,label:c.short}))]){const b=document.createElement('button');b.type='button';b.className='filter'+(filter===c.id?' active':'');b.textContent=c.label;b.onclick=()=>{filter=c.id;renderFilters();renderCatalog();};node.append(b);}}
function renderCatalog(){const q=$('searchInput').value.trim().toLowerCase();const items=ITEMS.filter(item=>(filter==='all'||item.category===filter)&&(!q||`${item.title} ${item.creator} ${item.year} ${item.category}`.toLowerCase().includes(q)));const grid=$('catalogGrid');grid.replaceChildren();if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Nothing on this shelf. Try another search.';grid.append(empty);return;}
  for(const item of items){const b=document.createElement('button');b.type='button';b.className='catalog-card';b.style.setProperty('--accent',item.accent);const art=document.createElement('div');art.className='catalog-art';const fmt=document.createElement('small');fmt.textContent=item.format;const title=document.createElement('strong');title.textContent=item.title;art.append(fmt,title);const copy=document.createElement('div');copy.className='catalog-copy';const name=document.createElement('strong');name.textContent=item.title;const meta=document.createElement('span');meta.textContent=`${item.creator} · ${item.year}`;copy.append(name,meta);b.append(art,copy);b.onclick=()=>openDetail(item);grid.append(b);}}
function inspect(){if(focusedItem)openDetail(focusedItem);else showToast('Move closer and aim at an item');}
$('itemCount').textContent=ITEMS.length;$('enterBtn').onclick=enter;$('browseBtn').onclick=openCatalog;$('closeCatalog').onclick=closeCatalog;$('closeDetail').onclick=closeDetail;$('backToStore').onclick=closeDetail;$('searchInput').oninput=renderCatalog;$('touchInspect').onclick=inspect;
renderFilters();renderCatalog();
canvas.addEventListener('click',()=>{if(!active||uiOpen)return;if(focusedItem)inspect();});
canvas.addEventListener('dblclick',()=>{if(active&&!uiOpen&&!mobile)requestLook();});
document.addEventListener('pointerlockchange',()=>{if(!mobile&&active&&!uiOpen&&document.pointerLockElement!==canvas)pause();});
document.addEventListener('mousemove',event=>{if(uiOpen||!active)return;if(document.pointerLockElement===canvas){yaw-=event.movementX*.0021;pitch=clamp(pitch-event.movementY*.0021,-1.28,1.28);}else if(dragLook){yaw-=(event.clientX-dragLastX)*.0045;pitch=clamp(pitch-(event.clientY-dragLastY)*.0045,-1.28,1.28);dragLastX=event.clientX;dragLastY=event.clientY;}});
canvas.addEventListener('pointerdown',event=>{if(!active||uiOpen||mobile||document.pointerLockElement===canvas)return;dragLook=true;dragPointer=event.pointerId;dragLastX=event.clientX;dragLastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
function endDrag(event){if(event.pointerId===dragPointer){dragLook=false;dragPointer=null;}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement)return;keys.add(event.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();if(event.code==='KeyB'&&active&&!uiOpen){event.preventDefault();openCatalog();}if(event.code==='KeyL'&&active&&!uiOpen)requestLook();if(event.code==='KeyE'&&active&&!uiOpen)inspect();if(event.code==='Escape'){if(!detailPanel.classList.contains('hidden'))closeDetail();else if(!catalogPanel.classList.contains('hidden'))closeCatalog();else pause();}});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
const joyEl=$('joystick'),stickEl=$('stick');
function updateJoy(e){const r=joyEl.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=len>39?39/len:1;joystick.x=dx*scale/39;joystick.y=-dy*scale/39;stickEl.style.left=`calc(50% + ${dx*scale}px)`;stickEl.style.top=`calc(50% + ${dy*scale}px)`;}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joystick.pointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joystick.pointer)updateJoy(e);});
function releaseJoy(e){if(e.pointerId!==joystick.pointer)return;joystick.pointer=null;joystick.x=joystick.y=0;stickEl.style.left='50%';stickEl.style.top='50%';}joyEl.addEventListener('pointerup',releaseJoy);joyEl.addEventListener('pointercancel',releaseJoy);
const lookEl=$('lookPad');lookEl.addEventListener('pointerdown',e=>{e.preventDefault();lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;lookEl.setPointerCapture(e.pointerId);});lookEl.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||uiOpen)return;yaw-=(e.clientX-lookLastX)*.005;pitch=clamp(pitch-(e.clientY-lookLastY)*.005,-1.25,1.25);lookLastX=e.clientX;lookLastY=e.clientY;});lookEl.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer)lookPointer=null;});lookEl.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
function canStand(x,z){const radius=.33;if(x<-9.45||x>9.45||z<-13.4||z>13.4)return false;for(const o of obstacles)if(x+radius>o.minX&&x-radius<o.maxX&&z+radius>o.minZ&&z-radius<o.maxZ)return false;if(x>4.45&&x<8.55&&z>8.8&&z<11.55)return false;return true;}
let bob=0;function updateMovement(dt){let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joystick.y;let s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;const len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3.5;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt;const nx=camera.position.x+dx,nz=camera.position.z+dz;if(canStand(nx,camera.position.z))camera.position.x=nx;if(canStand(camera.position.x,nz))camera.position.z=nz;bob+=Math.hypot(dx,dz)*5;camera.position.y=1.62+(len>.03?Math.sin(bob)*.025:0);}
function updateFocus(){raycaster.setFromCamera(center,camera);const hit=raycaster.intersectObjects(interactables,false).find(h=>h.distance<3.5);focusedItem=hit?itemById[hit.object.userData.itemId]:null;if(focusedItem){prompt.classList.remove('hidden');$('promptText').textContent=`Inspect ${focusedItem.title}`;}else prompt.classList.add('hidden');const nearest=CATEGORIES.map(c=>({c,d:Math.hypot(camera.position.x-(c.rack.x+c.rack.side*1.3),camera.position.z-c.rack.z)})).sort((a,b)=>a.d-b.d)[0];$('zoneName').textContent=nearest.d<4?nearest.c.short:'THE AISLES';}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(active&&!uiOpen&&intro.classList.contains('hidden')){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.55;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.3,-1.28,1.28);updateMovement(dt);camera.rotation.y=yaw;camera.rotation.x=pitch;updateFocus();}renderer.render(scene,camera);}animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1.35:1.8));renderer.setSize(innerWidth,innerHeight);});
