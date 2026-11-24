import * as THREE from './vendor/three.module.js';
import { CATEGORIES, ITEMS, categoryById, playlists, imdbList, bookList, trailerStreams, musicPreviews, posterContent, loadCollections } from './catalog.js';
import {installMusicPlayers} from './music-players.js';
import {installArcade} from './arcade.js';
import {ps2ShelfView} from './retro-showcase.js';
import {createWindowLighting} from './window-light.js';
import { buildInterior } from './interior.js';
import {trailerSources} from './trailer-channel.js';
import {installPosters,installTelevisions} from './displays.js';
import {installElevator} from './elevator.js';
import { rooms, levels, levelOf, ceilingOf, rise, stair, stairStart, stairEnd, lift, entrance, inside, roomAt, groundAt } from './plan.js';
import { enableMenuDrawer } from './menu-drawers.js';
import { seatAnchors } from './seat-anchors.js';
import { createItemDrawer } from './item-drawer.js';
import {createBoxSetControls} from './box-set-controls.js';
import { createCasePreview } from './case-preview.js';
import { stockRooms } from './racks.js';
import { coverDataUrl } from './media.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const intro = $('intro');
const hud = $('hud');
const catalogPanel = $('catalogPanel');
const detailPanel = $('detailPanel');
const drawer = createItemDrawer(detailPanel, { openInfo: moreInfo, dismiss: () => closeDetail() });
const prompt = $('inspectPrompt');
const preview=createCasePreview($('casePreview'),{onStep:turnItem,onDetails:moreInfo,onTravel:showRecordTravel,onSeasonPick:i=>boxControls.pick(i),onCaseTap:tapCase,onBoxTravel:t=>boxControls.travel(t)});
const boxControls=createBoxSetControls(preview);
$('previewReset').onclick=preview.reset;
const mobile = matchMedia('(any-pointer: coarse)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#63584a');
scene.fog = new THREE.FogExp2('#63584a', 0.012);
const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, 0.08, 80);
const atPS2=location.hash==='#ps2';
const entryRoom=rooms.find(room=>room.id===(atPS2?'retro':location.hash.slice(1)));
const start=atPS2?[ps2ShelfView.x,ps2ShelfView.z,ps2ShelfView.yaw]:entryRoom?.spawn||entrance;
const entryPitch=atPS2?ps2ShelfView.pitch:0;
camera.position.set(start[0],((entryRoom?.floor||1)-1)*rise+1.62,start[1]);
camera.rotation.order = 'YXZ';
camera.rotation.y = start[2];
camera.rotation.x = entryPitch;
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
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

let layoutSeed=0, restoredVisit=null;
try{
  layoutSeed=Number(sessionStorage.getItem('myroom.shelfSeed'))>>>0;
  const pending=sessionStorage.getItem('myroom.refreshVisit');
  if(pending){restoredVisit=JSON.parse(pending);sessionStorage.removeItem('myroom.refreshVisit');}
}catch{}
const illuminate=createWindowLighting(renderer);
const interior=buildInterior(scene,label,ITEMS,posterContent);
const elevator=installElevator(scene,interior.floors,box,label);
const houseLights=$('cinemaLights');
function syncHouseLights(on){
  interior.theatre.setHouseLights(on);
  houseLights.setAttribute('aria-pressed',String(on));
  houseLights.title=on?'Dim theatre lights':'Raise theatre lights';
  houseLights.setAttribute('aria-label',houseLights.title);
}
houseLights.onclick=()=>syncHouseLights(!interior.theatre.bright);
syncHouseLights(false);
const displayTargets=interior.roomModels.displayTargets;
const {stacks,interactables,destinations,roomStock}=stockRooms(interior,box,label,layoutSeed);
const seatTargets=interior.floors.map(()=>[]);
const seatMaterial=new THREE.MeshBasicMaterial({visible:false});
for(const seat of seatAnchors){
  const target=new THREE.Mesh(boxGeo,seatMaterial);
  target.scale.set(seat.width,seat.top-seat.bottom,seat.depth);
  target.position.set(seat.x,(seat.top+seat.bottom)/2,seat.z);
  target.name=seat.id;target.userData.seat=seat;target.visible=false;
  interior.floors[seat.level-1].add(target);seatTargets[seat.level-1].push(target);
}
const updatePosters=installPosters(interior,roomStock,displayTargets,posterContent);
const televisions=installTelevisions(canvas,interior.screens,roomStock,trailerStreams,openDetail);
for(const device of interior.devices){
  const targets=displayTargets[device.userData.level-1];targets.push(device);
  if(device.userData.coverTarget)targets.push(device.userData.coverTarget);
}
for(const tv of interior.screens){
  const floor=rooms.find(room=>room.id===tv.room).floor;
  tv.screen.userData.level=floor;displayTargets[floor-1].push(tv.screen);
}
for(const door of interior.doors)interactables[door.level-1].push(...door.faces);
const musicPlayer=installMusicPlayers(roomStock.get('music')||[],musicPreviews,interior.devices,openDetail);
const openArcade=installArcade(()=>{uiOpen=false;});
illuminate(scene);
interior.theatre.ready.then(()=>illuminate(interior.floors[0])).catch(()=>{});
let seated=null,libraryScreenSelected=false;
let ground=((entryRoom?.floor||1)-1)*rise,level=levelOf(ground);
let requestedFloor=0;
const loadNotice=$('floorLoad'),loadText=loadNotice.querySelector('span'),retryFloor=loadNotice.querySelector('button');
function requestFloor(next){
  requestedFloor=next;retryFloor.hidden=true;loadNotice.hidden=true;
  const hint=setTimeout(()=>{if(requestedFloor===next){loadText.textContent='Loading Level '+next;loadNotice.hidden=false;}},500);
  interior.roomModels.loadFloor(next).then(()=>{
    illuminate(interior.floors[next-1]);
    if(requestedFloor===next)loadNotice.hidden=true;
  }).catch(error=>{
    console.error('Room loading failed',error);
    if(requestedFloor!==next)return;
    loadText.textContent='Level '+next+' could not finish loading';retryFloor.hidden=false;loadNotice.hidden=false;
  }).finally(()=>clearTimeout(hint));
}
retryFloor.onclick=()=>requestFloor(level);

