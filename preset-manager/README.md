# Preset Manager - Application Angular

Application Angular pour la gestion des presets audio du projet Sampler (M1 INFO 2025-2026).

## Auteurs

- **[Stevenson JULES]**
- **[Bastian Holzer]**

## Fonctionnalités

### Obligatoires (toutes implémentées)

- [x] **Liste des presets** : Affichage de tous les presets avec leur type et nombre de sons
- [x] **Édition de preset** : Modification du nom, type et liste des samples
- [x] **Renommage** : Possibilité de renommer un preset existant

### Optionnelles (implémentées)

- [x] **Suppression de preset** : Suppression avec confirmation
- [x] **Création de preset** : Formulaire pour créer un nouveau preset avec nom, type et URLs des sons

### Non implémentées

- [ ] Upload de fichiers audio lors de la création d'un preset

## Technologies utilisées

- **Angular 21** avec composants standalone
- **Angular Material** pour l'interface utilisateur
- **RxJS** pour la gestion des requêtes HTTP
- **TypeScript 5.9**

## Structure du projet

```
src/app/
├── presets/                    # Page liste des presets
│   ├── presets.component.ts
│   ├── presets.component.html
│   └── presets.component.css
├── preset-detail/              # Page édition d'un preset
│   ├── preset-detail.component.ts
│   ├── preset-detail.component.html
│   └── preset-detail.component.css
├── add-preset/                 # Page création d'un preset
│   ├── add-preset.component.ts
│   ├── add-preset.component.html
│   └── add-preset.component.css
├── shared/                     # Services et modèles partagés
│   ├── preset.model.ts         # Modèle Preset et Sample
│   └── presets.service.ts      # Service HTTP pour l'API
├── app.routes.ts               # Configuration des routes
├── app.config.ts               # Configuration de l'application
└── app.component.ts            # Composant racine
```

## Installation

### Prérequis

- **Node.js** v20.19+ ou v22.12+ (obligatoire pour Angular 21)
- **npm** v10+

### Étapes

```bash
# Cloner le repository
git clone <url-du-repo>
cd preset-manager

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

L'application sera accessible sur `http://localhost:4200`

## Configuration du backend

Le service utilise l'API backend déployée sur Render :

```typescript
// src/app/shared/presets.service.ts
private apiUrl = 'https://webaudio-22k9.onrender.com/api';
```

Pour utiliser un backend local, modifier cette URL :

```typescript
private apiUrl = 'http://localhost:3000/api';
```

## Routes de l'application

| Route | Description |
|-------|-------------|
| `/` | Redirige vers `/presets` |
| `/presets` | Liste de tous les presets |
| `/presets/new` | Formulaire de création |
| `/presets/:name` | Édition d'un preset |

## API Backend utilisée

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/presets` | Liste tous les presets |
| GET | `/api/presets/:name` | Récupère un preset |
| POST | `/api/presets` | Crée un nouveau preset |
| PUT | `/api/presets/:name` | Met à jour un preset |
| DELETE | `/api/presets/:name` | Supprime un preset |



## Scripts disponibles

```bash
npm start       # Lance le serveur de développement
npm run build   # Build de production
npm test        # Lance les tests unitaires
```

## Licence

Projet universitaire - M1 INFO 2025-2026
