import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { PresetsService } from '../shared/presets.service';
import { Preset } from '../shared/preset.model';

@Component({
  selector: 'app-presets',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './presets.component.html',
  styleUrl: './presets.component.css'
})
export class PresetsComponent implements OnInit {
  presets: Preset[] = [];
  loading = true;

  constructor(private presetsService: PresetsService) {}

  ngOnInit(): void {
    this.getPresets();
  }

  /**
   * Récupérer la liste des presets depuis l'API
   */
  getPresets(): void {
    this.loading = true;
    this.presetsService.getPresets()
      .subscribe((data: Preset[]) => {
        console.log('Données reçues:', data);

        // L'API retourne directement un tableau de presets
        if (data && Array.isArray(data)) {
          this.presets = data;
          console.log('Presets disponibles:', this.presets);
        }

        this.loading = false;
      });
  }

  /**
   * Supprimer un preset
   */
  deletePreset(preset: Preset): void {
    if (confirm(`Voulez-vous vraiment supprimer le preset "${preset.name}" ?`)) {
      this.presetsService.deletePreset(preset.name)
        .subscribe(response => {
          console.log('Preset supprimé:', response);
          // Recharger la liste
          this.getPresets();
        });
    }
  }

  /**
   * Obtenir le type/catégorie du preset
   */
  getPresetType(preset: Preset): string {
    return preset.type || preset.category || 'Non classé';
  }
}
