import * as T from './vendor/three.module.js';

const recordSpeed=2*Math.PI*(33+1/3)/60;
const modelURL=new URL('./models/vinyl-player.glb',import.meta.url).href;

function printSurface(width,height,geometry){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return {ctx:canvas.getContext('2d'),map,mesh:new T.Mesh(geometry,new T.MeshBasicMaterial({map,toneMapped:false}))};
}
function coverImage(ctx,image){
  const side=Math.min(image.naturalWidth,image.naturalHeight);
  ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,ctx.canvas.width,ctx.canvas.height);
}
export function turntable({group,box,walnut},x,y,z){
  const base=new T.Group();base.name='Vinyl listening deck';
  base.position.set(x,y,z);base.rotation.y=Math.PI;group.add(base);
  const sleeve=new T.Group();sleeve.name='Now playing record sleeve';
  sleeve.position.set(x-.438,y+.174,z+.035);
  sleeve.rotation.set(-.17,Math.PI,0,'YXZ');sleeve.visible=false;group.add(sleeve);
  const board=new T.Mesh(new T.BoxGeometry(.316,.316,.004),new T.MeshStandardMaterial({color:'#bcad96',roughness:.85}));
  const print=printSurface(512,512,new T.PlaneGeometry(.314,.314));
  sleeve.add(board,print.mesh);print.mesh.position.z=.0022;
  print.mesh.userData={display:'case',level:2,item:null,width:.314,height:.314};
  print.mesh.raycast=function(ray,hits){if(sleeve.visible)T.Mesh.prototype.raycast.call(this,ray,hits);};
  box(x-.438,y+.011,z+.03,.265,.022,.145,walnut);
  box(x-.438,y+.024,z-.014,.25,.021,.009,'#a19a84');
  box(x-.438,y+.052,z+.061,.074,.084,.012,walnut,-.17);
  const label=printSurface(256,256,new T.CircleGeometry(.050,72));label.mesh.rotation.x=-Math.PI/2;
  let rotor,pressing,arm,loading=false,retryAt=0;
  let record=null,cover=null,labelItem=null,labelImage=null;
  let phase=0,seconds=0,armAngle=0;
  function sync(){
    sleeve.visible=Boolean(record&&cover);print.mesh.userData.item=sleeve.visible?record:null;
    if(pressing)pressing.visible=Boolean(record);
    if(!record||labelItem===record&&labelImage===cover)return;
    labelItem=record;labelImage=cover;
    const g=label.ctx;
    if(cover){
      coverImage(print.ctx,cover);print.map.needsUpdate=true;
      coverImage(g,cover);
      g.fillStyle='rgba(27,20,14,.25)';g.fillRect(0,0,256,256);
    }else{
      g.fillStyle='#bda680';g.fillRect(0,0,256,256);
    }
    g.fillStyle='#e9dcbc';g.fillRect(0,156,256,55);
    g.textAlign='center';g.fillStyle='#2b2925';g.font='bold 16px Helvetica,Arial,sans-serif';
    g.fillText(record.title,128,179,198);
    g.font='12px Helvetica,Arial,sans-serif';g.fillText(record.creator||'',128,197,190);
    g.beginPath();g.arc(128,128,10,0,2*Math.PI);g.fillStyle='#b8a88d';g.fill();
    label.map.needsUpdate=true;
  }
  async function loadDeck(){
    if(rotor||loading||performance.now()<retryAt)return;
    loading=true;
    try{
      const {GLTFLoader}=await import('./vendor/GLTFLoader.js');
      const {scene}=await new GLTFLoader().loadAsync(modelURL);
      const disc=scene.getObjectByName('Pressing'),motor=scene.getObjectByName('Rotor'),tonearm=scene.getObjectByName('Tonearm');
      if(!disc||!motor||!tonearm)throw new Error('Missing turntable mechanism');
      rotor=motor;pressing=disc;arm=tonearm;
      label.mesh.position.y=.01665;pressing.add(label.mesh);base.add(scene);
      rotor.rotation.y=phase;arm.rotation.order='YXZ';arm.rotation.y=armAngle;sync();
    }catch(error){
      retryAt=performance.now()+15000;
      console.warn('Unable to load the turntable model.',error);
    }finally{loading=false;}
  }
  if(window.requestIdleCallback)window.requestIdleCallback(loadDeck,{timeout:3500});
  else window.setTimeout(loadDeck,800);
  return {coverTarget:print.mesh,show({item,image}){
    if(item?.id!==record?.id)seconds=0;
    record=item;cover=image;
    if(!item){labelItem=null;labelImage=null;}
    sync();
  },updateMechanism(dt,playing){
    if(!rotor&&!loading&&performance.now()>=retryAt)void loadDeck();
    if(playing){phase=(phase-dt*recordSpeed)%(2*Math.PI);seconds+=dt;}
    const target=record?-T.MathUtils.degToRad(25+Math.min(seconds/30,1)*2):0;
    armAngle=T.MathUtils.damp(armAngle,target,4,dt);
    if(rotor)rotor.rotation.y=phase;
    if(arm){
      arm.rotation.y=armAngle;
      arm.rotation.x=T.MathUtils.degToRad(.8)*T.MathUtils.clamp(-armAngle/.43,0,1);
    }
  }};
}
