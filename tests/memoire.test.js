import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMemoire } from '../app/memoire/memoire.js';

const faux = (init) => {
  const m = new Map(init ? [['feutres-mystere:v1', init]] : []);
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

test('aller-retour d\'un choix, persisté sous la clé unique', () => {
  const s = faux();
  creerMemoire(s).enregistrerChoix('l1', 3, '★', { code: 'RY10' });
  assert.deepEqual(creerMemoire(s).lireChoix('l1', 3), { '★': { code: 'RY10' } });
  assert.deepEqual(JSON.parse(s.m.get('feutres-mystere:v1')).choix, { 'l1/3': { '★': { code: 'RY10' } } });
});

test('null efface le choix', () => {
  const mem = creerMemoire(faux());
  mem.enregistrerChoix('l1', 3, '★', { texte: 'rouge' });
  mem.enregistrerChoix('l1', 3, '★', null);
  assert.deepEqual(mem.lireChoix('l1', 3), {});
});

test('lireChoix renvoie une copie : la modifier ne casse rien', () => {
  const mem = creerMemoire(faux());
  mem.enregistrerChoix('l1', 1, 'a', { code: '1' });
  const o = mem.lireChoix('l1', 1);
  o.a.code = 'x'; o.b = { code: 'y' };
  assert.deepEqual(mem.lireChoix('l1', 1), { a: { code: '1' } });
  assert.deepEqual(mem.lireChoix('l1', 9), {});
});

test('préférence : défaut 0 et aller-retour', () => {
  const s = faux();
  assert.equal(creerMemoire(s).lirePreference(), 0);
  creerMemoire(s).enregistrerPreference(0.5);
  assert.equal(creerMemoire(s).lirePreference(), 0.5);
});

test('JSON corrompu ou de forme inattendue : défauts sans exception', () => {
  for (const brut of ['{oups', 'null', '[]', '{"preference":"x","choix":5}']) {
    const mem = creerMemoire(faux(brut));
    assert.equal(mem.lirePreference(), 0);
    assert.deepEqual(mem.lireChoix('l', 1), {});
    mem.enregistrerChoix('l', 1, 'a', { code: '1' });
    assert.deepEqual(mem.lireChoix('l', 1), { a: { code: '1' } });
  }
});

test('setItem qui lève : fonctionne en mémoire vive', () => {
  const mem = creerMemoire({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  mem.enregistrerChoix('l', 1, 'a', { code: '1' });
  mem.enregistrerPreference(1);
  assert.deepEqual(mem.lireChoix('l', 1), { a: { code: '1' } });
  assert.equal(mem.lirePreference(), 1);
});

test('creerMemoire(undefined) avec localStorage qui lève : mémoire vive', () => {
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    const mem = creerMemoire();
    mem.enregistrerChoix('l', 1, 'a', { code: '1' });
    assert.deepEqual(mem.lireChoix('l', 1), { a: { code: '1' } });
    assert.equal(mem.lirePreference(), 0);
  } finally {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
    else delete globalThis.localStorage;
  }
});

test('pages et livres finis : aller-retour, comptage, blocage', () => {
  const s = faux();
  const mem = creerMemoire(s);
  mem.marquerPageFinie('l1', 2, true);
  mem.marquerPageFinie('l1', 3, true);
  mem.marquerPageFinie('l10', 1, true);
  const relu = creerMemoire(s);
  assert.equal(relu.estPageFinie('l1', 2), true);
  assert.equal(relu.estPageFinie('l1', 4), false);
  assert.equal(relu.nbPagesFinies('l1'), 2); // « l10/ » ne compte pas
  assert.equal(relu.estPageBloquee('l1', 2), true);
  assert.equal(relu.estPageBloquee('l1', 4), false);
  relu.marquerLivreFini('l1', true);
  assert.equal(relu.estPageBloquee('l1', 4), true);
  relu.marquerLivreFini('l1', false);
  relu.marquerPageFinie('l1', 2, false);
  assert.equal(relu.estPageFinie('l1', 2), false);
  assert.equal(creerMemoire(s).estLivreFini('l1'), false);
});

test('ancien état sans pagesFinies, ou forme invalide : valeurs vides', () => {
  const vieux = creerMemoire(faux(JSON.stringify({ preference: 1, choix: {} })));
  assert.equal(vieux.nbPagesFinies('l1'), 0);
  const casse = creerMemoire(faux(JSON.stringify({ pagesFinies: [1], livresFinis: { l1: 'oui', l2: true } })));
  assert.equal(casse.estLivreFini('l1'), false);
  assert.equal(casse.estLivreFini('l2'), true);
});

test("completerChoix n'écrase pas les choix existants", () => {
  const s = faux();
  const mem = creerMemoire(s);
  mem.enregistrerChoix('l1', 3, 'a', { code: 'X' });
  mem.completerChoix('l1', 3, { a: { code: 'Y' }, b: { code: 'Z' } });
  assert.deepEqual(creerMemoire(s).lireChoix('l1', 3), { a: { code: 'X' }, b: { code: 'Z' } });
});

test('feutres hors d\'usage : aller-retour persisté', () => {
  const s = faux();
  const mem = creerMemoire(s);
  mem.marquerIndisponible('RY-07', true);
  assert.equal(creerMemoire(s).estIndisponible('RY-07'), true);
  assert.deepEqual([...creerMemoire(s).lireIndisponibles()], ['RY-07']);
  mem.marquerIndisponible('RY-07', false);
  assert.equal(creerMemoire(s).estIndisponible('RY-07'), false);
});

test('ancien état sans indisponibles : tout est disponible', () => {
  const mem = creerMemoire(faux(JSON.stringify({ preference: 1, choix: {} })));
  assert.equal(mem.lireIndisponibles().size, 0);
});

test('indisponibles : les entrées autres que true sont ignorées', () => {
  const mem = creerMemoire(faux(JSON.stringify({ indisponibles: { A: true, B: false, C: 'oui' } })));
  assert.deepEqual([...mem.lireIndisponibles()], ['A']);
});
