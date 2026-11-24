import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plusProches, proposerNuancier, doublons, trouverFeutre, MALUS } from '../app/nuancier/proposer.js';

const vrais = JSON.parse(readFileSync(new URL('../data/feutres.json', import.meta.url), 'utf8'));
const BLEU_GUANGNA = 'GB-BLEU';
const f = [
  { marque: 'languo', code: 'L1', nom: 'L1', hex: '#ff0000' },
  { marque: 'guangna', code: 'GB-ROUGE', nom: 'rouge', hex: '#fe0000' },
  { marque: 'guangna', code: BLEU_GUANGNA, nom: 'bleu', hex: '#0000ff' },
];

test('plusProches : préférence et malus', () => {
  assert.equal(MALUS, 15);
  assert.equal(plusProches('#ff0000', f, -1, 1)[0].feutre.marque, 'languo');
  assert.equal(plusProches('#ff0000', f, 1, 1)[0].feutre.marque, 'guangna');
  assert.equal(plusProches('#0000ff', f, -1, 1)[0].feutre.code, BLEU_GUANGNA); // malus, pas exclusion
  assert.equal(plusProches('#ff0000', f, 0, 5).length, 3);
});

test('trouverFeutre : casse, espaces, tirets', () => {
  assert.equal(trouverFeutre(' ry10 ', vrais).code, 'RY-10');
  assert.equal(trouverFeutre('gb 401', vrais).code, 'GB-401');
  assert.equal(trouverFeutre('GB401', vrais).code, 'GB-401');
  assert.equal(trouverFeutre('605', vrais).code, '605');
  assert.equal(trouverFeutre('posca rouge', vrais), null);
  assert.equal(trouverFeutre('  ', vrais), null);
  assert.equal(trouverFeutre('', vrais), null);
});

test('proposerNuancier : choix mémorisé prioritaire', () => {
  const cases = [{ symbole: 'a', hex: '#ff0000' }];
  const l = proposerNuancier({ cases }, f, 0, { a: { texte: 'posca rouge' } });
  assert.deepEqual([l[0].feutre, l[0].texte, l[0].modifie], [null, 'posca rouge', true]);
  const p = proposerNuancier({ cases }, f, 0, {})[0];
  assert.deepEqual([p.feutre.code, p.texte, p.modifie], ['L1', null, false]);
  const c = proposerNuancier({ cases }, f, 0, { a: { code: BLEU_GUANGNA } })[0];
  assert.deepEqual([c.feutre.code, c.modifie], [BLEU_GUANGNA, true]);
  const d = proposerNuancier({ cases }, f, 0, { a: { code: 'DISPARU' } })[0];
  assert.deepEqual([d.feutre, d.texte, d.modifie], [null, 'DISPARU', true]);
});

test('doublons', () => {
  assert.deepEqual(doublons([{ symbole: '1', feutre: { code: 'X' } }, { symbole: '2', feutre: { code: 'X' } }]), { 1: ['2'], 2: ['1'] });
  assert.deepEqual(doublons([{ symbole: '1', feutre: null }, { symbole: '2', feutre: { code: 'X' } }]), {});
});
