import {CSS3DObject} from './vendor/CSS3DRenderer.js';
import {showProgramme,programmePages} from './screen-programme.js';
import {roomRotation} from './trailer-rotation.js';
import {connectTelevision} from './room-audio.js';

let apiPromise,apiRetryAt=0;
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  if(Date.now()<apiRetryAt)return Promise.reject(new Error('Embed API unavailable'));
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const previous=window.onYouTubeIframeAPIReady;
    function finish(ok){
      clearTimeout(timeout);window.onYouTubeIframeAPIReady=previous;
      if(ok){resolve(window.YT);previous?.();}
      else{script.remove();apiPromise=null;apiRetryAt=Date.now()+60000;reject(new Error('Embed API unavailable'));}
    }
    const timeout=setTimeout(()=>finish(false),10000);
    window.onYouTubeIframeAPIReady=()=>finish(true);
    script.onerror=()=>finish(false);script.src='https://www.youtube.com/iframe_api';document.head.append(script);
  });
  return apiPromise;
}

export function trailerSources(item,info={}){
  const out=[],used=new Set();
  function add(type,value){
    if(!value||used.has(value))return;
    used.add(value);out.push({type,value});
  }
  // A curator's explicit source and directly playable publisher media take priority.
  for(const url of [item.trailerUrl,...(info.streams||[]).map(s=>s.url),info.url]){
    if(!url)continue;
    let u;try{u=new URL(url);}catch{continue;}
    if(u.protocol!=='https:')continue;
    const id=u.hostname==='youtu.be'?u.pathname.slice(1):/(^|\.)youtube(?:-nocookie)?\.com$/.test(u.hostname)?u.searchParams.get('v')||u.pathname.split('/embed/')[1]:null;
    if(id&&/^[\w-]{11}$/.test(id))add('youtube',id);
    else add(/\.m3u8(?:$|\?)/i.test(url)?'hls':'video',url);
  }
  for(const clip of info.youtube||[]){
    const id=typeof clip==='string'?clip:clip.id;
    if(/^[\w-]{11}$/.test(id))add('youtube',id);
  }
  return out;
}

