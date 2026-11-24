import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRILLES, disposition } from '../app/boites/disposition.js';

const feutres = JSON.parse(readFileSync(new URL('../data/feutres.json', import.meta.url), 'utf8'));

test('longueur de la grille de chaque boîte', () => {
  assert.equal(disposition('languo', feutres).length, 240);
  assert.equal(disposition('guangna', feutres).length, 168);
  assert.deepEqual(GRILLES.guangna, { rangees: 7, colonnes: 24 });
});

test('ordre par défaut : celui de feutres.json', () => {
  const g = feutres.filter((f) => f.marque === 'guangna');
  const d = disposition('guangna', feutres);
  assert.equal(d[0], g[0]);
  assert.equal(d[g.length - 1], g.at(-1));
});

test('disposition enregistrée : code inconnu donne null', () => {
  const g = feutres.filter((f) => f.marque === 'guangna');
  const d = disposition('guangna', feutres, { emplacements: [g[2].code, 'XXX', null, g[0].code] });
  assert.equal(d[0], g[2]);
  assert.equal(d[1], null);
  assert.equal(d[2], null);
  assert.equal(d[3], g[0]);
  assert.equal(d.length, 168);
});
