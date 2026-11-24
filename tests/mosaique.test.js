import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { couleursMosaique } from '../app/bibliotheque/mosaique.js';

test('couleursMosaique : sans doublon, réparties sur tout le livre', () => {
  // 4 pages de 8 couleurs distinctes : 4 couleurs retenues doivent venir des 4 pages.
  const hex = (p, i) => `#${p}${i}0000`;
  const livre = { coloriages: [0, 1, 2, 3].map((p) => ({ cases: Array.from({ length: 8 }, (_, i) => ({ hex: hex(p, i) })) })) };
  const c = couleursMosaique(livre, 4);
  assert.deepEqual(c, [hex(0, 0), hex(1, 0), hex(2, 0), hex(3, 0)]);
  const vrai = JSON.parse(fs.readFileSync(new URL('../data/livres/princesses-t2.json', import.meta.url)));
  assert.equal(new Set(couleursMosaique(vrai, 16)).size, 16);
});

test('couleursMosaique : peu de couleurs ou livre vide', () => {
  const l = { coloriages: [{ cases: [{ hex: '#111' }, { hex: '#111' }, { hex: null }] }] };
  assert.deepEqual(couleursMosaique(l, 16), ['#111']);
  assert.deepEqual(couleursMosaique({}, 16), []);
});
