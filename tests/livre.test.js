import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const f = new URL('../data/livres/princesses-t2.json', import.meta.url);

test('princesses-t2 : 74 coloriages numérotés, cases valides', () => {
  const livre = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.deepEqual(livre.coloriages.map((c) => c.numero), Array.from({ length: 74 }, (_, i) => i + 1));
  for (const c of livre.coloriages) {
    assert.ok(c.cases.length >= 10 && c.cases.length <= 100, `coloriage ${c.numero} : ${c.cases.length} cases`);
    assert.equal(new Set(c.cases.map((k) => k.symbole)).size, c.cases.length, `symboles en double, coloriage ${c.numero}`);
    for (const k of c.cases) assert.match(k.hex, /^#[0-9a-f]{6}$/);
  }
});

test('chaque symbole utilisé a son dessin dans glyphes', () => {
  const livre = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of livre.coloriages) for (const k of c.cases) {
    const g = livre.glyphes[k.base ?? k.symbole];
    assert.ok(g && g.d.startsWith('M') && g.l > 0 && g.h > 0, `pas de dessin pour ${k.symbole}`);
  }
});

test('coloriage 22 : le « c » imprimé deux fois devient c et c (2)', () => {
  const cases = JSON.parse(fs.readFileSync(f, 'utf8')).coloriages[21].cases;
  assert.equal(cases.find((k) => k.symbole === 'c').base, undefined);
  assert.equal(cases.find((k) => k.symbole === 'c (2)').base, 'c');
});

test('index.json contient princesses-t2', () => {
  const index = JSON.parse(fs.readFileSync(new URL('../data/livres/index.json', import.meta.url), 'utf8'));
  assert.deepEqual(index.find((l) => l.id === 'princesses-t2'), { id: 'princesses-t2', titre: 'Princesses Disney – Tome 2' });
});
