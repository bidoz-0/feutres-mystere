import { demarrerRouteur } from './navigation/routeur.js';
import { vueBibliotheque } from './bibliotheque/vue-bibliotheque.js';
import { vueColoriages } from './coloriages/vue-coloriages.js';
import { vueNuancier } from './nuancier/vue-nuancier.js';

demarrerRouteur(document.getElementById('app'), {
  bibliotheque: vueBibliotheque,
  coloriages: vueColoriages,
  nuancier: vueNuancier,
});
