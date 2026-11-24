import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const feutres = JSON.parse(readFileSync(new URL('../data/feutres.json', import.meta.url), 'utf8'));

test('data/feutres.json : 408 feutres cohérents', () => {
  assert.equal(feutres.length, 408);
  assert.equal(feutres.filter((f) => f.marque === 'languo').length, 240);
  assert.equal(new Set(feutres.map((f) => f.code)).size, 408);
  assert.ok(feutres.every((f) => /^#[0-9a-f]{6}$/.test(f.hex)));
  assert.equal(feutres.find((f) => f.code === '787').nom, 'straw yellow');
  assert.equal(feutres.find((f) => f.code === '611').nom, 'black');
  // garde-fous contre un décalage de ligne ou de colonne dans l'extraction
  const rgb = (code) => feutres.find((f) => f.code === code).hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  for (const code of ['RY-06', 'LC-114', '605']) { const [r, g, b] = rgb(code); assert.ok(r > 180 && g < 60 && b < 60, code + ' doit être rouge'); }
  assert.ok(rgb('600').every((v) => v > 240), '600 doit être blanc');
  assert.ok(rgb('611').every((v) => v < 20), '611 doit être noir');
});