export function createChannel(scene,entries,retro,room,standby,windowMaterial){
  const rotation=roomRotation(room,entries);
  const width=640,height=retro?480:360;
  const surface=document.createElement('div');
  surface.style.cssText='width:'+width+'px;height:'+height+'px;background:black;overflow:hidden;pointer-events:none';
  const plane=new CSS3DObject(surface);plane.visible=false;scene.add(plane);
  let tv=null,entry=null,candidates=[],nativeRetries=[],index=0,source=null,video=null,embed=null,hls=null,ready=false;
  let requested=false,card=null,route=null,canProcess=false,inspecting=false;
  let gainStart=1,gainGoal=1,gainTime=0,lastEmbedVolume=-1;
  let timer=0,generation=0,muted=false,gestureMuted=false,volume=1,marked=false,blocked=false;
  function display(on){
    if(!tv)return;
    tv.screen.material=on?windowMaterial:standby[room];
    tv.screen.userData.item=on?entry?.item:null;
  }
  function watch(ms,fn){
    clearTimeout(timer);const tag=generation;
    timer=setTimeout(()=>{if(tag===generation&&tv)fn();},ms);
  }
  function resetSource(){
    generation++;clearTimeout(timer);display(false);ready=false;blocked=false;
    route?.disconnect();route=null;canProcess=false;lastEmbedVolume=-1;
    if(hls){hls.destroy();hls=null;}
    if(video){video.onplaying=video.onerror=video.onended=video.onwaiting=null;video.pause();video.removeAttribute('src');video.load();video=null;}
    if(embed){embed.destroy();embed=null;}
    surface.replaceChildren();source=null;
  }
  function next(){
    requested=false;card=null;resetSource();entry=rotation.choose();index=0;nativeRetries=[];marked=false;
    standby[room].userData.cue?.(entry?.item||null);
    if(!entry){if(entries.length)watch(30000,next);return;}
    candidates=rotation.sourcesFor(entry);startSource();
  }
  function failed(){
    if(!entry||!tv)return;
    resetSource();
    if(index<candidates.length||nativeRetries.length){startSource();return;}
    if(requested){present(entry.item,'Trailer unavailable',entry.item.description);return;}
    rotation.unavailable(entry.id);next();
  }
  function playing(){
    if(!tv)return;
    clearTimeout(timer);blocked=false;display(true);
    tv.screen.userData.programme='Trailer';
    surface.querySelector('.screen-programme')?.remove();
    if(!marked && entries.some(candidate=>candidate.id===entry.id)){rotation.played(entry.id,entry.siblings,entry.sources.indexOf(source));marked=true;}
  }
  function inspectionGain(now){
    const t=Math.min(1,Math.max(0,(now-gainTime)/120));
    return gainStart+(gainGoal-gainStart)*t;
  }
  function playerVolume(){
    const gain=volume*inspectionGain(performance.now());
    if(video&&!route && Math.abs(video.volume-gain)>.0001)video.volume=gain;
    const percent=Math.round(gain*100);
    if(ready&&embed&&percent!==lastEmbedVolume){
      lastEmbedVolume=percent;embed.setVolume(percent);
    }
  }
  function connectSound(){
    if(!video||!canProcess||route)return;
    route=connectTelevision(video,inspecting,(muted||gestureMuted)?0:volume);
    if(route)video.volume=1;
  }
  function inspect(on){
    if(inspecting===on)return;
    inspecting=on;
    const now=performance.now();gainStart=inspectionGain(now);gainTime=now;
    // Protected iframe players expose gain, but keep their audio signal private.
    gainGoal=on ? .28 : 1;route?.inspect(on);playerVolume();
  }
  function sound(value){
    muted=value;route?.volume((muted||gestureMuted)?0:volume);
    if(video)video.muted=muted||gestureMuted;
    if(embed&&ready){if(muted||gestureMuted)embed.mute();else embed.unMute();}
  }
  function play(){
    if(!tv||!source)return;
    const tag=generation;
    watch(15000,failed);
    if(video){
      video.play().catch(e=>{
        if(tag!==generation||!tv||e.name==='AbortError')return;
        if(e.name==='NotAllowedError'){
          if(!video.muted){gestureMuted=true;sound(muted);play();}
          else{blocked=true;clearTimeout(timer);}
        }else if(e.name==='NotSupportedError'&&video?.onerror)video.onerror();
        else failed();
      });
    }else if(embed&&ready){sound(muted);embed.playVideo();}
  }
  function startSource(){
    // Try the other native streams with CORS first. An opaque native source
    // can still play independently before falling back to an iframe.
    const process=!(nativeRetries.length && (!candidates[index]||candidates[index].type==='youtube'));
    source=process?candidates[index++]:nativeRetries.shift();
    const tag=++generation;
    if(requested){
      showProgramme(surface,entry.item,'Loading trailer');display(true);tv.screen.userData.programme='Loading trailer';
    }
    watch(15000,failed);
    if(source.type!=='youtube'){
      video=document.createElement('video');
      video.playsInline=true;video.preload='none';video.disablePictureInPicture=true;video.tabIndex=-1;
      video.style.cssText='width:100%;height:100%;object-fit:contain';video.title=entry.item.title+' trailer';
      canProcess=process;
      if(process)video.crossOrigin='anonymous';
      playerVolume();connectSound();sound(muted);surface.append(video);
      video.onplaying=playing;video.onended=next;video.onwaiting=()=>{if(tv)watch(15000,failed);};
      const nativeHls=video.canPlayType('application/vnd.apple.mpegurl');
      const preferNative=nativeHls&&(navigator.vendor==='Apple Computer, Inc.'||!window.MediaSource);
      let useMSE=source.type==='hls'&&!preferNative;
      video.onerror=()=>{
        if(tag!==generation||!tv)return;
        if(process&&!useMSE)nativeRetries.push(source);
        failed();
      };
      if(useMSE){
        import('./vendor/hls.min.mjs').then(({default:Hls})=>{
          if(tag!==generation)return;
          if(!Hls.isSupported()){
            if(nativeHls){useMSE=false;video.src=source.value;if(tv)play();}
            else if(tv)failed();
            return;
          }
          hls=new Hls({capLevelToPlayerSize:true,maxBufferLength:18});
          hls.on(Hls.Events.ERROR,(_event,error)=>{if(tag===generation&&tv&&error.fatal)failed();});
          hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(tag===generation&&tv)play();});
          hls.loadSource(source.value);hls.attachMedia(video);
        }).catch(()=>{if(tag===generation&&tv)failed();});
      }else{video.src=source.value;play();}
      return;
    }
    youtubeAPI().then(YT=>{
      if(tag!==generation||!source)return;
      const node=document.createElement('div');surface.append(node);
      embed=new YT.Player(node,{width,height,videoId:source.value,
        playerVars:{playsinline:1,controls:0,rel:0,origin:location.origin},
        events:{
          onReady(e){
            if(tag!==generation)return;
            ready=true;playerVolume();sound(muted);if(tv)play();
          },
          onStateChange(e){
            if(tag!==generation||!tv)return;
            if(e.data===YT.PlayerState.PLAYING)playing();
            if(e.data===YT.PlayerState.ENDED)next();
            if(e.data===YT.PlayerState.BUFFERING)watch(15000,failed);
          },
          onError(){if(tag===generation&&tv)failed();},
          onAutoplayBlocked(){
            if(tag!==generation||!tv)return;
            if(!muted&&!gestureMuted){gestureMuted=true;play();}
            else{blocked=true;clearTimeout(timer);}
          }
        }});
    }).catch(()=>{if(tag===generation&&tv)failed();});
  }
  function drawCard(){
    if(!tv||!card)return;
    showProgramme(surface,entry.item,card.label,card.pages[card.page]);
    display(true);tv.screen.userData.programme=card.label;
    if(card.pages.length>1)watch(8000,()=>{card.page=(card.page+1)%card.pages.length;drawCard();});
  }
  function present(item,label,description=''){
    resetSource();requested=true;entry={id:item.id,item};
    card={label,pages:programmePages(description),page:0};drawCard();
  }
  function request(item,sources,label='Collection preview'){
    if(!tv)return;
    if(!sources.length){present(item,label,item.description);return;}
    resetSource();requested=true;card=null;
    entry=entries.find(e=>e.id===item.id)||{id:item.id,item,sources};
    index=0;nativeRetries=[];marked=false;candidates=rotation.sourcesFor(entry);startSource();
  }
  function setScreen(target,departed){
    if(!target){
      display(false);tv=null;plane.visible=false;clearTimeout(timer);
      if(departed){resetSource();entry=null;card=null;requested=false;}
      else if(video)video.pause();
      else if(ready)embed?.pauseVideo();
      return;
    }
    if(tv===target)return;
    tv=target;plane.visible=true;tv.screen.getWorldPosition(plane.position);tv.screen.getWorldQuaternion(plane.quaternion);
    plane.scale.set(tv.w/width,tv.h/height,1);
    if(card){drawCard();return;}
    if(!entry||!source){next();return;}
    play();
  }
  return {setScreen,sound,inspect,connectSound,request,present,clear:next,resume(){
    if(!tv)return;
    if(gestureMuted&&!muted){gestureMuted=false;sound(muted);play();}
    else if(blocked||video?.paused||ready&&embed?.getPlayerState()===2)play();
  },distance(position){
    if(!tv)return;
    const v=Math.round(100*Math.min(1,1/(1+.12*Math.max(0,position.distanceTo(plane.position)-1)**1.5)))/100;
    if(v!==volume){volume=v;route?.volume((muted||gestureMuted)?0:v);}
    if(!route)playerVolume();
  }};
}
