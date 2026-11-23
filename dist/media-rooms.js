import * as T from './vendor/three.module.js';
import {turntable} from './hi-fi.js';
import {boombox,compactStereo} from './stereos.js';
import {addTelevision} from './displays.js';

const dark='#202328', charcoal='#35363a', metal='#535762', amber='#b48b58';
const glow=new T.MeshBasicMaterial({color:'#ffcf88',toneMapped:false});
function hitSurface(parent,devices,key,title,x,y,z,w,h,d){
  const target=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({visible:false}));
  target.position.set(x,y,z);target.userData={device:key,title,display:'device',level:2};parent.add(target);devices.push(target);
}
export function cinemaRoom({group,box,cyl,seat,block,spot,rug,screens}){
  const cx=-4.04;
  const screenX=-4.95;
  box(screenX,2.1,-5.872,5.25,3.6,.06,'#262326');
  box(screenX,2.13,-5.79,4.45,2.56,.09,'#100f10');
  screens.push(addTelevision(group,'cinema',screenX,2.13,-5.738,4.32,4.32*9/16,false,false));
  for(const side of [-1,1]){
    const sx=screenX+side*2.48;
    box(sx,1.24,-5.55,.32,1.34,.24,dark);
    for(const y of [.89,1.27,1.70])cyl(sx,y,-5.414,.185,.023,.185,charcoal,Math.PI/2);
    block(sx,-5.55,.32,.24);
    for(let i=0;i<8;i++)box(sx+(i-3.5)*.034,2.67,-5.80,.022,1.20,.05,i%2?dark:charcoal);
  }
  rug(cx,.66,5.45,5.38);
  for(const z of [-.10,2.22])for(const x of [-5.43,-4.14,-2.85]){
    seat(x,z,1.00,0,'#72444b');
    for(const s of [-1,1]){cyl(x+s*.41,.774,z-.25,.082,.012,.082,metal);cyl(x+s*.41,.782,z-.25,.063,.006,.063,dark);}
  }
  box(cx,3.48,2.02,.055,.94,.055,metal);
  box(cx,2.97,2.02,.56,.19,.39,charcoal);
  cyl(cx+.12,2.97,1.81,.115,.08,.115,dark,Math.PI/2);
  cyl(cx+.12,2.97,1.763,.079,.014,.079,glow,Math.PI/2);
  for(let i=0;i<6;i++)box(cx-.20+i*.040,2.97,1.816,.016,.075,.014,dark);
  for(const x of [-6.33,-1.92])for(const z of [.25,1.28,2.31])box(x,.03,z,.045,.024,.24,glow);
  spot(-4.1,2.8,.15,6,7);
}

export function listeningStation({group,part,box,cyl,block,sign,shadow,walnut,devices}){
  const z=-5.53,y=.91,cx=-5.55;
  box(cx,.44,z,3.75,.78,.72,walnut);
  box(cx,y-.04,z,3.79,.08,.76,'#27292a');block(cx,z,3.79,.76);shadow(cx,z,3.88,1.19);
  const layout=[
    ['vinyl','Vinyl',-6.65,turntable,[.484,.416,.397]],
    ['cassettes','Cassette',-5.50,boombox,[.56,.412,.222]],
    ['cds','CD',-4.52,compactStereo,[.75,.36,.34]]
  ];
  for(const [key,name,x,build,[w,h,d]] of layout){
    const owner=new T.Group();
    owner.position.set(x,y,z);owner.rotation.y=Math.PI;owner.updateMatrix();group.add(owner);
    const shaped=(shape)=>(px,py,pz,sw,sh,sd,mat,rx=0,ry=0,rz=0,pose=null)=>{
      const transform=pose?new T.Matrix4().multiplyMatrices(owner.matrix,pose):owner.matrix;
      part(shape,px,py,pz,sw,sh,sd,mat,rx,ry,rz,transform);
    };
    const deviceParts={group:owner,box:shaped('box'),cyl:shaped('round'),walnut,
      part:(shape,...args)=>shaped(shape)(...args)};
    sign(name.toUpperCase(),x,1.6,-5.87,.83,0);
    hitSurface(owner,devices,key,name+' player',0,h/2,0,w,h,d);
    Object.assign(devices.at(-1).userData,build(deviceParts,0,0,0));
    shadow(x,z,w*1.28,d*1.48,y+.001);
  }
}

