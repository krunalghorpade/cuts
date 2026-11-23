import * as T from './vendor/three.module.js';
import {rise,groundAt} from './plan.js';
import {CSS3DObject,CSS3DRenderer} from './vendor/CSS3DRenderer.js';

const minute=60000;
const quarter=Math.PI/2;
// Each position is on the room-facing side of a wall, in metres from its floor.
function row(level,xs,y,z,angle,width){
  return xs.map(x=>[level,x,y,z,angle,width]);
}
function stairFlight(x,angle){
  return [-4.55,-5.57,-6.59,-7.61].map(z=>{
    const center=groundAt(x,z,0)+1.55,level=center>=rise?2:1;
    return [level,x,center-(level-1)*rise,z,angle,.58];
  });
}
const frames=[
  ...row(1,[-11.45,-10.25,-9.05],2.22,6.125,0,.65),
  ...row(1,[4.72,5.75,6.78],2.35,-5.875,0,.65),
  [1,7.875,2.17,-4.65,-quarter,.82],[1,7.875,2.15,2.72,-quarter,.64],
  ...row(1,[-.66,.44,1.54,2.64,3.74,4.84],2.43,5.875,Math.PI,.68),
  ...row(1,[-11.67,-10.44,-9.21],2.35,10.875,Math.PI,.79),
  [1,8.125,2.23,-6.24,quarter,.82],[1,8.125,2.23,-7.42,quarter,.82],
  [1,13.875,2.28,4.62,-quarter,.65],
  ...row(2,[-3.46,-2.55],2.30,-5.875,0,.61),
  ...row(2,[2.00,2.90,3.80],2.30,-5.875,0,.61),
  [2,7.875,2.06,-.72,-quarter,.85],[2,7.875,2.06,.54,-quarter,.85],
  ...row(2,[-11.28,-10.18,-9.08],2.24,6.125,0,.76),
  ...row(2,[9.64,10.74,11.84,12.94,14.04],2.33,-8.875,0,.68),
  ...row(2,[10.28,11.44,12.60],2.18,3.125,0,.78),
  ...stairFlight(-11.875,quarter),...stairFlight(-8.125,-quarter),
  ...row(1,[-11.15,-10,-8.85],rise/2+1.55,-8.875,0,.68)
];

function shuffled(entries){
  const a=entries.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

export function installPosters(floors,items,targets){
  const artwork=items.filter(i=>i.artwork && ['movies','shows','anime','game-discs','cartridges'].includes(i.category));
  const slots=frames.slice(0,artwork.length);
  if(!slots.length)return ()=>{};
  const w=224,h=320,cols=Math.ceil(Math.sqrt(slots.length*h/w)),rows=Math.ceil(slots.length/cols);
  const atlas=document.createElement('canvas');atlas.width=cols*w;atlas.height=rows*h;
  const ctx=atlas.getContext('2d',{alpha:false});
  const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;
  const imageMat=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  const metal=new T.MeshStandardMaterial({color:'#252725',metalness:.46,roughness:.43});
  const current=Array(slots.length).fill(null),panels=[];
  slots.forEach(([level,x,y,z,angle,width],index)=>{
    const mount=new T.Group(),height=width*h/w;
    mount.position.set(x,y,z);mount.rotation.y=angle;floors[level-1].add(mount);
    mount.add(new T.Mesh(new T.BoxGeometry(width+.044,height+.044,.043),metal));
    const face=new T.PlaneGeometry(width,height),uv=face.attributes.uv;
    const sx=(index%cols)*w,sy=Math.floor(index/cols)*h;
    for(let i=0;i<uv.count;i++){
      uv.setXY(i,(sx+.5+uv.getX(i)*(w-1))/atlas.width,1-(sy+.5+(1-uv.getY(i))*(h-1))/atlas.height);
    }
    const panel=new T.Mesh(face,imageMat);panel.position.z=.023;mount.add(panel);
    panel.userData={display:"poster",width,height,level};panels.push(panel);targets[level-1].push(panel);
  });
  let loading=false,deadline=0;
  async function rotate(){
    loading=true;
    const used=new Set(current),fresh=shuffled(artwork.filter(url=>!used.has(url)));
    let next=fresh;
    if(fresh.length<slots.length){
      const start=Math.max(0,artwork.indexOf(current[0])+1)%artwork.length;
      next=artwork.slice(start).concat(artwork.slice(0,start));
    }
    try{
      const images=await Promise.all(next.slice(0,slots.length).map(async item=>{
        const img=new Image();img.src=item.artwork;
        try{await img.decode();return img;}catch{return null;}
      }));
      images.forEach((img,i)=>{
        if(!img)return;
        const x=i%cols*w,y=Math.floor(i/cols)*h;
        const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale;
        ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);
        current[i]=next[i];panels[i].userData.item=next[i];
      });
      texture.needsUpdate=true;
    }finally{loading=false;}
  }
  return now=>{
    if(!loading && now>=deadline){
      deadline=now+minute;
      void rotate();
    }
  };
}

