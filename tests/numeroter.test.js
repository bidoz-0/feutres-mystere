import test from 'node:test';
import assert from 'node:assert/strict';
import { numeroter } from '../outils/extraire-livre.js';
import { glyphesDeLibelle } from '../outils/glyphes.js';
import { TABLE_LIBELLES } from '../outils/table-libelles.js';

const sig = (ch) => Object.keys(TABLE_LIBELLES).find((s) => TABLE_LIBELLES[s] === ch);
// « 1 & 2 » → lignes [['1'], ['&'], ['2']] ; « 12 » → [['1', '2']]
const col = (libelle) => ({ page: 2, libelleSignatures: libelle.split(' ').map((m) => [...m].map(sig)) });
const lire = (...libelles) => numeroter(libelles.map(col));

test('numeroter : libellés valides', () => {
  const r = lire('1 & 2', '3', '4 & 5');
  assert.deepEqual(r.map((c) => [c.numero, c.libelle]), [[1, '1 & 2'], [3, '3'], [4, '4 & 5']]);
  assert.equal(numeroter([col('1 & 2'), col('3')], 3).length, 2);
});

test('numeroter : erreurs', () => {
  assert.throws(() => numeroter([{ page: 2, libelleSignatures: [['m0,0;l1,1']] }]), /inconnus/);
  assert.throws(() => numeroter([{ page: 2, libelleSignatures: [[sig('&')]] }]), /illisible/);
  assert.throws(() => lire('1', '3'), /trou/);
  assert.throws(() => lire('1', '1'), /trou/);
  assert.throws(() => lire('1 & 3'), /trou/);
  assert.throws(() => lire('5 & 5'), /trou/);
  assert.throws(() => numeroter([col('1 & 2')], 100), /100 attendu/);
});

test('glyphesDeLibelle : un point « m h » précède chaque glyphe, signature indépendante de la position', () => {
  const trace = (dx) => [['m', 10 + dx, 20], ['h'], ['m', 10 + dx, 20], ['l', 15 + dx, 20], ['l', 15 + dx, 28], ['h'],
    ['m', 30 + dx, 20], ['h'], ['m', 30 + dx, 20], ['l', 33 + dx, 20], ['l', 33 + dx, 25], ['h']];
  const a = glyphesDeLibelle({ trace: trace(0) }), b = glyphesDeLibelle({ trace: trace(100) });
  assert.equal(a.length, 2);
  assert.deepEqual(a.map((g) => g.y), [20, 20]);
  assert.notEqual(a[0].signature, a[1].signature);
  assert.deepEqual(a.map((g) => g.signature), b.map((g) => g.signature));
});
