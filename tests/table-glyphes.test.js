import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_GLYPHES } from '../outils/table-glyphes.js';

test('table des glyphes : 73 caractères, tous différents', () => {
  const v = Object.values(TABLE_GLYPHES);
  assert.equal(v.length, 73);
  assert.equal(new Set(v).size, 73);
});
