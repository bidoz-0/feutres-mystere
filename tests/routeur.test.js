import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireRoute } from '../app/navigation/routeur.js';

test('lireRoute', () => {
  assert.deepEqual(lireRoute(''), { ecran: 'bibliotheque' });
  assert.deepEqual(lireRoute('#/'), { ecran: 'bibliotheque' });
  assert.deepEqual(lireRoute('#/livre/princesses-t2'), { ecran: 'coloriages', livreId: 'princesses-t2' });
  assert.deepEqual(lireRoute('#/livre/princesses-t2/7'), { ecran: 'nuancier', livreId: 'princesses-t2', numero: 7 });
  assert.deepEqual(lireRoute('#/nimporte'), { ecran: 'bibliotheque' });
});
