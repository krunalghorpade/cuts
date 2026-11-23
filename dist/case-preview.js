import * as THREE from './vendor/three.module.js';
import {createMediaCase, coverTexture, caseSpec} from './media.js';

// A printed catalog insert supplies a readable spine and reverse when the import only has front art.
function displayLabel(item, spec, spine = false) {
  const paper = document.createElement('canvas');
  paper.width = spine ? 112 : 600;
  paper.height = 800;
  const ctx = paper.getContext('2d');
  ctx.fillStyle = '#eae8e3';
  ctx.fillRect(0, 0, paper.width, paper.height);
  ctx.fillStyle = '#222';
  if (spine) {
    ctx.translate(76, 28);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 70px sans-serif';
    ctx.fillText(item.title, 0, 0, paper.height - 56);
  } else {
    ctx.fillRect(0, 0, 600, 110);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 27px monospace';
    ctx.fillText(spec.label.toUpperCase(), 34, 68, 535);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 52px sans-serif';
    let row = '', y = 220;
    for (const word of item.title.split(/\s+/)) {
      const next = row ? row+' '+word : word;
      if (row && ctx.measureText(next).width > 530) {
        ctx.fillText(row, 34, y, 532); y += 60; row = word;
      } else row = next;
    }
    ctx.fillText(row, 34, y, 532);
    ctx.font = '29px sans-serif'; ctx.fillText(item.creator, 34, Math.max(470, y + 68), 530);
    ctx.fillRect(34, 664, 532, 2);
    ctx.font = '24px monospace'; ctx.fillText(String(item.year), 34, 715);
    ctx.textAlign = 'right'; ctx.fillText('MY ROOM', 566, 715);
  }
  const map = new THREE.CanvasTexture(paper);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness:.76});
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
  const decorations = [];
  scene.add(new THREE.HemisphereLight(0xffffff, 0x808080, 1.65));
  for (const [x, y, z, intensity] of [[-3, 4, 4, 2.4], [3, 1, -2, 2.2]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(x, y, z); scene.add(light);
  }

  function reset() {
    if (!model) return;
    model.rotation.set(.09, -.38, -.015, 'YXZ'); dirty = true;
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
    for(const entry of entries)scene.remove(entry.group);
    entries=[];
    model=null;
    for(const part of decorations.splice(0)){
      part.geometry.dispose();part.material.map.dispose();part.material.dispose();
    }
  }

  function show(item,previous,next,direction=0) {
    const oldSlots=new Map(entries.map(entry=>[entry.id,entry.slot]));
    hide();
    if(!renderer){
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    }
    for(const [target,record] of [[-1,previous],[0,item],[1,next]]){
      if(!record)continue;
      const {group,spec}=createMediaCase(record);
      const start=oldSlots.get(record.id) ?? target+direction;
      entries.push({id:record.id,group,texture:coverTexture(record),version:-1,
        start,slot:start,target,scale:2/(spec.kind==='boxset'?boxDiagonal:Math.hypot(spec.w,spec.h,spec.d))});
      scene.add(group);
      if(target!==0){
        group.rotation.set(.06,-target*.42,0,'YXZ');
        continue;
      }
      model=group;
      {
        const back=new THREE.Mesh(new THREE.PlaneGeometry(spec.w*.94,spec.h*.94),displayLabel(item,spec));
        back.rotation.y=Math.PI;back.position.z=-spec.d/2-.00012;
        model.add(back);decorations.push(back);
        if(spec.d>=.007){
          const side=new THREE.Mesh(new THREE.PlaneGeometry(spec.d*.9,spec.h*.94),displayLabel(item,spec,true));
          side.rotation.y=-Math.PI/2;side.position.x=-spec.w/2-.00012;
          model.add(side);decorations.push(side);
        }
      }
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
  return {show,hide,reset,render};
}
