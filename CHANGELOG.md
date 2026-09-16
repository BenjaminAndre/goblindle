# Changelog

Toutes les évolutions notables du projet. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), la version la plus
récente en premier.

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
