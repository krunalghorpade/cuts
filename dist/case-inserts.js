import * as T from './vendor/three.module.js';

// Keep the existing Blender print meshes, including their UVs and booklet offsets,
// when the moving parts replace the closed case. The hinge models use millimetres.
export function caseInserts(closed,geometries){
  const copy=closed.clone(true);copy.position.set(0,0,0);copy.updateMatrixWorld(true);
  const center=new T.Box3().setFromObject(copy).getCenter(new T.Vector3());
  return function mount(parent,slot,x,y,z){
    const face=copy.getObjectByName(slot);
    if(!face)return;
    const geometry=face.geometry.clone().applyMatrix4(face.matrixWorld);
    geometry.translate(-center.x,-center.y,-center.z).scale(1000,1000,1000);
    geometry.computeBoundingBox();
    const faceZ=geometry.boundingBox.getCenter(new T.Vector3()).z;
    geometry.translate(0,0,-faceZ);
    const print=new T.Mesh(geometry,face.material);print.name=slot;
    print.position.set(x,y,z);parent.add(print);geometries.add(geometry);
  };
}
