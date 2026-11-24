import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trouverCases, couleurCase, casesEnGrille } from '../outils/grille.js';

function image() {
  const width = 120, height = 80;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const rect = (x0, y0, [r, g, b]) => {
    for (let y = y0; y < y0 + 25; y++) for (let x = x0; x < x0 + 25; x++) data.set([r, g, b, 255], (y * width + x) * 4);
  };
  rect(70, 5, [0, 128, 0]); // volontairement hors ordre de lecture
  rect(10, 5, [255, 0, 0]);
  rect(40, 45, [0, 0, 255]);
  return { width, height, data };
}

test('trouve les 3 cases en ordre de lecture', () => {
  const img = image();
  const cases = trouverCases(img, [255, 255, 255]);
  assert.deepEqual(cases, [{ x: 10, y: 5, w: 25, h: 25 }, { x: 70, y: 5, w: 25, h: 25 }, { x: 40, y: 45, w: 25, h: 25 }]);
  assert.deepEqual(cases.map((c) => couleurCase(img, c)), ['#ff0000', '#008000', '#0000ff']);
});

test('casesEnGrille complète une case blanche et tolère un décalage', () => {
  const width = 120, height = 80;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const rect = (x0, y0) => {
    for (let y = y0; y < y0 + 25; y++) for (let x = x0; x < x0 + 25; x++) data.set([200, 30, 30, 255], (y * width + x) * 4);
  };
  // grille 3×2 ; case (colonne 1, ligne 0) blanche = absente ; case (2, 1) décalée de 3 px
  rect(5, 5); rect(85, 5); rect(5, 45); rect(45, 45); rect(85, 48);
  const img = { width, height, data };
  const cases = casesEnGrille(trouverCases(img, [255, 255, 255]), 3, 2);
  assert.equal(cases.length, 6);
  assert.deepEqual(cases.map((c) => c.x), [5, 45, 85, 5, 45, 85]);
  assert.ok(cases[0].y < cases[3].y && Math.abs(cases[5].y - cases[3].y) <= 3);
  assert.equal(couleurCase(img, cases[1]), '#ffffff');
  assert.equal(couleurCase(img, cases[0]), '#c81e1e');
});
