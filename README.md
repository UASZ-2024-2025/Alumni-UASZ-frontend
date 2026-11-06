# Alumni UASZ – Frontend

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
| `npm run mock` | Lance le faux back sur http://localhost:8081/v1 |
| `npm run build` | Build de production |
| `npm test` | Lance les tests Vitest |
| `npm run api:generate` | Régénère les clients depuis les contrats |

L'adresse du back vient de `src/environments/` : `environment.development.ts` en local, `environment.ts` en production. Le remplacement est déclaré dans `angular.json` (`fileReplacements`, configuration `development`). Après toute modification de `angular.json`, relancer `npm start`.

## 4. Tester sans le back (mock)

Dans deux terminaux : `npm run mock`, puis `npm start`.

Mot de passe de tous les comptes : `password123`.

| Email | Rôle |
|---|---|
| alumni@uasz.sn | ALUMNI |
| etudiant@uasz.sn | ETUDIANT |
| enseignant@uasz.sn | ENSEIGNANT |
| entreprise@uasz.sn | ENTREPRISE |
| admin@uasz.sn | ADMINISTRATEUR |

Le jeton d'accès du mock expire après 20 secondes et le refresh token est à usage unique. Pour vérifier le rafraîchissement automatique : se connecter, attendre plus de 20 s, puis cliquer sur « Appeler une ressource protégée » sur la page d'accueil. Dans l'onglet Network : un 401, un `refresh-token`, puis la requête rejouée en 200. Avec « 3 appels en parallèle », le terminal du mock ne doit afficher qu'un seul `[refresh]`.

`scripts/mock-api.js` est un outil de test, il n'est pas inclus dans le build.

## 5. Architecture

```
alumni-frontend/
├── contrats-api/            Contrats OpenAPI (propriété de l'équipe back)
├── scripts/                 generate-api.js, mock-api.js
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
| Temporaires | `fonctionnalites/accueil/accueil.ts`, route `test-admin` | À supprimer quand les vraies pages existent |

### Git

- Une branche par fonctionnalité : `feature/offres-emploi`, `feature/messagerie`, etc.
- Pull Request obligatoire vers `main`.
- Relecture du référent obligatoire pour `socle/`, `app.config.ts` et `api/generes/` (voir `.github/CODEOWNERS`).
- Messages de commit : `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

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

À terme, l'analyse doit être lancée automatiquement sur chaque Pull Request via GitHub Actions.

## 10. État d'avancement

| Élément | État |
|---|---|
| Projet, arborescence, contrats et clients générés | Fait |
| Socle d'authentification (jeton, service, intercepteurs, gardes) | Code écrit, validation en cours |
| Page de connexion et layout avec menus par rôle | Code écrit, validation en cours |
| Mock du back pour les tests | Fait |
| Tests unitaires du socle, intégration SonarQube | À faire |
| Fonctionnalités métier | À faire |

### Fonctionnalités à développer

| Domaine | Contenu |
|---|---|
| Utilisateurs | Inscription, confirmation d'email, mot de passe oublié, administration des comptes et des statuts |
| Alumni, étudiants, entreprises | Annuaire, profils, CV, expériences, promotions, recommandations |
| Offres d'emploi | Catalogue, publication, candidatures, propositions |
| Messagerie et notifications | Notifications, messages privés, groupes de discussion |
| Correspondances et statistiques | Matching offres et candidats, tableau de bord, rapport d'insertion, écart de compétences |
| Transverse | Composants communs, pages 403 et 404, toasts d'erreur, tests |

Les rôles associés à chaque fonctionnalité sont des propositions à confirmer avec l'équipe back.

## 11. Points ouverts

- Le rôle `ENTREPRISE` n'existe pas dans le `RoleName` généré depuis `user-service.yaml` (seulement `ALUMNI`, `ETUDIANT`, `ENSEIGNANT`, `ADMINISTRATEUR`). Il est géré côté frontend. À confirmer avec l'équipe back.
- Seul le client `utilisateurs` est configuré. Les quatre autres services restent à brancher.
- Le dossier des contrats doit porter le même nom partout (`contrats-api/`), y compris dans `scripts/generate-api.js`.
- Le back doit autoriser CORS pour `http://localhost:4200` pour les tests en local.
