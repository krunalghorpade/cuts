import {retroPackage} from './game-packages.js';
const files=['imdb-items','spotify-items','book-items','playlists','trailers','game-editions','music-previews','manga-items','item-descriptions','poster-content'];
export async function loadCollections(cache='default'){
  return Promise.all(files.map(async name=>{
    const response=await fetch(new URL('./'+name+'.json',import.meta.url),{cache});
    if(!response.ok)throw new Error('Unable to load '+name);
    return response.json();
  }));
}
const [screenTitles,music,books,playlistSources,trailerSources,editions,previews,manga,descriptions,editorial]=await loadCollections();
export const posterContent=editorial;
export const trailerStreams = trailerSources;
export const musicPreviews = previews;
export const playlists = playlistSources;
export const bookList = "https://openlibrary.org/people/krunal_ghorpade/lists/OL360679L/my_books";
export const imdbList = "https://www.imdb.com/user/p.ad4lijmxzoqnsph42clunnfkoi/watchlist/";

export const CATEGORIES = [
  ['movies','Movies','MOVIES','DVD','#d65b55'],
  ['anime-movies','Anime movies','ANIME MOVIES','DVD','#a79aa5'],
  ['shows','TV series','SERIES','BOX SET','#d99043'],
  ['anime','Anime series','ANIME SERIES','BOX SET','#a4a4a4'],
  ['playstation','PlayStation discs','PLAYSTATION','DISC','#3a69ab'],
  ['xbox','Xbox discs','XBOX','DISC','#56834e'],
  ['retro-games','Retro boxed games','BOXED GAMES','BOX','#8875b5'],
  ['switch','Nintendo Switch','SWITCH','CASE','#ac4947'],
  ['game-discs','Other game editions','GAME ARCHIVE','CASE','#778380'],
  ['vinyl','Vinyl records','VINYL','LP','#bd6480'],
  ['cassettes','Cassettes','CASSETTES','TAPE','#c9934e'],
  ['cds','Music CDs','COMPACT DISCS','CD','#6c9c70'],
  ['books','Books','BOOKS','BOOK','#937d61'],
  ['manga','Manga','MANGA','MANGA','#a56a53']
].map(([id,label,short,format,accent])=>({id,label,short,format,accent}));
export const gameCategories=['playstation','xbox','game-discs','retro-games','switch'];
export const screenCategories=['movies','anime-movies','shows','anime',...gameCategories];
const titles=screenTitles.map(item=>{
  const edition=editions[item.id];
  if(!['cartridges','game-discs'].includes(item.category))return item;
  const platform=item.platform||edition?.platform||'';
  const retro=retroPackage(platform);
  const category=retro?'retro-games':/^Nintendo Switch/i.test(platform)?'switch':
    /^PlayStation [345]$/i.test(platform)?'playstation':/^Xbox (360|One|Series)/i.test(platform)?'xbox':'game-discs';
  return {...item,category,platform,edition:edition?.edition||'',
    format:retro?platform+' boxed edition':category==='switch'?'Nintendo Switch retail case':platform?platform+' disc':item.format,
    ...(edition?.launchboxUrl && edition.artwork ? {artwork:edition.artwork,launchboxUrl:edition.launchboxUrl,
      boxBack:edition.boxBack,boxSpine:edition.boxSpine,artworkNote:edition.artworkNote} : {})};
});
export const categoryById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
// Merge multiple Spotify editions with the same credited artist and album title.
const releases=new Map();
const releaseKey=item=>item.creator.toLowerCase()==='various artists' ? item.albumUri
  : JSON.stringify([item.creator.trim().toLowerCase(),item.title.trim().toLowerCase()]);
for(const item of music){
  const key=releaseKey(item);
  let group=releases.get(key);
  if(!group){group={album:item,lists:new Set()};releases.set(key,group);}
  if(item.releaseDate < group.album.releaseDate)group.album=item;
  for(const id of item.playlists || [])group.lists.add(id);
}
const retainedMusic=music.filter(item=>releases.get(releaseKey(item)).album.albumUri===item.albumUri)
  .map(item=>({...item,playlists:[...releases.get(releaseKey(item)).lists]}));
const seen = new Set();
export const ITEMS = [...titles, ...retainedMusic, ...books, ...manga].filter(item => {
  const key = item.albumUri ? item.albumUri + "|" + item.category : item.id;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(item=>{
  const note=descriptions[item.id]||descriptions[item.albumUri];
  const sourceText=item.description||note?.text;
  const extra=item.album&&item.featuredTrack?' Its playlist selection includes “'+item.featuredTrack+'”.':'';
  return {...item,description:sourceText||[item.title,item.creator?'by '+item.creator:'',item.year?'('+item.year+')':''].filter(Boolean).join(' ')+'.'+extra,
    descriptionSource:note?.sourceUrl||item.sourceUrl,accent:categoryById[item.category].accent};
});
