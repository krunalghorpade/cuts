import * as T from './vendor/three.module.js';

const plastic='#25272a', ink='#131518', iron='#42464a', silver='#b6bbbf', darkSilver='#80888e', orange='#d76116';
const metal=new T.MeshStandardMaterial({color:'#cbd0d4',metalness:.48,roughness:.31});
const unitCircle=new T.CircleGeometry(.5,72);
const rim=new T.TorusGeometry(.478,.022,8,72);
const flat=new T.PlaneGeometry(1,1);

function panelShape(points,bevel=.015){
  const path=new T.Shape();
  points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();
  const geom=new T.ExtrudeGeometry(path,{depth:.96,bevelEnabled:true,bevelThickness:.02,bevelSize:bevel,bevelSegments:2});
  return geom.translate(0,0,-.48);
}
const cabinet=panelShape([[-.48,-.49],[.48,-.49],[.49,-.46],[.49,.46],[.46,.49],[-.46,.49],[-.49,.46],[-.49,-.46]],.009);
const consoleFace=panelShape([[-.48,-.37],[-.39,-.49],[.39,-.49],[.48,-.37],[.48,.37],[.39,.49],[-.39,.49],[-.48,.37]]);
const tweeterBaffle=panelShape([[-.45,.48],[.48,.48],[.41,-.42],[.24,-.49],[-.29,-.27],[-.48,-.11]]);
const leftWing=panelShape([[-.44,.46],[.48,.48],[.28,-.07],[-.10,-.49],[-.49,-.27]]);

