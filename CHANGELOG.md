# Changelog

Toutes les évolutions notables du projet. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), la version la plus
récente en premier.

## [0.4.0] — 2026-09-17

### Ajouté

- **Hint d'interaction sur le champ de recherche.** Quand aucune tentative n'a
  encore été faite et que le champ est vide, il pulsera légèrement pour signaler
  qu'il doit être cliqué avant de taper une campagne.
- **Bouton de partage de résultat.** Une fois la partie terminée, le joueur peut
  copier ou partager son score directement dans un message Discord ou sur son
  système de partage natif, avec une grille d'émojis de résultat.

### Modifié

- **Le mode Illimité suit désormais la même limite de 6 essais** que le mode
  hebdomadaire. La partie se termine au sixième essai, même sans échéance
  hebdomadaire.
- **Le format de partage est un mini-grid lisible en texte brut** : chaque case
  est représentée par un seul emoji, avec les flèches de direction pour les
  valeurs numériques incorrectes.

### Corrigé

- Les statistiques du mode Illimité continuent d'incrémenter correctement les
  parties jouées et le taux de réussite, y compris en cas d'échec.
- Le texte de partage est désormais plus utile en contexte Discord, avec la date
  du dernier reset hebdomadaire et l'invitation à rejouer sur la page actuelle.

## [0.3.0] — 2026-09-16

### ⚠ Rupture de compatibilité

Le préfixe de stockage passe à `goblindle_v3_`. Au premier chargement après la
mise à jour, **toute partie en cours et toutes les statistiques du mode Illimité
sont effacées**. C'est volontaire : cela permet une disposition des clés simple
plutôt que défensive.

### Ajouté

- **Série hebdomadaire.** L'écran de fin affiche le nombre de semaines gagnées
  d'affilée, avec un message qui évolue à 10, 15, 20, 50, 100 et 200 semaines.
  Deux règles, rappelées sous le message parce qu'elles ne se devinent pas :
  **passer une semaine ne casse rien** — la série gèle — mais **abandonner une
  partie commencée la casse**, pour que personne ne protège sa série en
  s'arrêtant au cinquième essai. Une semaine abandonnée est détectée au
  chargement suivant, avant le nettoyage des parties passées.
- **Le logo du club** en icône d'onglet et à côté du titre. Icône iOS séparée,
  aplatie sur fond clair : iOS compose la transparence sur du noir, et le logo
  est presque entièrement sombre.
- `color-scheme: dark`, qui manquait : les ascenseurs, les anneaux de focus par
  défaut, le remplissage automatique de Chrome et `::selection` étaient rendus
  en clair sur une page sombre.

### Modifié

- **Palette alignée sur le logo** — bruns maroon très sombres et blanc cassé
  chaud, échantillonnés dans l'image. Polices, arrondis et tailles inchangés.
  Le vert et le rouge des cellules ne bougent pas : c'est le langage du jeu.
- Le décompte s'affiche en `dd-hh:mm:ss`, largeur fixe.
- Les boutons passent au blanc cassé du logo plutôt qu'à un orange de marque :
  toute teinte chaude se confondrait avec le rouge des cellules, et la vignette
  d'initiales s'affiche à quatre pixels d'une cellule dans la grille.
- La bordure du champ de recherche et l'accent ne partagent plus la même valeur.
  C'est ce qui rendait l'indicateur de focus invisible : il était exactement de
  la couleur de la bordure au repos.

### Corrigé

- **Texte blanc sur les cellules rouges : 3,77:1, sous le seuil WCAG AA** depuis
  toujours, et pire encore en 0,7 rem sur mobile. Les trois cellules ont
  désormais un texte sombre, à 5,14:1 sur le rouge.
- Le « ? » des anecdotes était affiché à 55 % d'opacité et devenait illisible sur
  les cellules — 2,13:1 sur le rouge — alors que c'est le seul indice qu'une
  case est cliquable.
- L'ombre portée de la bulle d'anecdote était du noir à 45 % sur une page
  quasi noire, donc invisible. Remplacée par un liseré clair.
- Suppression de `--color-partial` et de `.cell-partial` : `compareCampaigns` ne
  renvoie plus que `correct` ou `wrong` depuis la v0.1, la règle ne s'appliquait
  jamais.

### Limites connues

- La série est stockée dans le `localStorage` du navigateur : elle ne survit pas
  à un vidage du cache, ne suit pas d'un appareil à l'autre, et n'existe pas en
  navigation privée.

## [0.2.0] — 2026-09-16

### Ajouté