function slate(retro){
  const c=document.createElement('canvas');c.width=640;c.height=retro?480:360;
  const g=c.getContext('2d'),cx=c.width/2,cy=c.height/2;
  const glow=g.createRadialGradient(cx,cy,4,cx,cy,c.width*.6);
  glow.addColorStop(0,retro?'#183932':'#242628');glow.addColorStop(1,'#09100f');
  g.fillStyle=glow;g.fillRect(0,0,c.width,c.height);
  g.textAlign='center';g.fillStyle=retro?'#a1ba9b':'#d8d7cd';
  g.font=retro?'23px monospace':'24px Helvetica, Arial, sans-serif';
  g.fillText(retro?'CARTRIDGE CHANNEL':'MY ROOM CINEMA',cx,cy-5);
  g.font='15px monospace';g.fillText(retro?'STANDBY':'TRAILERS',cx,cy+25);
  if(retro){g.fillStyle='rgba(0,0,0,.13)';for(let y=0;y<c.height;y+=4)g.fillRect(0,y,c.width,1);}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshBasicMaterial({map,toneMapped:false});
}

const standby=[slate(false),slate(true)];
const windowMaterial=new T.ShaderMaterial({
  vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'void main(){gl_FragColor=vec4(0.0);}',blending:T.NoBlending
});

export function addTelevision(parent,room,x,y,z,w,h,reverse,retro){
  const screen=new T.Mesh(new T.PlaneGeometry(w,h),standby[Number(retro)]);
  screen.position.set(x,y,z);screen.rotation.y=reverse?Math.PI:0;parent.add(screen);
  screen.userData={display:"tv",width:w,height:h,item:null};
  return {screen,room,w,h,retro};
}

