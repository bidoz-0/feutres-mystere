# Design : pages sans code couleur, menu « Mes boîtes », boîte prise en photo

Date : 2026-11-24. Statut : complet, en attente de l'accord de l'utilisateur.

## Pourquoi

L'appli sert à une seule personne, qui colorie les livres Hachette avec deux boîtes : Languo 240 et GuangNa 168.
- Ses premiers dessins sont finis, mais elle n'a pas noté les feutres utilisés. Elle veut quand même les marquer comme finis, pour l'avancement.
- Certains feutres sont secs. L'appli ne doit plus les proposer, et elle veut voir d'un coup d'œil lesquels.
- Trouver 20 à 40 feutres dans une boîte de 240 est long. Elle veut photographier sa boîte et voir sur l'appli, rangés comme en vrai, les feutres à prendre pour le dessin.

## Partie 1 : page finie sans code couleur

- Dans le nuancier, un bouton « Fini, je n'ai pas noté les feutres ». Il remplit chaque symbole sans choix avec `{ texte: 'Code couleur inconnu' }`, puis marque la page finie. Le format de choix existe déjà : `proposerNuancier` affiche `texte` en « saisie libre ».
- Les choix déjà faits ne sont pas écrasés (`completerChoix`).
- « Reprendre la page » laisse les « inconnu » ; elle peut les changer un par un.
- Non-objectif : retrouver les vraies couleurs à partir d'une photo du dessin.

## Partie 2 : menu « Mes boîtes »

**Écrans**
- Nouvel onglet ou bouton depuis la bibliothèque : « Mes boîtes ». On voit les deux boîtes en grandes cartes.
- Toucher une boîte l'**agrandit en paysage** : elle occupe tout l'écran, et tous les feutres sont dessinés comme des capuchons de couleur avec leur code. Les feutres « ne marche plus » sont en **rouge** : contour rouge, barrés, couleur atténuée.
- Toucher un feutre bascule son état « marche / ne marche plus ».
- Un bouton « Liste » montre une liste écrite simple : code, nom, pastille, case « ne marche plus ». La liste se trie par code et se filtre par « ne marche plus ».

**Effet sur le reste de l'appli**
- Un feutre qui ne marche plus n'est plus proposé dans le nuancier : il est retiré de la liste avant `plusProches`.
- Si un choix déjà enregistré utilise un feutre qui ne marche plus, la ligne l'indique (« ne marche plus ») sans rien changer tout seul.

**Animation** (demande forte : « niveau site pro »)
- L'agrandissement de la boîte passe par l'API View Transitions, native, sans dépendance : la carte se transforme en plein écran, avec un élément partagé.
- Les capuchons apparaissent en cascade.
- Le passage en rouge est animé par un petit rebond.
- Les ressorts sont faits en CSS `linear()`.
- Seuls `transform` et `opacity` sont animés. `prefers-reduced-motion` est respecté : un simple fondu le remplace.
- Paysage : on demande le plein écran et `screen.orientation.lock('landscape')` quand le téléphone le permet (Android). Sinon (iPhone), la vue est tournée de 90° en CSS et on invite à tourner le téléphone.

**Données**
- `localStorage` : `indisponibles: { "<code>": true }`.

> **Partie 3 annulée le 2026-11-24.** Essai sur les vraies photos : codes lus justes 28 % (GuangNa) et 5 % (Languo), couleur seule environ 5 % et 0 % (éclairage de la pièce trop loin des couleurs de référence). L'utilisatrice aurait dû presque tout corriger à la main. L'utilisateur a choisi d'annuler. Le texte ci-dessous est gardé pour mémoire.

## Partie 3 : la boîte prise en photo

**Approches étudiées**
- A. Deviner chaque emplacement par la couleur du capuchon, puis correction à la main.
- B. Lire le code imprimé sur le capuchon (lecture de texte), puis correction.
- C. Une IA en ligne qui analyse la photo. Écartée : il faut un serveur et une clé payante, ce qui est impossible proprement sur un site statique.

**Choix de l'utilisateur : A + B.** Le code lu sur le capuchon passe en premier ; s'il n'est pas lu, ou s'il est lu mais absent de la boîte, la couleur sert de repli. Elle corrige ensuite à la main.

**Déroulé, la première fois**
1. Elle photographie sa boîte ouverte, avec l'appareil photo ou la galerie, via `<input type="file" accept="image/*" capture>`.
2. Elle ajuste un cadre à 4 coins sur la zone des feutres et indique le nombre de rangées et de colonnes. On peut pré-remplir ces nombres une fois qu'on aura les photos des vraies boîtes.
3. L'appli redresse la photo (perspective par les 4 coins), la découpe en emplacements, et pour chacun :
   - essaie de lire le code ;
   - sinon, prend la couleur moyenne du capuchon et cherche le feutre le plus proche (CIEDE2000, déjà présent), parmi ceux de cette boîte qui ne sont pas encore placés.
4. L'appli affiche la boîte reconstruite. Les emplacements peu sûrs sont signalés. Elle touche un emplacement pour corriger : saisie du code ou choix dans une courte liste de feutres proches.
5. La disposition est enregistrée : `dispositions: { languo: { rangees, colonnes, emplacements: [code|null] } }`. La photo elle-même n'est pas gardée, car elle est trop lourde pour le `localStorage`.

