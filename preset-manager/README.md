# Preset Manager - Angular Application

Angular application for managing audio presets in the Sampler project.

## Authors

- **[Stevenson JULES]**
- **[Bastian Holzer]**

## Features

### Required (all implemented)

- [x] **Preset list**: Display all presets with their type and number of sounds
- [x] **Preset editing**: Modify name, type and sample list
- [x] **Renaming**: Ability to rename an existing preset

### Optional (implemented)

- [x] **Preset deletion**: Deletion with confirmation
- [x] **Preset creation**: Form to create a new preset with name, type and sound URLs

### Not implemented

- [ ] Audio file upload during preset creation

## Technologies used

- **Angular 21** with standalone components
- **Angular Material** for the user interface
- **RxJS** for HTTP request management
- **TypeScript 5.9**

## Project structure

```
src/app/
├── presets/                    # Preset list page
│   ├── presets.component.ts
│   ├── presets.component.html
│   └── presets.component.css
├── preset-detail/              # Preset editing page
│   ├── preset-detail.component.ts
│   ├── preset-detail.component.html
│   └── preset-detail.component.css
├── add-preset/                 # Preset creation page
│   ├── add-preset.component.ts
│   ├── add-preset.component.html
│   └── add-preset.component.css
├── shared/                     # Shared services and models
│   ├── preset.model.ts         # Preset and Sample models
│   └── presets.service.ts      # HTTP service for the API
├── app.routes.ts               # Route configuration
├── app.config.ts               # Application configuration
└── app.component.ts            # Root component
```

## Installation

### Prerequisites

- **Node.js** v20.19+ or v22.12+ (required for Angular 21)
- **npm** v10+

### Steps

```bash
# Clone the repository
git clone <git@github.com:basti075/WebAudio.git>
cd preset-manager

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be accessible at `http://localhost:4200`

## Backend configuration

The service uses the backend API deployed on Render:

```typescript
// src/app/shared/presets.service.ts
private apiUrl = 'https://webaudio-22k9.onrender.com/api';
```

## Application routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/presets` |
| `/presets` | List of all presets |
| `/presets/new` | Creation form |
| `/presets/:name` | Edit a preset |

## Backend API used

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/presets` | List all presets |
| GET | `/api/presets/:name` | Retrieve a preset |
| POST | `/api/presets` | Create a new preset |
| PUT | `/api/presets/:name` | Update a preset |
| DELETE | `/api/presets/:name` | Delete a preset |

## Available scripts

```bash
npm start       # Start the development server
npm run build   # Production build
npm test        # Run unit tests
