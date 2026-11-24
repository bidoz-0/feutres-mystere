import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_GLYPHES } from '../outils/table-glyphes.js';
import { fiable } from '../outils/noms-glyphes.js';

// Un même caractère peut revenir (même symbole dans deux polices) : les conflits dans un coloriage
// sont vérifiés à l'extraction. Ici : chaque nom est un vrai caractère visible.
test('table des glyphes : noms visibles et valides', () => {
  const v = Object.values(TABLE_GLYPHES);
  assert.ok(v.length >= 73);
  for (const c of v) assert.equal(fiable(c), c);
});
