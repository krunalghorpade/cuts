import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {galleryMounts} from './gallery-mounts.js';

const second=1000,fade=460;
const pickIndex=n=>Math.floor(Math.random()*n);
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=pickIndex(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

export async function hangGallery(parent){
  const [manifest,profile]=await Promise.all([
    fetch(new URL('./gallery-art.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Gallery collection unavailable');return r.json();}),
    new GLTFLoader().loadAsync(new URL('./models/rooms/gallery-frame.glb',import.meta.url).href)
  ]);
  const works=manifest.artworks,deck=shuffle([...works]),used=new Set(),broken=new Set();
  const textureLoader=new T.TextureLoader(),panel=new T.PlaneGeometry(1,1);
  const board=new T.BoxGeometry(1,1,1),backing=new T.MeshStandardMaterial({color:'#242624',roughness:.89});
  const wire=new T.MeshStandardMaterial({color:'#505350',roughness:.49,metalness:.37});
  const rail=profile.scene.getObjectByProperty('isMesh',true);
  const exhibition=new T.Group();exhibition.name='My art room | Pinterest exhibition';
  const frames=[];
  function take(){
    // A shuffled bag exhausts eligible works before an image is shown again.
    if(!deck.some(work=>!used.has(work.id)&&!broken.has(work.id))){
      deck.splice(0,deck.length,...shuffle(works.filter(work=>!used.has(work.id)&&!broken.has(work.id))));
    }
    const i=deck.findIndex(work=>!used.has(work.id)&&!broken.has(work.id));
    if(i<0)return null;
    const work=deck.splice(i,1)[0];used.add(work.id);return work;
  }
  async function nextPrint(){
    let work;
    while((work=take())){
      try{
        const map=await textureLoader.loadAsync(new URL(work.image,import.meta.url).href);
        map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return {work,map};
      }catch{used.delete(work.id);broken.add(work.id);}
    }
    return null;
  }
  function mount(slot){
    const group=new T.Group();group.name=slot.id;group.position.set(slot.x,slot.y,slot.z);group.rotation.y=slot.angle;
    const print=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,opacity:1});
    const front=new T.Mesh(panel,print);front.position.z=.013;group.add(front);
    const back=new T.Mesh(board,backing);group.add(back);
    let reverse=null;
    if(slot.suspended){reverse=new T.Mesh(panel,print);reverse.rotation.y=Math.PI;reverse.position.z=-.013;group.add(reverse);}
    const pieces=Array.from({length:4},()=>new T.Mesh(rail.geometry,rail.material));
    for(const p of pieces)group.add(p);
    const wires=slot.suspended?[-1,1].map(()=>{const m=new T.Mesh(board,wire);group.add(m);return m;}):[];
    exhibition.add(group);
    return {slot,group,front,reverse,print,back,pieces,wires,current:null,due:0};
  }
  function fit(frame,entry){
    const {slot,front,reverse,back,pieces,wires,print,group}=frame;
    const aspect=entry.map.image.width/entry.map.image.height;
    const w=Math.min(slot.w-.052,(slot.h-.052)*aspect),h=w/aspect;
    const edge=.024;
    front.scale.set(w,h,1);reverse?.scale.copy(front.scale);back.scale.set(w+.014,h+.014,.024);
    pieces.forEach((p,i)=>{
      const sign=i%2?1:-1,vert=i>=2;
      p.position.set(vert?sign*(w+edge)/2:0,vert?0:sign*(h+edge)/2,0);
      p.rotation.z=vert?(sign<0?Math.PI/2:-Math.PI/2):(sign<0?Math.PI:0);
      p.scale.set(vert?h+edge*2:w,1,1);
    });
    for(let i=0;i<wires.length;i++){
      const top=h/2+.023,len=6.33-slot.y-top;
      wires[i].position.set((i?1:-1)*w*.32,top+len/2,0);wires[i].scale.set(.005,len,.005);
    }
    if(frame.current){used.delete(frame.current.work.id);frame.current.map.dispose();}
    frame.current=entry;group.userData={artworkId:entry.work.id,source:entry.work.source};
    print.map=entry.map;print.needsUpdate=true;
  }
  let clock=0,last=null,swapping=null,closed=false;
  function schedule(frame,from=clock){
    // Reserve nearby start times to let visitors see each replacement separately.
    let best=0,gap=-1;
    for(let i=0;i<40;i++){
      const due=from+(60+Math.random()*60)*second;
      const d=frames.reduce((a,f)=>f===frame||!f.due?a:Math.min(a,Math.abs(f.due-due)),Infinity);
      if(d>gap){best=due;gap=d;}if(d>=1.25*second)break;
    }
    frame.due=best;
  }
  for(const slot of galleryMounts)frames.push(mount(slot));
  await Promise.all(frames.map(async frame=>{
    const entry=await nextPrint();
    if(!entry){frame.group.visible=false;return;}
    fit(frame,entry);schedule(frame);
  }));
  if(!frames.some(f=>f.current))throw Error('Gallery images unavailable');
  parent.add(exhibition);
  function tick(now,visible){
    if(!visible||document.hidden){last=null;return;}
    if(last!==null)clock+=Math.min(now-last,1500);last=now;
    if(swapping){
      const s=swapping;
      if(!s.entry||clock<s.frame.due-fade)return;
      if(s.start===null)s.start=clock;
      const fraction=(clock-s.start)/fade;
      if(fraction<1){s.frame.print.opacity=Math.max(0,1-fraction);return;}
      if(!s.installed){fit(s.frame,s.entry);s.installed=true;}
      s.frame.print.opacity=Math.min(1,fraction-1);
      if(fraction>=2){schedule(s.frame,s.start+fade);swapping=null;}
      return;
    }
    const frame=frames.reduce((a,f)=>f.current&&(!a||f.due<a.due)?f:a,null);
    // Warm the next texture before its deadline. Keep its predecessor visible until it is ready.
    if(!frame||frame.due-clock>8*second||closed)return;
    swapping={frame,entry:null,start:null,installed:false};const transition=swapping;
    nextPrint().then(entry=>{
      if(entry){transition.entry=entry;}
      else{closed=true;swapping=null;}
    });
  }
  return {tick,group:exhibition};
}
