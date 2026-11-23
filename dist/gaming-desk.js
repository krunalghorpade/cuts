import * as T from './vendor/three.module.js';

const graphite='#292d2f', rubber='#171b1c', alloy='#566063', upholstery='#454a49';
const piping='#b98554', ivory='#dbd7c9';
const pilot=new T.MeshBasicMaterial({color:'#7ec4b5',toneMapped:false});

function beveled(shape,depth,radius){
  return new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:radius,bevelThickness:radius,curveSegments:8});
}

function backrest(){
  // The shell is open through both harness slots, including the visible back.
  const s=new T.Shape();
  s.moveTo(-.17,0);s.quadraticCurveTo(-.23,.02,-.225,.12);
  s.lineTo(-.178,.34);s.quadraticCurveTo(-.18,.42,-.25,.53);
  s.quadraticCurveTo(-.275,.59,-.22,.64);s.lineTo(-.145,.74);
  s.quadraticCurveTo(-.115,.815,-.075,.82);s.lineTo(.075,.82);
  s.quadraticCurveTo(.115,.815,.145,.74);s.lineTo(.22,.64);
  s.quadraticCurveTo(.275,.59,.25,.53);s.quadraticCurveTo(.18,.42,.178,.34);
  s.lineTo(.225,.12);s.quadraticCurveTo(.23,.02,.17,0);s.closePath();
  for(const side of [-1,1]){
    const hole=new T.Path();hole.absellipse(side*.09,.61,.052,.027,side*-.30,Math.PI*2+side*-.30,true,side*.18);
    s.holes.push(hole);
  }
  return beveled(s,.051,.009);
}

function gamepad(){
  // Positive Y on this profile points towards the triggers when the pad lies flat.
  const s=new T.Shape();
  s.moveTo(0,.036);s.bezierCurveTo(-.035,.036,-.063,.058,-.075,.028);
  s.bezierCurveTo(-.083,.008,-.094,-.04,-.08,-.058);
  s.bezierCurveTo(-.063,-.07,-.05,-.025,-.027,-.021);
  s.quadraticCurveTo(0,-.015,.027,-.021);
  s.bezierCurveTo(.05,-.025,.063,-.07,.08,-.058);
  s.bezierCurveTo(.094,-.04,.083,.008,.075,.028);
  s.bezierCurveTo(.063,.058,.035,.036,0,.036);s.closePath();
  return beveled(s,.022,.006);
}

function stitchedFabric(){
  const c=document.createElement('canvas');c.width=160;c.height=240;
  const g=c.getContext('2d');
  g.fillStyle='#3c4140';g.fillRect(0,0,160,240);
  g.fillStyle='#333737';
  for(let y=2;y<240;y+=5)for(let x=2+(y%2)*2;x<160;x+=5)g.fillRect(x,y,1.4,1.4);
  for(let y=20;y<220;y+=36){
    for(const [dy,color] of [[0,'#2d3231'],[2,'#67716a']]){
      g.strokeStyle=color;g.lineWidth=dy?.8:2;
      g.beginPath();g.moveTo(9,y+dy);g.lineTo(80,y+15+dy);g.lineTo(151,y+dy);g.stroke();
    }
  }
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return new T.MeshStandardMaterial({map,roughness:.94});
}

