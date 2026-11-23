import * as T from './vendor/three.module.js';

function sampler(seed) {
  return () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;};
}

function waterMaterial() {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 128;
  const ctx = c.getContext('2d'), image = ctx.createImageData(c.width, c.height);
  const rand = sampler(13324);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const u = x / c.width, v = y / c.height;
      const ripple = Math.sin(y * .67 + 2 * Math.sin(x * .052)) + .5 * Math.sin(x * .041 + y * 1.74);
      const warp = u + ripple * .007;
      const reflection = Math.max(0, Math.sin(warp * 39 + .5 * v)) ** 6 * (1 - .55 * v);
      const sky = 14 * Math.max(0, Math.sin((warp + .09 * v) * 7));
      const glint = Math.max(0, ripple - .85) * 28;
      const value = 12 + reflection * 41 + sky + glint + 4 * rand();
      const index = (y * c.width + x) * 4;
      image.data[index] = value * .83;
      image.data[index + 1] = value * 1.08 + 10;
      image.data[index + 2] = value + 10;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map, roughness:.24, metalness:.20});
}

function leafBlade() {
  const geo = new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute([
    0,0,0, -.13,.30,-.035, -.13,.65,-.07, 0,1,-.20, .13,.65,-.07, .13,.30,-.035, 0,.53,.045
  ],3));
  geo.setIndex([0,6,1, 1,6,2, 2,6,3, 3,6,4, 4,6,5, 5,6,0]);
  geo.computeVertexNormals(); return geo;
}

function entranceGarden({group,part,box,oval,block,stone}) {
  const rand = sampler(128703), leaves = [];
  const leafColors = ['#536937','#687c42','#76934f','#8f9a52','#455d39','#92a665'];
  const up = new T.Vector3(0,1,0);
  function branch(start,end,girth) {
    const a = new T.Vector3(...start), b = new T.Vector3(...end);
    const direction = b.clone().sub(a), length = direction.length();
    const rotation = new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(up,direction.normalize()));
    const m = a.lerp(b,.5);
    part('cone',m.x,m.y,m.z,girth,length,girth*.94,'#534439',rotation.x,rotation.y,rotation.z);
  }
  function crown(cx,cy,cz,r) {
    for(let j=0;j<52;j++) {
      const az = rand()*Math.PI*2, t = rand()*2-1, radial = r*Math.cbrt(rand()), ring = Math.sqrt(1-t*t);
      leaves.push([cx+radial*ring*Math.cos(az),cy+radial*t*.54,cz+radial*ring*Math.sin(az),
        .86+rand()*1.3,rand()*6.28,(rand()-.5)*2,.21+rand()*.19,1.15+rand()*.47,Math.floor(rand()*6)]);
    }
  }
  function tree(x,z,h,turn) {
    const levels = [[x,0,z],[x-.13,h*.28,z+.09],[x+.20,h*.58,z+.05],[x+.03,h*.84,z+.15],[x+.29,h,z+.08]];
    for(let i=1;i<levels.length;i++)branch(levels[i-1],levels[i],h*(.046-.008*i));
    for(let i=0;i<10;i++) {
      const a=i*2.4+turn, cy=h*(.4+.044*i),reach=h*(.27+.17*rand())*(1-i*.045);
      const joint=[x+Math.cos(a)*reach*.55,cy+h*.12,z+Math.sin(a)*reach*.55];
      const tip=[x+Math.cos(a)*reach,cy+h*(.21+rand()*.056),z+Math.sin(a)*reach];
      branch([x+.1,cy,z+.08],joint,h*(.023-i*.0011));branch(joint,tip,h*.010);
      for(const sign of [-1,1]) {
        const az=a+sign*.77;
        const sprig=[tip[0]+Math.cos(az)*reach*.37,tip[1]+h*.05,tip[2]+Math.sin(az)*reach*.37];
        branch(tip,sprig,h*.005);crown(...sprig,h*(.13+.036*rand()));
      }
    }
    crown(x+.27,h+.06,z+.10,h*.15);
  }

  box(4.6,-.17,-13.4,22,.23,8.9,'#505746');
  box(5.04,-.064,-10.22,2.52,.103,2.55,'#3f463f');
  for(let i=0;i<3;i++) box(5.04,-.016,-9.27-i*.38,2.05,.046,.29,stone);
  box(5.04,-.049,-11.77,2.12,.113,2.53,stone);
  for(let i=0;i<3;i++)box(4.98+i*.02,-.035,-13.49-i*.82,1.77,.13,.71,stone);

  for(const [x,z,w,d] of [[2,-11.55,3.14,3.8],[8.56,-11.77,4.26,4.35],[1.15,-15.51,5.1,2.3]]) {
    box(x,.017,z,w,.18,d,'#58594c');box(x,.123,z,w-.16,.07,d-.16,'#393d32');
    for(let i=0;i<39;i++){
      const px=x+(rand()-.5)*(w-.26),pz=z+(rand()-.5)*(d-.24),r=.09+.16*rand();
      oval(px,.17,pz,r*1.8,r*.54,r*.97,['#797967','#6d715f','#545d4e','#969582'][i%4],0,rand()*6.28);
      if(i%3) continue;
      for(let k=0;k<9;k++){
        const a=rand()*Math.PI*2;
        leaves.push([px,.18,pz,Math.sin(a)*.68,a,Math.cos(a)*.52,.22+.25*rand(),.75+rand()*.6,Math.floor(rand()*6)]);
      }
    }
  }
  tree(8.24,-12.59,5.35,.8);tree(1.61,-12.34,4.01,2.1);tree(2.46,-16.08,4.75,-.66);
  // Merge leaf variation into one instanced draw, even at a distance through the glass blocks.
  const foliage=new T.InstancedMesh(leafBlade(),new T.MeshStandardMaterial({color:0xffffff,side:T.DoubleSide,roughness:.92}),leaves.length);
  const pose=new T.Object3D(), color=new T.Color();
  leaves.forEach(([x,y,z,rx,ry,rz,h,wide,palette],index)=>{
    pose.position.set(x,y,z);pose.rotation.set(rx,ry,rz);pose.scale.set(h*wide,h,h);pose.updateMatrix();
    foliage.setMatrixAt(index,pose.matrix);foliage.setColorAt(index,color.set(leafColors[palette]));
  });
  foliage.computeBoundingSphere();group.add(foliage);
  for(const [x,z] of [[1.61,-12.34],[8.24,-12.59],[2.46,-16.08]])block(x,z,.34,.34);
}

