import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grilleEcran, delaiCascade, listeTriee, nbHorsUsage, texteHorsUsage, encreSur } from '../app/boites/presentation.js';

test('grilleEcran : boîte large gardée telle quelle', () => {
  const g = grilleEcran({ rangees: 7, colonnes: 24 });
  assert.equal(g.lignes, 7);
  assert.equal(g.colonnes, 24);
  assert.deepEqual(g.ordre.slice(0, 3), [0, 1, 2]);
});

test('grilleEcran : boîte haute couchée, le haut de la boîte à gauche', () => {
  // 3 rangées × 2 colonnes : [0 1 / 2 3 / 4 5] devient [1 3 5 / 0 2 4]
  const g = grilleEcran({ rangees: 3, colonnes: 2 });
  assert.equal(g.lignes, 2);
  assert.equal(g.colonnes, 3);
  assert.deepEqual(g.ordre, [1, 3, 5, 0, 2, 4]);
  const l = grilleEcran({ rangees: 20, colonnes: 12 });
  assert.deepEqual([...l.ordre].sort((a, b) => a - b), Array.from({ length: 240 }, (_, i) => i));
});

test('delaiCascade : diagonale, de 0 au total', () => {
  const g = { lignes: 12, colonnes: 20 };
  assert.equal(delaiCascade(0, g), 0);
  assert.equal(delaiCascade(239, g), 260);
  assert.equal(delaiCascade(1, g), delaiCascade(20, g)); // même diagonale
  assert.ok(delaiCascade(21, g) > delaiCascade(1, g));
  assert.equal(delaiCascade(0, { lignes: 1, colonnes: 1 }), 0);
});

test('listeTriee : tri numérique par code et filtre', () => {
  const f = [{ code: 'CB-906' }, { code: 'CB-1000' }, { code: 'AG-12' }];
  const hs = new Set(['CB-906']);
  assert.deepEqual(listeTriee(f, hs).map((x) => x.code), ['AG-12', 'CB-906', 'CB-1000']);
  assert.deepEqual(listeTriee(f, hs, true).map((x) => x.code), ['CB-906']);
  assert.equal(f[0].code, 'CB-906'); // l'entrée n'est pas modifiée
  assert.equal(nbHorsUsage(f, hs), 1);
});

test('texteHorsUsage et encreSur', () => {
  assert.equal(texteHorsUsage(0), 'Tous marchent');
  assert.equal(texteHorsUsage(1), '1 ne marche plus');
  assert.equal(texteHorsUsage(3), '3 ne marchent plus');
  assert.equal(encreSur('#fefefe'), 'sur-clair');
  assert.equal(encreSur('#1a1a40'), 'sur-fonce');
});
