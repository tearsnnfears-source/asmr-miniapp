// Mock data for the asmrleaks redesign

const ARTISTS = [
  { id: 'a1', name: 'Heyhelen ASMR', handle: '@heyhelen', tag: 'pink', videos: 142, photos: 1820, fresh: true },
  { id: 'a2', name: 'Mar1oASMR', handle: '@mar1o', tag: 'lime', videos: 87, photos: 1240 },
  { id: 'a3', name: 'Tingle 808', handle: '@t808', tag: 'blue', videos: 220, photos: 2940, fresh: true },
  { id: 'a4', name: 'Velvet Bunny', handle: '@vbunny', tag: 'purple', videos: 64, photos: 980 },
  { id: 'a5', name: 'Aurora Hush', handle: '@aurorahush', tag: 'pink', videos: 53, photos: 720 },
  { id: 'a6', name: 'Soft.koi', handle: '@softkoi', tag: 'lime', videos: 41, photos: 510 },
  { id: 'a7', name: 'Nyx Whispers', handle: '@nyx', tag: 'orange', videos: 71, photos: 1060, fresh: true },
  { id: 'a8', name: 'Lila Mochi', handle: '@lila', tag: 'blue', videos: 98, photos: 1390 },
];

// Thumbnail palettes — abstract gradient cards (no real photos, no copyright issues)
const THUMB_PALETTES = [
  ['#FF7EC8', '#C86BFF', '#44C8FF'],
  ['#CCFF00', '#44C8FF', '#0E0E0F'],
  ['#FF9F44', '#FF7EC8', '#1E1E20'],
  ['#44C8FF', '#C86BFF', '#161617'],
  ['#FF7EC8', '#FF9F44', '#252527'],
  ['#CCFF00', '#FF7EC8', '#1E1E20'],
  ['#C86BFF', '#FF7EC8', '#161617'],
  ['#FF9F44', '#CCFF00', '#0E0E0F'],
];

function makeThumb(idx) {
  const p = THUMB_PALETTES[idx % THUMB_PALETTES.length];
  return {
    bg: `linear-gradient(135deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`,
    dot: p[0],
  };
}

const VIDEOS = [
  { id: 'v1',  title: 'Soft brushing & whisper · Eardrum cleanup', artist: ARTISTS[0], duration: '22:03', age: '29 min ago', views: '1.2K', thumb: makeThumb(0) },
  { id: 'v2',  title: '3DIO ear massage · slow trigger words', artist: ARTISTS[1], duration: '18:47', age: '2 hours ago', views: '8.4K', thumb: makeThumb(1) },
  { id: 'v3',  title: 'Tingle therapy · scratching session', artist: ARTISTS[2], duration: '41:12', age: '5 hours ago', views: '24K', thumb: makeThumb(2) },
  { id: 'v4',  title: 'Personal attention · sleep companion', artist: ARTISTS[3], duration: '1:02:08', age: '1 day ago', views: '102K', thumb: makeThumb(3) },
  { id: 'v5',  title: 'Mouth sounds · gentle inaudible', artist: ARTISTS[0], duration: '15:30', age: '1 day ago', views: '38K', thumb: makeThumb(4) },
  { id: 'v6',  title: 'Late-night roleplay · spa visit', artist: ARTISTS[4], duration: '34:55', age: '2 days ago', views: '6.7K', thumb: makeThumb(5) },
  { id: 'v7',  title: 'Tapping & tracing · pure triggers', artist: ARTISTS[5], duration: '27:18', age: '3 days ago', views: '12K', thumb: makeThumb(6) },
  { id: 'v8',  title: 'Hair brushing · close-up mic', artist: ARTISTS[6], duration: '49:02', age: '4 days ago', views: '54K', thumb: makeThumb(7) },
  { id: 'v9',  title: 'Glass tapping · crystal triggers', artist: ARTISTS[7], duration: '21:44', age: '5 days ago', views: '9.1K', thumb: makeThumb(0) },
  { id: 'v10', title: 'Layered whisper · breathy reading', artist: ARTISTS[2], duration: '38:11', age: '6 days ago', views: '71K', thumb: makeThumb(1) },
];

const SHORTS = [
  { id: 's1', artist: ARTISTS[0], duration: '0:24', views: '12K',  thumb: makeThumb(0), label: 'Ear cleanup' },
  { id: 's2', artist: ARTISTS[1], duration: '0:48', views: '34K',  thumb: makeThumb(1), label: 'Mic test' },
  { id: 's3', artist: ARTISTS[2], duration: '0:32', views: '208K', thumb: makeThumb(2), label: '3DIO trigger' },
  { id: 's4', artist: ARTISTS[3], duration: '0:51', views: '4.1K', thumb: makeThumb(3), label: 'Late night' },
  { id: 's5', artist: ARTISTS[4], duration: '0:18', views: '88K',  thumb: makeThumb(4), label: 'Slow tap' },
  { id: 's6', artist: ARTISTS[5], duration: '0:42', views: '17K',  thumb: makeThumb(5), label: 'Brush' },
  { id: 's7', artist: ARTISTS[6], duration: '0:30', views: '52K',  thumb: makeThumb(6), label: 'Tingle' },
  { id: 's8', artist: ARTISTS[7], duration: '0:26', views: '9.4K', thumb: makeThumb(7), label: 'Whisper' },
  { id: 's9', artist: ARTISTS[0], duration: '0:33', views: '21K',  thumb: makeThumb(2), label: 'Spa intro' },
  { id: 's10', artist: ARTISTS[2], duration: '0:44', views: '64K', thumb: makeThumb(5), label: 'Crinkles' },
];

const CATEGORIES = [
  { id: 'fresh',    label: 'Fresh',      icon: '◐' },
  { id: 'whisper',  label: 'Whisper',    icon: '◑' },
  { id: '3dio',     label: '3DIO',       icon: '◒' },
  { id: 'roleplay', label: 'Roleplay',   icon: '◓' },
  { id: 'sleep',    label: 'Sleep',      icon: '◔' },
  { id: 'mouth',    label: 'Mouth',      icon: '◕' },
  { id: 'tap',      label: 'Tapping',    icon: '◗' },
];

const STATS = { photos: 53168, videos: 11385, artists: 112 };

Object.assign(window, { ARTISTS, VIDEOS, SHORTS, CATEGORIES, STATS, makeThumb });
