// Dapur Ember — config: recipes, ingredients, stations and tuning.
// All names, dishes and prices are original to this game.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const DAY_SECONDS = 150;

export const INGREDIENTS = {
  bun:     { id: 'bun',     name: 'Roti',       color: '#e8a54b', ready: true },
  patty:   { id: 'patty',   name: 'Patty',      color: '#8a4b2a', ready: false },
  lettuce: { id: 'lettuce', name: 'Selada',     color: '#5da244', ready: false },
  tomato:  { id: 'tomato',  name: 'Tomat',      color: '#d9392b', ready: false },
  cheese:  { id: 'cheese',  name: 'Keju',       color: '#f2c230', ready: true },
  fries:   { id: 'fries',   name: 'Kentang',    color: '#f6c945', ready: false },
};

export const RECIPES = [
  { id: 'klasik',  name: 'Ember Klasik',  needs: ['bun', 'patty', 'lettuce'],            price: 18 },
  { id: 'keju',    name: 'Keju Lava',     needs: ['bun', 'patty', 'cheese', 'tomato'],   price: 26 },
  { id: 'sayur',   name: 'Sayur Segar',   needs: ['bun', 'lettuce', 'tomato', 'cheese'], price: 22 },
  { id: 'komplit', name: 'Komplit Ember', needs: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'], price: 34 },
  { id: 'kentang', name: 'Kentang Ember', needs: ['fries'],                              price: 12 },
];

export const TUNING = {
  chefSpeed: 300,
  grillCookSeconds: 6,      // raw patty -> perfect
  grillBurnSeconds: 12,     // perfect -> burnt
  fryerCookSeconds: 8,      // raw fries -> ready
  fryerBurnSeconds: 15,     // ready -> burnt
  chopSeconds: 2.4,         // hold Space to chop tomato / lettuce
  orderPatienceSeconds: 48,
  firstOrderDelaySeconds: 2,
  orderEverySeconds: 13,
  rushAfterSeconds: 70,     // after this, orders arrive faster
  rushOrderEverySeconds: 9,
  maxTickets: 4,
  tipPerPatienceSecond: 0.35,
  comboStep: 0.25,
  comboCap: 3,
  wrongServePenalty: 5,
  expiredPenalty: 0,
};

// Stations: rectangles the chef walks up to. y is the counter band.
export const STATIONS = {
  grill:    { id: 'grill',    label: 'PANGGANGAN', x: 40,  y: 150, w: 260, h: 100 },
  fryer:    { id: 'fryer',    label: 'PENGGORENG', x: 320, y: 150, w: 160, h: 100 },
  board:    { id: 'board',    label: 'TALENAN',    x: 500, y: 150, w: 160, h: 100 },
  assembly: { id: 'assembly', label: 'RAKITAN',    x: 680, y: 150, w: 260, h: 100 },
  window:   { id: 'window',   label: 'JENDELA SAJI', x: 960, y: 150, w: 280, h: 100 },
};

// Ingredient bins along the bottom wall.
export const BINS = [
  { id: 'bun',     x: 40,  w: 190 },
  { id: 'patty',   x: 245, w: 190 },
  { id: 'lettuce', x: 450, w: 190 },
  { id: 'tomato',  x: 655, w: 190 },
  { id: 'cheese',  x: 860, w: 190 },
  { id: 'fries',   x: 1065, w: 175 },
];
export const BIN_Y = 668;
export const BIN_H = 112;

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// Two stacks hold the same dish when they have the same ingredients,
// no matter the order they were stacked in.
export function stacksMatch(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}