export function gameConsoles({box,cyl,oval}){
  // Three console silhouettes on the unit beside the modern screen.
  const y=.79;
  box(2.86,y+.192,-1.69,.085,.38,.22,'#292b30');
  for(const s of [-1,1])box(2.86+s*.061,y+.20,-1.69,.020,.40,.244,'#d2d0c6',0,0,-s*.07);
  box(2.91,y+.18,-1.565,.006,.135,.005,dark);
  box(5.13,y+.169,-1.67,.169,.338,.169,'#282a29');
  for(let i=0;i<6;i++)for(let j=0;j<6;j++)cyl(5.065+i*.025,y+.340,-1.732+j*.025,.014,.005,.014,'#101414');
  box(5.13,y+.12,-1.581,.085,.004,.005,metal);
  box(3.15,y+.051,-1.31,.234,.10,.064,dark);
  box(3.15,y+.089,-1.32,.194,.106,.016,charcoal);
  box(3.15,y+.084,-1.305,.150,.077,.011,'#1a292e');
  for(const [dx,color] of [[-.101,'#477f94'],[.101,'#aa6054']])box(3.15+dx,y+.089,-1.32,.030,.105,.022,color);
}

export function arcadeCabinets({group,box,cyl,block,label,shadow,devices}){
  for(const [x,key,title,color] of [[10.82,'bricks','Brick Break','#368a94'],[12.32,'drift','Star Drift','#926fa3']]){
    const z=-1.47;
    box(x,.48,z,.71,.93,.66,dark);box(x,.53,z-.337,.57,.55,.017,charcoal);
    box(x,.73,z-.35,.16,.15,.025,'#606464');box(x,.75,z-.367,.08,.009,.011,dark);
    for(const s of [-1,1]){
      box(x+s*.354,1.01,z,.045,1.94,.68,color);
      box(x+s*.354,1.46,z-.27,.052,.86,.08,charcoal,.11);
    }
    box(x,1.41,z+.04,.69,.81,.25,dark);
    const screen=label(group,'',x,1.45,z-.12,.56,.41,{bg:'#182730'});screen.rotation.y=Math.PI;
    const c=document.createElement('canvas');c.width=256;c.height=180;const ctx=c.getContext('2d');
    ctx.fillStyle='#0b1523';ctx.fillRect(0,0,256,180);
    if(key==='bricks'){
      for(let i=0;i<6;i++)for(let j=0;j<4;j++){ctx.fillStyle=['#db8060','#e5bb79','#8ab69e','#679aa8'][j];ctx.fillRect(15+i*38,19+j*15,34,10);}
      ctx.fillStyle='#ddd5b8';ctx.fillRect(103,151,50,5);ctx.fillRect(148,110,5,5);
    }else{
      for(let i=0;i<48;i++){ctx.fillStyle=i%5?'#a5afc9':'#e5c494';ctx.fillRect((i*47)%251,(i*i*17)%177,2,2);}
      ctx.fillStyle='#c69fca';ctx.beginPath();ctx.moveTo(128,109);ctx.lineTo(115,134);ctx.lineTo(140,134);ctx.fill();
    }
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;screen.material.map.dispose();screen.material.map=map;
    box(x,.997,z-.18,.76,.095,.6,dark,-.08);
    cyl(x-.17,1.07,z-.36,.021,.10,.021,metal);ovalKnob(x-.17,1.127,z-.36,color);
    for(const dx of [.07,.135,.20])cyl(x+dx,1.065,z-.35,.042,.018,.042,color);
    box(x,1.91,z,.76,.19,.64,dark);const tag=label(group,title.toUpperCase(),x,1.90,z-.33,.66,.14,{bg:'#20212a',color:'#f3dab0',size:66});tag.rotation.y=Math.PI;
    hitSurface(group,devices,key,title,x,1.34,z-.27,.74,.77,.42);
    block(x,z-.06,.78,.88);shadow(x,z,1.12,1.20);
  }
  function ovalKnob(x,y,z,color){cyl(x,y,z,.052,.047,.052,color);}
}
