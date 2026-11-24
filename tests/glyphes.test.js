import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFormes } from '../outils/pdf.js';
import { glyphesDeCase, signatureGlyphe, regrouper } from '../outils/glyphes.js';

const forme = (dx, dy) => lireFormes(`0 0 0 sc ${10 + dx} ${50 + dy} m ${15 + dx} ${50 + dy} l ${15 + dx} ${58 + dy} l h f ${10 + dx} ${60 + dy} 2 2 re f`);

test('signatureGlyphe : indépendante de la position', () => {
  assert.equal(signatureGlyphe(forme(0, 0)), signatureGlyphe(forme(100, 300)));
  assert.notEqual(signatureGlyphe(forme(0, 0)), signatureGlyphe(forme(0, 0).slice(0, 1)));
});

test('glyphesDeCase : garde les petites formes dans la case, pas le numéro à gauche', () => {
  const formes = [...forme(0, 0), { x: 2, y: 55, w: 6, h: 9, hex: '#000000', trace: [] }];
  const c = { x: 8, y: 45, w: 14, h: 20 };
  assert.equal(glyphesDeCase(c, formes).length, 2);
});

test('regrouper : fusionne un écart de 0.1, pas un vrai écart', () => {
  const r = regrouper(['m1.0,2.0;l3.0,4.0', 'm1.1,2.0;l3.0,3.9', 'm1.0,2.0;l3.0,5.0']);
  assert.equal(r.get('m1.1,2.0;l3.0,3.9'), 'm1.0,2.0;l3.0,4.0');
  assert.equal(r.get('m1.0,2.0;l3.0,5.0'), 'm1.0,2.0;l3.0,5.0');
});
