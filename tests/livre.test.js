import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const f = new URL('../data/livres/princesses-t2.json', import.meta.url);

test('princesses-t2 : numéros imprimés uniques, croissants et contigus, cases valides', () => {
  const { coloriages } = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(coloriages.length, 74);
  assert.equal(coloriages[0].libelle, '1 & 2');
  let attendu = 1;
  for (const c of coloriages) {
    assert.match(c.libelle, /^\d+( & \d+)?$/);
    assert.equal(c.numero, attendu);
    attendu = Number(c.libelle.split(' & ').at(-1)) + 1;
    assert.ok(c.cases.length >= 10 && c.cases.length <= 100, `coloriage ${c.libelle} : ${c.cases.length} cases`);
    assert.equal(new Set(c.cases.map((k) => k.symbole)).size, c.cases.length, `symboles en double, coloriage ${c.libelle}`);
    for (const k of c.cases) assert.match(k.hex, /^#[0-9a-f]{6}$/);
  }
  assert.equal(attendu, 101);
});

test('coloriage « 21 & 22 » : 44 cases, symboles dans l’ordre du nuancier', () => {
  const c = JSON.parse(fs.readFileSync(f, 'utf8')).coloriages.find((x) => x.libelle.includes('22'));
  assert.equal(c.numero, 21);
  assert.equal(c.cases.length, 44);
  assert.deepEqual(c.cases.slice(0, 5).map((k) => k.symbole), ['1', '2', '3', '4', '5']);
});

test('chaque symbole utilisé a son dessin dans glyphes', () => {
  const livre = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of livre.coloriages) for (const k of c.cases) {
    const g = livre.glyphes[k.base ?? k.symbole];
    assert.ok(g && g.d.startsWith('M') && g.l > 0 && g.h > 0, `pas de dessin pour ${k.symbole}`);
  }
});

test('coloriage « 28 » : dernière case corrigée en ψ, aucun doublon dans le livre', () => {
  const { coloriages } = JSON.parse(fs.readFileSync(f, 'utf8'));
  const c = coloriages.find((x) => x.libelle === '28');
  assert.equal(c.cases.at(-1).symbole, 'ψ');
  assert.equal(c.cases.at(-1).base, undefined);
  assert.equal(coloriages.flatMap((x) => x.cases).filter((k) => k.base).length, 0);
});

test('index.json contient princesses-t2', () => {
  const index = JSON.parse(fs.readFileSync(new URL('../data/livres/index.json', import.meta.url), 'utf8'));
  assert.deepEqual(index.find((l) => l.id === 'princesses-t2'), { id: 'princesses-t2', titre: 'Princesses Disney – Tome 2', couverture: 'couvertures/princesses-t2.jpg' });
});