// Cross-origin movie streams stay in ordinary video players. The depth-tested
// WebGL screen cuts a window onto the matching CSS 3D plane behind the canvas.
function createChannel(scene,entries,retro){
  if(!entries.length)return {setScreen(){},sound(){},resume(){},distance(){}};
  const video=document.createElement('video');
  video.muted=true;video.playsInline=true;video.preload='none';
  video.disablePictureInPicture=true;video.tabIndex=-1;
  video.style.cssText='width:640px;height:'+ (retro?480:360)+'px;object-fit:contain;background:black;pointer-events:none';
  const plane=new CSS3DObject(video);plane.visible=false;scene.add(plane);
  let tv=null,record=null,queue=[],last=null,skipped=new Set(),timer=0,blocked=false;
  let muted=false,needsGesture=false;
  function sound(value){
    muted=value;video.muted=muted||needsGesture;
  }
  function showVideo(on){
    if(!tv)return;
    tv.screen.material=on?windowMaterial:standby[Number(retro)];
    tv.screen.userData.item=on?record?.item:null;
  }
  function watch(ms,callback){clearTimeout(timer);timer=setTimeout(callback,ms);}
  function play(){
    if(!tv||!record)return;
    const attempt=record;
    video.play().catch(error=>{
      if(attempt!==record||!tv||error.name==='AbortError')return;
      if(error.name==='NotAllowedError'){
        if(!video.muted){needsGesture=true;video.muted=true;play();}
        else{blocked=true;clearTimeout(timer);}
      }
      else fail();
    });
  }
  function next(){
    clearTimeout(timer);showVideo(false);blocked=false;
    if(!tv)return;
    if(!queue.length){
      queue=shuffled(entries.filter(entry=>!skipped.has(entry)));
      if(queue.length>1 && queue.at(-1).id===last){queue.unshift(queue.pop());}
    }
    record=queue.pop();
    if(!record){watch(minute,()=>{skipped.clear();next();});return;}
    last=record.id;video.muted=muted||needsGesture;video.src=record.url;video.title=record.item.title+' trailer';
    watch(20000,fail);play();
  }
  function fail(){
    if(!tv||!record)return;
    skipped.add(record);video.pause();next();
  }
  video.addEventListener('error',fail);
  video.addEventListener('playing',()=>{clearTimeout(timer);blocked=false;showVideo(true);});
  video.addEventListener('waiting',()=>{if(tv&&!blocked)watch(20000,fail);});
  video.addEventListener('ended',()=>{skipped.clear();next();});
  function setScreen(nextTV){
    if(nextTV===tv)return;
    showVideo(false);tv=nextTV;plane.visible=Boolean(tv);clearTimeout(timer);
    if(!tv){video.pause();return;}
    tv.screen.getWorldPosition(plane.position);tv.screen.getWorldQuaternion(plane.quaternion);
    plane.scale.set(tv.w/640,tv.h/(retro?480:360),1);
    if(!record||video.ended){next();return;}
    if(!video.paused && video.readyState>=2)showVideo(true);
    else{watch(20000,fail);play();}
  }
  return {setScreen,sound,resume(){
    if(!tv)return;
    if(needsGesture&&!muted){needsGesture=false;video.muted=false;play();}
    else if(blocked){blocked=false;play();}
  },distance(position){
    if(tv)video.volume=Math.min(1,1/(1+.12*Math.max(0,position.distanceTo(plane.position)-1)**1.5));
  }};
}

export function installTelevisions(canvas,screens,items,streams){
  const renderer=new CSS3DRenderer(),scene=new T.Scene();
  renderer.domElement.className='room-televisions';renderer.domElement.setAttribute('aria-hidden','true');
  canvas.before(renderer.domElement);
  const byChannel=[[],[]];
  for(const item of items){
    const url=item.trailerUrl||streams[item.id]?.url;
    if(!url)continue;
    if(['movies','shows','anime','game-discs','cartridges'].includes(item.category)){
      const entry={id:item.id,item,url};
      byChannel[0].push(entry);
      if(item.category==='cartridges' && item.legacyCartridge===true)byChannel[1].push(entry);
    }
  }
  const channels=byChannel.map((entries,index)=>createChannel(scene,entries,Boolean(index)));
  function resize(){renderer.setSize(canvas.clientWidth,canvas.clientHeight);}
  resize();window.addEventListener('resize',resize);
  const muteButton=document.getElementById('tvSound');
  let muted=false;
  try{muted=localStorage.getItem('myroom.tvMuted')==='true';}catch{}
  function syncSound(){
    channels.forEach(channel=>channel.sound(muted));
    muteButton.textContent=muted?'Unmute TVs':'Mute TVs';
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
  function switchRoom(room){
    activeRoom=room;hasScreen=false;
    channels.forEach((channel,index)=>{
      const tv=screens.find(s=>s.room===room && Number(s.retro)===index);
      channel.setScreen(tv||null);
      if(tv)hasScreen=true;
    });
    muteButton.classList.toggle("hidden",!hasScreen);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)switchRoom(null);});
  return (camera,room,enabled)=>{
    const next=enabled&&!document.hidden?room:null,changed=next!==activeRoom;
    if(changed)switchRoom(next);
    if(hasScreen)channels.forEach(ch=>ch.distance(camera.position));
    if(changed||hasScreen)renderer.render(scene,camera);
  };
}
