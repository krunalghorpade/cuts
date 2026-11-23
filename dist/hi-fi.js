import * as T from './vendor/three.module.js';

const graphite='#26282b', silver='#a4a39c', rubber='#141619';
function canvasMap(w,h){
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return {map,ctx:canvas.getContext('2d')};
}
function squareImage(ctx,img,x,y,size){
  const side=Math.min(img.naturalWidth,img.naturalHeight);
  ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,x,y,size,size);
}
function mesh(parent,geometry,material,x,y,z){
  const obj=new T.Mesh(geometry,material);
  obj.position.set(x,y,z);parent.add(obj);
  return obj;
}

export function turntable({group,box,cyl,walnut},x,y,z){
  const center=x+.025;
  for(const dx of [-.26,.26])box(x+dx,y+.02,z,.07,.04,.32,rubber);
  box(x,y+.075,z,.69,.077,.45,walnut);
  box(x,y+.118,z,.677,.013,.436,'#474746');
  cyl(center,y+.139,z,.338,.030,.338,silver);
  cyl(center,y+.157,z,.326,.013,.326,rubber);
  const platter=new T.Group();platter.position.set(center,y+.166,z);group.add(platter);
  const {map,ctx}=canvasMap(640,640);
  const disc=mesh(platter,new T.CircleGeometry(.1525,96),new T.MeshStandardMaterial({map,roughness:.38,metalness:.18}),0,0,0);
  disc.rotation.x=-Math.PI/2;
  // Cut bands and uneven highlights remain visible as the disc revolves.
  ctx.fillStyle='#1b1c1e';ctx.fillRect(0,0,640,640);
  for(let radius=108;radius<320;radius+=2){
    ctx.lineWidth=1;ctx.strokeStyle=radius%14===0?'#424447':'#26282a';
    ctx.beginPath();ctx.arc(320,320,radius,0,Math.PI*2);ctx.stroke();
  }
  for(let j=0;j<2;j++)for(let i=0;i<90;i++){
    const a=.48+j*Math.PI+(i-45)*.009;
    ctx.strokeStyle='rgba(172,177,186,'+(.008+.078*Math.cos((i-45)/45*Math.PI/2))+')';
    ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(320+Math.cos(a)*108,320+Math.sin(a)*108);
    ctx.lineTo(320+Math.cos(a)*316,320+Math.sin(a)*316);ctx.stroke();
  }
  const label=canvasMap(160,160);
  const centerLabel=mesh(platter,new T.CircleGeometry(.05,60),new T.MeshBasicMaterial({map:label.map,toneMapped:false}),0,.0008,0);
  centerLabel.rotation.x=-Math.PI/2;
  cyl(center,y+.17,z,.005,.010,.005,silver);
  // Pivot, counterweight, arm tube and the cartridge over the playing surface.
  cyl(x-.222,y+.158,z+.126,.071,.066,.071,graphite);
  box(x-.1505,y+.201,z+.0255,.012,.012,.25,silver,0,-.62);
  box(x-.08,y+.185,z-.075,.024,.035,.039,graphite,0,-.62);
  cyl(x+.243,y+.136,z-.136,.044,.019,.044,silver);
  cyl(x+.243,y+.148,z-.136,.034,.007,.034,graphite);
  cyl(x-.236,y+.207,z+.161,.043,.054,.043,silver,Math.PI/2-.13);
  const jacket=new T.Group();jacket.name='Now playing record sleeve';
  jacket.position.set(x-.53,y+.174,z+.035);
  jacket.rotation.set(-.17,Math.PI,0,'YXZ');group.add(jacket);
  const jacketMap=canvasMap(512,512);
  mesh(jacket,new T.BoxGeometry(.316,.316,.004),new T.MeshStandardMaterial({color:'#c4bbaa'}),0,0,0);
  mesh(jacket,new T.PlaneGeometry(.314,.314),new T.MeshBasicMaterial({map:jacketMap.map,toneMapped:false}),0,0,.0024);
  box(x-.53,y+.014,z+.027,.29,.027,.18,walnut);
  box(x-.53,y+.033,z-.044,.266,.024,.016,silver);
  jacket.visible=false;
  return {platter,jacket,show({item,image}){
    platter.visible=Boolean(item);jacket.visible=Boolean(item&&image);
    label.ctx.fillStyle='#c3a784';label.ctx.fillRect(0,0,160,160);
    if(image){
      squareImage(jacketMap.ctx,image,0,0,512);jacketMap.map.needsUpdate=true;
      squareImage(label.ctx,image,0,0,160);
    }
    label.ctx.fillStyle='#e5ddc6';label.ctx.fillRect(49,109,62,10);
    label.map.needsUpdate=true;
  }};
}
