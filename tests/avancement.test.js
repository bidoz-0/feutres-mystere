import test from 'node:test';
import assert from 'node:assert/strict';
import { avancement } from '../app/bibliotheque/avancement.js';

test('avancement : pages finies sur total, arrondi', () => {
  assert.deepEqual(avancement(77, 12, false), { finies: 12, total: 77, pourcent: 16 });
});
test('avancement : livre fini = 100 %', () => {
  assert.deepEqual(avancement(77, 3, true), { finies: 77, total: 77, pourcent: 100 });
});
test('avancement : livre vide ou trop de pages finies', () => {
  assert.equal(avancement(0, 0, false).pourcent, 0);
  assert.equal(avancement(10, 15, false).finies, 10);
});
