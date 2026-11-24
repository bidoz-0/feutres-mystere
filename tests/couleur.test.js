import test from 'node:test';
import assert from 'node:assert/strict';
import { hexVersLab, deltaE } from '../app/couleurs/couleur.js';

const proche = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('deltaE : valeurs de référence Sharma et al. (2005)', () => {
  proche(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485]), 2.0425);
  proche(deltaE([50, 3.1571, -77.2803], [50, 0, -82.7485]), 2.8615);
  proche(deltaE([50, -1.3802, -84.2814], [50, 0, -82.7485]), 1.0);
  proche(deltaE([50, 2.5, 0], [50, 0, -2.5]), 4.3065);
  proche(deltaE([50, 2.5, 0], [73, 25, -18]), 27.1492);
  assert.equal(deltaE([50, 0, 0], [50, 0, 0]), 0);
});

test('hexVersLab : blanc et rouge', () => {
  const [L, a, b] = hexVersLab('#ffffff');
  assert.ok(Math.abs(L - 100) < 0.01 && Math.abs(a) < 0.01 && Math.abs(b) < 0.01);
  assert.ok(Math.abs(hexVersLab('#ff0000')[0] - 53.24) < 0.05);
});