export function buildGamingDesk({part,box,tv,speaker,block,shadow}){
  // Model small objects around their own origin so the controls turn with their bodies.
  function placed(x,y,z,yaw=0){
    const pose=new T.Matrix4().makeRotationY(yaw).setPosition(x,y,z);
    return (shape,lx,ly,lz,w,h,d,mat,rx=0,ry=0,rz=0)=>
      part(shape,lx,ly,lz,w,h,d,mat,rx,ry,rz,pose);
  }

  const top=.79,z=-1.66;
  const glass=new T.MeshStandardMaterial({color:'#a5c8c9',transparent:true,opacity:.32,depthWrite:false,metalness:.26,roughness:.15});
  box(0,top-.009,z,3.26,.018,1.04,glass);
  for(const side of [-1,1]){
    box(0,top-.036,z+side*.50,3.24,.045,.026,alloy);
    box(side*1.61,top-.036,z,.025,.045,1.00,alloy);
  }
  for(const side of [-1,1]){
    const x=side*1.29;
    box(x,.371,z-.07,.086,.68,.12,graphite);
    box(x,.043,z,.13,.065,.88,alloy);
    for(const foot of [-1,1])box(x,.02,z+foot*.32,.12,.04,.14,rubber);
  }
  box(0,.64,z-.30,2.62,.09,.09,graphite);
  box(0,.61,z-.40,1.47,.07,.13,rubber);
  box(0,top-.064,z+.515,1.42,.004,.006,pilot);
  block(0,z,3.26,1.04);shadow(0,z,3.72,1.60);

  tv(0,-1.98,1.128*1.4,1.51,false,false,top);
  speaker(-1.38,top,-1.93);speaker(1.38,top,-1.93);

  // A desk pad keeps the face-up controller, mouse and keyboard at the front edge.
  part('cushion',0,top+.003,-1.41,1.66,.006,.43,alloy);
  part('cushion',0,top+.006,-1.41,1.65,.003,.42,rubber);
  const padTop=top+.008;
  const keyboard=placed(-.10,padTop,-1.43,-.035);
  keyboard('box',0,.011,0,.355,.022,.133,alloy);
  keyboard('box',0,.023,0,.349,.006,.127,rubber);
  // A suffix gives a modifier's width in standard key units.
  const rows=[
    'esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 prt ins del',
    '~ 1 2 3 4 5 6 7 8 9 0 - = back:2 home',
    'tab:1.5 Q W E R T Y U I O P [ ] |:1.5 pgup',
    "caps:1.75 A S D F G H J K L ; ' enter:2.25 pgdn",
    'shift:2.25 Z X C V B N M , . / shift:1.75 ↑ end',
    'ctrl:1.25 alt:1.25 fn:1.25 _:6.25 alt:1.25 fn:1.25 ←:1.5 ↓ →'
  ];
  const ink=document.createElement('canvas');ink.width=1024;ink.height=384;
  const print=ink.getContext('2d');
  print.textAlign='center';print.textBaseline='middle';
  rows.forEach((row,r)=>{
    let x=-.159;
    row.split(' ').forEach((key,k)=>{
      const [glyph,span]=key.split(':');
      const units=Number(span||1),w=units*.019;
      const cap=(r===0&&k===0)||(r===3&&k===12)?piping:units>1||r===0?alloy:'#c6c6b9';
      keyboard('box',x+w/2,.031,(r-2.5)*.019,w-.0025,.011,.0165,cap);
      if(glyph!=='_'){
        print.fillStyle=cap==='#c6c6b9'?'#292d2e':'#ece9dd';
        print.font=glyph.length>1?'500 15px Arial':'600 19px Arial';
        print.fillText(glyph,((x+w/2)/.355+.5)*ink.width,((r-2.5)*.019/.133+.5)*ink.height);
      }
      x+=w;
    });
  });
  const legendsMap=new T.CanvasTexture(ink);legendsMap.colorSpace=T.SRGBColorSpace;legendsMap.anisotropy=4;
  const legendInk=new T.MeshStandardMaterial({map:legendsMap,alphaTest:.3,roughness:.85});
  keyboard(new T.PlaneGeometry(1,1),0,.0366,0,.355,.133,1,legendInk,-Math.PI/2);
  const mouse=placed(.26,padTop,-1.41,.07);
  mouse('leaf',0,.022,0,.067,.045,.114,graphite);
  for(const side of [-1,1])mouse('leaf',side*.014,.030,-.017,.032,.025,.068,'#363b3c');
  mouse('round',0,.042,-.018,.014,.006,.014,rubber,0,0,Math.PI/2);

  const pad=placed(.58,padTop+.006,-1.34,-.32);
  pad(gamepad(),0,0,0,1,1,1,ivory,-Math.PI/2);
  for(const side of [-1,1]){
    pad('cushion',side*.051,.014,-.037,.039,.016,.015,graphite);
    pad('round',side*.026,.029,.015,.026,.006,.026,graphite);
    pad('round',side*.026,.034,.015,.017,.007,.017,rubber);
    pad('round',side*.026,.038,.015,.021,.004,.021,graphite);
  }
  pad('cushion',0,.029,-.018,.044,.005,.025,graphite);
  pad('box',0,.032,-.004,.013,.002,.003,pilot);
  pad('box',-.054,.03,-.013,.022,.005,.007,rubber);
  pad('box',-.054,.0304,-.013,.007,.005,.022,rubber);
  for(const [dx,dz,color] of [[0,-.009,'#d4a451'],[.009,0,'#b56953'],[0,.009,'#649b83'],[-.009,0,'#688da1']])
    pad('round',.054+dx,.0305,-.013+dz,.007,.005,.007,color);

  // Mesh-front PC with recessed fan hubs and a lit rim around each intake.
  const pc=placed(1.13,top+.035,-1.46,-.25);
  const lit=hex=>new T.MeshBasicMaterial({color:hex,toneMapped:false});
  const rgb=['#72d5d7','#c583d0','#83b7ef'].map(lit);
  for(const sign of [-1,1]){
    pc('box',0,.224+sign*.216,0,.238,.018,.43,graphite);
    pc('box',sign*.111,.224,-.209,.015,.432,.014,graphite);
  }
  pc('box',.109,.224,0,.009,.43,.406,graphite);
  pc('box',-.114,.224,0,.004,.426,.405,glass);
  pc('box',.101,.226,-.016,.009,.34,.30,rubber);
  pc('box',.029,.158,.012,.14,.051,.273,alloy);
  pc('box',-.043,.168,.012,.005,.008,.243,rgb[1]);
  for(let i=0;i<3;i++)pc('box',.082,.315,.055+i*.025,.025,.094,.009,rgb[i]);
  const cooler=new T.TorusGeometry(.045,.004,6,26);
  pc(cooler,.051,.29,-.069,1,1,1,rgb[0],0,Math.PI/2);
  pc('box',0,.22,.213,.21,.412,.012,rubber);
  const rim=new T.TorusGeometry(.068,.003,6,32);
  for(const y of [.13,.29]){
    pc('round',0,y,.221,.146,.012,.146,alloy,Math.PI/2);
    pc('round',0,y,.229,.133,.008,.133,rubber,Math.PI/2);
    for(let blade=0;blade<7;blade++){
      const a=blade*Math.PI*2/7;
      pc('leaf',.036*Math.sin(a),y+.036*Math.cos(a),.234,.030,.065,.006,alloy,0,0,-a-.45);
    }
    pc('round',0,y,.237,.038,.01,.038,graphite,Math.PI/2);
    pc(rim,0,y,.238,1,1,1,rgb[y>.2?1:0]);
  }
  for(const side of [-1,1])pc('box',side*.08,-.032,0,.044,.055,.32,graphite);
  pc('box',.064,.404,.222,.028,.004,.005,pilot);

  // The headband hangs on a padded rest, with its cups clear of the glass.
  const hp=placed(-1.09,top,-1.41,.25);
  hp('cushion',0,.011,0,.151,.022,.129,graphite);
  hp('round',0,.139,-.016,.018,.252,.018,alloy);
  hp('cushion',0,.270,0,.083,.021,.065,upholstery);
  hp(new T.TorusGeometry(.087,.009,8,32,Math.PI),0,.196,.018,1,1,1,rubber);
  for(const side of [-1,1]){
    hp('cushion',side*.091,.163,.018,.031,.093,.073,graphite,0,0,side*-.10);
    hp('cushion',side*.072,.163,.018,.019,.087,.067,upholstery);
    hp('box',side*.109,.162,.018,.002,.035,.009,rgb[2]);
  }
  // The chair is pulled back and turned toward the screen, leaving the controls visible.
  const chairX=-.52,chairZ=-.32;
  const chair=placed(chairX,0,chairZ,-.57);
  chair('round',0,.28,0,.071,.28,.071,alloy);
  chair('round',0,.184,0,.093,.17,.093,graphite);
  for(let n=0;n<5;n++){
    const a=n*Math.PI*2/5,dx=Math.sin(a),dz=Math.cos(a);
    chair('box',dx*.16,.125,dz*.16,.043,.041,.29,alloy,0,a);
    chair('round',dx*.295,.098,dz*.295,.024,.062,.024,graphite);
    chair('leaf',dx*.295,.064,dz*.295,.088,.081,.065,rubber,0,a);
  }
  chair('box',0,.398,0,.33,.07,.32,graphite);
  chair('cushion',0,.478,-.018,.51,.115,.53,upholstery);
  chair('cushion',0,.536,-.035,.38,.035,.44,graphite);
  chair(backrest(),0,.48,.20,1,1,1,upholstery,.13);
  chair('cushion',0,.905,.207,.31,.405,.072,stitchedFabric(),.15);
  chair('cushion',0,.678,.177,.345,.12,.096,upholstery,.10);
  chair('cushion',0,1.219,.261,.25,.10,.087,graphite,.14);
  for(const side of [-1,1]){
    chair('cushion',side*.20,.54,-.028,.088,.086,.46,upholstery,0,0,side*-.23);
    chair('cushion',side*.189,.84,.209,.088,.42,.103,upholstery,.15,0,side*-.055);
    chair('cushion',side*.149,.88,.171,.009,.34,.012,piping,.15,0,side*-.08);
    chair('box',side*.277,.565,.045,.034,.20,.047,alloy);
    chair('cushion',side*.277,.686,.012,.073,.055,.226,graphite);
    chair('cushion',side*.121,.91,.319,.014,.46,.010,piping,.13,0,side*-.15);
  }
  block(chairX,chairZ,.88,.87);shadow(chairX,chairZ,1.07,1.03,.034);
}
