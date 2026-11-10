# Ajouter une fonctionnalité

Guide pour toute l'équipe front. Lire d'abord la section « Architecture » du `README.md`.

## 1. Où va quoi

| Je code… | Dossier |
|---|---|
| Un écran ou un service propre à ma fonctionnalité | `src/app/fonctionnalites/<ma-fonctionnalite>/` |
| Un composant ou un utilitaire utile à plusieurs fonctionnalités | `src/app/commun/` |
| Authentification, intercepteurs, gardes, coquille | `src/app/socle/` (référent socle uniquement) |
| Un appel au back | Jamais à la main : utiliser le client généré dans `src/app/api/generes/` |

Une fonctionnalité n'importe jamais le code d'une autre fonctionnalité. Ce qui se partage monte dans `commun/`.

## 2. Les squelettes existent déjà

Chaque ticket a son dossier avec un fichier de routes, qui affiche pour l'instant la page « en construction » :

| Ticket | Dossier | Chemins déjà branchés au menu |
|---|---|---|
| AL-48 profils, CV, annuaire | `fonctionnalites/profils/` | `/etudiants`, `/entreprises` |
| AL-49 offres, candidatures, matching | `fonctionnalites/offres-emploi/` | `/offres-emploi`, `/candidatures`, `/correspondances` |
| AL-50 messagerie, notifications | `fonctionnalites/messagerie/` | `/messagerie`, `/notifications` |
| Statistiques | `fonctionnalites/statistiques/` | `/statistiques` |
| AL-51 administration | `fonctionnalites/administration/` | `/administration` |

Les rôles de chaque route sont des propositions : à confirmer avec l'équipe back, puis à ajuster dans `data.roles`.

## 3. Les étapes

1. `git fetch` puis `git pull origin develop`, et regarder ce qui a changé.
2. Créer la branche : `git checkout -b feature/<nom>` depuis `develop`.
3. Dans le fichier de routes de la fonctionnalité, remplacer `enConstruction` par `loadComponent: () => import('./pages/ma-page').then((m) => m.MaPage)`.
4. Créer la page dans `pages/` (composant autonome, `templateUrl` si le gabarit dépasse quelques lignes).
5. Brancher le client API généré (voir plus bas).
6. Écrire les tests (`ma-page.spec.ts` à côté du fichier).
7. Si un nouveau lien de menu est nécessaire : ajouter une ligne dans `socle/mise-en-page/menus.config.ts`.
8. Vérifier : `npx ng test --no-watch` et `npx ng build`.
9. Pull Request vers `develop`.

## 4. Brancher le client API

Les cinq clients sont générés. Le client `utilisateurs` est configuré globalement dans `app.config.ts`. Pour un autre service, déclarer son `BASE_PATH` et les services utilisés dans les `providers` du fichier de routes de la fonctionnalité, comme le fait `administration/administration.routes.ts` :

```ts
providers: [
  { provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni },
  CompaniesService,
],
```

Les erreurs d'un `subscribe` sont des `ErreurApi`. Pour les afficher : `messageErreur(e, { 404: 'Message clair.' })` de `commun/utilitaires/messages-erreur`.

## 5. Les conventions d'écran

- Un formulaire de création ou de modification s'ouvre dans `<app-modale>`.
- Un succès passe par `ToastService`, une confirmation (suppression, désactivation) par `ConfirmationService`. Pas de `window.confirm` ni de `alert`.
- Une liste affiche trois états : chargement (`app-spinner`), vide (`app-etat-vide`), erreur (`app-alerte`). `app-tableau` gère les deux premiers.
- Une liste paginée s'appuie sur `creerListePaginee`.
- Les couleurs viennent des variables de `src/styles/_variables.scss`. Aucune couleur en dur.
- Sur un élément non natif, ne pas utiliser `(click)` : utiliser `<app-bouton (clic)="…">` ou un vrai `<button>`.

## 6. Catalogue des composants communs

Tous dans `src/app/commun/components/`. Le commentaire en tête de chaque fichier donne un exemple d'usage.

| Besoin | Composant |
|---|---|
| Boutons | `app-bouton` (variantes principal, secondaire, danger) |
| Champ de saisie, liste déroulante, zone de texte, date, nombre | `app-champ` |
| Case à cocher, choix unique | `app-case-a-cocher`, `app-groupe-radio` |
| Fichier (CV, photo) | `app-champ-fichier` |
| Compétences en puces | `app-puces-competences` |
| Recherche avec filtres | `app-barre-recherche` |
| Tableau de données | `app-tableau` (+ `app-pagination`) |
| Onglets | `app-onglets` |
| Regroupement visuel | `app-carte`, `app-carte-stat` |
| Statut, score, compteur | `app-badge`, `app-barre-score`, `app-compteur` |
| Identité | `app-avatar` |
| Messages | `app-alerte`, `app-etat-vide`, `app-spinner`, `ToastService` |
| Fenêtres | `app-modale`, `ConfirmationService` |
| Graphiques | `app-graphique-anneau`, `app-graphique-barres`, `app-graphique-colonnes` |
| Pages d'erreur | `app-page-erreur` (403 et 404 déjà branchées) |

Il manque un composant ? Le demander dans l'équipe avant de le coder dans sa fonctionnalité : s'il sert à deux écrans, il va dans `commun/`.

## 7. Qualité avant la Pull Request

- Tests verts et build sans erreur.
- Analyse SonarQube sans nouveau problème (voir le README, section SonarQube).
- Messages de commit : `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
- Ne pas modifier les fichiers réservés au référent socle (tableau du README) sans sa relecture.
