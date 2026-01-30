import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { PresetsService } from '../shared/presets.service';
import { Preset, Sample } from '../shared/preset.model';

@Component({
  selector: 'app-add-preset',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './add-preset.component.html',
  styleUrl: './add-preset.component.css'
})
export class AddPresetComponent {
  // Champs du formulaire
  newPresetName: string = '';
  newPresetType: string = '';
  newSamples: Sample[] = [{ url: '', name: '' }];

  constructor(
    private presetsService: PresetsService,
    private router: Router
  ) {}

  /**
   * Ajouter un nouveau champ pour un son
   */
  addSampleField(): void {
    this.newSamples.push({ url: '', name: '' });
  }

  /**
   * Supprimer un champ de son
   */
  removeSampleField(index: number): void {
    if (this.newSamples.length > 1) {
      this.newSamples.splice(index, 1);
    }
  }

  /**
   * Créer le nouveau preset
   */
  onCreate(): void {
    // Validation
    if (!this.newPresetName.trim()) {
      alert('Le nom du preset est obligatoire !');
      return;
    }

    // Filtrer les samples vides
    const validSamples = this.newSamples.filter(s => s.url.trim() !== '');

    if (validSamples.length === 0) {
      alert('Veuillez ajouter au moins un son !');
      return;
    }

    // Créer l'objet Preset (isFactoryPresets = false pour les presets créés par l'utilisateur)
    const newPreset = new Preset(
      this.newPresetName.trim(),
      validSamples,
      this.newPresetType.trim() || undefined,
      false // isFactoryPresets
    );

    // Envoyer au serveur
    this.presetsService.addPreset(newPreset)
      .subscribe(response => {
        console.log('Preset créé:', response);
        alert('Preset créé avec succès !');
        this.router.navigate(['/presets']);
      });
  }

  /**
   * Annuler et retourner à la liste
   */
  onCancel(): void {
    this.router.navigate(['/presets']);
  }
}
