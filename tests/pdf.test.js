import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFormes, grouperEnLignes } from '../outils/pdf.js';

test('lireFormes : couleurs et formes remplies', () => {
  const c = '0.5 0.5 0.5 sc 10 100 m 30 100 l 30 120 l 10 120 l h f 1 0 0 sc 40 100 20 20 re f';
  const f = lireFormes(c);
  assert.deepEqual(f.map((x) => x.hex), ['#808080', '#ff0000']);
  assert.deepEqual([f[0].x, f[0].y, f[0].w, f[0].h], [10, 100, 20, 20]);
});

test('lireFormes : un rectangle de découpage (re W n) n\'est pas une forme', () => {
  assert.equal(lireFormes('0 0 595 842 re W n 1 1 1 sc 0 0 10 20 re f').length, 1);
});

test('grouperEnLignes : doublon collé de même couleur → une seule case', () => {
  const d = [{ x: 0, y: 100, w: 14, h: 20, hex: '#9caad8' }, { x: 14, y: 100, w: 14, h: 20, hex: '#9caad8' }, { x: 30, y: 100, w: 14, h: 20, hex: '#bce4fa' }];
  const fusions = [];
  assert.equal(grouperEnLignes(d, (...a) => fusions.push(a))[0].length, 2);
  assert.equal(fusions.length, 1);
});

test('grouperEnLignes : case blanche conservée', () => {
  assert.equal(grouperEnLignes([{ x: 0, y: 50, w: 14, h: 20, hex: '#ffffff' }])[0].length, 1);
});

test('grouperEnLignes : glyphes ignorés, lignes de haut en bas, tri par x', () => {
  assert.equal(grouperEnLignes([{ x: 0, y: 50, w: 6, h: 9, hex: '#000000' }]).length, 0);
  const l = grouperEnLignes([
    { x: 30, y: 50, w: 14, h: 20, hex: '#111111' }, { x: 0, y: 50, w: 14, h: 20, hex: '#222222' }, { x: 0, y: 90, w: 14, h: 20, hex: '#333333' }]);
  assert.deepEqual(l.map((r) => r.map((c) => c.hex)), [['#333333'], ['#222222', '#111111']]);
});
