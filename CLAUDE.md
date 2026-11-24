# Feutres Mystère

## C'est quoi
Une page web pour téléphone qui choisit, pour chaque symbole d'un coloriage mystère Hachette, le feutre le plus proche parmi les boîtes Languo 240 et GuangNa 168. Faite pour une seule utilisatrice (la copine de l'utilisateur).

## Stack
HTML + CSS + JavaScript (modules ES), sans framework ni build, sans dépendance npm. Node.js pour le serveur local, les scripts d'extraction et les tests (`node --test`). Données dans des fichiers JSON (`data/`) ; choix de l'utilisatrice dans le `localStorage` du téléphone. Hébergement : GitHub Pages.

## Lancer / tester
En ligne : https://bidoz-0.github.io/feutres-mystere/ (GitHub Pages, publié depuis `main`).
- `npm start` puis ouvrir http://localhost:8080
- `npm test`
- Extraire un livre : `node outils/extraire-livre.js sources/pdfs/<fichier>.pdf <id> "<titre>" [nombre de pages]` (ex. `… princesses-t2 "Princesses Disney – Tome 2" 100` : s'arrête si le dernier numéro imprimé diffère)
- Extraire les feutres : `npm start` puis http://localhost:8080/outils/extraire-feutres.html

## Règles
- Réponds en français, court, droit au but.
- L'utilisateur débute en dev : explique les choix importants en une phrase, sans faire de cours.
- Solution la plus simple qui marche. Ne change jamais de techno ni d'architecture sans le proposer d'abord.
- Jamais de secret (clé API, token, mot de passe) dans le code ou le repo : variables d'environnement + .gitignore.
- Pas de fausses données ni de TODO caché : si quelque chose n'est pas fait ou pas faisable, dis-le.
- Préviens avant toute action risquée (suppression, gros refactor, migration).
- Agents : l'utilisateur donne son accord permanent, sans redemander, pour utiliser l'agent explorateur dès qu'une recherche demande de lire plus de 3 fichiers, l'agent codeur pour écrire du code sur plusieurs fichiers, et l'agent relecteur avant chaque commit.
- Structure du projet : voir ARCHITECTURE.md. Où on en est : dernier fichier de docs/handoff/ (pas encore de handoff : la V1 démarre à la Task 1 du plan).
- `sources/` (images vendeurs, PDF de Jérémy Mariez) ne va jamais dans git : seules les couleurs extraites sont versionnées.
- Design : `docs/superpowers/specs/2026-11-24-coloriage-feutres-design.md`. Plan V1 : `docs/superpowers/plans/2026-11-24-coloriage-feutres-v1.md`.

## Structure du code
- Le point d'entrée (main) ne fait que lancer l'appli : aucune logique dedans.
- Séparer interface, logique, données et services externes (API).
- Un fichier = un rôle. Au-delà de ~300 lignes, découper.
- Dossiers rangés par fonctionnalité, pas par type de fichier.
- Configuration et secrets à part, jamais en dur dans le code.
- Avant de créer un fichier, vérifier s'il existe déjà un endroit logique pour ce code.