function refreshFloor(){
  level=levelOf(ground);
  if(level!==requestedFloor)requestFloor(level);
  const onStair=inside(stair,camera.position.x,camera.position.z);
  interior.floors.forEach((group,index)=>group.visible=onStair||index===level-1);
  const {x,z}=camera.position;
  const location=inside(lift,x,z)?'Elevator':onStair?'Staircase':roomAt(level,x,z)?.name||'Entrance';
  $('entryLocation').textContent='Level '+level+' · '+location;
}
refreshFloor();
let active=false, uiOpen=false, yaw=start[2], pitch=entryPitch, focusedCase=null, selectedCase=null, toastTimer;
let dragLook=false, dragPointer=null, dragLastX=0, dragLastY=0;
const keys=new Set(); const raycaster=new THREE.Raycaster(); const hoverPoint=new THREE.Vector2();let hasPointer=false,suppressClick=false,pressX=0,pressY=0; const clock=new THREE.Clock();
const joystick={x:0,y:0,pointer:null}; let lookStart=null,lookPointer=null,lookLastX=0,lookLastY=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function requestLook(){ if(!mobile && !uiOpen && document.pointerLockElement!==canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(()=>showToast('Drag on the scene to look around')); } }
function enter(){ active=true;uiOpen=false;intro.classList.add('hidden');hud.classList.remove('hidden');const room=roomAt(level,camera.position.x,camera.position.z)?.id;televisions.update(camera,room,true);musicPlayer.update(room==='music'||room==='library'&&!libraryScreenSelected); }
function pause(){ if(!active||uiOpen||elevator.riding)return; active=false;keys.clear();intro.classList.remove('hidden');hud.classList.add('hidden');$('enterBtn').textContent='Keep digging'; document.exitPointerLock?.(); }
function showToast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2400);}
function openCatalog(){if(elevator.riding)return;preview.hide();boxControls.show(null);currentDetailId=null;uiOpen=true;catalogPanel.classList.remove('hidden');detailPanel.classList.add('hidden');intro.classList.add('hidden');document.exitPointerLock?.();renderCatalog();(drawer.compact ? $('closeCatalog') : $('searchInput')).focus({preventScroll:true});}
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
  if(!item.description&&album.strDescriptionEN){const desc=document.createElement('p');desc.textContent=album.strDescriptionEN.slice(0,270)+(album.strDescriptionEN.length>270?'…':'');extra.append(desc);}
  if(extra.childNodes.length)extra.classList.remove('hidden');
}
let detailItems=[],detailIndex=-1,browseStack=null,fromCatalog=false,caseOpen=false,mediumIndex=0;
let returnFocus=null,caseRequest=0;
function showPopup(){
  if(detailPanel.classList.contains('hidden')){
    fromCatalog=!catalogPanel.classList.contains('hidden');
    returnFocus=document.activeElement;
  }
  uiOpen=true;keys.clear();dragLook=false;
  catalogPanel.classList.add('hidden');intro.classList.add('hidden');
  detailPanel.classList.remove('hidden');document.exitPointerLock?.();
}
function openStack(shell){
  const stack=stacks.get(shell.userData.stackId);
  if(!stack)return;
  showPopup();browseStack=stack;
  detailItems=stack.browseItems;detailIndex=detailItems.indexOf(shell.userData.item);
  showDetailItem('stack');(drawer.compact ? $('drawerGrip') : $('moreInfo')).focus({preventScroll:true});
}
function openDetail(item){
  if(!item)return;
  showPopup();browseStack=null;detailItems=[item];detailIndex=0;
  showDetailItem('info');$('closeDetail').focus({preventScroll:true});
}
function moreInfo(){
  if(detailPanel.dataset.view!=='stack'||!currentDetailItem)return;
  showDetailItem('info');$('backToStack').focus({preventScroll:true});
}
function backToStack(){
  if(!browseStack)return;
  showDetailItem('stack');(drawer.compact ? $('drawerGrip') : $('moreInfo')).focus({preventScroll:true});
}
$('moreInfo').onclick=moreInfo;$('backToStack').onclick=backToStack;
const catalogById=new Map(ITEMS.map(item=>[item.id,item]));
function showRelated(item){
  const panel=$('relatedTitles');panel.replaceChildren();
  const ids=item.relatedAnimeIds||ITEMS.filter(book=>book.category==='manga'&&book.relatedAnimeIds?.includes(item.id)).map(book=>book.id);
  const works=ids.map(id=>catalogById.get(id)).filter(Boolean);
  panel.classList.toggle('hidden',!works.length);
  if(works.length){
    const heading=document.createElement('h3');heading.textContent=item.category==='manga'?'Related anime':'On the manga shelf';panel.append(heading);
    if(item.relation){const p=document.createElement('p');p.textContent=item.relation;panel.append(p);}
    for(const work of works){
      const button=document.createElement('button');button.type='button';button.textContent=work.title;button.onclick=()=>openDetail(work);panel.append(button);
    }
  }
  const credit=$('posterCredit');credit.replaceChildren();
  const artist=item.album&&posterContent.artists.find(a=>a.creator===item.creator);
  credit.classList.toggle('hidden',!artist);
  if(artist){
    const a=document.createElement('a');a.textContent='Artist poster · '+(artist.credit||artist.creator);a.href=artist.source;a.target='_blank';a.rel='noopener noreferrer';credit.append(a);
    if(artist.licenseUrl){const l=document.createElement('a');l.textContent=artist.license;l.href=artist.licenseUrl;l.target='_blank';l.rel='noopener noreferrer';credit.append(' · ',l);}
  }
}
function turnItem(direction){
  const next=detailIndex+direction;
  if(detailPanel.dataset.view!=='stack'||next<0||next>=detailItems.length)return;
  detailIndex=next;showDetailItem('stack',direction);
}
function showRecordTravel(fraction){
  const n=Math.round(fraction*100),slider=$('sleeveSlider');
  slider.value=String(n);
  slider.setAttribute('aria-valuetext',n===0?'In sleeve':n===100?'Fully out':n+'% out');
}
function updateCaseControls(item){
  const media=item.gameMedia,kind=media?.kind,actual=media?.media||[];
  const release=item.releaseKind,lp=release==='vinyl';
  const physical=!!release||['disc','cartridge','umd'].includes(kind);
  $('caseActions').hidden=!media&&!release;
  $('toggleCase').hidden=!physical;
  $('caseLabel').textContent=lp?(caseOpen?'Return to sleeve':'Slide record out'):(caseOpen?'Close case':'Open case');
  $('recordTravel').hidden=!lp;
  if(lp&&!caseOpen)showRecordTravel(0);
  $('toggleCase').setAttribute('aria-pressed',String(caseOpen));
  const selector=$('mediumSelect');
  $('mediumPicker').hidden=!caseOpen||actual.length<2;
  if(caseOpen&&actual.length>1){
    selector.replaceChildren(...actual.map((entry,i)=>new Option(entry.label||'Disc '+(i+1),String(i))));
    selector.value=String(mediumIndex);
  }
  const medium=actual[mediumIndex];
  let note='';
  if(kind==='digital')note='Digital release.';
  else if(kind==='unknown')note='Physical media unverified for this edition.';
  else if(caseOpen&&release){
    note=item.mediumArt?.credit||(release==='vinyl'?'Center label adapted from the album cover.':
      release==='cassette'?'Tape label adapted from the album cover.':release==='cd'?'Disc label adapted from the album cover.':'Disc label adapted from the film poster.');
    if(item.mediumArt?.issue)note+=' · '+item.mediumArt.issue;
    if(lp&&item.mediumArt)note+=' · Side '+(item.mediumArt.side||'A')+'. Opposite label adapted from the cover.';
  }else if(caseOpen){
    if(!medium?.artwork)note='LaunchBox has no verified label scan for this edition.';
    else note=[medium.label,medium.regionalAlternative?medium.region+' disc artwork':'',
      medium.type==='Cart - 3D'?'Cartridge label from the LaunchBox 3D image':''].filter(Boolean).join(' · ');
  }
  const caption=$('mediumNote');caption.textContent=note;
  if(caseOpen&&item.mediumArt?.source){
    const link=document.createElement('a');link.href=item.mediumArt.source;link.target='_blank';link.rel='noopener noreferrer';
    link.textContent='View artwork source';caption.append(' · ',link);
  }
}
async function viewCase(open,index=0,position=null){
  const item=currentDetailItem,request=++caseRequest;
  caseOpen=open;mediumIndex=index;updateCaseControls(item);
  try{await preview.setCaseOpen(open,index,position);}
  catch(error){
    if(request!==caseRequest||currentDetailItem!==item)return;
    caseOpen=false;updateCaseControls(item);
    $('mediumNote').textContent='The preview could not load. Try again.';
    console.error('Open case preview unavailable',error);
  }
}
$('sleeveSlider').oninput=event=>{
  const fraction=event.target.valueAsNumber/100;
  viewCase(fraction>0,0,fraction);
};
$('toggleCase').onclick=()=>viewCase(!caseOpen,mediumIndex);
$('mediumSelect').onchange=event=>viewCase(true,Number(event.target.value));
function tapCase(season){
  if(!drawer.compact||!currentDetailItem)return;
  if(currentDetailItem.seasons){boxControls.openTappedCase(season);return;}
  if(currentDetailItem.releaseKind||['disc','cartridge','umd'].includes(currentDetailItem.gameMedia?.kind)){
    viewCase(!caseOpen,mediumIndex);
  }
}
function showDetailItem(view,direction=0){
  const item=detailItems[detailIndex],browsing=view==='stack';
  currentDetailId=item.id;currentDetailItem=item;caseOpen=false;mediumIndex=0;caseRequest++;
  detailPanel.dataset.view=view;
  drawer.reset();
  const prev=browsing?detailItems[detailIndex-1]:null,next=browsing?detailItems[detailIndex+1]:null;
  $('itemPrev').disabled=!prev;$('itemNext').disabled=!next;
  $('itemPrev').title=prev?prev.title:'First item';$('itemNext').title=next?next.title:'Last item';
  $('itemPosition').textContent=(detailIndex+1)+' / '+detailItems.length;
  detailPanel.scrollTop=0;
  $('backToStack').hidden=browsing||!browseStack;
  $('inspectLocation').hidden=!browsing&&!!browseStack;
  $('inspectLocation').textContent=browsing?browseStack.label:'Item details';
  $('gestureHint').textContent=browsing?(mobile?(prev||next?'Swipe to browse · Double-tap for details':'Double-tap for details'):
    'Drag to rotate · Double-click for details'):'Drag to rotate';
  $('previewReset').hidden=browsing&&mobile&&!!(prev||next);
  $('detailTitle').textContent=item.title;
  $('detailCreator').textContent=browsing?[item.creator,item.year].filter(Boolean).join(' · '):item.creator;
  preview.show(item,{previous:prev,next,step:direction,view});
  boxControls.show(browsing?null:item);
  if(browsing)return;
  updateCaseControls(item);
  const programme=programmeFor(item);
  $('playLabel').textContent=programme.action;
  $('playInRoom').title=programme.action+' · '+programme.content.title+' · '+programme.destination.name;
  $('playInRoom').setAttribute('aria-label',$('playInRoom').title);
  if(drawer.compact && mobile && (item.seasons || !$('toggleCase').hidden && !$('caseActions').hidden)){
    $('gestureHint').textContent='Drag to rotate · Double-tap to open';
  }
  $('audioExtra').classList.add('hidden');
  $('itemDescription').textContent=item.description;
  showRelated(item);
  const category=item.exhibit?.section||categoryById[item.category].label;
  $('detailCategory').textContent=category;
  $('detailCreator').textContent=[item.album||['books','manga'].includes(item.category)?item.creator:category,item.year].filter(Boolean).join(' · ');
  const credits=item.credits;
  const imdbTitle=/^tt\d+$/.test(item.id);
  const rating=credits?.rating||item.rating;
  const rows=[
    ['IMDb rating',rating?rating+' / 10':imdbTitle?'Unrated':''],
    ['Genre',(credits?.genres||item.genres||[]).join(', ')],
    ['Cast',credits?.cast?.slice(0,4).join(', ')||(imdbTitle?'Unlisted':'')],
    ['Director',credits?.directors?.slice(0,4).join(', ')||
      (['movies','anime-movies'].includes(item.category)?item.creator:'')||(imdbTitle?'Unlisted':'')]
  ];
  const meta=$('detailMeta');meta.replaceChildren();
  for(const [label,value] of rows){
    if(!value)continue;
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=label;dd.textContent=value;meta.append(dt,dd);
  }
  const sourceLink=$('sourceLink');
  sourceLink.classList.toggle('hidden',!item.sourceUrl);
  const imdb=item.sourceUrl && /^https:\/\/(?:www\.)?imdb\.com\//i.test(item.sourceUrl);
  $('imdbMark').hidden=!imdb;
  sourceLink.querySelector('svg').toggleAttribute('hidden',Boolean(imdb));
  if(item.sourceUrl){
    sourceLink.href=item.sourceUrl;
    sourceLink.title='Open '+item.title+' on '+(imdb?'IMDb':item.source||'the source website');
    sourceLink.setAttribute('aria-label',sourceLink.title);
  }else sourceLink.removeAttribute('href');
  const coverSource=$('coverSource');
  coverSource.classList.toggle('hidden',!item.launchboxUrl);
  if(item.launchboxUrl)coverSource.href=item.launchboxUrl;
  else coverSource.removeAttribute('href');
  const listNames=(item.playlists || []).map(id=>playlists[id]).filter(Boolean);
  $('detailNote').textContent=item.album
    ? [item.featuredTrack, listNames.join(', ')].filter(Boolean).join(' · ')
    : [item.pages ? item.pages+' pages' : '', item.platforms?.join(', ') || item.platform, item.edition, item.artworkNote, item.episodeCount!=null ? item.episodeCount+' episodes' : ''].filter(Boolean).join(' · ');
  if(item.album)enrichAudio(item);
}
$('itemPrev').onclick=()=>turnItem(-1);
$('itemNext').onclick=()=>turnItem(1);
function closeDetail(returnToCatalog=fromCatalog){
  preview.hide();boxControls.show(null);currentDetailId=null;currentDetailItem=null;
  detailPanel.classList.add('hidden');detailItems=[];detailIndex=-1;fromCatalog=false;browseStack=null;caseRequest++;
  const trigger=returnFocus;returnFocus=null;
  if(returnToCatalog){
    uiOpen=true;catalogPanel.classList.remove('hidden');
    const target=drawer.compact ? catalogPanel.querySelector('.catalog-card[aria-pressed="true"]') : $('catalogDetails');
    (target?.getClientRects().length ? target : $('closeCatalog')).focus({preventScroll:true});
    return;
  }
  uiOpen=false;
  if(active)hud.classList.remove('hidden');else intro.classList.remove('hidden');
  if(trigger?.isConnected && trigger.getClientRects().length)trigger.focus({preventScroll:true});
}
function arrive(floor,x,z,direction,lookPitch=0){
  seated=null;$('standUp').hidden=true;
  selectCase(null);hasPointer=false;
  ground=(floor-1)*rise;camera.position.set(x,ground+1.62,z);yaw=direction;pitch=lookPitch;
  camera.rotation.y=yaw;camera.rotation.x=pitch;keys.clear();
  refreshFloor();enter();camera.updateMatrixWorld();
}
const screenRoomsByCategory={
  movies:'cinema','anime-movies':'cinema',shows:'television',anime:'television',
  vinyl:'music',cds:'music',cassettes:'music',books:'library',manga:'library',
  playstation:'gaming',xbox:'gaming',switch:'gaming','retro-games':'retro','game-discs':'collect'
};
const screenViews={cinema:[-4.90,-1.62],television:[2.00,-.84],music:[-5.50,-2.65],
  library:[-10.95,9.52],collect:[11.28,6.54],gaming:[4.12,1.31],retro:[11.60,-2.26],bed:[11.63,-3.92]};
