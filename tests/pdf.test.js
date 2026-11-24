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

test('lireFormes : CMJN (k et sc à 4 composantes)', () => {
  const f = lireFormes('0 0 0 0 k 0 0 10 20 re f 1 0 0 0 sc 0 0 10 20 re f 0 0 0 0.5 scn 0 0 10 20 re f');
  assert.deepEqual(f.map((x) => x.hex), ['#ffffff', '#00ffff', '#808080']);
});

test('lireFormes : B, B*, b, b* remplissent comme f', () => {
  assert.equal(lireFormes('0 0 10 20 re B 0 0 10 20 re B* 0 0 10 20 re b 0 0 10 20 re b*').length, 4);
});

test('lireFormes : nombre de composantes inattendu → erreur claire', () => {
  assert.throws(() => lireFormes('0.1 0.2 sc 0 0 10 20 re f'), /2 composantes/);
  assert.throws(() => lireFormes('0.1 0.2 0.3 0.4 0.5 scn 0 0 10 20 re f'), /5 composantes/);
});

test('lireFormes : cm non identité toléré hors remplissage (image), erreur si une forme y est remplie', () => {
  assert.equal(lireFormes('q 130 0 0 185 232 596 cm /Im0 Do Q 0 0 10 20 re f').length, 1);
  assert.throws(() => lireFormes('q 1 0 0 1 5 5 cm 0 0 10 20 re f Q'), /repère modifié par cm/);
});

test('lireFormes : Q restaure la couleur', () => {
  assert.deepEqual(lireFormes('1 0 0 rg q 0 0 1 rg Q 0 0 10 20 re f').map((x) => x.hex), ['#ff0000']);
});

test('grouperEnLignes : y 100.49 et 100.51 = même ligne, 100 et 103 = deux lignes', () => {
  const c = (x, y) => ({ x, y, w: 14, h: 20, hex: '#' + x.toString(16).padStart(6, '0') });
  assert.equal(grouperEnLignes([c(0, 100.49), c(30, 100.51)]).length, 1);
  assert.equal(grouperEnLignes([c(0, 100), c(30, 103)]).length, 2);
});
