/**
 * dynamic-songs.js — artist suggestion pool for the pick screen.
 *
 * Pool source: static list of ~200 broadly popular artists, shuffled and
 * trimmed to 50 per room. Search is always available for anything not in
 * the pool.
 *
 * Future: seed pool from actual Spotify playlist tracks when host provides
 * a playlist URL/ID. Internal game history database (play counts, pick
 * frequency) planned for smart pool generation via local AI.
 *
 * Song mode retired — only artist pools are generated.
 */

// ── Top ~200 broadly popular artists (cross-genre) ───────────────────────────
const ALL_ARTISTS = [
  // Pop / mainstream
  'Taylor Swift', 'Ed Sheeran', 'Ariana Grande', 'Dua Lipa', 'Harry Styles',
  'Olivia Rodrigo', 'Billie Eilish', 'Justin Bieber', 'Selena Gomez', 'Shawn Mendes',
  'Charlie Puth', 'Camila Cabello', 'Bebe Rexha', 'Halsey', 'Demi Lovato',
  'Miley Cyrus', 'Katy Perry', 'Lady Gaga', 'Adele', 'Beyoncé',
  'Rihanna', 'Bruno Mars', 'The Weeknd', 'Post Malone', 'Sam Smith',
  'Lizzo', 'Meghan Trainor', 'Zara Larsson', 'Sia', 'P!nk',
  'John Legend', 'Charlie XCX', 'Sabrina Carpenter', 'Gracie Abrams', 'Chappell Roan',

  // Hip-Hop / R&B
  'Drake', 'Kendrick Lamar', 'Travis Scott', 'Cardi B', 'Nicki Minaj',
  'J. Cole', 'Future', 'Lil Baby', 'Gunna', 'Jack Harlow',
  'Lil Nas X', 'DaBaby', 'Polo G', 'Rod Wave', 'Roddy Ricch',
  'A$AP Rocky', 'Megan Thee Stallion', 'Doja Cat', 'SZA', 'H.E.R.',
  'Khalid', 'Summer Walker', 'Bryson Tiller', 'The Kid LAROI', 'Juice WRLD',
  'XXXTentacion', 'NBA YoungBoy', 'Lil Uzi Vert', 'Playboi Carti', 'Tyler the Creator',
  'Frank Ocean', 'Childish Gambino', 'Anderson .Paak', 'Chance the Rapper', 'Logic',
  'Wiz Khalifa', 'Wale', 'Big Sean', 'Meek Mill', 'Rick Ross',
  'Fivio Foreign', 'EST Gee', '42 Dugg', 'Moneybagg Yo', 'Yo Gotti',
  'Chris Brown', 'Usher', 'Ne-Yo', 'Trey Songz', 'Miguel',
  'Bad Bunny', 'J Balvin', 'Ozuna', 'Maluma', 'Daddy Yankee',

  // Rock / Alternative
  'Imagine Dragons', 'Twenty One Pilots', 'Coldplay', 'Maroon 5', 'OneRepublic',
  'The Chainsmokers', 'Panic! at the Disco', 'Fall Out Boy', 'Paramore', 'Linkin Park',
  'Green Day', 'Foo Fighters', 'Red Hot Chili Peppers', 'Radiohead', 'Muse',
  'Arctic Monkeys', 'The 1975', 'Tame Impala', 'Glass Animals', 'Cage the Elephant',
  'Kings of Leon', 'The Killers', 'U2', 'Metallica', 'Pearl Jam',
  'Nirvana', 'Guns N\' Roses', 'Bon Jovi', 'Aerosmith', 'AC/DC',
  'Led Zeppelin', 'Queen', 'The Rolling Stones', 'Fleetwood Mac', 'Eagles',
  'Hozier', 'Mumford & Sons', 'Of Monsters and Men', 'Florence + The Machine', 'Lorde',
  'Vampire Weekend', 'Modest Mouse', 'Death Cab for Cutie', 'Bon Iver', 'Sufjan Stevens',

  // Country
  'Morgan Wallen', 'Luke Combs', 'Zach Bryan', 'Chris Stapleton', 'Carrie Underwood',
  'Blake Shelton', 'Luke Bryan', 'Jason Aldean', 'Kenny Chesney', 'Tim McGraw',
  'Thomas Rhett', 'Cole Swindell', 'Sam Hunt', 'Brett Young', 'Darius Rucker',
  'Kacey Musgraves', 'Maren Morris', 'Miranda Lambert', 'Carly Pearce', 'Gabby Barrett',
  'Kane Brown', 'Jordan Davis', 'Dustin Lynch', 'Mitchell Tenpenny', 'Nate Smith',
  'Bailey Zimmerman', 'Jelly Roll', 'Lainey Wilson', 'Tyler Hubbard', 'Hardy',

  // Electronic / Dance
  'Calvin Harris', 'Marshmello', 'The Chainsmokers', 'Diplo', 'Skrillex',
  'David Guetta', 'Tiësto', 'Martin Garrix', 'Zedd', 'Kygo',
  'Illenium', 'Odesza', 'Flume', 'Disclosure', 'Kaytranada',
  'Deadmau5', 'Avicii', 'Swedish House Mafia', 'Daft Punk', 'Aphex Twin',

  // Classics / Legacy
  'Michael Jackson', 'Prince', 'Madonna', 'Whitney Houston', 'Mariah Carey',
  'Janet Jackson', 'Stevie Wonder', 'Elton John', 'David Bowie', 'Bob Dylan',
  'Bruce Springsteen', 'Tom Petty', 'Sting', 'Phil Collins', 'Billy Joel',
  'John Mayer', 'Jack Johnson', 'Jason Mraz', 'Train', 'Matchbox Twenty',
].map(name => ({ name }));

// ── Shuffle helper ────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { songs: [], artists } — 50 randomly selected artists from the pool.
 * playlistName accepted for future use (Spotify playlist seeding, history DB).
 * songs array is always empty (song mode retired).
 */
async function getDynamicPool(playlistName) {
  const artists = shuffle(ALL_ARTISTS).slice(0, 50);
  console.log(`[dynamic-songs] Static pool (shuffled 50) for "${playlistName || 'unnamed'}"`);
  return { songs: [], artists };
}

module.exports = { getDynamicPool };