**Déroulé pour chaque dessin**
- Dans le nuancier, le bouton « Préparer mes feutres » ouvre la boîte rangée comme en vrai. Les feutres de la page s'allument, avec le symbole du coloriage sur chacun, et les autres sont atténués.
- Option : reprendre une photo et ajuster les 4 coins. Les feutres à prendre sont alors entourés directement sur la photo.

**Lecture des codes**
- La bibliothèque Tesseract.js est chargée depuis un CDN uniquement quand elle prend une photo. Cela ajoute une dépendance externe au site, que l'utilisateur a demandée.
- Elle ne lit que les caractères des codes : lettres A–Z, chiffres, tiret.
- On attend une lecture correcte seulement pour une partie des capuchons. La correction à la main reste le filet de sécurité.

## Points tranchés (relecture « constructeur »)

- **Données** (constaté) : `data/feutres.json` contient 240 feutres `languo` et 168 `guangna`, chacun avec `marque` et `code`. Aucun code n'existe dans les deux boîtes, donc `indisponibles` et `dispositions` sont indexés par `code` seul. Les choix du nuancier sont stockés en `{ code }`, la même clé. Le code imprimé sur le capuchon (« CB 906 », « 611 ») se compare au code de la base une fois normalisé : majuscules, sans espace ni tiret, comme `trouverFeutre`.
- **Grille Languo** *(décision du concepteur)* : grille régulière de 20 × 12. Chaque emplacement peut être décalé à la main de façon simple. Pas de modèle de demi-pas. Un emplacement peut rester vide (`null`).
- **Lecture des codes** *(décision du concepteur)* :
  - On la mesure sur les deux photos réelles fournies le 2026-11-24, avant de brancher l'écran.
  - Si elle ne lit presque rien d'utile, on garde la couleur seule plus la correction, et on le dit à l'utilisateur avant de livrer : on ne livre pas un outil lourd qui ne sert pas.
  - Tesseract.js est chargé depuis un CDN. Il faut internet au moment de la photo, ce qui est acceptable : c'est une opération rare.
- **« Préparer mes feutres »** *(décision du concepteur)* :
  - un feutre à prendre marqué « ne marche plus » reste affiché, en rouge, avec l'avertissement ;
  - « Code couleur inconnu » et la saisie libre sont ignorés ;
  - un feutre absent de la disposition est listé à part (« pas trouvé dans la boîte »).
- **Paysage et retour** *(décision du concepteur)* : le bouton retour du téléphone, ou la croix, quitte le plein écran, libère l'orientation et revient au menu « Mes boîtes ».

## Contraintes

- Le site reste statique sur GitHub Pages, sans build et sans npm. Tout est en modules ES, comme aujourd'hui.
- Rien de privé ne part sur internet : la photo est traitée dans le téléphone.
- Les fichiers ne dépassent pas ~300 lignes, et un fichier ne joue qu'un rôle. Les dossiers sont rangés par fonctionnalité : `app/boites/` et `app/photo/`.

## Non-objectifs et anti-objectifs

- Non-objectif : reconnaître une boîte sans aucune correction.
- Non-objectif : mesurer la vraie couleur de l'encre. C'est le sujet « scanner les feutres », repoussé.
- Anti-objectif : une animation qui ralentit l'usage ou saccade sur son téléphone.
- Anti-objectif : écraser un choix ou une disposition sans qu'elle l'ait voulu.

## Les vraies boîtes (photos du 2026-11-24)

- **Languo 240** : trousse verticale, feutres debout, vus par le dessus. On compte **20 rangées de 12**, par paires de rangées décalées sur des supports. Le dessus du capuchon est un disque de la couleur du feutre, avec le code imprimé (ex. « CB 906 ») dans tous les sens. La perspective est forte : les feutres du haut sont penchés.
- **GuangNa 168** : boîte horizontale, feutres couchés en **7 rangées de 24**. Le capuchon entier est de la couleur du feutre, avec le numéro imprimé (ex. « 611 »), souvent tourné ou à l'envers.
- Conséquences :
  - La couleur du capuchon est un bon indice dans les deux boîtes.
  - Les codes sont imprimés dans tous les sens : la lecture essaie 4 rotations par emplacement, uniquement sur ceux dont la couleur ne suffit pas, pour rester rapide.
  - Le cadre à 4 coins se pré-règle sur 20×12 ou 7×24, et chaque emplacement peut être décalé un peu pour suivre les rangées décalées de la Languo.
  - La vue agrandie de chaque boîte reproduit ces grilles : 12 colonnes × 20 rangées pour la Languo, affichée couchée en paysage, et 24 × 7 pour la GuangNa.
- Constat : son rangement ne suit pas l'ordre de la carte imprimée. La photo est donc bien nécessaire.

## Son téléphone

Google Pixel (Android, Chrome). Le plein écran et `screen.orientation.lock('landscape')` marchent, la vue agrandie passe donc vraiment en paysage. La rotation CSS ne reste qu'en secours, si le verrouillage échoue. Les View Transitions et `linear()` sont pris en charge.

## Ordre de réalisation

Partie 1, puis partie 2, puis partie 3. Chaque partie est mise en ligne séparément.
