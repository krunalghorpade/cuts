const load = async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Unable to read the store catalog");
  return response.json();
};
const [screenTitles, music, books, playlistSources, trailerSources] = await Promise.all([
  load("imdb-items.json"), load("spotify-items.json"), load("book-items.json"), load("playlists.json"), load("trailers.json").catch(()=>({}))
]);
export const trailerStreams = trailerSources;
export const playlists = playlistSources;
export const bookList = "https://openlibrary.org/people/krunal_ghorpade/lists/OL360679L/my_books";
export const imdbList = "https://www.imdb.com/user/p.ad4lijmxzoqnsph42clunnfkoi/watchlist/";

export const CATEGORIES = [
  {
    "id": "movies",
    "label": "Movie DVDs",
    "short": "MOVIES",
    "format": "DVD",
    "source": "IMDb CSV",
    "accent": "#d65b55",
    "rack": {
      "x": -7.35,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "shows",
    "label": "Series",
    "short": "SERIES",
    "format": "BOX SET",
    "source": "IMDb CSV",
    "accent": "#d99043",
    "rack": {
      "x": -7.35,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "anime",
    "label": "Anime",
    "short": "ANIME",
    "format": "BOX SET",
    "source": "IMDb CSV",
    "accent": "#a4a4a4"
  },
  {
    "id": "game-discs",
    "label": "Game DVDs",
    "short": "GAME DISCS",
    "format": "DISC",
    "source": "IMDb CSV",
    "accent": "#4c9daa",
    "rack": {
      "x": -2.45,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "cartridges",
    "label": "Game cartridges",
    "short": "CARTRIDGES",
    "format": "CART",
    "source": "IMDb CSV",
    "accent": "#8875b5",
    "rack": {
      "x": -2.45,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "books",
    "label": "Books",
    "short": "BOOKS",
    "format": "BOOK",
    "source": "Open Library",
    "accent": "#937d61"
  },
  {
    "id": "vinyl",
    "label": "Vinyl records",
    "short": "VINYL",
    "format": "LP",
    "source": "Spotify playlist",
    "accent": "#bd6480",
    "rack": {
      "x": 2.45,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "cds",
    "label": "CDs",
    "short": "CDS",
    "format": "CD",
    "source": "Spotify playlist",
    "accent": "#6c9c70",
    "rack": {
      "x": 2.45,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "cassettes",
    "label": "Cassettes",
    "short": "CASSETTES",
    "format": "TAPE",
    "source": "Spotify playlist",
    "accent": "#c9934e",
    "rack": {
      "x": 7.35,
      "z": -2,
      "side": -1
    }
  }
];
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
export const ITEMS = [...screenTitles, ...retainedMusic, ...books].filter(item => {
  const key = item.albumUri ? item.albumUri + "|" + item.category : item.id;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(item => ({...item, accent: categoryById[item.category].accent}));
