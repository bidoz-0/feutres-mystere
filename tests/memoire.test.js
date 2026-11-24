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
