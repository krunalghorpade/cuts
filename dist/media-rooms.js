import * as T from './vendor/three.module.js';
import {addTelevision} from './displays.js';

const dark='#202328', charcoal='#35363a', metal='#535762', amber='#b48b58';
const glow=new T.MeshBasicMaterial({color:'#ffcf88',toneMapped:false});
function hitSurface(parent,devices,key,title,x,y,z,w,h,d){
  const target=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({visible:false}));
  target.position.set(x,y,z);target.userData={device:key,title,display:'device',level:2};parent.add(target);devices.push(target);
}
export function cinemaRoom({group,box,cyl,seat,block,spot,rug,screens}){
  const cx=-4.04;
  box(cx,2.1,-5.872,7.64,4,.06,'#262326');
  box(cx,2.13,-5.79,5.52,3.15,.09,'#100f10');
  screens.push(addTelevision(group,'cinema',cx,2.13,-5.738,5.38,5.38*9/16,false,false));
  for(const side of [-1,1]){
    const sx=cx+side*3.21;
    box(sx,1.24,-5.55,.32,1.34,.24,dark);
    for(const y of [.89,1.27,1.70])cyl(sx,y,-5.414,.185,.023,.185,charcoal,Math.PI/2);
    block(sx,-5.55,.32,.24);
    for(let i=0;i<8;i++)box(sx+side*(i-3.5)*.058,2.67,-5.80,.022,1.20,.05,i%2?dark:charcoal);
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

export function listeningStation({group,box,cyl,oval,block,sign,shadow,walnut,devices}){
  const z=5.42,y=.91;
  box(-2.87,.44,z,4.62,.78,.75,walnut);
  box(-2.87,y-.04,z,4.69,.08,.83,'#27292a');block(-2.87,z,4.69,.83);shadow(-2.87,z,4.94,1.25);
  const layout=[['vinyl','Vinyl',-4.30],['cassettes','Cassette',-2.87],['cds','CD',-1.44]];
  for(const [key,name,x] of layout){
    sign(name.toUpperCase(),x,1.60,5.872,.90,Math.PI);
    hitSurface(group,devices,key,name+' player',x,1.02,z,.84,.23,.54);
    const lamp=new T.Mesh(new T.SphereGeometry(.012,8,6),new T.MeshBasicMaterial({color:'#43534d'}));
    lamp.position.set(x+.30,key==='vinyl'?y+.094:y+.155,z-(key==='vinyl'?.20:.226));
    group.add(lamp);devices.at(-1).userData.lamp=lamp;
    if(key==='vinyl'){
      box(x,y+.045,z,.75,.09,.50,walnut);
      cyl(x-.063,y+.101,z,.40,.028,.40,charcoal);
      cyl(x-.063,y+.122,z,.375,.014,.375,'#141619');
      for(const radius of [.155,.12,.085]){
        const ring=new T.Mesh(new T.TorusGeometry(radius,.0011,4,48),new T.MeshBasicMaterial({color:'#5e5c58'}));
        ring.position.set(x-.063,y+.13,z);ring.rotation.x=-Math.PI/2;group.add(ring);
      }
      cyl(x-.063,y+.133,z,.114,.006,.114,amber);
      const mark=new T.Mesh(new T.BoxGeometry(.026,.004,.013),new T.MeshStandardMaterial({color:dark}));
      const platter=new T.Group();platter.position.set(x-.063,y+.138,z);mark.position.x=.032;platter.add(mark);group.add(platter);
      devices.at(-1).userData.platter=platter;
      cyl(x+.265,y+.11,z+.12,.066,.065,.066,metal);
      box(x+.215,y+.153,z+.008,.012,.012,.24,'#bdbbb1',0,.41);
      box(x+.159,y+.14,z-.10,.026,.025,.038,charcoal);
    }else{
      box(x,y+.087,z,.74,.174,.44,key==='cds'?'#94948e':charcoal);
      const front=z-.226;
      if(key==='cassettes'){
        box(x-.105,y+.09,front,.36,.125,.012,'#171c20');
        box(x-.105,y+.10,front-.009,.28,.085,.01,'#7b8380');
        for(const dx of [-.072,.072])cyl(x-.105+dx,y+.095,front-.019,.050,.015,.050,'#272b2d',Math.PI/2);
        for(let i=0;i<5;i++)box(x+.11+i*.035,y+.05,front-.015,.026,.026,.029,'#aba99d');
      }else{
        box(x-.08,y+.095,front,.392,.052,.009,'#44494a');
        box(x-.08,y+.096,front-.007,.36,.032,.008,'#878a86');
        cyl(x+.248,y+.09,front-.005,.056,.025,.056,dark,Math.PI/2);
      }
      box(x+.155,y+.133,front-.014,.15,.04,.009,'#152923');
      for(let i=0;i<5;i++)box(x+.105+i*.021,y+.131,front-.021,.013,.008,.004,'#7fab9c');
    }
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
  for(const [x,key,title,color] of [[11.48,'bricks','Brick Break','#368a94'],[13.13,'drift','Star Drift','#926fa3']]){
    const z=-1.75;
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
