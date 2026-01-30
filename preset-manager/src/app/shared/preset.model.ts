// Modèle pour représenter un Sample
export interface Sample {
  url: string;
  name: string;
}

// Modèle pour représenter un Preset
export class Preset {
  name!: string;              // Nom du preset (ex: "808", "Basic Kit")
  type?: string;              // Type/catégorie (ex: "Drumkit", "Piano")
  category?: string;          // Alias pour compatibilité
  isFactoryPresets: boolean = false; // Preset d'usine ou custom (requis par l'API)
  samples!: Sample[];         // Tableau des samples avec url et name

  // Constructeur pour initialiser facilement
  constructor(name: string, samples: Sample[], type?: string, isFactoryPresets: boolean = false) {
    this.name = name;
    this.samples = samples;
    this.type = type;
    this.category = type;
    this.isFactoryPresets = isFactoryPresets;
  }
}