function programmeFor(item){
  let room=screenRoomsByCategory[item.category]||'retro';
  if(room==='cinema'&&roomAt(level,camera.position.x,camera.position.z)?.id==='bed')room='bed';
  const destination=rooms.find(r=>r.id===room);
  if(item.albumUri)return {destination,content:item,action:'Listen'};
  let content=item,sources=trailerSources(item,trailerStreams[item.id]);
  if(item.relatedAnimeIds?.length){
    for(const id of item.relatedAnimeIds){
      const adaptation=catalogById.get(id);
      if(!adaptation)continue;
      const clips=trailerSources(adaptation,trailerStreams[id]);
      if(clips.length){content=adaptation;sources=clips;break;}
    }
  }
  const action=sources.length?'Trailer':'On screen';
  const label=['books','manga'].includes(item.category)?'Reading room':item.exhibit?'Console spotlight':'Trailer unavailable';
  return {destination,content,sources,action,label};
}
function playInRoom(){
  if(!currentDetailItem)return;
  const {destination,content,sources,label}=programmeFor(currentDetailItem);
  const screen=interior.screens.find(tv=>tv.room===destination.id);
  if(!screen)return;
  closeDetail(false);
  const staySeated=seated&&roomAt(level,camera.position.x,camera.position.z)?.id===destination.id;
  libraryScreenSelected=destination.id==='library';
  if(!staySeated){
    const [x,z]=screenViews[destination.id];arrive(destination.floor,x,z,0);
  }else enter();
  const point=screen.screen.getWorldPosition(new THREE.Vector3());
  const dx=point.x-camera.position.x,dz=point.z-camera.position.z;
  yaw=Math.atan2(-dx,-dz);pitch=Math.atan2(point.y-camera.position.y,Math.hypot(dx,dz));
  camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
  if(content.albumUri){musicPlayer.request(content);}
  else{televisions.request(destination.id,content,sources,label);}
}
$('playInRoom').onclick=playInRoom;
function visitShelf(){
  if(!currentDetailItem)return;
  const dest=currentDetailItem.exhibit?.destination||destinations.get(currentDetailItem.id);
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
    if(q && ![item.title,item.creator,item.year,item.platform,categoryById[item.category].label].join(' ').toLowerCase().includes(q)) continue;
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
      if(drawer.compact)openDetail(item);
    };
    grid.append(card);
  }
  if(!grid.childElementCount){
    const empty=document.createElement('p');empty.className='empty-state';
    empty.textContent=q?'No matches.':'This shelf is empty.';
    if(!q && ['retro-games','switch','game-discs'].includes(filter)){
      const link=document.createElement('a');
      link.href=imdbList;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='View IMDb watchlist';
      empty.append(document.createElement('br'),link);
    }
    grid.append(empty);
  }
}
const sourceList=$('sourceLists');
for(const [title,url] of [['IMDb watchlist (CSV export)',imdbList],['My books on Open Library',bookList],['My art room on Pinterest','https://www.pinterest.com/kratexmusic/my-art-room/'],...Object.entries(playlists).map(([id,name])=>[name,'https://open.spotify.com/playlist/'+id])]){
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
  if(!shell||shell.userData.device||shell.userData.seat){frame.visible=false;return;}
  if(shell.userData.display){
    shell.add(frame);frame.visible=true;
    frame.position.set(0,0,(shell.userData.depth||0)/2+.001);frame.scale.set(shell.userData.width,shell.userData.height,1);return;
  }
  if(frame.parent!==shell.parent)shell.parent.add(frame);
  const {w,h,d}=shell.userData.spec;
  frame.visible=true;frame.scale.set(w+.0007,h+.0007,1);frame.position.z=d/2+.00085;
}
function selectCase(shell){
  selectedCase=shell;outline(selectionFrame,shell);
}
function sit(seat){
  if(seated||uiOpen||!active)return;
  seated={x:camera.position.x,z:camera.position.z,ground,yaw,pitch};
  selectCase(null);focusedCase=null;keys.clear();
  ground=(seat.level-1)*rise;
  camera.position.set(seat.eyeX,ground+seat.eyeY,seat.eyeZ);
  yaw=seat.yaw;pitch=seat.pitch;camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
  $('standUp').hidden=false;refreshFloor();
}
function stand(){
  if(!seated)return;
  const previous=seated;
  // Return to the walkable point from which this seat was reached.
  seated=null;$('standUp').hidden=true;keys.clear();
  ground=previous.ground;yaw=previous.yaw;pitch=previous.pitch;
  camera.position.set(previous.x,ground+1.62,previous.z);
  camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();refreshFloor();
}
$('standUp').onclick=stand;
function useTarget(shell){
  const data=shell?.userData;
  if(data?.seat){sit(data.seat);return;}
  if(!data?.device){selectCase(shell);if(data?.stackId)openStack(shell);return;}
  selectCase(null);
  if(['vinyl','cassettes','cds'].includes(data.device)){musicPlayer.toggle(data.device);return;}
  keys.clear();uiOpen=true;document.exitPointerLock?.();openArcade(data.device,data.title);
}
function inspect(){
  if(elevator.riding)return;
  if(elevator.enclosed(camera.position.x,camera.position.z)){openLift();return;}
  if(focusedCase?.userData.seat||focusedCase?.userData.device){useTarget(focusedCase);return;}
  const target=focusedCase?.userData.display==='tv'?focusedCase:selectedCase||focusedCase;
  if(!target){showToast('Select a case on the shelf');return;}
  openDetail(target.userData.item);
}
$('displayDetails').onclick=()=>openDetail(selectedCase?.userData.item);
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
  useTarget(pickStackAt(locked?innerWidth/2:event.clientX,locked?innerHeight/2:event.clientY));
});
canvas.addEventListener('dblclick',()=>{if(active&&!uiOpen&&!mobile)requestLook();});
document.addEventListener('pointerlockchange',()=>{if(!mobile&&active&&!uiOpen&&document.pointerLockElement!==canvas)pause();});
document.addEventListener('mousemove',event=>{if(uiOpen||!active)return;if(document.pointerLockElement===canvas){yaw-=event.movementX*.0021;pitch=clamp(pitch-event.movementY*.0021,-1.28,1.28);}else if(dragLook){yaw-=(event.clientX-dragLastX)*.0045;pitch=clamp(pitch-(event.clientY-dragLastY)*.0045,-1.28,1.28);dragLastX=event.clientX;dragLastY=event.clientY;}});
canvas.addEventListener('pointerdown',event=>{suppressClick=false;pressX=event.clientX;pressY=event.clientY;if(!active||uiOpen||mobile||document.pointerLockElement===canvas)return;dragLook=true;dragPointer=event.pointerId;dragLastX=event.clientX;dragLastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
function endDrag(event){if(event.pointerId===dragPointer){dragLook=false;dragPointer=null;}}
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',event=>{
  if($('mapDialog').open||$('arcadeGame').open||$('liftDialog').open||elevator.riding)return;
  if(currentDetailItem){
    const browsing=detailPanel.dataset.view==='stack';
    if(event.key==='Tab'){
      const controls=[...detailPanel.querySelectorAll('button:not(:disabled),a[href],select,input:not(:disabled),canvas[tabindex]')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }else if(event.key==='Escape'){
      event.preventDefault();if(!browsing&&browseStack)backToStack();else closeDetail();
    }else if(browsing&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){
      event.preventDefault();turnItem(event.key==='ArrowLeft'?-1:1);
    }else if(browsing&&!event.repeat&&(event.code==='KeyE'||event.key==='Enter'&&event.target===$('casePreview'))){
      event.preventDefault();moreInfo();
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
  if(event.code==='KeyV'&&!event.repeat&&!$('tvSound').classList.contains('hidden'))$('tvSound').click();
  if(event.code==='KeyE'&&!event.repeat){if(seated)stand();else inspect();}
  if(event.key==='Escape')pause();
});
document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
const joyEl=$('joystick'),stickEl=$('stick');
function updateJoy(e){const r=joyEl.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=len>39?39/len:1;joystick.x=dx*scale/39;joystick.y=-dy*scale/39;stickEl.style.left=`calc(50% + ${dx*scale}px)`;stickEl.style.top=`calc(50% + ${dy*scale}px)`;}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joystick.pointer=e.pointerId;joyEl.setPointerCapture(e.pointerId);updateJoy(e);});joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joystick.pointer)updateJoy(e);});
function releaseJoy(e){if(e.pointerId!==joystick.pointer)return;joystick.pointer=null;joystick.x=joystick.y=0;stickEl.style.left='50%';stickEl.style.top='50%';}joyEl.addEventListener('pointerup',releaseJoy);joyEl.addEventListener('pointercancel',releaseJoy);
const lookEl=$('lookPad');lookEl.addEventListener('pointerdown',e=>{e.preventDefault();lookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;lookStart={x:e.clientX,y:e.clientY,moved:false};lookEl.setPointerCapture(e.pointerId);});lookEl.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||uiOpen)return;if(lookStart&&Math.hypot(e.clientX-lookStart.x,e.clientY-lookStart.y)>12)lookStart.moved=true;yaw-=(e.clientX-lookLastX)*.005;pitch=clamp(pitch-(e.clientY-lookLastY)*.005,-1.25,1.25);lookLastX=e.clientX;lookLastY=e.clientY;});lookEl.addEventListener('pointerup',e=>{if(e.pointerId!==lookPointer)return;if(lookStart&&!lookStart.moved&&active&&!uiOpen){const id=pickStackAt(e.clientX,e.clientY);useTarget(id);}lookPointer=null;lookStart=null;});lookEl.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null;});
function tryMove(x,z){
  const h=groundAt(x,z,ground);
  if(h===null||Math.abs(h-ground)>.44)return;
  const onStair=inside(stair,x,z);
  if(onStair && z>stairStart && z<stairEnd && Math.abs(x+10)<.23)return;
  const floor=levelOf(h);
  if(elevator.blocks(x,z,floor))return;
  if(interior.obstacles.some(o=>o.level===floor && Math.abs(x-o.x)<o.w/2+.19 && Math.abs(z-o.z)<o.d/2+.19))return;
  if(interior.doors.some(door=>door.level===floor && door.blocks(x,z)))return;
  camera.position.x=x;camera.position.z=z;ground=h;
}
let bob=0;function updateMovement(dt){if(seated)return;let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+joystick.y;let s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joystick.x;const len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.2:3.5;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed*dt,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed*dt;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let i=0;i<steps;i++){tryMove(camera.position.x+dx/steps,camera.position.z);tryMove(camera.position.x,camera.position.z+dz/steps);}
  bob+=Math.hypot(dx,dz)*5;camera.position.y=ground+1.62+(len>.03?Math.sin(bob)*.022:0);refreshFloor();
}
function pickStackAt(clientX,clientY){
  raycaster.setFromCamera(new THREE.Vector2(clientX/innerWidth*2-1,-clientY/innerHeight*2+1),camera);
  const onStair=inside(stair,camera.position.x,camera.position.z);
  const visible=onStair?displayTargets.flat():displayTargets[level-1];
  const hits=raycaster.intersectObjects(interactables[level-1],false);
  raycaster.intersectObjects(visible,false,hits);
  if(!seated&&!onStair){
    const room=roomAt(level,camera.position.x,camera.position.z)?.id;
    const candidates=seatTargets[level-1].filter(target=>target.userData.seat.room===room);
    const seatHit=raycaster.intersectObjects(candidates,false)[0];
    if(seatHit&&seatHit.distance<=3.3&&(!hits.length||seatHit.distance<hits[0].distance))hits.unshift(seatHit);
  }
  const hit=hits[0];
  if(!hit||hit.distance>(hit.object.userData.display?14:8))return null;
  if(!hit.object.userData.item&&!hit.object.userData.device&&!hit.object.userData.seat)return null;
  const p=camera.position,q=hit.point;
  for(const wall of interior.occluders){
    if(!onStair && wall.level!==level)continue;
    const t=wall.w<wall.d?(wall.x-p.x)/(q.x-p.x):(wall.z-p.z)/(q.z-p.z);
    const height=p.y+(q.y-p.y)*t-(wall.level-1)*rise;
    if(height>=0&&height<=ceilingOf(wall.level)&&t>0&&t<1&&Math.abs(p.x+(q.x-p.x)*t-wall.x)<=wall.w/2&&Math.abs(p.z+(q.z-p.z)*t-wall.z)<=wall.d/2)return null;
  }
  return hit.object;

}
function updateFocus(){
  if(inside(lift,camera.position.x,camera.position.z)){
    focusedCase=null;outline(hoverFrame,null);selectCase(null);prompt.classList.add('hidden');return;
  }
  const aim=mobile||document.pointerLockElement===canvas;
  focusedCase=aim?pickStackAt(innerWidth/2,innerHeight/2):hasPointer?pickStackAt(hoverPoint.x,hoverPoint.y):null;
  outline(hoverFrame,focusedCase===selectedCase?null:focusedCase);
  canvas.style.cursor=focusedCase?'pointer':'';
  if(selectedCase){
    const display=selectedCase.userData.display;
    const inRange=selectedCase.userData.item && selectedCase.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position)<(display?14:5);
    const sameFloor=display?interior.floors[selectedCase.userData.level-1].visible:interactables[level-1].includes(selectedCase);
    if(!inRange||!sameFloor)selectCase(null);
  }
  if(focusedCase?.userData.seat){
    const action='Sit on '+focusedCase.userData.seat.label;
    prompt.classList.remove('hidden');$('displayDetails').classList.add('hidden');
    prompt.querySelector('.keycap').textContent=mobile?'Tap':aim?'E':'Click';
    $('promptText').textContent=action;$('touchInspect').textContent=action;return;
  }
  if(focusedCase?.userData.device){
    const info=focusedCase.userData;
    const touchDeck=mobile&&['vinyl','cassettes','cds'].includes(info.device);
    prompt.classList.toggle('hidden',touchDeck);$('displayDetails').classList.add('hidden');
    prompt.querySelector('.keycap').textContent=mobile?'Tap':aim?'E':'Click';
    const action=['bricks','drift'].includes(info.device)?'Play '+info.title:musicPlayer.description(info.device);
    $('promptText').textContent=action;$('touchInspect').textContent=action;
    return;
  }
  $('touchInspect').textContent='View item';
  const hoveredTV=focusedCase?.userData.display==='tv' && focusedCase!==selectedCase;
  const current=hoveredTV?focusedCase:selectedCase||focusedCase;
  const isSelected=current && current===selectedCase;
  const item=current?.userData.item;
  prompt.classList.toggle('hidden',!item);
  $('displayDetails').classList.toggle('hidden',!(isSelected && current.userData.display));
  if(!item)return;
  if(current.userData.display){
    prompt.querySelector('.keycap').textContent=isSelected&&!mobile?'E':'';
    $('promptText').textContent=(current.userData.display==='tv'?'Now playing · ':'')+item.title;
  }else{
    prompt.querySelector('.keycap').textContent=mobile?'':isSelected||aim?'E':'Click';
    $('promptText').textContent='Browse stack · '+item.title;
  }
}
const liftDialog=$('liftDialog'),liftAction=$('liftAction'),liftMessage=$('liftMessage');
function openLift(){
  if(uiOpen||!active||elevator.riding||!elevator.enclosed(camera.position.x,camera.position.z)||!elevator.available(level))return;
  uiOpen=true;keys.clear();document.exitPointerLock?.();
  for(const b of liftDialog.querySelectorAll('[data-floor]'))b.disabled=Number(b.dataset.floor)===level;
  liftDialog.showModal();
}
liftAction.onclick=openLift;
$('closeLift').onclick=()=>liftDialog.close();
liftDialog.addEventListener('close',()=>{uiOpen=false;keys.clear();});
for(const b of liftDialog.querySelectorAll('[data-floor]')){
  b.onclick=()=>{
    const target=Number(b.dataset.floor);
    if(elevator.request(target,level,camera.position.x,camera.position.z)){
      keys.clear();selectCase(null);liftDialog.close();
    }
  };
}
function updateLift(dt){
  const {x,z}=camera.position;
  const riding=elevator.riding;
  const state=elevator.update(dt,level,x,z);
  if(riding){
    ground=state.height;camera.position.y=ground+1.62;refreshFloor();
    if(state.arrived){yaw=Math.PI;pitch=0;camera.rotation.set(0,yaw,0,'YXZ');}
  }
  const within=elevator.enclosed(x,z),near=Math.abs(x+3.475)<1.18&&z>=-9.43&&z< -7.5;
  const ready=elevator.available(level);
  liftAction.classList.toggle('hidden',!(active&&!uiOpen&&within&&ready&&!elevator.riding));
  const status=elevator.riding?'Elevator in motion':near?(ready?'Step inside the elevator':'Elevator arriving'):'';
  if(liftMessage.textContent!==status)liftMessage.textContent=status;
  liftMessage.classList.toggle('hidden',!active||uiOpen||!status);
}
let roomFrameValid=false;
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.15);
  updateLift(dt);
  if(active&&!uiOpen){
    for(const door of interior.doors)door.update(dt,level,camera.position.x,camera.position.z);
  }
  if(active&&!uiOpen&&intro.classList.contains('hidden')){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.55;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.3,-1.28,1.28);if(!elevator.riding)updateMovement(dt);camera.rotation.y=yaw;camera.rotation.x=pitch;camera.updateMatrixWorld();updateFocus();}
  updatePosters(performance.now());
  interior.roomModels.tick(performance.now(),level);
  const currentRoom=roomAt(level,camera.position.x,camera.position.z)?.id;
  houseLights.hidden=currentRoom!=='cinema'||!active||uiOpen;
  televisions.update(camera,currentRoom,active);
  if(currentRoom!=='library'||(active&&!document.hidden&&!televisions.hasProgramme()))libraryScreenSelected=false;
  musicPlayer.update(active&&(currentRoom==='music'||currentRoom==='library'&&!libraryScreenSelected),dt);
  if(currentRoom==='music'){
    const now=musicPlayer.screen();
    televisions.music(now?.item||null,now?.label||'',now?.title||'');
  }
  // The camera is stationary behind the glass. Keep its last frame composited
  // so a touch gesture only redraws the inspected models.
  if(!currentDetailItem||!roomFrameValid){
    renderer.autoClear=false;renderer.clear();renderer.render(scene,camera);roomFrameValid=true;
  }
  preview.render();
}animate();
window.addEventListener('resize',()=>{
  roomFrameValid=false;
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
    button.style.left=(x+13)/28*100+'%';button.style.top=(z+11.4)/22.4*100+'%';
    button.style.width=(X-x)/28*100+'%';button.style.height=(Z-z)/22.4*100+'%';
    if(current)button.className='here';board.append(button);
  };
  const current=roomAt(level,camera.position.x,camera.position.z)?.id;
  for(const r of rooms.filter(r=>r.floor===mapLevel)){
    add(r.bounds,r.name,()=>{mapDialog.close();arrive(r.floor,...r.spawn);},r.id===current);
  }
  add(stair,'Stairs',()=>{mapDialog.close();arrive(mapLevel,mapLevel===3?-9:-11,-8.1,Math.PI);},inside(stair,camera.position.x,camera.position.z)&&level===mapLevel);
  add(lift,'Lift',()=>{mapDialog.close();arrive(mapLevel,-3.475,-7.95,0);},inside(lift,camera.position.x,camera.position.z)&&level===mapLevel);
  $('levelOne').setAttribute('aria-pressed',String(mapLevel===1));$('levelTwo').setAttribute('aria-pressed',String(mapLevel===2));$('levelThree').setAttribute('aria-pressed',String(mapLevel===3));
}
function openMap(){
  if(uiOpen||elevator.riding)return;uiOpen=true;keys.clear();document.exitPointerLock?.();mapLevel=level;drawMap();mapDialog.showModal();
}
$('mapBtn').onclick=openMap;$('closeMap').onclick=()=>mapDialog.close();
$('levelOne').onclick=()=>{mapLevel=1;drawMap();};$('levelTwo').onclick=()=>{mapLevel=2;drawMap();};$('levelThree').onclick=()=>{mapLevel=3;drawMap();};
mapDialog.addEventListener('close',()=>{uiOpen=false;});
function dismissCatalog(){if(!catalogPanel.classList.contains('hidden')){closeCatalog();$('browseBtn').focus({preventScroll:true});}}
enableMenuDrawer(catalogPanel,()=>drawer.compact,dismissCatalog);
enableMenuDrawer(mapDialog,()=>drawer.compact,()=>{if(mapDialog.open)mapDialog.close();});
mapDialog.addEventListener('click',event=>{
  if(!drawer.compact||event.target!==mapDialog)return;
  const b=mapDialog.getBoundingClientRect();
  if(event.clientY<b.top||event.clientY>b.bottom||event.clientX<b.left||event.clientX>b.right)mapDialog.close();
});

