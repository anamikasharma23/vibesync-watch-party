// Movie catalog used for recommendations, filters, fuzzy search and the group swipe.
// "src" is set only for films that are free to stream (Blender open movies, CC BY).
// Everything else can be picked by the group and then played from a YouTube or MP4 link.

const OPEN = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';

export const CATALOG = [
  // Free to stream right away
  { id: 'bbb', title: 'Big Buck Bunny', year: 2008, lang: 'English', runtime: 10, genres: ['Comedy', 'Animation'], blurb: 'A gentle giant rabbit takes revenge on three bullies.', src: { type: 'mp4', url: OPEN + 'BigBuckBunny.mp4' } },
  { id: 'sintel', title: 'Sintel', year: 2010, lang: 'English', runtime: 15, genres: ['Fantasy', 'Adventure', 'Drama'], blurb: 'A girl searches a hostile world for her lost baby dragon.', src: { type: 'mp4', url: OPEN + 'Sintel.mp4' } },
  { id: 'tos', title: 'Tears of Steel', year: 2012, lang: 'English', runtime: 12, genres: ['Sci-Fi', 'Action'], blurb: 'Scientists try to save the world from robots in future Amsterdam.', src: { type: 'mp4', url: OPEN + 'TearsOfSteel.mp4' } },
  { id: 'ed', title: 'Elephants Dream', year: 2006, lang: 'English', runtime: 11, genres: ['Sci-Fi', 'Fantasy'], blurb: 'Two men explore a strange, endless machine.', src: { type: 'mp4', url: OPEN + 'ElephantsDream.mp4' } },

  // Horror
  { id: 'conjuring', title: 'The Conjuring', year: 2013, lang: 'English', runtime: 112, genres: ['Horror', 'Thriller'], blurb: 'Paranormal investigators help a family terrorised by a dark presence.' },
  { id: 'stree', title: 'Stree', year: 2018, lang: 'Hindi', runtime: 128, genres: ['Horror', 'Comedy'], blurb: 'A small town is haunted by a spirit that abducts men at night.' },
  { id: 'tumbbad', title: 'Tumbbad', year: 2018, lang: 'Hindi', runtime: 104, genres: ['Horror', 'Fantasy'], blurb: 'Greed, a cursed treasure and a god who should never be worshipped.' },
  { id: 'getout', title: 'Get Out', year: 2017, lang: 'English', runtime: 104, genres: ['Horror', 'Thriller'], blurb: 'A weekend visit to meet the parents turns deeply wrong.' },
  { id: 'quietplace', title: 'A Quiet Place', year: 2018, lang: 'English', runtime: 90, genres: ['Horror', 'Sci-Fi'], blurb: 'A family survives by never making a sound.' },
  { id: 'bhoolbhulaiyaa', title: 'Bhool Bhulaiyaa', year: 2007, lang: 'Hindi', runtime: 159, genres: ['Horror', 'Comedy'], blurb: 'A haunted palace, a family secret and a psychiatrist who does not believe in ghosts.' },
  { id: 'hereditary', title: 'Hereditary', year: 2018, lang: 'English', runtime: 127, genres: ['Horror', 'Drama'], blurb: 'After a death in the family, something inherited starts to surface.' },
  { id: 'bhediya', title: 'Bhediya', year: 2022, lang: 'Hindi', runtime: 156, genres: ['Horror', 'Comedy'], blurb: 'A wolf bite in the Arunachal forests changes a contractor forever.' },

  // Sci-fi
  { id: 'interstellar', title: 'Interstellar', year: 2014, lang: 'English', runtime: 169, genres: ['Sci-Fi', 'Drama', 'Adventure'], blurb: 'Explorers travel through a wormhole to find humanity a new home.' },
  { id: 'inception', title: 'Inception', year: 2010, lang: 'English', runtime: 148, genres: ['Sci-Fi', 'Thriller', 'Action'], blurb: 'A thief who steals secrets from dreams is asked to plant one instead.' },
  { id: 'matrix', title: 'The Matrix', year: 1999, lang: 'English', runtime: 136, genres: ['Sci-Fi', 'Action'], blurb: 'A hacker learns the world he knows is a simulation.' },
  { id: 'enthiran', title: 'Enthiran', year: 2010, lang: 'Tamil', runtime: 174, genres: ['Sci-Fi', 'Action', 'Romance'], blurb: 'A scientist builds a robot that learns to feel, and to want.' },
  { id: 'koimilgaya', title: 'Koi... Mil Gaya', year: 2003, lang: 'Hindi', runtime: 171, genres: ['Sci-Fi', 'Drama'], blurb: 'A boy befriends an alien left behind on Earth.' },
  { id: 'arrival', title: 'Arrival', year: 2016, lang: 'English', runtime: 116, genres: ['Sci-Fi', 'Drama'], blurb: 'A linguist races to understand visitors before the world panics.' },
  { id: 'dune', title: 'Dune', year: 2021, lang: 'English', runtime: 155, genres: ['Sci-Fi', 'Adventure'], blurb: 'A noble family takes control of the most dangerous planet in the universe.' },

  // Comedy
  { id: '3idiots', title: '3 Idiots', year: 2009, lang: 'Hindi', runtime: 170, genres: ['Comedy', 'Drama'], blurb: 'Two friends search for the college buddy who changed how they saw life.' },
  { id: 'heraPheri', title: 'Hera Pheri', year: 2000, lang: 'Hindi', runtime: 156, genres: ['Comedy', 'Crime'], blurb: 'Three broke men get a ransom call meant for someone else.' },
  { id: 'aaa', title: 'Andaz Apna Apna', year: 1994, lang: 'Hindi', runtime: 160, genres: ['Comedy', 'Romance'], blurb: 'Two slackers compete to marry an heiress.' },
  { id: 'superbad', title: 'Superbad', year: 2007, lang: 'English', runtime: 113, genres: ['Comedy'], blurb: 'Two best friends try to make one party count before college.' },
  { id: 'budapest', title: 'The Grand Budapest Hotel', year: 2014, lang: 'English', runtime: 99, genres: ['Comedy', 'Adventure'], blurb: 'A legendary concierge is framed for murder.' },
  { id: 'munnabhai', title: 'Munna Bhai M.B.B.S.', year: 2003, lang: 'Hindi', runtime: 156, genres: ['Comedy', 'Drama'], blurb: 'A gangster enrols in medical college to impress his father.' },
  { id: 'welcome', title: 'Welcome', year: 2007, lang: 'Hindi', runtime: 159, genres: ['Comedy', 'Crime'], blurb: 'A doctor falls for a girl whose brothers are dons.' },
  { id: 'znmd', title: 'Zindagi Na Milegi Dobara', year: 2011, lang: 'Hindi', runtime: 155, genres: ['Comedy', 'Drama', 'Adventure'], blurb: 'Three friends take a road trip through Spain before a wedding.' },

  // Romance and drama
  { id: 'jabwemet', title: 'Jab We Met', year: 2007, lang: 'Hindi', runtime: 138, genres: ['Romance', 'Comedy'], blurb: 'A heartbroken man meets a chatterbox on a train.' },
  { id: 'yjhd', title: 'Yeh Jawaani Hai Deewani', year: 2013, lang: 'Hindi', runtime: 160, genres: ['Romance', 'Drama'], blurb: 'A trek, a group of friends and a reunion years later.' },
  { id: 'lalaland', title: 'La La Land', year: 2016, lang: 'English', runtime: 128, genres: ['Romance', 'Musical', 'Drama'], blurb: 'A jazz pianist and an actress chase dreams in Los Angeles.' },
  { id: 'ddlj', title: 'Dilwale Dulhania Le Jayenge', year: 1995, lang: 'Hindi', runtime: 189, genres: ['Romance', 'Musical'], blurb: 'Two travellers fall in love on a trip across Europe.' },
  { id: 'beforesunrise', title: 'Before Sunrise', year: 1995, lang: 'English', runtime: 101, genres: ['Romance', 'Drama'], blurb: 'Two strangers spend one night walking through Vienna.' },
  { id: 'barfi', title: 'Barfi!', year: 2012, lang: 'Hindi', runtime: 151, genres: ['Romance', 'Comedy', 'Drama'], blurb: 'A deaf and mute man and the two women who love him.' },
  { id: 'notebook', title: 'The Notebook', year: 2004, lang: 'English', runtime: 123, genres: ['Romance', 'Drama'], blurb: 'An old man reads a love story to a woman in a care home.' },

  // Thriller and action
  { id: 'drishyam', title: 'Drishyam', year: 2015, lang: 'Hindi', runtime: 163, genres: ['Thriller', 'Crime', 'Drama'], blurb: 'A father goes to any length to protect his family.' },
  { id: 'andhadhun', title: 'Andhadhun', year: 2018, lang: 'Hindi', runtime: 139, genres: ['Thriller', 'Comedy', 'Crime'], blurb: 'A pianist pretending to be blind witnesses a murder.' },
  { id: 'kahaani', title: 'Kahaani', year: 2012, lang: 'Hindi', runtime: 122, genres: ['Thriller', 'Mystery'], blurb: 'A pregnant woman searches Kolkata for her missing husband.' },
  { id: 'parasite', title: 'Parasite', year: 2019, lang: 'Korean', runtime: 132, genres: ['Thriller', 'Drama', 'Comedy'], blurb: 'A poor family schemes its way into a rich household.' },
  { id: 'gonegirl', title: 'Gone Girl', year: 2014, lang: 'English', runtime: 149, genres: ['Thriller', 'Mystery'], blurb: 'A wife vanishes and her husband becomes the main suspect.' },
  { id: 'madmax', title: 'Mad Max: Fury Road', year: 2015, lang: 'English', runtime: 120, genres: ['Action', 'Sci-Fi', 'Adventure'], blurb: 'A desert chase across a wasteland that never slows down.' },
  { id: 'rrr', title: 'RRR', year: 2022, lang: 'Telugu', runtime: 187, genres: ['Action', 'Drama'], blurb: 'Two revolutionaries form an unlikely friendship in 1920s India.' },
  { id: 'baahubali', title: 'Baahubali: The Beginning', year: 2015, lang: 'Telugu', runtime: 159, genres: ['Action', 'Fantasy', 'Adventure'], blurb: 'A young man discovers his royal past beyond a giant waterfall.' },
  { id: 'kgf', title: 'K.G.F: Chapter 1', year: 2018, lang: 'Kannada', runtime: 155, genres: ['Action', 'Crime'], blurb: 'A man rises from the streets to the gold fields.' },

  // Animation
  { id: 'spiritedaway', title: 'Spirited Away', year: 2001, lang: 'Japanese', runtime: 125, genres: ['Animation', 'Fantasy', 'Adventure'], blurb: 'A girl must work in a bathhouse for spirits to save her parents.' },
  { id: 'coco', title: 'Coco', year: 2017, lang: 'English', runtime: 105, genres: ['Animation', 'Musical', 'Adventure'], blurb: 'A boy who loves music crosses into the Land of the Dead.' },
  { id: 'up', title: 'Up', year: 2009, lang: 'English', runtime: 96, genres: ['Animation', 'Adventure', 'Comedy'], blurb: 'An old man flies his house to South America with balloons.' },
];

