import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireRoute, demarrerRouteur } from '../app/navigation/routeur.js';

test('lireRoute', () => {
  assert.deepEqual(lireRoute(''), { ecran: 'bibliotheque' });
  assert.deepEqual(lireRoute('#/'), { ecran: 'bibliotheque' });
  assert.deepEqual(lireRoute('#/livre/princesses-t2'), { ecran: 'coloriages', livreId: 'princesses-t2' });
  assert.deepEqual(lireRoute('#/livre/princesses-t2/7'), { ecran: 'nuancier', livreId: 'princesses-t2', numero: 7 });
  assert.deepEqual(lireRoute('#/nimporte'), { ecran: 'bibliotheque' });
});

test('demarrerRouteur : une vue en retard n\'est plus actuelle', () => {
  const ecouteurs = {};
  globalThis.addEventListener = (type, f) => { ecouteurs[type] = f; };
  globalThis.location = { hash: '#/' };
  const actuelles = [];
  const vue = (_r, _p, estActuelle) => actuelles.push(estActuelle);
  demarrerRouteur({ replaceChildren() {} }, { bibliotheque: vue, coloriages: vue, nuancier: vue });
  globalThis.location.hash = '#/livre/x';
  ecouteurs.hashchange();
  assert.equal(actuelles[0](), false);
  assert.equal(actuelles[1](), true);
});
