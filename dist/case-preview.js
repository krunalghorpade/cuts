import * as THREE from './vendor/three.module.js';
import {createMediaCase, coverTexture} from './media.js';

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
    ctx.textAlign = 'right'; ctx.fillText('THE LOWER LEVEL', 566, 715);
  }
  const map = new THREE.CanvasTexture(paper);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness:.76});
}

export function createCasePreview(canvas) {
  let renderer, model, art, artVersion, drag = null, dirty = true;
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
    if (!steps[event.key] && event.key!=='Home') return;
    event.preventDefault(); event.stopPropagation();
    if(event.key==='Home')reset();else rotate(...steps[event.key]);
  });

  function hide() {
    if(drag && canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);
    drag=null;
    if(model)scene.remove(model);
    model=null;
    for(const part of decorations.splice(0)){
      part.geometry.dispose();part.material.map.dispose();part.material.dispose();
    }
  }

  function show(item) {
    hide();
    if(!renderer){
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.setClearColor(0,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
    }
    const {group,spec}=createMediaCase(item);
    model=group;art=coverTexture(item);artVersion=-1;
    const back=new THREE.Mesh(new THREE.PlaneGeometry(spec.w*.94,spec.h*.94),displayLabel(item,spec));
    back.rotation.y=Math.PI;back.position.z=-spec.d/2-.00012;
    model.add(back);decorations.push(back);
    if(spec.d>=.007){
      const side=new THREE.Mesh(new THREE.PlaneGeometry(spec.d*.9,spec.h*.94),displayLabel(item,spec,true));
      side.rotation.y=-Math.PI/2;side.position.x=-spec.w/2-.00012;
      model.add(side);decorations.push(side);
    }
    // Fit the entire case (including its diagonal) as it turns.
    model.scale.setScalar(2/Math.hypot(spec.w,spec.h,spec.d));
    scene.add(model);reset();
    canvas.setAttribute('aria-label','Rotate '+item.title+' '+spec.label+'. Drag, or use the arrow keys. Home resets the view.');
    render();
  }

  function render() {
    if(!model)return;
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    if(w!==width||h!==height){
      width=w;height=h;renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.position.z=1.04/Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect)));
      camera.updateProjectionMatrix();dirty=true;
    }
    if(!dirty && artVersion===art.version)return;
    renderer.render(scene,camera);dirty=false;artVersion=art.version;
  }
  return {show,hide,reset,render};
}

