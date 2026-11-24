import * as THREE from './vendor/three.module.js';
import {createMediaCase} from './media.js';

// Broad strip lights give jewel lids, overwrap and molded edges a reflection when turned.
function inspectionStudio(){
  const image=document.createElement('canvas');image.width=256;image.height=128;
  const g=image.getContext('2d');
  const grad=g.createLinearGradient(0,0,0,128);
  grad.addColorStop(0,'#a4a6a7');grad.addColorStop(.52,'#626567');grad.addColorStop(1,'#252728');
  g.fillStyle=grad;g.fillRect(0,0,256,128);
  g.fillStyle='#f8f9fa';g.fillRect(24,27,27,48);g.fillRect(167,20,51,14);
  g.fillStyle='#d3d4d4';g.fillRect(109,49,9,50);
  const map=new THREE.CanvasTexture(image);map.mapping=THREE.EquirectangularReflectionMapping;
  map.colorSpace=THREE.SRGBColorSpace;return map;
}

export function createCasePreview(canvas,{onStep,onDetails,onTravel,onSeasonPick,onBoxTravel,onCaseTap}){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,20);
  camera.position.z=4.5;
  scene.add(new THREE.HemisphereLight(0xffffff,0x9c9c9c,1.6));
  for(const [x,y,z,power] of [[-3,4,4,2.4],[3,1,-2,2.2]]){
    const light=new THREE.DirectionalLight(0xffffff,power);
    light.position.set(x,y,z);scene.add(light);
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const vertical=new THREE.Vector3(0,1,0),horizontal=new THREE.Vector3(1,0,0);
  let renderer,entries=[],hero,mode='info',width=0,height=0,dirty=true;
  let pointer=null,lastTap=null,slideStart=0,openGeneration=0;
  let opening=null,progress=0,goal=0,lastTime=0;

  function prepare(){
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene.environment=inspectionStudio();scene.environmentIntensity=.53;
  }
  function dropInterior(){
    if(opening){hero.pivot.remove(opening.group);opening.dispose();opening=null;}
    if(hero)hero.group.visible=true;
    progress=goal=0;
  }
  function clear(){
    openGeneration++;dropInterior();
    for(const e of entries){scene.remove(e.pivot);e.dispose?.();}
    entries=[];hero=null;slideStart=0;dirty=true;
  }
  function releasePointer(){
    if(pointer&&canvas.hasPointerCapture(pointer.id))canvas.releasePointerCapture(pointer.id);
    pointer=null;
  }
  function hide(){releasePointer();clear();lastTap=null;}
  function home(entry){
    if(entry.item.exhibit)entry.pivot.rotation.set(.16,.12,0,'YXZ');
    else entry.pivot.rotation.set(.075,-.19,0,'YXZ');
    dirty=true;
  }
  function reset(){if(hero)home(hero);}
  function show(item,{previous=null,next=null,step=0,view='info'}={}){
    prepare();releasePointer();lastTap=null;
    openGeneration++;dropInterior();
    const oldHero=hero,existing=new Map(entries.map(entry=>[entry.item.id,entry]));
    entries=[];hero=null;mode=view;
    for(const [slot,record] of [[-1,previous],[0,item],[1,next]]){
      if(!record)continue;
      let entry=existing.get(record.id);
      if(entry)existing.delete(record.id);
      else{
        const model=record.exhibit?{group:record.exhibit.model.clone(true),textures:[]}:createMediaCase(record);
        const pivot=new THREE.Group(),bounds=new THREE.Box3().setFromObject(model.group);
        model.group.position.sub(bounds.getCenter(new THREE.Vector3()));
        pivot.add(model.group);scene.add(pivot);
        entry={...model,pivot,item:record,size:bounds.getSize(new THREE.Vector3()),versions:[]};
      }
      entry.slot=slot;entries.push(entry);
      if(!slot){hero=entry;if(hero!==oldHero)home(hero);}
      else entry.pivot.rotation.set(.065,-slot*.48,0,'YXZ');
    }
    for(const entry of existing.values()){scene.remove(entry.pivot);entry.dispose?.();}
    slideStart=step&&!reduced.matches?performance.now():0;
    for(const e of entries)e.start=e.slot+step;
    canvas.setAttribute('aria-label',(view==='stack'?'Browse stack. ':'Rotate ')+item.title+
      (view==='stack'?'. Choose More info for item details.':'. Drag to rotate, or use the arrow keys. Home resets the view.'));
    dirty=true;
  }

  function replaceInterior(entry,build){
    const previous=opening?progress:0;
    dropInterior();
    opening=build();
    opening.restPosition=opening.group.position.clone();
    const samples=opening.boxSet?31:13;
    opening.frames=Array.from({length:samples},(_,i)=>{
      opening.setOpen(i/(samples-1));
      const box=opening.measure?.()||new THREE.Box3().setFromObject(opening.group);
      return {center:box.getCenter(new THREE.Vector3()),size:box.getSize(new THREE.Vector3())};
    });
    opening.versions=[];progress=previous;entry.group.visible=false;entry.pivot.add(opening.group);
  }

  async function setBoxStage(stage,season,page,position=null){
    const ticket=++openGeneration,entry=hero;
    if(!entry?.item.seasons||mode!=='info')return;
    if(stage&&(!opening||opening.seasonIndex!==season||opening.page!==page)){
      const {createBoxSet}=await import('./open-box-set.js');
      if(ticket!==openGeneration||entry!==hero)return;
      replaceInterior(entry,()=>createBoxSet(entry.item,entry.spec,entry.group,season,page));
    }
    if(!opening)return;
    goal=stage/3;
    if(position!==null)progress=goal=(1+THREE.MathUtils.clamp(position,0,1))/3;
    lastTime=performance.now();dirty=true;render();
  }

  async function setCaseOpen(value,mediumIndex=0,position=null){
    const token=++openGeneration,entry=hero;
    if(!entry||mode!=='info')return;
    if(value&&(!opening||opening.mediumIndex!==mediumIndex)){
      const kind=entry.item.releaseKind;
      let build;
      if(kind==='vinyl'||kind==='cassette'){
        const {createOpenMusicCase}=await import('./open-music-case.js');
        build=()=>createOpenMusicCase(entry.item,entry.spec,entry.group);
      }else if(kind){
        const [{createOpticalCase},{mediumPrint,musicLiner},{caseInserts}]=await Promise.all([
          import('./open-game-case.js'),import('./medium-print.js'),import('./case-inserts.js')]);
        build=()=>createOpticalCase(entry.item,entry.spec,mediumPrint(entry.item,kind),owned=>caseInserts(entry.group,owned),kind==='cd'?musicLiner(entry.item,false):null);
      }else{
        const {createOpenGameCase}=await import('./open-game-case.js');
        build=()=>createOpenGameCase(entry.item,entry.spec,mediumIndex);
      }
      if(token!==openGeneration||entry!==hero)return;
      replaceInterior(entry,build);
      opening.mediumIndex=mediumIndex;
    }
    if(!opening)return;
    goal=value?1:0;
    if(position!==null){
      // Invert smoothstep so manual travel agrees exactly with the slider.
      const distance=THREE.MathUtils.clamp(position,0,1);
      progress=goal=.5-Math.sin(Math.asin(1-2*distance)/3);
      if(distance===0||distance===1)progress=goal=distance;
    }
    lastTime=performance.now();dirty=true;render();
  }
  function rotate(dx,dy){
    if(!hero)return;
    hero.pivot.rotateOnWorldAxis(vertical,dx);hero.pivot.rotateOnWorldAxis(horizontal,dy);dirty=true;
  }
  function hitSlot(x,y){
    const b=canvas.getBoundingClientRect();
    ndc.set((x-b.left)/b.width*2-1,1-(y-b.top)/b.height*2);
    ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects(entries.map(e=>e.pivot),true)[0];
    if(!hit)return null;
    for(let n=hit.object;n;n=n.parent){const e=entries.find(e=>e.pivot===n);if(e)return e.slot;}
    return null;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!hero||pointer||event.button!==0)return;
    event.preventDefault();canvas.focus({preventScroll:true});
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,
      swipe:mode==='stack'&&entries.length>1&&event.pointerType!=='mouse',moved:false};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(pointer?.id!==event.pointerId)return;
    const p=pointer;
    if(Math.hypot(event.clientX-p.startX,event.clientY-p.startY)>6)p.moved=true;
    if(!p.moved)return;
    if(!p.swipe){
      const radians=2*Math.PI/Math.max(180,canvas.clientWidth*.84);
      rotate((event.clientX-p.x)*radians,(event.clientY-p.y)*radians);
    }
    p.x=event.clientX;p.y=event.clientY;
  });
  canvas.addEventListener('pointerup',event=>{
    if(pointer?.id!==event.pointerId)return;
    const p=pointer;releasePointer();
    const tap = !p.moved && Math.hypot(event.clientX-p.startX,event.clientY-p.startY)<=8;
    const now=performance.now();
    const doubleTap=tap && lastTap?.item===hero.item.id &&
      Math.min(event.timeStamp-lastTap.eventTime,now-lastTap.time)<480 &&
      Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<28;
    const remember=()=>({time:now,eventTime:event.timeStamp,x:event.clientX,y:event.clientY,item:hero.item.id});
    if(mode==='info'){
      if(!tap){lastTap=null;return;}
      const b=canvas.getBoundingClientRect();
      ndc.set((event.clientX-b.left)/b.width*2-1,1-(event.clientY-b.top)/b.height*2);
      ray.setFromCamera(ndc,camera);
      const hit=ray.intersectObject(opening?.group||hero.group,true).find(hit=>{
        for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;
        return true;
      });
      if(!hit){lastTap=null;return;}
      const season=hit.object.userData.seasonIndex;
      if(opening?.boxSet && goal===1/3 && Number.isInteger(season))onSeasonPick?.(season);
      if(event.pointerType==='touch'){
        if(doubleTap){lastTap=null;onCaseTap?.(season);}
        else lastTap=remember();
      }
      return;
    }
    const dx=event.clientX-p.startX,dy=event.clientY-p.startY;
    if(p.swipe&&Math.abs(dx)>=28&&Math.abs(dx)>Math.abs(dy)*1.15){
      lastTap=null;onStep(dx<0?1:-1);return;
    }
    if(p.moved||Math.hypot(dx,dy)>8){lastTap=null;return;}
    if(doubleTap){
      lastTap=null;onDetails();return;
    }
    const slot=hitSlot(event.clientX,event.clientY);
    if(slot===null){lastTap=null;return;}
    if(slot)onStep(slot);
    lastTap=remember();
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
    if(pointer?.id===event.pointerId)pointer=null;
  });
  canvas.addEventListener('keydown',event=>{
    const steps={ArrowLeft:[-.22,0],ArrowRight:[.22,0],ArrowUp:[0,-.22],ArrowDown:[0,.22]};
    if(mode==='stack'&&['ArrowLeft','ArrowRight'].includes(event.key)&&!event.shiftKey)return;
    if(event.key!=='Home'&&!steps[event.key])return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Home')reset();else rotate(...steps[event.key]);
  });

  const center=new THREE.Vector3(),size=new THREE.Vector3();
  const corner=new THREE.Vector3();
  function fitBoxSet(dims,pivot,fill){
    const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*.84;
    const tanX=tanY/.84*camera.aspect*fill;
    let limit=Infinity;
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
      corner.set(dims.x*x,dims.y*y,dims.z*z).applyQuaternion(pivot.quaternion);
      // For each corner, include its depth in the perspective fit.
      const extent=Math.max(Math.abs(corner.x)/tanX,Math.abs(corner.y)/tanY)+corner.z;
      if(extent>0)limit=Math.min(limit,camera.position.z/extent);
    }
    return limit;
  }
  function render(){
    if(!hero)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    if(w!==width||h!==height){
      width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;
    }
    const now=performance.now();
    const textureChanged=e=>e.textures.some((t,i)=>t.version!==e.versions[i]);
    if(!dirty&&!slideStart&&progress===goal&&!entries.some(textureChanged)&&!(opening&&textureChanged(opening)))return;
    const t=slideStart?Math.min(1,(now-slideStart)/230):1;
    if(opening){
      const duration=opening.boxSet?1740:410;
      const travel=reduced.matches?1:Math.min(1,Math.max(.001,(now-lastTime)/duration));
      progress+=Math.sign(goal-progress)*Math.min(travel,Math.abs(goal-progress));lastTime=now;
      const amount=opening.boxSet?progress:progress*progress*(3-2*progress);
      opening.setOpen(amount);
      if(hero.item.releaseKind==='vinyl')onTravel?.(amount);
      if(opening.boxSet)onBoxTravel?.(THREE.MathUtils.clamp(3*amount-1,0,1));
      const frame=amount*(opening.frames.length-1),index=Math.floor(frame);
      const a=opening.frames[index],b=opening.frames[Math.min(index+1,opening.frames.length-1)];
      center.lerpVectors(a.center,b.center,frame-index);
      opening.group.position.copy(opening.restPosition).sub(center);
      size.lerpVectors(a.size,b.size,frame-index);
      opening.versions=opening.textures.map(t=>t.version);
      if(!progress&&!goal)dropInterior();
    }
    const visibleH=2*camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5)),visibleW=visibleH*camera.aspect;
    for(const e of entries){
      const position=e.slot+(e.start-e.slot)*(1-t)**3,side=Math.min(1,Math.abs(position));
      const dims=e===hero&&opening?size:e.size;
      const fill=mode==='stack'&&entries.length>1?.68:.89;
      const scale=Math.min(visibleH*.84/Math.max(dims.y,.001),visibleW*fill/Math.max(dims.x,dims.z,.001));
      e.pivot.position.set(position*visibleW*.54,-side*visibleH*.026,-side*.32);
      const fitted=e===hero&&opening?.boxSet?Math.min(scale,fitBoxSet(dims,e.pivot,fill)):scale;
      e.pivot.scale.setScalar(fitted*(1-.24*side));e.versions=e.textures.map(texture=>texture.version);
    }
    if(t===1)slideStart=0;
    renderer.render(scene,camera);dirty=false;
  }
  return {show,hide,reset,render,setCaseOpen,setBoxStage};
}
