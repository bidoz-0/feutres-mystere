import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plusProches, proposerNuancier, disponibles, doublons, trouverFeutre, proposerParBoite, choixFiges, choixInconnus, MALUS } from '../app/nuancier/proposer.js';

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

test('proposerParBoite : une liste par boîte, préférée en premier', () => {
  const g = proposerParBoite('#ff0000', f, 1, 3);
  assert.deepEqual(g.map((x) => x.marque), ['guangna', 'languo']);
  assert.deepEqual(g[0].feutres.map((x) => x.feutre.code), ['GB-ROUGE', BLEU_GUANGNA]);
  assert.deepEqual(g[1].feutres.map((x) => x.feutre.code), ['L1']);
  assert.deepEqual(proposerParBoite('#ff0000', f, 0).map((x) => x.marque), ['languo', 'guangna']);
});

test('choixFiges : seulement les symboles sans choix', () => {
  const c = { cases: [{ symbole: 'a', hex: '#ff0000' }, { symbole: 'b', hex: '#0000ff' }] };
  assert.deepEqual(choixFiges(c, f, 0, { b: { code: 'L1' } }), { a: { code: 'L1' } });
  assert.deepEqual(choixFiges(c, f, 0, { a: { texte: 'x' }, b: { code: 'L1' } }), {});
});

test('choixInconnus : ne remplit que les symboles sans choix', () => {
  const c = { cases: [{ symbole: 'a', hex: '#ff0000' }, { symbole: 'b', hex: '#00ff00' }, { symbole: 'c', hex: '#0000ff' }] };
  assert.deepEqual(choixInconnus(c, { b: { code: 'RY-07' } }), {
    a: { texte: 'Code couleur inconnu' },
    c: { texte: 'Code couleur inconnu' },
  });
});

test('disponibles retire les codes indisponibles', () => {
  assert.deepEqual(disponibles(f, new Set(['L1'])).map((x) => x.code), ['GB-ROUGE', BLEU_GUANGNA]);
});

const rouge = { cases: [{ symbole: 'a', hex: '#ff0000' }] };

test('proposerNuancier avec une boîte entièrement indisponible propose l\'autre boîte', () => {
  const prop = disponibles(f, new Set(['GB-ROUGE', BLEU_GUANGNA]));
  assert.equal(proposerNuancier(rouge, f, 1, {}, prop)[0].feutre.code, 'L1');
});

test('proposerNuancier avec aucun feutre disponible donne feutre: null', () => {
  const [l] = proposerNuancier(rouge, f, 0, {}, []);
  assert.equal(l.feutre, null);
});

test('un choix déjà fait sur un feutre indisponible est gardé', () => {
  const prop = disponibles(f, new Set(['L1']));
  const [l] = proposerNuancier(rouge, f, 0, { a: { code: 'L1' } }, prop);
  assert.equal(l.feutre.code, 'L1');
});
