import * as T from './vendor/three.module.js';
import {categoryById} from './catalog.js';
import {fixtures} from './plan.js';
import {caseSpec,coverTexture} from './media.js';

function cassetteSpine(item,cover){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=72;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  function draw(image){
    ctx.fillStyle='#252723';ctx.fillRect(0,0,384,72);ctx.fillStyle='#e3ddc9';ctx.fillRect(4,5,376,62);
    ctx.drawImage(image,8,8,58,55);ctx.fillStyle='#312e29';ctx.font='bold 21px sans-serif';
    ctx.fillText(item.title,75,33,295);ctx.font='15px sans-serif';ctx.fillText(item.creator,76,54,289);texture.needsUpdate=true;
  }
  draw(cover.image);
  if(item.artwork){const img=new Image();img.onload=()=>draw(img);img.src=item.artwork;}
  return texture;
}
export function stockRooms(interior,box,label,displayItems) {
  const stacks=new Map(), interactables=[[],[]], destinations=new Map(), offsets={};
  const wood=new T.MeshStandardMaterial({color:'#664a35'}), steel=new T.MeshStandardMaterial({color:'#292a27'}), led=new T.MeshBasicMaterial({color:'#ffd7a2'}),white=new T.MeshStandardMaterial({color:'white'});
  const boxGeo=new T.BoxGeometry(),artGeo=new T.PlaneGeometry(),dummy=new T.Object3D(),artwork=new Map();
  for(const [level,key,x,z,width,angle] of fixtures){
    const cat=categoryById[key],entries=displayItems(cat),group=new T.Group();
    group.position.set(x,0,z);group.rotation.y=angle;interior.floors[level-1].add(group);
    if(!destinations.has(key)||level===2)destinations.set(key,{level,x:x+Math.sin(angle)*1.6,z:z+Math.cos(angle)*1.6,yaw:angle});
    interior.obstacles.push({level,x,z,w:Math.abs(Math.cos(angle))*width+Math.abs(Math.sin(angle))*.75,d:Math.abs(Math.sin(angle))*width+Math.abs(Math.cos(angle))*.75});
    const cols=Math.max(4,Math.floor((width-.16)/.45)),rows=key==='vinyl'?3:4,h=key==='vinyl'?1.75:2.32,step=(h-.2)/rows;
    box(group,0,h/2,-.25,width,h,.08,steel);
    for(const side of [-1,1])box(group,side*(width/2-.034),h/2,0,.068,h,.62,steel);
    const count=cols*rows*4, bodies=new T.InstancedMesh(boxGeo,white,count);
    group.add(bodies);let index=0;
    for(let row=0;row<rows;row++){
      const base=.12+row*step;
      box(group,0,base,0,width,.055,.67,wood);box(group,0,base+.045,.33,width,.056,.023,steel);
      if(key==='cds')box(group,0,base+.12,.34,width,.012,.012,steel);
      for(let col=0;col<cols;col++){
        const cx=(col+.5)*(width-.16)/cols-(width-.16)/2,first=offsets[key]||0;
        const items=Array.from({length:4},(_,k)=>entries[(first+k)%entries.length]);offsets[key]=first+4;
        const id=key+'-'+stacks.size;stacks.set(id,{category:cat,items});
        for(let k=3;k>=0;k--){
          const item=items[k],spec=caseSpec(item),scale=Math.min((width-.24)/cols/spec.w,(step-.085)/spec.h);
          const tape=key==='cassettes',ww=spec.w*scale,hh=tape?.108:spec.h*scale;
          const yy=base+.031+hh/2+(tape?k*.115:k*.013),zz=tape?.09:.24-k*.085;
          dummy.position.set(cx+(tape?0:k*.009),yy,zz);dummy.rotation.set(tape?0:-.09,0,0);dummy.scale.set(ww,hh,tape?.40:Math.min(.075,spec.d));dummy.updateMatrix();
          bodies.setMatrixAt(index,dummy.matrix);bodies.setColorAt(index++,new T.Color(spec.shell));
          if(k===0||tape){if(!artwork.has(item.id)){const cover=coverTexture(item);artwork.set(item.id,new T.MeshBasicMaterial({map:tape?cassetteSpine(item,cover):cover}));}
            const art=new T.Mesh(artGeo,artwork.get(item.id));art.position.set(cx,yy+(tape?0:spec.ay*scale),zz+(tape?.204:.048));art.rotation.x=tape?0:-.09;
            art.scale.set(tape?ww*.95:spec.aw*scale,tape?.092:spec.ah*scale,1);art.userData.stackId=id;group.add(art);interactables[level-1].push(art);
          }
        }
      }
    }
    box(group,0,h,0,width,.065,.62,wood);box(group,0,h-.045,.245,width-.1,.018,.035,led);
    label(group,cat.short,0,h+.12,.13,Math.min(1.55,width*.64),.22,{bg:'#302c26',color:'#efcea5',size:80});
  }
  return {stacks,interactables,destinations};
}
