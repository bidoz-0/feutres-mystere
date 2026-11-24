import test from 'node:test';
import assert from 'node:assert/strict';
import { identifierSymboles } from '../outils/identifier-symboles.js';

const k = (signature, car) => ({ signature, glyphe: [], car });
const col = (libelle, ...cases) => ({ libelle, cases });

test('identifierSymboles : table prioritaire, police sinon, inconnu sinon ; divergence signalée sans toucher la table', () => {
  const r = identifierSymboles([col('1', k('m1.0,1.0', 'A'), k('m2.0,2.0', 'B'), k('m3.0,3.0', null))], { 'm1.0,1.0': 'Z' });
  assert.equal(r.symboles.get('m1.0,1.0'), 'Z');
  assert.equal(r.symboles.get('m2.0,2.0'), 'B');
  assert.deepEqual([r.parTable, r.parPolice, r.inconnus.length], [1, 1, 1]);
  assert.deepEqual(r.divergences, [{ signature: 'm1.0,1.0', table: 'Z', police: 'A' }]);
});

test('identifierSymboles : même caractère pour deux dessins = variantes seulement s\'ils ne sont jamais ensemble', () => {
  const ok = identifierSymboles([col('1', k('m1.0,1.0', 'A')), col('2', k('m2.0,2.0', 'A'))], {});
  assert.equal(ok.conflits.length, 0);
  const mal = identifierSymboles([col('1', k('m1.0,1.0', 'A'), k('m2.0,2.0', 'A'))], {});
  assert.equal(mal.conflits.length, 2);
  assert.equal(mal.symboles.size, 0);
});

test('fiable : refuse les caractères invisibles, privés ou invalides', async () => {
  const { fiable, nomVersCar } = await import('../outils/noms-glyphes.js');
  for (const c of ['A', 'Ж', 'ψ', '♣', '☺']) assert.equal(fiable(c), c);
  for (const c of ['', ' ', '\u0000', '​', '�', '', '', String.fromCodePoint(0xF0000), nomVersCar('uniD800')]) assert.equal(fiable(c), null);
});
