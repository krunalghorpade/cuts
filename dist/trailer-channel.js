import {CSS3DObject} from './vendor/CSS3DRenderer.js';
import {roomRotation} from './trailer-rotation.js';

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
  if(!entries.length)return {setScreen(){},sound(){},resume(){},distance(){}};
  const rotation=roomRotation(room,entries);
  const width=640,height=retro?480:360;
  const surface=document.createElement('div');
  surface.style.cssText='width:'+width+'px;height:'+height+'px;background:black;overflow:hidden;pointer-events:none';
  const plane=new CSS3DObject(surface);plane.visible=false;scene.add(plane);
  let tv=null,entry=null,candidates=[],index=0,source=null,video=null,embed=null,hls=null,ready=false;
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
    if(hls){hls.destroy();hls=null;}
    if(video){video.onplaying=video.onerror=video.onended=video.onwaiting=null;video.pause();video.removeAttribute('src');video.load();video=null;}
    if(embed){embed.destroy();embed=null;}
    surface.replaceChildren();source=null;
  }
  function next(){
    resetSource();entry=rotation.choose();index=0;marked=false;
    standby[room].userData.cue?.(entry?.item||null);
    if(!entry){watch(30000,next);return;}
    candidates=rotation.sourcesFor(entry);startSource();
  }
  function failed(){
    if(!entry||!tv)return;
    resetSource();
    if(index<candidates.length){startSource();return;}
    rotation.unavailable(entry.id);next();
  }
  function playing(){
    if(!tv)return;
    clearTimeout(timer);blocked=false;display(true);
    if(!marked){rotation.played(entry.id,entry.siblings,entry.sources.indexOf(source));marked=true;}
  }
  function sound(value){
    muted=value;
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
        }else failed();
      });
    }else if(embed&&ready){sound(muted);embed.playVideo();}
  }
  function startSource(){
    source=candidates[index++];
    const tag=++generation;
    watch(15000,failed);
    if(source.type!=='youtube'){
      video=document.createElement('video');
      video.playsInline=true;video.preload='none';video.disablePictureInPicture=true;video.tabIndex=-1;
      video.style.cssText='width:100%;height:100%;object-fit:contain';video.title=entry.item.title+' trailer';
      video.volume=volume;sound(muted);surface.append(video);
      video.onplaying=playing;video.onended=next;video.onerror=failed;video.onwaiting=()=>{if(tv)watch(15000,failed);};
      const nativeHls=video.canPlayType('application/vnd.apple.mpegurl');
      const preferNative=nativeHls&&(navigator.vendor==='Apple Computer, Inc.'||!window.MediaSource);
      if(source.type==='hls'&&!preferNative){
        import('./vendor/hls.min.mjs').then(({default:Hls})=>{
          if(tag!==generation)return;
          if(!Hls.isSupported()){
            if(nativeHls){video.src=source.value;if(tv)play();}
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
            ready=true;e.target.setVolume(Math.round(volume*100));sound(muted);if(tv)play();
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
  function setScreen(target,departed){
    if(!target){
      display(false);tv=null;plane.visible=false;clearTimeout(timer);
      if(departed){resetSource();entry=null;}
      else if(video)video.pause();
      else if(ready)embed?.pauseVideo();
      return;
    }
    if(tv===target)return;
    tv=target;plane.visible=true;tv.screen.getWorldPosition(plane.position);tv.screen.getWorldQuaternion(plane.quaternion);
    plane.scale.set(tv.w/width,tv.h/height,1);
    if(!entry||!source){next();return;}
    play();
  }
  return {setScreen,sound,resume(){
    if(!tv)return;
    if(gestureMuted&&!muted){gestureMuted=false;sound(muted);play();}
    else if(blocked||video?.paused||ready&&embed?.getPlayerState()===2)play();
  },distance(position){
    if(!tv)return;
    const v=Math.round(100*Math.min(1,1/(1+.12*Math.max(0,position.distanceTo(plane.position)-1)**1.5)))/100;
    if(v===volume)return;volume=v;if(video)video.volume=v;if(ready)embed?.setVolume(v*100);
  }};
}