export const GENRES = [...new Set(CATALOG.flatMap((m) => m.genres))].sort();
export const LANGS = [...new Set(CATALOG.map((m) => m.lang))].sort();

export const CATEGORIES = [
  { id: 'free', label: 'Watch free now', test: (m) => !!m.src },
  { id: 'scary', label: 'Scream together', test: (m) => m.genres.includes('Horror') },
  { id: 'laugh', label: 'Group laughs', test: (m) => m.genres.includes('Comedy') },
  { id: 'short', label: 'Under 2 hours', test: (m) => m.runtime <= 120 },
  { id: 'mind', label: 'Mind benders', test: (m) => m.genres.includes('Sci-Fi') || m.genres.includes('Mystery') },
  { id: 'feels', label: 'In your feels', test: (m) => m.genres.includes('Romance') },
];

// Which room "world" a film gets, from its genres.
export function worldFor(genres = []) {
  if (genres.includes('Horror')) return 'fog';
  if (genres.includes('Sci-Fi')) return 'space';
  if (genres.includes('Romance')) return 'rain';
  if (genres.includes('Comedy') || genres.includes('Musical')) return 'stage';
  return 'calm';
}

// Recommendation score for a room: overlap with genres the room has liked/watched.
export function recommend(likedGenres = {}, list = CATALOG) {
  return [...list].map((m) => ({
    m,
    score: m.genres.reduce((s, g) => s + (likedGenres[g] || 0), 0) + (m.src ? 0.5 : 0) + (m.year > 2010 ? 0.2 : 0),
  })).sort((a, b) => b.score - a.score).map((x) => x.m);
}