- **Bulles d'anecdotes.** Chaque case de la grille dont la campagne a une note
  pour ce champ devient cliquable et affiche une anecdote tirée au hasard. Au
  survol sur ordinateur, au toucher sur mobile, où la case entière fait office
  de cible. Fermeture à l'Échap, au clic à côté, ou en refermant la case.
- **Bannière de contribution.** Invite les joueurs à signaler une campagne
  manquante, une anecdote à ajouter ou une information erronée, via
  `mailto:`. L'adresse est assemblée en JavaScript au premier survol, donc
  absente du HTML servi — voir les limites ci-dessous. Si aucun client mail
  n'est configuré, l'adresse s'affiche en clair avec un bouton « copier ».
- **Décompte hebdomadaire.** Une fois la partie terminée, l'écran de fin
  indique le temps restant avant la prochaine campagne.

### Modifié

- **Le mode « Quotidien » devient « Hebdomadaire ».** Le jeu se réinitialise
  désormais chaque **jeudi à 19 h, heure de Bruxelles** — juste avant les
  séances. Le fuseau est fixe et non celui du joueur : tout le monde a la même
  campagne au même instant, y compris en déplacement. Les semaines de changement
  d'heure durent 167 ou 169 heures réelles et le décompte en tient compte.
- La sélection de la campagne se fait maintenant sur l'indice de la période et
  non sur la date. Chaque campagne sort exactement une fois par rotation de 16
  semaines, sans jamais se répéter deux semaines de suite.
- Les parties en cours sont stockées sous `goblindle_v1_weekly_<jeudi>` ; les
  anciennes clés `goblindle_v1_daily_*` sont supprimées au chargement. Les
  statistiques du mode Illimité sont conservées.
- Le mode inconnu ne partage plus sa sauvegarde avec le mode Illimité.
- Une seule GitHub Action : `ci.yml` est supprimé et ses étapes `npm test` et
  `npm run lint` passent dans `deploy.yml`, avant le build. Un test qui échoue
  bloque donc le déploiement.

### Corrigé

- Prise en charge de `prefers-reduced-motion` sur la grille. L'ajout naïf
  (`animation: none`) aurait vidé le plateau, les cases partant d'une opacité
  nulle et ne devant leur apparition qu'à l'animation.
- Le passage d'une période à la suivante, onglet ouvert, ne réinitialise plus
  silencieusement une partie en cours : le décompte propose un rechargement.

### Limites connues

- L'obfuscation de l'adresse protège la page déployée, qui est le principal
  vecteur de collecte. Le dépôt étant public, l'adresse reste lisible dans le
  code source sur GitHub — d'où le choix d'une adresse dédiée, jetable si elle
  finit par attirer du spam.
- Avec 16 campagnes et un tirage par semaine, la rotation épuise le jeu de
  données en 16 semaines. Ajouter des campagnes rallonge le cycle et donne plus
  de matière aux bulles d'anecdotes.

## [0.1.0] — 2026-09-16

Première version : conversion d'un clone de LoLdle en jeu de devinettes sur les
campagnes de la guilde.

### Ajouté

- Format de données par campagne : `campaign`, `gm`, `game`, `year`, `pj_max`,
  `duration` (en années pleines) et `deaths`, chaque champ portant une valeur et
  une liste facultative d'anecdotes.
- Interface entièrement en français.
- Emplacement d'illustration facultatif par campagne, avec une vignette
  d'initiales par défaut.
- Contrôles au chargement : le jeu refuse de démarrer sur un fichier vide, une
  campagne sans nom, ou deux noms qui ne se distinguent que par les accents ou
  la ponctuation — ce dernier cas cassant la grille en pleine partie.

### Modifié

- `web/static/campaigns.json` devient l'unique source de données, éditée à la
  main. Le dossier `data/` et son scraper Go, hérités du projet d'origine, sont
  supprimés, ainsi que le workflow hebdomadaire qui écrasait les données.
- Le nombre de colonnes de la grille suit la liste des attributs au lieu d'être
  répété dans trois blocs CSS.

### Corrigé

- **Une campagne sans mort était indevinable.** `0` était traité comme une
  valeur absente : la case affichait « — » et la flèche haut/bas disparaissait.
  Dans la foulée, une valeur manquante ne produit plus de flèche mensongère.
- **La campagne du jour descendait le fichier dans l'ordre.** La fonction de
  hachage plaçait deux dates consécutives à des indices voisins ; 64 % des jours
  tombaient à ±1 de la veille. Remplacée par un cycle mélangé.