function paint(w,h,draw){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshBasicMaterial({map,toneMapped:false});
}
function type(g,text,x,y,size,color,align='left',bold=false){
  g.font=(bold?'bold ':'')+size+'px Arial, sans-serif';g.textAlign=align;g.fillStyle=color;g.fillText(text,x,y);
}
function speakerCloth(radio){
  return paint(384,384,(g,w,h)=>{
    const shade=g.createRadialGradient(172,147,13,192,192,192);
    shade.addColorStop(0,radio?'#45464a':'#242529');shade.addColorStop(.66,radio?'#2e2e31':'#1e1e20');shade.addColorStop(1,'#131416');
    g.fillStyle=shade;g.fillRect(0,0,w,h);
    if(radio){
      const cap=g.createRadialGradient(184,186,1,192,192,46);
      cap.addColorStop(0,'#929496');cap.addColorStop(.62,'#4f5054');cap.addColorStop(.78,'#252629');cap.addColorStop(.89,'#86878a');cap.addColorStop(1,'#303135');
      g.fillStyle=cap;g.beginPath();g.arc(192,192,45,0,Math.PI*2);g.fill();
    }
    for(let row=0;row<97;row++)for(let col=0;col<97;col++){
      const x=col*4+(row%2)*2,y=row*4;
      g.fillStyle=radio?'rgba(8,8,9,.76)':'rgba(0,0,0,.29)';g.fillRect(x,y,2,2);
      g.fillStyle=radio?'rgba(205,207,209,.30)':'rgba(145,146,148,.14)';g.fillRect(x,y+2,2,1);
    }
    if(!radio)type(g,'STEREO',w/2,h*.54,12,'#a2a3a2','center',true);
  });
}
const radioGrille=speakerCloth(true),hifiGrille=speakerCloth(false);
const upperGrille=paint(160,160,g=>{
  const shade=g.createLinearGradient(0,0,120,160);
  shade.addColorStop(0,'#c5c7c6');shade.addColorStop(1,'#82898a');g.fillStyle=shade;g.fillRect(0,0,160,160);
  g.fillStyle='#666a6b';
  for(let row=0;row<40;row++)for(let col=0;col<40;col++)g.fillRect(col*4+row%2*2,row*4,1.5,1.5);
});
const radioDial=paint(1024,224,(g,w,h)=>{
  g.fillStyle='#242626';g.fillRect(0,0,w,h);
  const tint='#d7cfb2';
  for(const [r,band,labels] of [[0,'FM',['88','90','92','94','96','98','100','104','108']],[1,'MW',['530','600','700','800','900','1000','1200','1400','1600']],[2,'SW',['6','7','8','9','10','12','14','16','18']]]){
    const y=70+r*64;type(g,band,14,y,34,tint,'left',true);
    g.fillStyle='#a89f85';g.fillRect(91,y+6,820,1.7);
    for(let i=0;i<65;i++)g.fillRect(94+i*12.6,y+(i%4?0:-5),1.5,i%4?5:10);
    labels.forEach((n,i)=>type(g,n,102+i*99,y-12,23,tint,'left'));
    type(g,r===1?'kHz':'MHz',1006,y,23,tint,'right');
  }
  g.fillStyle='#df9d4e';g.fillRect(614,7,4,h-14);
});
const tapeWindow=paint(408,150,(g,w,h)=>{
  g.fillStyle='#252829';g.fillRect(0,0,w,h);
  const pane=g.createLinearGradient(0,0,w,h);pane.addColorStop(0,'#676b68');pane.addColorStop(.46,'#373c3c');pane.addColorStop(1,'#525658');g.fillStyle=pane;g.fillRect(5,5,w-10,h-10);
  for(const cx of [104,303]){g.fillStyle='#242726';g.beginPath();g.arc(cx,73,40,0,Math.PI*2);g.fill();g.fillStyle='#b3b4ac';g.beginPath();g.arc(cx,73,18,0,Math.PI*2);g.fill();g.fillStyle='#454744';g.fillRect(cx-9,65,18,15);}
  type(g,'STEREO',w/2,84,18,'#cfcec2','center',true);
});
const cdGlass=paint(640,168,(g,w,h)=>{
  const wash=g.createLinearGradient(0,0,140,h);wash.addColorStop(0,'#40494c');wash.addColorStop(.5,'#272e31');wash.addColorStop(1,'#3b4142');
  g.fillStyle=wash;g.fillRect(0,0,w,h);
  type(g,'3 DISC CHANGER',26,55,27,'#b9b7a7','left',true);
  type(g,'COMPACT DISC   •   DIGITAL AUDIO',27,118,19,'#979d99');
  for(let i=0;i<3;i++){g.strokeStyle='#939d99';g.lineWidth=3;g.beginPath();g.arc(502+i*43,85,16,0,Math.PI*2);g.stroke();}
});
const cassetteLegend=paint(512,64,(g,w,h)=>{g.fillStyle='#272829';g.fillRect(0,0,w,h);type(g,'PORTABLE STEREO CASSETTE RECORDER',w/2,43,21,'#deded3','center',true);});
const cdLegend=paint(480,60,(g,w,h)=>{g.fillStyle='#363b3e';g.fillRect(0,0,w,h);type(g,'COMPACT COMPONENT SYSTEM',w/2,41,26,'#e0ddd4','center');});