// VibeMatch: each person picks a vibe, the swipe deck is built from the room's mix.
export const VIBES = [
  { id: 'laugh', label: 'Need a laugh', color: '#FFD23F', genres: { Comedy: 3, Animation: 1, Musical: 1 } },
  { id: 'scared', label: 'Want to be scared', color: '#FF4F7B', genres: { Horror: 3, Thriller: 1 } },
  { id: 'cry', label: 'Something to cry to', color: '#C3B3EE', genres: { Romance: 2, Drama: 2 } },
  { id: 'brainoff', label: 'Brain off, pure fun', color: '#3DB7FF', genres: { Action: 2, Comedy: 1, Adventure: 2, Animation: 1 } },
  { id: 'edge', label: 'Edge of my seat', color: '#FFB547', genres: { Thriller: 3, Mystery: 2, Crime: 2 } },
  { id: 'mind', label: 'Blow my mind', color: '#5BE3A6', genres: { 'Sci-Fi': 3, Fantasy: 1, Mystery: 1 } },
];

export function deckFromVibes(picks, exclude = [], size = 12) {
  const weights = {};
  for (const v of picks) {
    const vibe = VIBES.find((x) => x.id === v);
    if (!vibe) continue;
    for (const [g, w] of Object.entries(vibe.genres)) weights[g] = (weights[g] || 0) + w;
  }
  const scored = CATALOG.filter((m) => !exclude.includes(m.id)).map((m) => ({
    m, s: m.genres.reduce((a, g) => a + (weights[g] || 0), 0) + Math.random() * 1.5,
  })).sort((a, b) => b.s - a.s);
  const deck = scored.slice(0, size - 2).map((x) => x.m.id);
  // Always include a couple of films the room can play right away.
  for (const f of scored.filter((x) => x.m.src && !deck.includes(x.m.id)).slice(0, 2)) deck.push(f.m.id);
  return deck.slice(0, size);
}

export const VERDICTS = [
  { id: 'never', label: 'Never again in this life', color: '#FF4F7B' },
  { id: 'snacks', label: 'Worth it for the snacks', color: '#FFD23F' },
  { id: 'cried', label: "Cried, won't admit it", color: '#C3B3EE' },
  { id: 'blame', label: 'Blame whoever picked it', color: '#FFB547' },
  { id: 'mind', label: 'Mind = blown', color: '#5BE3A6' },
  { id: 'slept', label: 'Slept through it', color: '#3DB7FF' },
];