const reloadButton=$('reloadCollections');
reloadButton.disabled=false;
reloadButton.onclick=async()=>{
  if(reloadButton.disabled||elevator.riding)return;
  reloadButton.disabled=true;reloadButton.setAttribute('aria-busy','true');
  try{
    await loadCollections('reload');
    const view={active,ground,level,x:camera.position.x,z:camera.position.z,yaw,pitch,...seated};
    const seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;
    sessionStorage.setItem('myroom.shelfSeed',String(seed));
    sessionStorage.setItem('myroom.refreshVisit',JSON.stringify(view));
    location.reload();
  }catch{
    reloadButton.disabled=false;reloadButton.removeAttribute('aria-busy');
    showToast('Collections could not be refreshed. Try again.');
  }
};
if(restoredVisit){
  const v=restoredVisit;
  if(v.active&&levels.includes(v.level)&&[v.x,v.z,v.yaw,v.pitch,v.ground].every(Number.isFinite)){
    const room=roomAt(v.level,v.x,v.z);
    const obstacle=interior.obstacles.some(o=>o.level===v.level&&Math.abs(v.x-o.x)<o.w/2+.19&&Math.abs(v.z-o.z)<o.d/2+.19);
    if(inside(lift,v.x,v.z))arrive(v.level,-3.475,-7.95,0);
    else if(room&&obstacle)arrive(v.level,...room.spawn);
    else if(room||inside(stair,v.x,v.z)){
      arrive(v.level,v.x,v.z,v.yaw,v.pitch);ground=v.ground;camera.position.y=ground+1.62;refreshFloor();
    }
  }
  showToast('Collections refreshed · shelves shuffled');
}