function station(group,part,x,y,z,angle){
  const mount=new T.Group();mount.position.set(x,y,z);mount.rotation.y=Math.PI+angle;mount.updateMatrix();group.add(mount);
  // Static stereo parts share the room's batched geometry and use local front (+Z).
  const piece=(shape,px,py,pz,w,h,d,mat,rx=0,ry=0,rz=0)=>part(shape,px,py,pz,w,h,d,mat,rx,ry,rz,mount.matrix);
  const box=(...args)=>piece('box',...args);
  const face=(px,py,pz,w,h,mat)=>piece(flat,px,py,pz,w,h,1,mat);
  const circle=(px,py,pz,diameter,mat)=>piece(unitCircle,px,py,pz,diameter,diameter,1,mat);
  const knob=(px,py,pz,dia,depth,mat)=>piece('round',px,py,pz,dia,depth,dia,mat,Math.PI/2);
  const ring=(px,py,pz,dia,mat)=>piece(rim,px,py,pz,dia,dia,dia,mat);
  const rod=(a,b,diameter,mat)=>{
    const ax=b[0]-a[0],ay=b[1]-a[1],az=b[2]-a[2],len=Math.hypot(ax,ay,az);
    piece('round',(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,diameter,len,diameter,mat,Math.atan2(az,ay),0,-Math.asin(ax/len));
  };
  return {mount,piece,box,face,circle,knob,ring,rod};
}

export function boombox({group,part},x,y,z){
  const {mount,piece,box,face,circle,knob,ring,rod}=station(group,part,x,y,z,-.06);
  for(const s of [-1,1])box(s*.179,.007,0,.085,.014,.099,ink);
  piece(cabinet,0,.156,0,.54,.287,.147,plastic);
  box(0,.027,.062,.511,.017,.022,ink);
  for(const s of [-1,1]){
    const cx=s*.17;
    piece(cabinet,cx,.123,.079,.168,.185,.017,'#303136');
    knob(cx,.126,.088,.162,.013,ink);
    ring(cx,.126,.098,.159,metal);circle(cx,.126,.099,.150,radioGrille);
    // Rectangular tweeters at either side of the multiband tuning window.
    piece(consoleFace,s*.224,.251,.085,.044,.031,.012,metal);
    box(s*.224,.251,.094,.038,.019,.004,ink);box(s*.224,.251,.097,.032,.003,.003,silver);
    for(let j=0;j<9;j++)box(s*.268,.211,-.055+j*.012,.002,.069,.003,ink);
  }
  piece(cabinet,0,.125,.078,.176,.175,.019,'#242527');
  piece(consoleFace,0,.137,.092,.129,.066,.008,metal);
  face(0,.137,.097,.122,.057,tapeWindow);
  face(0,.072,.090,.158,.021,cassetteLegend);
  for(let i=0;i<4;i++)box(0,.045+i*.003,.089,.155,.001,.003,iron);
  piece(consoleFace,0,.25,.071,.513,.085,.037,ink);
  box(0,.248,.092,.377,.062,.004,'#b6ad8b');face(0,.248,.095,.369,.056,radioDial);
  for(let i=0;i<6;i++){
    const keyX=-.071+i*.028;
    box(keyX,.306,.027,.024,.019,.043,iron);
    box(keyX,.315,.030,.021,.005,.037,i===0?'#c8bbb0':silver);
  }
  for(const [px,dia] of [[-.218,.027],[-.174,.027],[-.13,.028],[.169,.044]]){
    piece('round',px,.307,-.012,dia,.023,dia,metal);
    piece('round',px,.320,-.012,dia*.76,.002,dia*.76,iron);
    box(px,.322,-.01,dia*.1,.001,dia*.55,silver);
  }
  for(const s of [-1,1]){
    box(s*.247,.345,-.026,.014,.12,.022,metal);
    knob(s*.251,.296,-.026,.022,.019,iron);
  }
  piece(cabinet,0,.402,-.026,.507,.023,.025,ink);
  for(let i=0;i<4;i++)box(0,.394+i*.004,-.012,.47,.0015,.002,iron);
  piece('round',.192,.308,-.057,.028,.017,.028,metal);
  const base=[.192,.312,-.057],mid=[-.012,.414,-.057],tip=[-.159,.488,-.057];
  rod(base,mid,.0074,metal);rod(mid,tip,.0044,metal);piece('leaf',...tip,.009,.009,.009,metal);
  return openCase(mount,true,.36,.085);
}

export function compactStereo({group,part},x,y,z){
  const {mount,piece,box,face,circle,knob,ring}=station(group,part,x,y,z,.035);
  const height=.347,center=.183;
  for(const s of [-1,1]){
    const sx=s*.252;
    box(sx,.007,0,.17,.014,.177,ink);
    piece(cabinet,sx,center,-.003,.220,height,.214,'#91979c');
    piece(cabinet,sx,center,.101,.216,height-.004,.022,silver);
    piece(tweeterBaffle,sx,.286,.117,.189,.128,.025,'#4a4f53',0,s<0?0:Math.PI);
    knob(sx+s*.038,.300,.138,.063,.011,iron);
    circle(sx+s*.038,.300,.146,.057,upperGrille);
    ring(sx+s*.038,.300,.147,.059,metal);
    knob(sx-s*.040,.308,.139,.041,.012,ink);
    knob(sx-s*.040,.308,.148,.020,.005,'#929797');
    box(sx-s*.040,.308,.152,.039,.003,.003,metal);
    piece(leftWing,sx-s*.066,.225,.123,.062,.096,.027,iron,0,s<0?0:Math.PI);
    const cy=.133;
    knob(sx,cy,.125,.218,.028,metal);
    knob(sx,cy,.144,.209,.012,orange);
    knob(sx,cy,.154,.192,.014,ink);
    circle(sx,cy,.162,.188,hifiGrille);
    ring(sx,cy,.163,.190,'#36383a');
  }
  box(0,.006,0,.22,.012,.206,ink);
  piece(cabinet,0,center,0,.274,height,.236,darkSilver);
  piece(cabinet,0,.353,.005,.266,.005,.208,silver);
  for(let i=0;i<14;i++)box(-.074+i*.0112,.356,-.052,.002,.001,.060,iron);
  piece(cabinet,0,.329,.118,.270,.049,.026,darkSilver);
  face(0,.325,.134,.169,.017,cdLegend);
  piece(cabinet,0,.264,.118,.269,.085,.025,silver);
  box(0,.290,.134,.230,.005,.005,ink);
  box(0,.252,.134,.232,.056,.005,iron);face(0,.252,.138,.221,.046,cdGlass);
  piece(consoleFace,0,.177,.126,.273,.101,.034,'#383d41');
  for(const s of [-1,1]){
    const px=s*.084;
    knob(px,.177,.149,.081,.016,darkSilver);
    knob(px,.177,.158,.069,.009,orange);
    knob(px,.177,.167,.061,.013,metal);
    ring(px,.177,.175,.057,silver);
    box(px+s*.008,.198,.177,.004,.008,.002,iron,0,0,s*.21);
  }
  for(let i=0;i<3;i++){
    knob(-.024+i*.024,.200,.146,.014,.007,'#58616c');
    box(-.024+i*.024,.173,.148,.017,.007,.007,i===1?orange:silver);
  }
  for(let i=0;i<7;i++)knob(-.044+i*.0146,.143,.149,.0068,.005,silver);
  for(const s of [-1,1]){
    piece(consoleFace,s*.065,.077,.119,.125,.094,.025,silver);
    box(s*.065,.064,.134,.099,.015,.003,iron);
    for(let j=0;j<3;j++)box(s*.065,.047+j*.006,.135,.095,.002,.004,plastic);
  }
  return openCase(mount,false,.530,.120);
}

const clearShell=new T.MeshPhysicalMaterial({color:'#e2ebed',roughness:.19,transparent:true,opacity:.17,depthWrite:false});
const clearEdge=new T.MeshStandardMaterial({color:'#bbc4c7',metalness:.15,roughness:.28});
const trayBlack=new T.MeshStandardMaterial({color:'#27292a',roughness:.63});
const paper=new T.MeshStandardMaterial({color:'#c6beb2',roughness:.85});
const caseBox=new T.BoxGeometry(1,1,1);

function openCase(parent,tape,x,z){
  // The hinge runs vertically when an open Norelco or jewel case stands on end.
  const w=tape?.0696:.142,h=tape?.109:.125,d=tape?.0168:.0104;
  const stand=new T.Group();stand.name=tape?'Open cassette case':'Open CD jewel case';
  stand.position.set(x,h/2+.002,z);stand.rotation.set(-.06,tape?-.30:-.40,0,'YXZ');parent.add(stand);
  const lid=new T.Group(),tray=new T.Group();
  lid.rotation.y=.43;tray.rotation.y=-.33;stand.add(lid,tray);
  function panel(parent,x,y,z,w,h,d,mat){
    const m=new T.Mesh(caseBox,mat);m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);
  }
  function edgeBox(leaf,cx,depth){
    panel(leaf,cx,0,0,w,h,depth*.44,clearShell);
    const edge=.0016;
    for(const sign of [-1,1]){
      panel(leaf,cx,sign*(h-edge)/2,depth*.35,w,edge,depth,clearEdge);
      panel(leaf,cx+sign*(w-edge)/2,0,depth*.35,edge,h,depth,clearEdge);
    }
  }
  edgeBox(lid,-w/2,.004);edgeBox(tray,w/2,d*.70);
  panel(stand,0,0,.001,.004,h,.004,clearEdge);
  panel(lid,-w/2,0,.0015,w-.004,h-.005,.0015,paper);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=tape?800:512;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const artwork=new T.Mesh(new T.PlaneGeometry(tape?w-.006:h-.006,h-.006),new T.MeshBasicMaterial({map:texture,toneMapped:false}));
  artwork.position.set(-w*.5,0,.0025);lid.add(artwork);
  artwork.userData={display:'case',level:2,item:null,width:artwork.geometry.parameters.width,height:h-.006};
  artwork.raycast=function(ray,hits){if(stand.visible)T.Mesh.prototype.raycast.call(this,ray,hits);};
  // Empty tray: the physical tape or disc is inside the player.
  if(tape){
    panel(tray,w*.5,0,.004,w-.004,h-.004,.002,clearShell);
    for(const py of [-.022,.022]){
      const peg=new T.Mesh(new T.CylinderGeometry(.0033,.0048,.007,12),clearEdge);
      peg.position.set(w*.54,py,.008);peg.rotation.x=Math.PI/2;tray.add(peg);
    }
    panel(tray,w*.52,0,.006,.001,h*.81,.003,clearEdge);
    for(const s of [-1,1])panel(tray,w*.67,s*h*.45,.007,w*.55,.003,.01,clearEdge);
  }else{
    panel(tray,w/2,0,.003,w-.004,h-.004,.005,trayBlack);
    const imprint=new T.Mesh(new T.TorusGeometry(.057,.00095,6,64),clearEdge);
    imprint.position.set(w*.53,0,.006);tray.add(imprint);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      panel(tray,w*.53+.006*Math.cos(a),.006*Math.sin(a),.007,.002,.002,.005,clearEdge);
    }
    for(let i=0;i<8;i++)panel(tray,.004+i*.0013,0,.006,.00055,h-.006,.001,clearEdge);
  }
  stand.visible=false;
  let current=null;
  return {coverTarget:artwork,show({item,image}){
    stand.visible=Boolean(item&&image);
    artwork.userData.item=stand.visible?item:null;
    if(!stand.visible){current=null;return;}
    if(current===image)return;
    current=image;
    ctx.fillStyle=tape?'#ede9de':'#f4f2ea';ctx.fillRect(0,0,canvas.width,canvas.height);
    const side=Math.min(image.naturalWidth,image.naturalHeight);
    ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,512,512);
    if(tape){
      ctx.save();ctx.beginPath();ctx.rect(16,523,480,261);ctx.clip();
      ctx.fillStyle='#282a2a';ctx.font='bold 42px Arial,sans-serif';ctx.textAlign='left';
      const words=item.title.split(/\s+/);let line='',baseline=579;
      for(const word of words){
        if(line && ctx.measureText(line+' '+word).width>470){
          ctx.fillText(line,22,baseline);baseline+=48;line='';if(baseline>683)break;
        }
        line+=(line?' ':'')+word;
      }
      if(line&&baseline<=683)ctx.fillText(line,22,baseline);
      type(ctx,item.creator,22,748,28,'#54544e');
      ctx.restore();
    }
    texture.needsUpdate=true;
  }};
}
