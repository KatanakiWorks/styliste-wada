import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hexToLab, deltaE2000, nearestColors, buildCombos, outfitsFor, styleNote, basicColorName, learnTaste, rankByTaste, dayScore, outfitsOfTheDay } from '../src/lib/color.ts';

const COLORS = JSON.parse(readFileSync(new URL('../src/data/wada.json', import.meta.url)));
const COMBOS = buildCombos(COLORS);

test('dataset: 159 colours, 348 combinations of 2 to 4 colours', () => {
  assert.equal(COLORS.length, 159);
  assert.equal(COMBOS.size, 348);
  for (const cols of COMBOS.values()) assert.ok(cols.length >= 2 && cols.length <= 4);
});

test('hexToLab matches the dataset Lab within 0.5', () => {
  const lab = hexToLab('#f9c1ce'); // Hermosa Pink, dataset Lab 83.43 / 22.14 / 1.64
  [83.43, 22.14, 1.64].forEach((v, i) => assert.ok(Math.abs(lab[i] - v) < 0.5, `${i}: ${lab[i]}`));
});

test('CIEDE2000 matches Sharma reference pairs', () => {
  assert.ok(Math.abs(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-3);
  assert.ok(Math.abs(deltaE2000([50, 2.5, 0], [73, 25, -18]) - 27.1492) < 1e-3);
  assert.ok(Math.abs(deltaE2000([2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514]) - 0.9082) < 1e-3);
  assert.equal(deltaE2000([40, 10, 10], [40, 10, 10]), 0);
});

test('nearestColors finds the exact colour first', () => {
  const c = COLORS[42];
  assert.equal(nearestColors(c.hex, COLORS)[0].name, c.name);
});

test('outfitsFor fills top/bottom/shoes with colours of one combination', () => {
  const combo = [...COMBOS.entries()].find(([, cols]) => cols.length === 4);
  const [n, cols] = combo;
  const mk = (id, slot, color) => ({ id, slot, color, type: id, material: '', photo: '', createdAt: 0 });
  const shirt = mk('t', 'top', cols[0]);
  const items = [shirt, mk('b', 'bottom', cols[1]), mk('s', 'shoes', cols[2]), mk('a', 'accessory', cols[3]), mk('x', 'bottom', 'Nope')];
  const res = outfitsFor(shirt, items, COMBOS);
  const hit = res.find((o) => o.combo === n);
  assert.ok(hit, 'combination found');
  assert.deepEqual([hit.pick.top.id, hit.pick.bottom.id, hit.pick.shoes.id, hit.pick.accessory.id], ['t', 'b', 's', 'a']);
  assert.ok(res.every((o) => o.colors.includes(shirt.color)));
  assert.deepEqual(outfitsFor(mk('z', 'top', 'Nope'), items, COMBOS), []);
});

test('neutrals fill a slot the palette cannot, and a neutral anchor still gets outfits', () => {
  const [n, cols] = [...COMBOS.entries()].find(([, c]) => c.length === 3);
  const mk = (id, slot, color) => ({ id, slot, color, type: id, material: '', photo: '', createdAt: 0 });
  const neutrals = new Set(['Noir']);
  const jean = mk('j', 'bottom', 'Noir');
  const items = [mk('t', 'top', cols[0]), jean, mk('s', 'shoes', cols[1])];
  const res = outfitsFor(items[0], items, COMBOS, { neutrals });
  assert.ok(res.some((o) => o.combo === n && o.pick.bottom.id === 'j'), 'neutral trousers used');
  const fromJean = outfitsFor(jean, items, COMBOS, { neutrals });
  assert.ok(fromJean.length > 0, 'neutral anchor gets outfits');
  const keys = fromJean.map((o) => Object.values(o.pick).map((i) => i.id).sort().join());
  assert.equal(new Set(keys).size, keys.length, 'no duplicate outfits');
  assert.deepEqual(outfitsFor(jean, [jean, mk('t2', 'top', 'Noir'), mk('s2', 'shoes', 'Noir')], COMBOS, { neutrals }), [], 'all-neutral outfit skipped');
});

test('close shades count as palette colours, and shoes are optional', () => {
  const BY = new Map(COLORS.map((c) => [c.name, c.hex]));
  const mk = (id, slot, color) => ({ id, slot, color, type: id, material: '', photo: '', createdAt: 0 });
  const [, cols] = [...COMBOS.entries()].find(([, c]) => c.length === 2);
  // a shade that is not in the combination but is within ΔE 10 of its first colour
  const near = COLORS.find((c) => !cols.includes(c.name) && deltaE2000(hexToLab(c.hex), hexToLab(BY.get(cols[0]))) < 10);
  assert.ok(near, 'dataset has a close shade');
  const top = mk('t', 'top', near.name);
  const bottom = mk('b', 'bottom', cols[1]);
  const strict = outfitsFor(top, [top, bottom], COMBOS, {});
  const loose = outfitsFor(top, [top, bottom], COMBOS, { hexOf: (n) => BY.get(n) });
  assert.ok(loose.some((o) => o.pick.bottom?.id === 'b' && !o.pick.shoes), 'close shade + no shoes still gives an outfit');
  assert.ok(loose.length >= strict.length);
});

test('basicColorName gives everyday colour words', () => {
  const cases = { '#111314': 'noir', '#ffffff': 'blanc', '#8f8f8d': 'gris', '#1f2a44': 'bleu marine', '#2d4863': 'bleu', '#b86e52': 'terracotta', '#d6c4a5': 'beige', '#4b3317': 'marron', '#6b6a3c': 'kaki', '#b98a57': 'camel', '#ffefae': 'jaune', '#7f9bbd': 'bleu' };
  for (const [hex, word] of Object.entries(cases)) assert.equal(basicColorName(hex), word, hex);
});

test('taste: kept outfits rise, passed ones sink, ties keep harmony order', () => {
  const mk = (id) => ({ id, slot: 'top', color: 'x', type: id, material: '', photo: '', createdAt: 0 });
  const o = (n, id, color) => ({ combo: n, colors: [color], pick: { top: mk(id) } });
  const a = o(1, 'a', 'Black'), b = o(2, 'b', 'White'), c = o(3, 'c', 'Marine');
  assert.deepEqual(rankByTaste([a, b, c], {}), [a, b, c]);
  let taste = learnTaste({}, c, true);
  taste = learnTaste(taste, a, false);
  assert.deepEqual(rankByTaste([a, b, c], taste).map((x) => x.combo), [3, 2, 1]);
  for (let i = 0; i < 20; i++) taste = learnTaste(taste, c, true);
  assert.equal(taste['item:c'], 5, 'weights are capped');
});

test('outfit of the day: weather fit, recently worn pieces, no duplicates', () => {
  const mk = (id, slot, color, type = id) => ({ id, slot, color, type, material: '', photo: '', createdAt: 0 });
  const [, cols] = [...COMBOS.entries()].find(([, c]) => c.length === 2);
  const tee = mk('tee', 'top', cols[0], 't-shirt');
  const trousers = mk('tr', 'bottom', cols[1], 'pantalon');
  const shorts = mk('sh', 'bottom', cols[1], 'short');
  const withTrousers = { combo: 1, colors: cols, pick: { top: tee, bottom: trousers } };
  const withShorts = { combo: 1, colors: cols, pick: { top: tee, bottom: shorts } };
  assert.ok(dayScore(withTrousers, {}, { temp: 8 }, new Set()) > dayScore(withShorts, {}, { temp: 8 }, new Set()), 'cold: trousers win');
  assert.ok(dayScore(withShorts, {}, { temp: 28 }, new Set()) > dayScore(withTrousers, {}, { temp: 28 }, new Set()), 'hot: shorts win');
  assert.ok(dayScore(withTrousers, {}, {}, new Set(['tr'])) < dayScore(withTrousers, {}, {}, new Set()), 'recently worn sinks');

  const items = [tee, trousers, shorts, mk('tee2', 'top', cols[0], 'chemise')];
  const day = outfitsOfTheDay(items, COMBOS, {}, {}, { temp: 8 }, new Set());
  assert.ok(day.length > 0);
  const keys = day.map((o) => Object.values(o.pick).map((i) => i.id).sort().join());
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.equal(day[0].pick.bottom.id, 'tr', 'cold day starts with trousers');
});

test('styleNote spots a warm/cool contrast', () => {
  assert.match(styleNote([{ name: 'Rouge', hex: '#b5452f' }, { name: 'Bleu', hex: '#2d4863' }]), /chaud\/froid/);
});
