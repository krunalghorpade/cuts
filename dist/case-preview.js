import * as THREE from './vendor/three.module.js';
import {createMediaCase, coverTexture, caseSpec} from './media.js';

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

export function createCasePreview(canvas, items) {
  // One display scale preserves the proportions of every box set in the carousel.
  const sets=items.filter(item=>item.category==='shows'||item.category==='anime').map(caseSpec);
  const boxDiagonal=Math.max(.20,...sets.map(spec=>Math.hypot(spec.w,spec.h,spec.d)));
  let renderer, model, drag = null, dirty = true, started=0;
  let entries=[];
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .01, 15);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 1.65));
  for (const [x, y, z, intensity] of [[-3, 4, 4, 2.4], [3, 1, -2, 2.2]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(x, y, z); scene.add(light);
  }

  function reset() {
    if (!model) return;
    if(entries.length)model.rotation.set(.09, -.38, -.015, 'YXZ');
    else model.rotation.set(.16, .12, 0, 'YXZ');
    dirty = true;
  }

  function rotate(dx, dy) {
    if (!model) return;
    model.rotateOnWorldAxis(new THREE.Vector3(0,1,0), dx);
    model.rotateOnWorldAxis(new THREE.Vector3(1,0,0), dy);
    dirty = true;
  }

  canvas.addEventListener('pointerdown', event => {
    if (!model || drag || event.button !== 0) return;
    event.preventDefault(); canvas.focus({preventScroll:true});
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const sensitivity = Math.PI / Math.max(110, canvas.clientWidth * .55);
    rotate((event.clientX-drag.x)*sensitivity, (event.clientY-drag.y)*sensitivity);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  function release(event) { if (event.pointerId === drag?.id) drag = null; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', event => {
    const steps={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,-.16],ArrowDown:[0,.16]};
    if (['ArrowLeft','ArrowRight'].includes(event.key) && !event.shiftKey) return;
    if (!steps[event.key] && event.key!=='Home') return;
    event.preventDefault(); event.stopPropagation();
    if(event.key==='Home')reset();else rotate(...steps[event.key]);
  });

  function hide() {
    if(drag && canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);
    drag=null;
    for(const entry of entries){scene.remove(entry.group);entry.dispose();}
    if(model&&entries.length===0)scene.remove(model);
    entries=[];
    model=null;
  }

  function prepareRenderer() {
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    scene.environment=inspectionStudio();scene.environmentIntensity=.53;
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  }

  function showModel(source,title) {
    hide();prepareRenderer();
    const display=source.clone(true), bounds=new THREE.Box3().setFromObject(display);
    const pivot=new THREE.Group();
    display.position.sub(bounds.getCenter(new THREE.Vector3()));pivot.add(display);
    pivot.scale.setScalar(2.25/bounds.getSize(new THREE.Vector3()).length());
    scene.add(pivot);model=pivot;
    canvas.setAttribute('aria-label','Rotate '+title+'. Drag to rotate. Home resets the view.');
    reset();started=0;render();
  }

  function show(item,previous,next,direction=0) {
    const oldSlots=new Map(entries.map(entry=>[entry.id,entry.slot]));
    hide();prepareRenderer();
    for(const [target,record] of [[-1,previous],[0,item],[1,next]]){
      if(!record)continue;
      const {group,spec,dispose}=createMediaCase(record);
      const start=oldSlots.get(record.id) ?? target+direction;
      entries.push({id:record.id,group,dispose,texture:coverTexture(record),version:-1,
        start,slot:start,target,scale:2/(spec.kind==='boxset'?boxDiagonal:Math.hypot(spec.w,spec.h,spec.d))});
      scene.add(group);
      if(target!==0){
        group.rotation.set(.06,-target*.42,0,'YXZ');
        continue;
      }
      model=group;
      reset();
      canvas.setAttribute('aria-label','Rotate '+item.title+'. Drag to rotate. Left and right browse items. Shift with left or right rotates. Home resets the view.');
    }
    started=direction && !reducedMotion.matches?performance.now():0;
    dirty=true;render();
  }

  function render() {
    if(!model)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==width||h!==height){
      width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;
      const fov=THREE.MathUtils.degToRad(camera.fov/2);
      camera.position.z=Math.max(1.12/Math.sin(fov),1.6/(camera.aspect*Math.tan(fov)));
      camera.updateProjectionMatrix();dirty=true;
    }
    const t=started?Math.min(1,(performance.now()-started)/220):1;
    if(!dirty && !started && entries.every(e=>e.texture.version===e.version))return;
    const halfWidth=camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
    for(const e of entries){
      e.slot=e.target+(e.start-e.target)*(1-t)**3;
      const side=Math.min(1,Math.abs(e.slot));
      e.group.position.set(e.slot*halfWidth*.98,-side*.035,-side*.48);
      e.group.scale.setScalar(e.scale*(1-.34*side));
      e.version=e.texture.version;
    }
    if(t===1)started=0;
    renderer.render(scene,camera);dirty=false;
  }
  return {show,showModel,hide,reset,render};
}
