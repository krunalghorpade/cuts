import * as T from './vendor/three.module.js';
import {cinemaProgramme} from './cinema-programme.js';
export {installPosters} from './posters.js';
import {CSS3DRenderer} from './vendor/CSS3DRenderer.js';
import {createChannel,trailerSources} from './trailer-channel.js';

function slate(label,retro=false){
  const c=document.createElement('canvas');c.width=640;c.height=retro?480:360;
  const g=c.getContext('2d'),cx=c.width/2,cy=c.height/2;
  const glow=g.createRadialGradient(cx,cy,4,cx,cy,c.width*.6);
  glow.addColorStop(0,retro?'#183932':'#242628');glow.addColorStop(1,'#09100f');
  g.fillStyle=glow;g.fillRect(0,0,c.width,c.height);
  g.textAlign='center';g.fillStyle=retro?'#a1ba9b':'#d8d7cd';
  g.font=retro?'23px monospace':'24px Helvetica, Arial, sans-serif';
  g.fillText(label,cx,cy-5);
  g.font='15px monospace';g.fillText(retro?'STANDBY':'TRAILERS',cx,cy+25);
  if(retro){g.fillStyle='rgba(0,0,0,.13)';for(let y=0;y<c.height;y+=4)g.fillRect(0,y,c.width,1);}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshBasicMaterial({map,toneMapped:false});
}

const standby={
  cinema:cinemaProgramme(), television:slate('TV ROOM'),
  gaming:slate('GAME TRAILERS'), retro:slate('RETRO GAMING ROOM',true)
};
const windowMaterial=new T.ShaderMaterial({
  vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'void main(){gl_FragColor=vec4(0.0);}',blending:T.NoBlending
});

export function addTelevision(parent,room,x,y,z,w,h,reverse,retro){
  const channel=room;
  const screen=new T.Mesh(new T.PlaneGeometry(w,h),standby[channel]);
  screen.position.set(x,y,z);screen.rotation.y=reverse?Math.PI:0;parent.add(screen);
  screen.userData={display:"tv",width:w,height:h,item:null};
  return {screen,room,w,h,retro,channel};
}

export function installTelevisions(canvas,screens,roomStock,streams,openDetail){
  const renderer=new CSS3DRenderer(),scene=new T.Scene();
  renderer.domElement.className='room-televisions';renderer.domElement.setAttribute('aria-hidden','true');
  canvas.before(renderer.domElement);
  const channels=new Map();
  for(const tv of screens){
    const entries=[];
    for(const item of roomStock.get(tv.room)||[]){
      const sources=trailerSources(item,streams[item.id]);
      if(sources.length)entries.push({id:item.id,item,sources});
    }
    // Joint releases (e.g. Pokémon Red and Blue) share one original TV spot.
    const editions=new Map();
    for(const entry of entries){
      const key=JSON.stringify(entry.sources.map(s=>s.value));
      if(!editions.has(key))editions.set(key,[]);
      editions.get(key).push(entry);
    }
    for(const group of editions.values())for(const e of group)e.siblings=group.filter(other=>other!==e).map(other=>other.id);
    channels.set(tv.channel,createChannel(scene,entries,tv.retro,tv.room,standby,windowMaterial));
  }
  function resize(){renderer.setSize(canvas.clientWidth,canvas.clientHeight);}
  resize();window.addEventListener('resize',resize);
  const muteButton=document.getElementById('tvSound');
  const controls=document.getElementById('tvControls'),itemButton=document.getElementById('tvItem');
  const art=document.getElementById('tvArtwork'),title=document.getElementById('tvTitle');
  let currentItem=null,activeScreen=null;
  itemButton.onclick=()=>{if(currentItem)openDetail(currentItem);};
  function updateItem(item){
    if(currentItem===item)return;
    currentItem=item;itemButton.classList.toggle('hidden',!item);
    title.textContent=item?.title||'';
    art.classList.add('hidden');art.removeAttribute('src');
    if(item?.artwork){
      art.onload=()=>{if(currentItem===item)art.classList.remove('hidden');};
      art.src=item.artwork;
    }
  }
  let muted=false;
  try{muted=localStorage.getItem('myroom.tvMuted')==='true';}catch{}
  function syncSound(){
    channels.forEach(channel=>channel.sound(muted));
    muteButton.title=muted?'Unmute TVs':'Mute TVs';
    muteButton.setAttribute('aria-label',muteButton.title);muteButton.setAttribute('aria-pressed',String(muted));
  }
  syncSound();
  muteButton.onclick=()=>{
    muted=!muted;
    try{localStorage.setItem('myroom.tvMuted',String(muted));}catch{}
    syncSound();if(!muted)resume();
  };
  const resume=()=>channels.forEach(channel=>channel.resume());
  window.addEventListener('pointerdown',resume);window.addEventListener('keydown',resume);
  let activeRoom,hasScreen=false;
  function switchRoom(room,departed=false){
    activeRoom=room;hasScreen=false;activeScreen=null;
    channels.forEach((channel,name)=>{
      const tv=screens.find(s=>s.room===room && s.channel===name);
      channel.setScreen(tv||null,departed&&name!==room);
      if(tv){hasScreen=true;activeScreen=tv.screen;}
    });
    controls.classList.toggle("hidden",!hasScreen);muteButton.classList.toggle("hidden",!hasScreen);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)switchRoom(null);});
  return (camera,room,enabled)=>{
    const next=enabled&&!document.hidden?room:null,changed=next!==activeRoom;
    if(changed)switchRoom(next,enabled&&!document.hidden);
    updateItem(activeScreen?.userData.item||null);
    if(hasScreen)channels.forEach(ch=>ch.distance(camera.position));
    if(changed||hasScreen)renderer.render(scene,camera);
  };
}
