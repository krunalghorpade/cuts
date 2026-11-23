import * as THREE from './vendor/three.module.js';
import { CATEGORIES, ITEMS, categoryById } from './catalog.js';
import { createMediaCase, caseSpec, coverTexture, coverDataUrl } from './media.js';

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
renderer.setPixelRatio(Math.min(devicePixelRatio, Math.sqrt(900000/(innerWidth*innerHeight))));
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
  if(x===0){const light = new THREE.PointLight('#ffffff', 2.5, 12, 2); light.position.set(x, 3.8, z); scene.add(light);}
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

const interactables=[]; const obstacles=[]; const stacks=new Map();
const islands=new Map();
const rackArtMaterials=new Map();
function rackArt(item){if(!rackArtMaterials.has(item.id))rackArtMaterials.set(item.id,new THREE.MeshBasicMaterial({map:coverTexture(item),side:THREE.DoubleSide}));return rackArtMaterials.get(item.id);}
const fixture={movies:mat('#182e4b'),shows:mat('#512f3b'),'game-discs':mat('#1b2634'),cartridges:mat('#8c6841'),vinyl:mat('#735441'),cds:mat('#171b1b'),cassettes:mat('#a2744c'),featured:mat('#19354c')};
const lip={movies:mat('#ac3637'),shows:mat('#bd6542'),'game-discs':mat('#aa3836'),cartridges:mat('#c79b62'),vinyl:mat('#a9c9b5'),cds:mat('#262e2e'),cassettes:mat('#d0a46d'),featured:mat('#be533b')};
const samples={
  vinyl:['Midnight Sun|The Harbor Lights|1978','Golden Hour|The Sonics|1969','Blue Smoke|Nina Vale|1959','The Long Way Home|The Roadhouse Band|1981','Electric June|Tidal Waves|1976','After Hours|The Midnight Trio|1964','Sunday Soul|Mara James|1971','City Lights|The Glass Notes|1983'],
  cassettes:['Street Radio|The Avenue|1987','Summer Mix|The Skylines|1991','Night Drive|Neon Coast|1993','Blue Horizon|The Wanderers|1986','Side A / Side B|Echo Fields|1990','Sunset Cassette|The Satellites|1994'],
  cartridges:['Galaxy Quest|Pixel Arcade|1991','Turbo Circuit|Pixel Arcade|1994','The Lost Castle|Pixel Arcade|1988','Star Pilot|Pixel Arcade|1992','River Runner|Pixel Arcade|1989'],
  'game-discs':['Afterglow City|Studio North|2022','Iron Circuit|Studio North|2020','Nocturne Rally|Studio North|2018','Beyond the Gate|Studio North|2016']
};
function displayItems(category){
  const actual=ITEMS.filter(item=>item.category===category.id);
  const dummy=(samples[category.id]||[]).map((entry,index)=>{const [title,creator,year]=entry.split('|');return {id:`display-${category.id}-${index}`,category:category.id,title,creator,year:Number(year),format:category.format,source:'Display sample',demo:true,accent:category.accent};});
  return [...actual,...dummy];
}
function islandAt(x){
  if(islands.has(x))return islands.get(x);
  const rack=new THREE.Group();rack.position.set(x,0,-2);scene.add(rack);
  box(rack,0,1.48,0,.31,2.94,13.3,mat('#425051'));
  for(const y of [.2,1.04,1.88,2.72])box(rack,0,y,0,1.28,.075,13.5,mat('#555f5e'));
  for(const z of [-6.77,6.77])box(rack,0,1.49,z,1.28,2.98,.1,mat('#526160'));
  box(rack,0,3.02,0,1.3,.15,13.7,trim);
  obstacles.push({minX:x-.7,maxX:x+.7,minZ:-8.88,maxZ:4.88});
  islands.set(x,rack);return rack;
}
function createFace(category,itemsOverride=null){
  const rack=islandAt(category.rack.x),side=category.rack.side;
  const entries=itemsOverride||displayItems(category);
  const shelf=fixture[category.id],edge=lip[category.id];
  const bodies=new THREE.InstancedMesh(boxGeo,mat('#ffffff',.55,.05),240);rack.add(bodies);let bodyIndex=0;const dummy=new THREE.Object3D();
  for(const y of [.21,1.05,1.89,2.73]){
    box(rack,side*.52,y,0,.52,.045,13.35,shelf);
    box(rack,side*.8,y+.034,0,.028,.055,13.34,edge);
  }
  // Low dividers and front rails follow the distinct record, cassette and disc fixtures.
  for(let slot=0;slot<=20;slot++){
    const z=-6.27+slot*.63;
    if(category.id==='vinyl'||category.id==='cassettes')for(const y of [.46,1.30,2.14])box(rack,side*.78,y,z,.24,.42,.025,edge);
  }
  for(let row=0;row<3;row++)for(let slot=0;slot<20;slot++){
    const ix=row*20+slot,first=(ix*3)%entries.length;
    const items=[entries[first],entries[(first+1)%entries.length],entries[(first+2)%entries.length],entries[(first+3)%entries.length]];
    const id=`${category.id}-${row}-${slot}`;
    stacks.set(id,{id,items,category});
    const y=.21+row*.84+.41,z=-6.17+slot*.63;
    const spec=caseSpec(items[0]),scale=spec.h>.7?.83:spec.h>.6?.88:1;
    const tint=new THREE.Color(spec.shell);
    for(let depth=3;depth>=0;depth--){
      dummy.position.set(side*.85+(depth?-side*depth*.06:side*.045),y,z-(depth?side*depth*.025:0));
      dummy.rotation.set(depth?0:category.id==='cds'?.16:category.id==='vinyl'?.10:0,side*Math.PI/2+(depth?depth*.055:-.07),0,'YXZ');
      dummy.scale.set(spec.w*scale,spec.h*scale,spec.d*scale);
      dummy.updateMatrix();bodies.setMatrixAt(bodyIndex,dummy.matrix);bodies.setColorAt(bodyIndex,tint);bodyIndex++;
    }
    const art=new THREE.Mesh(new THREE.PlaneGeometry(spec.aw*scale,spec.ah*scale),rackArt(items[0]));
    art.position.set(side*.85+side*(.045+spec.d*scale/2+.012),y+spec.ay*scale,z);
    art.rotation.set(category.id==='cds'?.16:category.id==='vinyl'?.10:0,side*Math.PI/2-.07,0,'YXZ');
    art.userData.stackId=id;rack.add(art);interactables.push(art);
  }
  bodies.instanceMatrix.needsUpdate=true;bodies.instanceColor.needsUpdate=true;
  // Reference-inspired rack construction: mint/wood LP bins, black CD trays, oak tapes, blue/red movies and games.
  if(category.id==='cds'||category.id==='game-discs')for(const y of [.32,1.16,2])box(rack,side*.86,y,0,.017,.012,13.2,mat('#758080',.35,.55));
  if(category.id==='cassettes')for(const y of [.22,1.06,1.9,2.75])box(rack,side*.7,y,0,.3,.08,13.4,mat('#b78a5a'));
  if(category.id==='vinyl')for(const y of [.22,1.06,1.9])box(rack,side*.86,y,0,.04,.18,13.3,mat('#a7c6ad'));
  const sign=label(rack,category.short,0,0,0,3.8,.42,{bg:category.id==='vinyl'?'#a9cab7':category.id==='cassettes'?'#b98755':'#17272c',color:category.id==='vinyl'?'#233d36':'#f8e8c7',size:70});
  sign.rotation.y=side*Math.PI/2;sign.position.set(side*.66,3.22,0);
  const end=label(rack,category.short,side*.31,2.55,6.83,.57,.28,{bg:category.accent,color:'#ffffff',size:70});
}
CATEGORIES.forEach(category=>createFace(category));
createFace({id:'featured',short:'STAFF PICKS',accent:'#eb8b56',format:'DVD',rack:{x:7.35,side:1}},ITEMS.filter(item=>item.category==='movies').slice(0,80));
// Wall shelves carry real cover artwork and finish the deep aisle perspective.
for(let row=0;row<3;row++){
  box(scene,0,.62+row*.72,-13.73,19,.06,.5,mat('#8b989a'));
  for(let slot=0;slot<30;slot++){
    const item=ITEMS[(slot*7+row*31)%ITEMS.length];
    const wallArt=new THREE.Mesh(new THREE.PlaneGeometry(.43,.55),rackArt(item));
    wallArt.position.set(-9.2+slot*.63,.88+row*.72,-13.4);scene.add(wallArt);
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

let active=false, uiOpen=false, yaw=0, pitch=0, focusedStack=null, toastTimer;
let dragLook=false, dragPointer=null, dragLastX=0, dragLastY=0;
const keys=new Set(); const raycaster=new THREE.Raycaster(); const center=new THREE.Vector2(0,0); const clock=new THREE.Clock();
const joystick={x:0,y:0,pointer:null}; let lookPointer=null,lookLastX=0,lookLastY=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function requestLook(){ if(!mobile && !uiOpen && document.pointerLockElement!==canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(()=>showToast('Drag on the scene to look around')); } }
function enter(){ active=true;uiOpen=false;intro.classList.add('hidden');hud.classList.remove('hidden'); }
function pause(){ if(!active||uiOpen)return; intro.classList.remove('hidden');hud.classList.add('hidden');$('enterBtn').firstChild.textContent='Return to the basement '; document.exitPointerLock?.(); }
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
  $('detailNote').textContent=item.album?`From your Spotify playlist · ${item.featuredTrack} appears on ${item.album}. Format uses the album release year.`:item.source==='IMDb watchlist'?`From your IMDb watchlist CSV${item.rating?' · IMDb '+item.rating+'/10':''}.`:item.demo?'Display sample used to fill the physical rack. It is not in your imported collection.':'Sample game entry until you provide a game list.';
  if(item.album)enrichAudio(item);
}
function closeDetail(){detailPanel.classList.add('hidden');uiOpen=false;if(active){hud.classList.remove('hidden');}else intro.classList.remove('hidden');}
function visitShelf(){if(!currentDetailItem)return;const category=categoryById[currentDetailItem.category];closeDetail();active=true;intro.classList.add('hidden');hud.classList.remove('hidden');camera.position.set(category.rack.x+category.rack.side*1.7,1.62,0);yaw=category.rack.side===-1?-Math.PI/2:Math.PI/2;pitch=-.04;camera.rotation.y=yaw;camera.rotation.x=pitch;showToast(`Welcome to ${category.short.toLowerCase()}`);}
$('visitShelf').onclick=visitShelf;
let filter='all';
function renderFilters(){const node=$('filters');node.replaceChildren();for(const c of [{id:'all',label:'ALL'},...CATEGORIES.map(c=>({id:c.id,label:c.short}))]){const b=document.createElement('button');b.type='button';b.className='filter'+(filter===c.id?' active':'');b.textContent=c.label;b.onclick=()=>{filter=c.id;renderFilters();renderCatalog();};node.append(b);}}
function renderCatalog(){const q=$('searchInput').value.trim().toLowerCase();const items=ITEMS.filter(item=>(filter==='all'||item.category===filter)&&(!q||`${item.title} ${item.creator} ${item.year} ${item.category}`.toLowerCase().includes(q)));const grid=$('catalogGrid');grid.replaceChildren();if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Nothing on this shelf. Try another search.';grid.append(empty);return;}
  for(const item of items){const b=document.createElement('button');b.type='button';b.className='catalog-card';b.style.setProperty('--accent',item.accent);const art=document.createElement('div');art.className='catalog-art';art.style.backgroundImage=`linear-gradient(180deg,transparent,rgba(0,0,0,.65)),url("${item.artwork||coverDataUrl(item)}")`;const fmt=document.createElement('small');fmt.textContent=item.format;const title=document.createElement('strong');title.textContent=item.title;art.append(fmt,title);const copy=document.createElement('div');copy.className='catalog-copy';const name=document.createElement('strong');name.textContent=item.title;const meta=document.createElement('span');meta.textContent=`${item.creator} · ${item.year}`;copy.append(name,meta);b.append(art,copy);b.onclick=()=>openDetail(item);grid.append(b);}}
function inspect(){if(focusedStack)openStack(focusedStack);else showToast('Move closer and aim at a stack');}
$('itemCount').textContent=ITEMS.length;$('enterBtn').onclick=enter;$('browseBtn').onclick=openCatalog;$('closeCatalog').onclick=closeCatalog;$('closeDetail').onclick=closeDetail;$('backToStore').onclick=closeDetail;$('searchInput').oninput=renderCatalog;$('touchInspect').onclick=inspect;
renderFilters();renderCatalog();
canvas.addEventListener('click',event=>{if(!active||uiOpen)return;const id=pickStackAt(event.clientX,event.clientY);if(id)openStack(id);else if(focusedStack)inspect();});
canvas.addEventListener('dblclick',()=>{if(active&&!uiOpen&&!mobile)requestLook();});
document.addEventListener('pointerlockchange',()=>{if(!mobile&&active&&!uiOpen&&document.pointerLockElement!==canvas)pause();});
document.addEventListener('mousemove',event=>{if(uiOpen||!active)return;if(document.pointerLockElement===canvas){yaw-=event.movementX*.0021;pitch=clamp(pitch-event.movementY*.0021,-1.28,1.28);}else if(dragLook){yaw-=(event.clientX-dragLastX)*.0045;pitch=clamp(pitch-(event.clientY-dragLastY)*.0045,-1.28,1.28);dragLastX=event.clientX;dragLastY=event.clientY;}});
canvas.addEventListener('pointerdown',event=>{if(!active||uiOpen||mobile||document.pointerLockElement===canvas)return;dragLook=true;dragPointer=event.pointerId;dragLastX=event.clientX;dragLastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
function endDrag(event){if(event.pointerId===dragPointer){dragLook=false;dragPointer=null;}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement)return;keys.add(event.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();if(event.code==='KeyB'&&active&&!uiOpen){event.preventDefault();openCatalog();}if(event.code==='KeyL'&&active&&!uiOpen)requestLook();if(event.code==='KeyE'&&active&&!uiOpen)inspect();if(stackOpen&&['ArrowLeft','KeyA'].includes(event.code)){event.preventDefault();turnStack(-1);}if(stackOpen&&['ArrowRight','KeyD'].includes(event.code)){event.preventDefault();turnStack(1);}if(stackOpen&&event.code==='Enter'){event.preventDefault();openDetail(stacks.get(stackOpen).items[stackIndex]);}if(event.code==='Escape'){if(!detailPanel.classList.contains('hidden'))closeDetail();else if(!catalogPanel.classList.contains('hidden'))closeCatalog();else if(stackOpen)closeStack();else pause();}});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
const joyEl=$('joystick'),stickEl=$('stick');
function updateJoy(e){const r=joyEl.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=len>39?39/len:1;joystick.x=dx*scale/39;joystick.y=-dy*scale/39;stickEl.style.left=`calc(50% + ${dx*scale}px)`;stickEl.style.top=`calc(50% + ${dy*scale}px)`;}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joystick.pointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joystick.pointer)updateJoy(e);});
function releaseJoy(e){if(e.pointerId!==joystick.pointer)return;joystick.pointer=null;joystick.x=joystick.y=0;stickEl.style.left='50%';stickEl.style.top='50%';}joyEl.addEventListener('pointerup',releaseJoy);joyEl.addEventListener('pointercancel',releaseJoy);
const lookEl=$('lookPad');lookEl.addEventListener('pointerdown',e=>{e.preventDefault();lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;lookStart={x:e.clientX,y:e.clientY,moved:false};lookEl.setPointerCapture(e.pointerId);});lookEl.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||uiOpen)return;if(lookStart&&Math.hypot(e.clientX-lookStart.x,e.clientY-lookStart.y)>12)lookStart.moved=true;yaw-=(e.clientX-lookLastX)*.005;pitch=clamp(pitch-(e.clientY-lookLastY)*.005,-1.25,1.25);lookLastX=e.clientX;lookLastY=e.clientY;});lookEl.addEventListener('pointerup',e=>{if(e.pointerId!==lookPointer)return;if(lookStart&&!lookStart.moved&&active&&!uiOpen){const id=pickStackAt(e.clientX,e.clientY);if(id)openStack(id);}lookPointer=null;lookStart=null;});lookEl.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
function canStand(x,z){const radius=.33;if(x<-9.45||x>9.45||z<-13.4||z>13.4)return false;for(const o of obstacles)if(x+radius>o.minX&&x-radius<o.maxX&&z+radius>o.minZ&&z-radius<o.maxZ)return false;if(x>4.45&&x<8.55&&z>8.8&&z<11.55)return false;return true;}
let bob=0;function updateMovement(dt){let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joystick.y;let s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;const len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3.5;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt;const nx=camera.position.x+dx,nz=camera.position.z+dz;if(canStand(nx,camera.position.z))camera.position.x=nx;if(canStand(camera.position.x,nz))camera.position.z=nz;bob+=Math.hypot(dx,dz)*5;camera.position.y=1.62+(len>.03?Math.sin(bob)*.025:0);}
function pickStackAt(clientX,clientY){
  raycaster.setFromCamera(new THREE.Vector2(clientX/innerWidth*2-1,-clientY/innerHeight*2+1),camera);
  const hit=raycaster.intersectObjects(interactables,false).find(h=>h.distance<8.0);
  return hit?.object.userData.stackId||null;
}
function updateFocus(){
  focusedStack=pickStackAt(innerWidth/2,innerHeight/2);
  if(focusedStack){const stack=stacks.get(focusedStack);prompt.classList.remove('hidden');$('promptText').textContent=`Flip through ${stack.category.short.toLowerCase()} stack`;}else prompt.classList.add('hidden');
  const nearest=CATEGORIES.map(c=>({c,d:Math.hypot(camera.position.x-(c.rack.x+c.rack.side*1.3),camera.position.z-c.rack.z)})).sort((a,b)=>a.d-b.d)[0];
  $('zoneName').textContent=nearest.d<4?nearest.c.short:'THE AISLES';
}
const viewerScene=new THREE.Scene();
const viewerCamera=new THREE.OrthographicCamera(-3,3,3,-3,.1,40);viewerCamera.position.set(0,0,5);viewerCamera.lookAt(0,0,0);
viewerScene.add(new THREE.HemisphereLight('#fff5e6','#526278',2.5));
const viewerLight=new THREE.PointLight('#ffffff',4,12);viewerLight.position.set(-2,3,4);viewerScene.add(viewerLight);
const viewerBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:'#0b1110',transparent:true,opacity:.89,depthWrite:false}));viewerBackdrop.position.z=-4;viewerScene.add(viewerBackdrop);
const viewerGroup=new THREE.Group();viewerScene.add(viewerGroup);
let stackOpen=null,stackIndex=0,viewerCases=[],viewerTilt=0,viewerYaw=0;
function updateViewerInfo(){
  const stack=stacks.get(stackOpen);if(!stack)return;
  const item=stack.items[stackIndex];$('stackCategory').textContent=stack.category.short+' / '+(item.demo?'DISPLAY SAMPLE':'YOUR COLLECTION');
  $('stackTitle').textContent=item.title;$('stackMeta').textContent=`${item.creator} · ${item.year} · ${item.format}`;
  $('stackCount').textContent=`${stackIndex+1} / ${stack.items.length}`;
  $('stackDetails').textContent=item.demo?'About this display sample':'View item details ↗';
}
function openStack(id){
  const stack=stacks.get(id);if(!stack)return;
  uiOpen=true;stackOpen=id;stackIndex=0;viewerTilt=0;viewerYaw=0;intro.classList.add('hidden');hud.classList.add('hidden');document.exitPointerLock?.();
  viewerGroup.clear();viewerCases=stack.items.map((item)=>{const result=createMediaCase(item);const g=result.group;const spec=result.spec;const targetW=innerWidth<700?1.95:2.7,targetH=innerWidth<700?1.8:2.5;g.scale.setScalar(Math.min(targetW/spec.w,targetH/spec.h));viewerGroup.add(g);return g;});
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
    const spread=innerWidth<700?1.48:2.65;const tx=visible===0?0:visible===2?0:visible*spread,ty=visible===0?.18:-.07,tz=visible===0?.8:visible===2?-1.7:-.65;
    g.position.x+=(tx-g.position.x)*Math.min(1,dt*9);g.position.y+=(ty-g.position.y)*Math.min(1,dt*9);g.position.z+=(tz-g.position.z)*Math.min(1,dt*9);
    const ry=visible===0?-.09:visible===2?.85:visible*.48;g.rotation.y+=(ry-g.rotation.y)*Math.min(1,dt*9);
  }
}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.15);
  if(active&&!uiOpen&&intro.classList.contains('hidden')){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.55;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.3,-1.28,1.28);updateMovement(dt);camera.rotation.y=yaw;camera.rotation.x=pitch;updateFocus();}
  renderer.autoClear=false;renderer.clear();renderer.render(scene,camera);
  if(stackOpen){animateViewer(dt);renderer.clearDepth();renderer.render(viewerScene,viewerCamera);}
}animate();
viewerCamera.left=-3*innerWidth/innerHeight;viewerCamera.right=3*innerWidth/innerHeight;viewerCamera.updateProjectionMatrix();
const stackOverlay=$('stackOverlay');
$('closeStack').onclick=closeStack;$('stackPrev').onclick=()=>turnStack(-1);$('stackNext').onclick=()=>turnStack(1);
$('stackDetails').onclick=()=>openDetail(stacks.get(stackOpen).items[stackIndex]);
stackOverlay.addEventListener('wheel',event=>{if(!stackOpen)return;event.preventDefault();if(Math.abs(event.deltaY)>4)turnStack(event.deltaY>0?1:-1);},{passive:false});
let swipeStart=null,lookStart=null;
stackOverlay.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;swipeStart={x:event.clientX,y:event.clientY};});
stackOverlay.addEventListener('pointermove',event=>{if(!swipeStart)return;viewerYaw=clamp((event.clientX-swipeStart.x)*.003,-.35,.35);});
stackOverlay.addEventListener('pointerup',event=>{if(!swipeStart)return;viewerYaw=0;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;if(Math.abs(dx)>35)turnStack(dx<0?1:-1);else if(Math.abs(dy)>25)viewerTilt=clamp(viewerTilt-dy*.003,-.25,.25);swipeStart=null;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,Math.sqrt(900000/(innerWidth*innerHeight))));renderer.setSize(innerWidth,innerHeight);viewerCamera.left=-3*innerWidth/innerHeight;viewerCamera.right=3*innerWidth/innerHeight;viewerCamera.updateProjectionMatrix();});
