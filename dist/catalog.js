const load = async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Unable to read the store catalog");
  return response.json();
};
const [screenTitles, music, books, playlistSources, trailerSources, editions, previews] = await Promise.all([
  load("imdb-items.json"), load("spotify-items.json"), load("book-items.json"), load("playlists.json"), load("trailers.json").catch(()=>({})),
  load("game-editions.json"), load("music-previews.json")
]);
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
  ['cartridges','Game cartridges','CARTRIDGES','CART','#8875b5'],
  ['game-discs','Other game editions','GAME ARCHIVE','CASE','#778380'],
  ['vinyl','Vinyl records','VINYL','LP','#bd6480'],
  ['cassettes','Cassettes','CASSETTES','TAPE','#c9934e'],
  ['cds','Music CDs','COMPACT DISCS','CD','#6c9c70'],
  ['books','Books','BOOKS','BOOK','#937d61']
].map(([id,label,short,format,accent])=>({id,label,short,format,accent}));
export const gameCategories=['playstation','xbox','game-discs','cartridges'];
export const screenCategories=['movies','anime-movies','shows','anime',...gameCategories];
const titles=screenTitles.map(item=>{
  const edition=editions[item.id];
  if(!edition)return item;
  const consoleDisc=item.category==='game-discs' && ['playstation','xbox'].includes(edition.shelf);
  return {...item,...(edition.artwork?{artwork:edition.artwork,igdbUrl:edition.igdbUrl}:{}),
    ...(consoleDisc?{category:edition.shelf,platform:edition.platform,edition:edition.edition||'',format:edition.platform+' disc'}:{})};
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
export const ITEMS = [...titles, ...retainedMusic, ...books].filter(item => {
  const key = item.albumUri ? item.albumUri + "|" + item.category : item.id;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(item => ({...item, accent: categoryById[item.category].accent}));
