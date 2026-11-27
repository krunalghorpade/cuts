// Only the room TV feeds the inspection filter. Physical case sounds and the
// listening room's players keep their own output paths.
let context, resuming;

export function unlockRoomAudio(){
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    context??=new Audio();
    if(context.state==='running')return;
    if(!resuming){
      resuming=context.resume().catch(()=>{}).finally(()=>{resuming=null;});
    }
    return resuming;
  }catch{/* A browser without Web Audio can still use the media player's output. */}
}

function fade(param,value,now,duration){
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
  else{
    const held=param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(held,now);
  }
  param.linearRampToValueAtTime(value,now+duration);
}

export function connectTelevision(video,inspecting,volume){
  if(context?.state!=='running')return null;
  let source;
  try{source=context.createMediaElementSource(video);}catch{return null;}
  const dry=context.createGain(),wet=context.createGain(),master=context.createGain();
  const filter=context.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=400;
  // Web Audio specifies low-pass Q in decibels. This gives a Butterworth knee.
  filter.Q.value=-3.0103;
  dry.gain.value=inspecting?0:1;
  wet.gain.value=inspecting ? .82 : 0;
  master.gain.value=volume;
  source.connect(dry).connect(master);
  source.connect(filter).connect(wet).connect(master);
  master.connect(context.destination);
  return {
    inspect(on){
      fade(dry.gain,on?0:1,context.currentTime,.12);
      fade(wet.gain,on ? .82 : 0,context.currentTime,.12);
    },
    volume(value){fade(master.gain,value,context.currentTime,.06);},
    disconnect(){for(const node of [source,dry,filter,wet,master])node.disconnect();}
  };
}

const latchBuffers=new Map();
function latchBuffer(open,jewel){
  const key=(open?'open':'shut')+(jewel?' jewel':' keep');
  if(latchBuffers.has(key))return latchBuffers.get(key);
  const rate=context.sampleRate;
  const buffer=context.createBuffer(1,Math.ceil(rate*.16),rate),samples=buffer.getChannelData(0);
  // A flexible hinge releases first, followed by the catch. Closing loads the
  // body and ends with the sharper snap of the two plastic tabs meeting.
  const hits=open?[[0,.42,1.7],[.036,.70,1],[.046,.19,1.28]]:
                  [[0,.31,1.42],[.019,.9,.88],[.024,.38,1.55]];
  let seed=47213;
  for(const [offset,power,tone] of hits){
    const start=Math.round(offset*rate),pitch=tone*(jewel?1.33:1);
    let lastNoise=0;
    for(let i=start;i<samples.length;i++){
      const t=(i-start)/rate;
      seed=(Math.imul(1664525,seed)+1013904223)>>>0;
      const noise=seed/2147483648-1;
      const tick=(noise-lastNoise)*Math.exp(-t*730);
      lastNoise=noise;
      const body=Math.sin(2*Math.PI*pitch*(open?940:525)*t)*Math.exp(-t*(open?230:140));
      const ring=Math.sin(2*Math.PI*pitch*2630*t)*Math.exp(-t*300);
      samples[i]+=power*(1-Math.exp(-t*16000))*(.115*tick+.088*body+.061*ring);
    }
  }
  latchBuffers.set(key,buffer);
  return buffer;
}

export function caseLatch(open,item){
  const kind=item?.releaseKind;
  if(!['cd','dvd','bluray'].includes(kind)&&!item?.seasons&&item?.gameMedia?.kind!=='disc')return;
  const initiated=performance.now(),pending=unlockRoomAudio();
  function click(){
    if(context?.state!=='running'||document.hidden||performance.now()-initiated>250)return;
    const source=context.createBufferSource();
    source.buffer=latchBuffer(open,kind==='cd'||item.platform==='PlayStation');
    source.connect(context.destination);source.onended=()=>source.disconnect();source.start();
  }
  if(context?.state==='running')click();
  else pending?.then(click);
}
