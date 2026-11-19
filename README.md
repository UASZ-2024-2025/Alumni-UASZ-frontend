## Alumni UASZ – Frontend
## A lire avant de coder svp 

Interface web de la plateforme Alumni de l'Université Assane Seck de Ziguinchor (UASZ). Elle consomme cinq services back décrits par des contrats OpenAPI et propose des espaces adaptés à cinq rôles : `ALUMNI`, `ETUDIANT`, `ENSEIGNANT`, `ENTREPRISE`, `ADMINISTRATEUR`.

## Sommaire

1. [Choix technologiques](#1-choix-technologiques)
2. [Prérequis et installation](#2-prérequis-et-installation)
3. [Commandes utiles](#3-commandes-utiles)
4. [Tester sans le back (mock)](#4-tester-sans-le-back-mock)
5. [Architecture](#5-architecture)
6. [Authentification et rôles](#6-authentification-et-rôles)
7. [Règles d'équipe](#7-règles-déquipe)
8. [Client API généré](#8-client-api-généré)
9. [Qualité du code avec SonarQube](#9-qualité-du-code-avec-sonarqube)
10. [État d'avancement](#10-état-davancement)
11. [Points ouverts](#11-points-ouverts)

---

## 1. Choix technologiques

| Élément | Choix | Justification |
|---|---|---|
| Framework | Angular 21 | Cohérence avec le générateur `typescript-angular`, TypeScript natif, intercepteurs et gardes intégrés, injection de dépendances adaptée à un travail en équipe, composants standalone et lazy loading |
| Langage | TypeScript 5.9 | Les modèles générés depuis les contrats sont typés de bout en bout |
| Client API | `openapi-generator-cli` (typescript-angular) | Aucun appel HTTP écrit à la main : les contrats restent la source de vérité |
| Tests | Vitest | Test runner par défaut d'Angular 21 |
| Qualité | SonarQube Community | Détection des bugs, vulnérabilités, duplications et suivi de la couverture |

**Stockage du JWT.** Les jetons sont conservés dans le `localStorage`, via un seul service (`jeton.service.ts`). C'est un compromis : ce stockage est exposé en cas de faille XSS. Une alternative plus sûre (refresh token en cookie `HttpOnly`) demanderait une évolution côté back. Changer de stockage ne modifie que ce fichier.

## 2. Prérequis et installation

- Node.js `^20.19.0 || ^22.12.0 || ^24.0.0` et npm 11
- Git
- Java uniquement pour régénérer les clients API
- Docker Desktop uniquement pour SonarQube

```bash
git clone <url-du-depot>
cd alumni-frontend
npm install
```

## 3. Commandes utiles

| Commande | Rôle |
|---|---|
| `npm start` | Lance l'application sur http://localhost:4200 (configuration `development`) |
| `npm run mock` | Lance le faux back (ports 8081 à 8084, voir section 4) |
| `npm run build` | Build de production |
| `npm test` | Lance les tests Vitest |
| `npm run api:generate` | Régénère les clients depuis les contrats |

L'adresse du back vient de `src/environments/` : `environment.development.ts` en local, `environment.ts` en production. Le remplacement est déclaré dans `angular.json` (`fileReplacements`, configuration `development`). Après toute modification de `angular.json`, relancer `npm start`.

### Lancer les tests

| Commande | Rôle |
|---|---|
| `npx ng test --watch=false` | Lance toute la suite Vitest une fois |
| `npx ng test` | Mode « watch » : relance les tests à chaque modification |
| `npx ng test --watch=false --include="src/app/fonctionnalites/offres-emploi/**/*.spec.ts"` | Lance seulement les tests des offres d'emploi |
| `npx ng test --coverage --watch=false` | Tests avec rapport de couverture (voir section 9.4) |

Un test est un fichier `*.spec.ts` placé à côté du code qu'il vérifie. Avant de pousser, lancer `npm run build` puis `npx ng test --watch=false`, comme le fait la CI.

**Simuler une erreur de l'API dans un test.** Les composants ne reçoivent jamais un `HttpErrorResponse` brut : `erreur.interceptor.ts` le transforme en `ErreurApi`. Dans un test de composant, il faut donc faire lancer une `ErreurApi` :

```ts
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';

service.mesOffres.mockReturnValue(
  throwError(() => new ErreurApi(403, 'COMPANY_NOT_VALIDATED', 'Message du back.')),
);
```

Avec un `HttpErrorResponse`, `messageErreur()` renvoie toujours « Une erreur est survenue. ». Les tests du **service** (qui passent par `HttpTestingController`, sans intercepteur) vérifient, eux, le statut HTTP brut.

## 4. Tester sans le back (mock)

Dans deux terminaux : `npm run mock`, puis `npm start`.

Le mock écoute sur les ports `8081` à `8084` (un même programme sert les quatre services, ports par défaut des contrats). Le service des offres d'emploi répond sur `http://localhost:8083/v1`.

Mot de passe de tous les comptes : `password123`.

| Email | Rôle |
|---|---|
| alumni@uasz.sn | ALUMNI |
| etudiant@uasz.sn | ETUDIANT |
| enseignant@uasz.sn | ENSEIGNANT |
| entreprise@uasz.sn | ENTREPRISE |
| entreprise-attente@uasz.sn | ENTREPRISE (entreprise non validée) |
| admin@uasz.sn | ADMINISTRATEUR |

Le mock sert aussi le service notifications (port 8085) : chaque compte a quatre notifications, et un nouveau message arrive toutes les 45 s pour voir le compteur de la cloche monter sans recharger.

Le jeton d'accès du mock expire après 20 secondes et le refresh token est à usage unique. Pour vérifier le rafraîchissement automatique : se connecter, attendre plus de 20 s, puis cliquer sur « Appeler une ressource protégée » sur la page d'accueil. Dans l'onglet Network : un 401, un `refresh-token`, puis la requête rejouée en 200. Avec « 3 appels en parallèle », le terminal du mock ne doit afficher qu'un seul `[refresh]`.

### Données de test des offres d'emploi

| Compte | Comportement |
|---|---|
| `entreprise@uasz.sn` | Possède 3 offres (Sonatel) visibles dans « Mes offres » ; peut en publier de nouvelles |
| `entreprise-attente@uasz.sn` | Entreprise non validée : `POST /offers` renvoie `403 COMPANY_NOT_VALIDATED` ; sert à tester ce refus |
| Autres rôles | `403 FORBIDDEN` à la publication |

Le mock contient aussi une offre d'une autre entreprise (Orange Digital Center), qui ne doit **jamais** apparaître dans « Mes offres ». Les données sont en mémoire : relancer `npm run mock` les remet à zéro.

`scripts/mock-api.js` est un outil de test, il n'est pas inclus dans le build.

Groupes de discussion (`/groupes`) : le mock applique les règles du contrat messagerie 1.1.0 (rôles OWNER/ADMIN/MEMBER, réglages, préférences, messages système).

| Compte | Ce qu'il permet de vérifier |
|---|---|
| enseignant@uasz.sn | Propriétaire de « Promo GL 2025 » et « Annonces UFR SET » : réglages, rôles, retrait, suppression |
| alumni@uasz.sn | Admin de « Promo GL 2025 » : retire des membres, mais pas la propriétaire, et ne gère pas les rôles |
| etudiant@uasz.sn | Simple membre ; « Annonces UFR SET » en lecture seule ; `/groupes/g3` répond « Accès réservé aux membres » |
| entreprise@uasz.sn | Pas d'accès aux groupes (403) |

## 5. Architecture

```
alumni-frontend/
├── contrat/                 Contrats OpenAPI (propriété de l'équipe back)
├── scripts/                 mock-api.js
├── src/
│   ├── environments/        URLs d'API par environnement
│   └── app/
│       ├── api/generes/     Clients générés (ne pas modifier)
│       ├── socle/           Fondations transverses
│       │   ├── authentification/   modeles/, services/, stockage/
│       │   ├── intercepteurs-http/
│       │   ├── gardes-routes/
│       │   └── mise-en-page/
│       ├── commun/          Composants, modèles et utilitaires partagés
│       ├── fonctionnalites/ Un dossier par fonctionnalité métier (lazy loading)
│       ├── app.config.ts
│       ├── app.routes.ts
│       └── app.ts
├── angular.json
└── package.json
```

Règles de dépendance :

- `fonctionnalites` peut utiliser `socle`, `commun` et `api/generes`. Jamais l'inverse.
- Une fonctionnalité n'importe pas le code d'une autre. Ce qui est partagé monte dans `commun`.
- `socle` est modifié rarement, par le référent désigné, après revue.

### Rôle des fichiers du socle

| Fichier | Rôle |
|---|---|
| `app.config.ts` | Branche routeur, `HttpClient`, intercepteurs (ordre : erreur, jeton, renouvellement) et adresse du back |
| `app.routes.ts` | Table des routes : connexion publique, zone protégée, lazy loading |
| `session.model.ts` | Modèle de session et type `RoleApplicatif` (`RoleName` plus `ENTREPRISE`) |
| `jeton.service.ts` | Seul accès au stockage de la session |
| `authentification.service.ts` | Connexion, déconnexion, refresh partagé, signaux `utilisateur()`, `role()`, `estConnecte()` |
| `jeton.interceptor.ts` | Ajoute `Authorization: Bearer` aux requêtes de l'API |
| `renouvellement.interceptor.ts` | Sur 401 : refresh, rejeu de la requête, retour à `/connexion` si échec |
| `erreur.interceptor.ts` | Normalise toute erreur en `ErreurApi` |
| `utilitaires-api.ts` | Reconnaît les URLs de l'API et les URLs d'authentification publiques |
| `authentification.guard.ts` | Redirige vers `/connexion` si non connecté |
| `role.guard.ts` | Contrôle `data.roles` de la route |
| `coquille-principale.ts` | Layout : barre de navigation, nom, rôle, déconnexion |
| `menus.config.ts` | Liens de menu par rôle |
| `erreur-api.model.ts` | Format unique des erreurs (`statut`, `code`, `message`) |

## 6. Authentification et rôles

1. **Connexion** : `AuthentificationService.connecter` appelle `loginUser` du client généré, puis enregistre la session.
2. **Requête** : le jeton est ajouté automatiquement. Les pages n'ont rien à faire.
3. **Jeton expiré** : le back répond 401, l'intercepteur appelle `refresh-token` une seule fois (même si plusieurs requêtes échouent en parallèle) et rejoue la requête.
4. **Refresh refusé** : la session est effacée, retour sur `/connexion`.
5. **Déconnexion** : `logoutUser` en meilleur effort, session locale effacée dans tous les cas.

Pour protéger une route par rôle :

```ts
{
  path: 'statistiques',
  canActivate: [roleGuard],
  data: { roles: ['ENSEIGNANT', 'ADMINISTRATEUR'] },
  loadChildren: () =>
    import('./fonctionnalites/statistiques/statistiques.routes').then(m => m.STATISTIQUES_ROUTES),
}
```

Pour afficher un lien de menu, l'ajouter dans `menus.config.ts` pour les rôles concernés.

## 7. Règles d'équipe

### Conventions

- Appels API uniquement via les services générés, jamais via `HttpClient` direct dans un composant.
- Aucune lecture ou écriture directe dans `localStorage` : passer par `JetonService`.
- Noms de dossiers et de fichiers en français, minuscules avec tirets.
- Composants standalone, signals pour l'état local, `@if` et `@for` dans les templates.
- Les erreurs d'un `subscribe` sont des `ErreurApi` : afficher `e.message`.

Pour ajouter une fonctionnalité pas à pas : [`docs/ajouter-une-fonctionnalite.md`](docs/ajouter-une-fonctionnalite.md).

### Fichiers à ne pas modifier

| Catégorie | Fichiers | Pourquoi |
|---|---|---|
| Interdits | `src/app/api/generes/**`, contrats YAML, `package-lock.json` | Générés ou propriété d'une autre équipe. Corriger le contrat et régénérer |
| Réservés au référent socle | `app.config.ts`, intercepteurs, `utilitaires-api.ts`, `authentification.service.ts`, `jeton.service.ts`, gardes, `session.model.ts`, `erreur-api.model.ts`, `coquille-principale.ts`, page de connexion | Une régression casse l'authentification de toute l'application |
| Ajout autorisé d'une ligne | `app.routes.ts`, `menus.config.ts`, `environment*.ts` | Ajouter la route, les liens ou l'URL de sa fonctionnalité sans toucher à celles des autres |
| Temporaire | `fonctionnalites/accueil/accueil.ts` | Page d'essai des appels protégés, à remplacer par la vraie page d'accueil |

### Git

- Une branche par fonctionnalité : `feature/offres-emploi`, `feature/messagerie`, etc.
- Pull Request obligatoire vers `develop` (jamais directement sur `develop` ni `main`).
- Relecture du référent obligatoire pour `socle/`, `app.config.ts` et `api/generes/` (le fichier `.github/CODEOWNERS` reste à créer par le propriétaire du dépôt).
- Titre de PR au format Conventional Commits (voir [Règles de contribution](#règles-de-contribution-actives-sur-develop-et-main)) : c'est lui qui devient le message du commit sur `develop`.

### Intégration continue (GitHub Actions)

Chaque PR vers `develop` ou `main` lance deux workflows (`.github/workflows/`) :

| Workflow | Check | Rôle |
|---|---|---|
| `ci.yml` | `Build et tests frontend` | `npm ci`, `npm run build`, `ng test --watch=false` |
| `ci.yml` | `CI success` | récapitulatif : échoue si le build ou un test échoue |
| `pr-title.yml` | `Titre de PR (Conventional Commits)` | le titre doit suivre `type(scope): description` |

Avant de pousser, lancer en local : `npm run build` puis `npx ng test --watch=false`.

### Règles de contribution (actives sur `develop` et `main`)

Ces règles sont imposées par GitHub (ruleset `protect-main-develop`) : le bouton de fusion reste bloqué tant qu'elles ne sont pas toutes respectées. Le backend (`uasz-alumni-backend`) applique les mêmes.

| Règle | Détail |
|---|---|
| Pull Request obligatoire | Jamais de push direct sur `develop` ni `main` ; une branche par tâche (`feature/AL-XX-...`, `fix/...`, `docs/...`) |
| 1 approbation | Par un autre membre de l'équipe, et par le propriétaire du code (CODEOWNERS) quand il y en a un ; un nouveau push annule l'approbation |
| Conversations résolues | Tous les commentaires de relecture doivent être résolus |
| Checks obligatoires | `CI success` (build et tests) et `Titre de PR (Conventional Commits)` doivent être verts |
| Branche à jour | La PR doit contenir le dernier état de `develop` (bouton *Update branch*) |
| Squash merge uniquement | Toute la PR devient un seul commit, dont le message est le **titre de la PR** |

#### Format du titre de PR

```text
type(scope): description courte (AL-XX)
```

- `type` : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` ;
- `scope` (facultatif) : la partie concernée, ex. `profils`, `offres`, `socle`, `admin` ;
- la référence du ticket Jira à la fin, entre parenthèses, quand il y en a une.

| Correct | Refusé (et pourquoi) |
|---|---|
| `feat(profils): éditeur de CV (AL-48)` | `AL-48: éditeur de CV` (le ticket n'est pas un type) |
| `fix(socle): rafraîchissement du jeton expiré` | `Feature/offres emploi` (nom de branche, pas de type) |
| `test(admin): tests de la liste des utilisateurs` | `Mise à jour` (pas de type ni de description utile) |

Si le check du titre est rouge, il suffit de **modifier le titre de la PR** : le contrôle se relance tout seul, sans nouveau commit.

## 8. Client API généré

Les cinq clients sont générés depuis `contrats-api/` vers `src/app/api/generes/` :

| Contrat | Dossier généré |
|---|---|
| `user-service.yaml` | `utilisateurs/` |
| `alumni-student-company-service.yaml` | `alumni/` |
| `job-offer-service.yaml` | `offres-emploi/` |
| `notification-messaging-service.yaml` | `notifications-messagerie/` |
| `analytics-matching-service.yaml` | `analyses-correspondances/` |

Les clients générés sont commités pour que chacun travaille sur les mêmes fichiers sans installer Java. Quand un contrat change, une seule personne régénère (`npm run api:generate`) et commite le résultat. Les fichiers `git_push.sh` et `.openapi-generator-ignore` produits dans chaque dossier peuvent être supprimés.

Chaque client a son propre `BASE_PATH`. Pour brancher un nouveau service : ajouter son URL dans `urlsApi` des environnements (ce qui l'inclut automatiquement dans le filtre des intercepteurs), puis déclarer son `BASE_PATH` dans `app.config.ts` avec un alias d'import.

Le client `offres-emploi` est branché : son `BASE_PATH` est déclaré dans `app.config.ts` (alias `BASE_PATH_OFFRES`) et son URL se trouve dans `urlsApi.offres` des fichiers `environment*.ts` (`http://localhost:8083/v1` en développement). Sans ce `BASE_PATH`, le client généré appelle le premier serveur du contrat (la production) et la page affiche « Serveur injoignable ».

## 9. Qualité du code avec SonarQube

SonarQube tourne en local dans Docker. Un scanner envoie le code, et un rapport de couverture issu des tests Vitest renseigne la couverture.

### 9.1 Démarrer SonarQube

Docker Desktop doit être lancé.

```powershell
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
```

Attendre 1 à 2 minutes, puis ouvrir http://localhost:9000 (`admin` / `admin`, mot de passe à changer à la première connexion). Si le conteneur s'arrête, consulter `docker logs sonarqube`. Une erreur sur `vm.max_map_count` se corrige avec :

```powershell
wsl -d docker-desktop sysctl -w vm.max_map_count=262144
```

Les lancements suivants : `docker start sonarqube`.

### 9.2 Créer le projet et le token

1. **Create a local project** : clé et nom `alumni-frontend`, branche `main`.
2. Nouveau code : **Use the global setting**.
3. Méthode d'analyse **Locally**, puis **Generate** un token. Le copier immédiatement.

Le token est personnel et ne doit jamais être commité : le passer par variable d'environnement.

### 9.3 Configurer l'analyse

`sonar-project.properties` à la racine :

```properties
sonar.projectKey=alumni-frontend
sonar.projectName=Alumni Frontend
sonar.sourceEncoding=UTF-8

sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.spec.ts

# Le code généré fausserait tous les résultats
sonar.exclusions=src/app/api/generes/**,src/environments/**
sonar.coverage.exclusions=src/app/api/generes/**,src/main.ts,**/*.routes.ts,**/app.config.ts

sonar.javascript.lcov.reportPaths=coverage/alumni-frontend/lcov.info
```

Ajouter au `.gitignore` :

```
coverage/
.scannerwork/
```

### 9.4 Produire la couverture

```powershell
npm install -D @vitest/coverage-v8
```

Dans `angular.json`, bloc `test` :

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": { "coverageReporters": ["lcov", "text-summary"] }
}
```

Puis :

```powershell
npx ng test --coverage --watch=false
```

Vérifier que `coverage/alumni-frontend/lcov.info` existe. Si le dossier porte un autre nom, ajuster `sonar.javascript.lcov.reportPaths`.

### 9.5 Lancer l'analyse

Sans installer Java, avec le scanner officiel :

```powershell
$env:SONAR_TOKEN="colle-ton-token-ici"
docker run --rm `
  -e SONAR_HOST_URL="http://host.docker.internal:9000" `
  -e SONAR_TOKEN=$env:SONAR_TOKEN `
  -v "${PWD}:/usr/src" `
  sonarsource/sonar-scanner-cli
```

Résultats : http://localhost:9000/dashboard?id=alumni-frontend

### 9.6 Lire les résultats

- **Bugs, Vulnerabilities, Security Hotspots, Code Smells** : problèmes détectés.
- **Coverage** : part du code exécutée par les tests.
- **Duplications** : code copié-collé.
- **Quality Gate** : verdict global.

La première analyse échouera probablement au Quality Gate : la règle par défaut exige 80 % de couverture sur le nouveau code, et tant que les tests n'existent pas, la couverture est de 0 %. Les fichiers à tester en priorité sont ceux du socle : service d'authentification, intercepteurs et gardes.

Le build et les tests sont lancés automatiquement sur chaque Pull Request (voir [Intégration continue](#intégration-continue-github-actions)). L'analyse SonarQube, elle, reste locale.

## 10. État d'avancement

| Élément | État |
|---|---|
| Projet, arborescence, contrats et clients générés | Fait |
| Socle d'authentification (jeton, service, intercepteurs, gardes) | Code écrit, validation en cours |
| Page de connexion et layout avec menus par rôle | Code écrit, validation en cours |
| Mock du back pour les tests | Fait |
| Tests unitaires et SonarQube | Fait (suite Vitest, analyse locale) |
| Administration (tableau de bord, utilisateurs, entreprises partenaires) | Fait (AL-51) |
| Squelettes des fonctionnalités, pages 403 et 404, composants communs | Fait, voir `docs/ajouter-une-fonctionnalite.md` |
| Offres d'emploi côté entreprise : « Mes offres » et « Publier une offre » | Fait (AL-49), tests unitaires inclus |
| Cloche et centre de notifications (ALUM-160) | Fait : compteur de non-lus avec polling toutes les 30 s, panneau, « tout marquer comme lu », lien vers l'écran concerné |
| Autres fonctionnalités métier | À faire (AL-48, AL-50, et le reste d'AL-49 : catalogue, candidatures, propositions) |

### Fonctionnalités à développer

| Domaine | Contenu |
|---|---|
| Utilisateurs | Inscription, confirmation d'email, mot de passe oublié, administration des comptes et des statuts |
| Alumni, étudiants, entreprises | Annuaire, profils, CV, expériences, promotions, recommandations |
| Offres d'emploi | Catalogue, candidatures, propositions (la publication et « Mes offres » côté entreprise sont faites) |
| Messagerie et notifications | Notifications, messages privés, groupes de discussion |
| Correspondances et statistiques | Matching offres et candidats, tableau de bord, rapport d'insertion, écart de compétences |
| Transverse | Composants communs, pages 403 et 404, toasts d'erreur, tests |

Les rôles associés à chaque fonctionnalité sont des propositions à confirmer avec l'équipe back.

### Offres d'emploi (espace entreprise) : ce qui est fait

Rôle concerné : `ENTREPRISE` (route protégée par `roleGuard`).

| Route | Page | Contenu |
|---|---|---|
| `/offres-emploi/mes-offres` | `pages/mes-offres.ts` | Tableau paginé (10 par page) des offres de l'entreprise : intitulé, type (Emploi/Stage), lieu, statut (badge Ouverte/Clôturée/Archivée), date de publication. États de chargement, vide et erreur gérés |
| `/offres-emploi/publier` | `pages/publier-offre.ts` | Formulaire réactif : intitulé, type, mode de travail, lieu, description, compétences requises (puces), durée en mois (visible uniquement pour un stage), fourchette salariale, date limite. Validation côté front, toast de succès et redirection vers « Mes offres » |

Les deux pages passent par `services/offres-entreprise.service.ts`, qui appelle le client généré `OffersService` (`searchOffers` filtré par `companyId`, et `createOffer`). Les messages d'erreur sont propres à chaque écran :

| Statut | Message affiché |
|---|---|
| 400 | Certaines informations sont invalides (publication) |
| 401 | Votre session a expiré, reconnectez-vous |
| 403 | Entreprise non encore validée |
| 404 | Entreprise introuvable |
| 0 | Serveur injoignable (réseau) |

**Tests** (`*.spec.ts` dans le même dossier) : affichage et libellés du tableau, pagination, états vide et chargement, validation du formulaire, durée réservée aux stages, redirection après publication, et un test par code d'erreur. Le service est testé avec `HttpTestingController` (URL, méthode, paramètres `companyId`, `page`, `size`, propagation des erreurs). Voir la section 3 pour lancer les tests.

## 11. Points ouverts

- Le rôle `ENTREPRISE` n'existe pas dans le `RoleName` généré depuis `user-service.yaml` (seulement `ALUMNI`, `ETUDIANT`, `ENSEIGNANT`, `ADMINISTRATEUR`). Il est géré côté frontend. À confirmer avec l'équipe back.
- Seuls les clients `utilisateurs`, `offres-emploi` et `notifications-messagerie` sont configurés dans `app.config.ts` (le dernier pour la cloche, présente dans toute la coquille). Les autres services restent à brancher.
- `OffresEntrepriseService` utilise un identifiant d'entreprise fixe (`ID_ENTREPRISE_MOCK`) en attendant de pouvoir lire l'id de l'entreprise connectée (session ou profil). À remplacer quand le back l'exposera.
- Les rôles des routes `offres-emploi/*` (`ENTREPRISE`) sont à confirmer avec l'équipe back.
- Le back doit renvoyer le même format d'erreur (`code`, `message`) pour que les messages s'affichent correctement.
- Le script `scripts/generate-api.js` appelé par `npm run api:generate` n'est pas dans le dépôt (les clients sont déjà générés et commités).
- Le back doit autoriser CORS pour `http://localhost:4200` pour les tests en local.

