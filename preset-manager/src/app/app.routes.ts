import { Routes } from '@angular/router';
import { PresetsComponent } from './presets/presets.component';
import { PresetDetailComponent } from './preset-detail/preset-detail.component';
import { AddPresetComponent } from './add-preset/add-preset.component';

export const routes: Routes = [
  // Route par défaut : redirige vers /presets
  { path: '', redirectTo: '/presets', pathMatch: 'full' },
  
  // Route pour la liste des presets
  { path: 'presets', component: PresetsComponent },
  
  // Route pour créer un nouveau preset
  { path: 'presets/new', component: AddPresetComponent },
  
  // Route pour voir/éditer un preset spécifique
  { path: 'presets/:name', component: PresetDetailComponent },
  
  // Route 404 - redirection vers la liste
  { path: '**', redirectTo: '/presets' }
];