// A pair of projecting reliefs picks up the timber, bronze and pale stone from the gallery.
function foyerRelief({box,part,walnut,brass},x,z,dir,variant) {
  const y=1.75, w=1.74,h=1.18;
  box(x,y,z,w,h,.055,walnut);
  box(x,y,z+dir*.034,w-.09,h-.09,.027,variant?'#526157':'#c6b89f');
  for(let i=0;i<13;i++) {
    const u=(i-6)/6, yy=y+.12*Math.sin(u*3+variant*1.8);
    const hh=.32+.40*(1-u*u);
    box(x+u*.66,yy,z+dir*.072,.046,hh,.055,variant?'#ad9374':'#794d3b',0,0,Math.sin(i*.61)*.18);
  }
  part('round',x-.39,y+.30,z+dir*.10,.235,.024,.235,brass,Math.PI/2);
}

export function furnishHall(ctx) {
  const {group,level,box,oval,cyl,block,seat,plant,walnut,stone,brass,iron,label}=ctx;
  function plaque(text,x,y,z,w,face) {
    box(x,y,z,w,.245,.025,walnut);
    const tag=label(group,text,x,y,z+face*.018,w-.022,.22,{height:128,width:1024,bg:'#34352e',color:'#e6dcc4',size:61});
    tag.rotation.y=face>0?0:Math.PI;
  }

  if(level===1) {
    entranceGarden(ctx);
    const x=-5.76,z=-6.54,w=3.60,d=.58,lip=.07;
    box(x,.145,z,w,.29,d,stone);
    box(x,.287,z,w-.075,.013,d-.075,iron);
    box(x,.304,z,w-2*lip,.012,d-2*lip,waterMaterial());
    for(const side of [-1,1]){
      box(x,.317,z+side*(d-lip)/2,w,.05,lip,stone);
      box(x+side*(w-lip)/2,.317,z,lip,.05,d-2*lip,stone);
    }
    block(x,z,w,d);
    for(const [px,pz,sz] of [[-7.13,-6.53,.34],[-6.83,-6.48,.23],[-7.24,-6.68,.18]]){
      oval(px,.33,pz,sz,sz*.34,sz*.72,'#737267',0,.49);
    }
    for(let j=0;j<16;j++){
      const a=j*2.39996,rad=.12*Math.sqrt(j/16);
      const px=-7.11+Math.sin(a)*rad,pz=-6.55+Math.cos(a)*rad;
      oval(px,.58+(j%5)*.035,pz,.048,.58+(j%6)*.1,.019,j%3?'#617945':'#829157',.24*Math.cos(a),a,.23*Math.sin(a));
    }

    box(7.58,.42,-7.55,.46,.72,1.65,walnut);box(7.58,.807,-7.55,.50,.055,1.69,stone);
    for(const pz of [-8.02,-7.55,-7.08])box(7.342,.43,pz,.013,.47,.014,brass);
    block(7.58,-7.55,.50,1.69);plant(7.45,-8.51,1.30);
    plaque('TV ROOM',3.17,1.68,-6.115,.89,-1);
    plaque('STAIR   /   LIFT',-6.20,1.69,-8.883,1.56,1);
  } else if(level===2) {
    box(-7.35,.32,-6.68,.64,.64,.56,walnut);box(-7.35,.655,-6.68,.66,.045,.58,stone);
    block(-7.35,-6.68,.64,.56);plant(-7.35,-6.68,.73,.68);
    seat(6.56,-7.82,1.22,Math.PI/2);plant(7.42,-8.51,1.51);
    plaque('MUSIC & LIBRARY',-4.28,1.71,-6.117,1.51,-1);
    plaque('STAIR   /   LIFT',-6.20,1.69,-8.883,1.56,1);
  } else {
    foyerRelief(ctx,-6.40,-6.145,-1,0);foyerRelief(ctx,3.72,-8.845,1,1);
    plant(7.28,-6.57,1.62);
    plaque('GALLERY',-1.35,1.69,-6.117,.92,-1);
    plaque('STAIR   /   LIFT',-6.20,1.69,-8.883,1.56,1);
  }
}
