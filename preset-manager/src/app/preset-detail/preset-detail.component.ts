import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { PresetsService } from '../shared/presets.service';
import { Preset, Sample } from '../shared/preset.model';

@Component({
  selector: 'app-preset-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './preset-detail.component.html',
  styleUrl: './preset-detail.component.css'
})
export class PresetDetailComponent implements OnInit {
  preset?: Preset;
  originalName: string = '';

  // Pour le formulaire
  editedName: string = '';
  editedType: string = '';
  editedSamples: Sample[] = [];

  loading = true;

  constructor(
    private presetsService: PresetsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getPreset();
  }

  /**
   * Récupérer les détails du preset
   */
  getPreset(): void {
    // Récupérer le nom du preset depuis l'URL
    const name = this.route.snapshot.params['name'];
    this.originalName = name;

    this.loading = true;
    this.presetsService.getPreset(name)
      .subscribe(preset => {
        if (preset) {
          this.preset = preset;
          this.editedName = preset.name;
          this.editedType = preset.type || '';
          this.editedSamples = preset.samples.map(s => ({ ...s }));
        }
        this.loading = false;
      });
  }

  /**
   * Sauvegarder les modifications
   */
  onSave(): void {
    if (!this.editedName.trim()) {
      alert('Le nom du preset est obligatoire !');
      return;
    }

    // Préserver isFactoryPresets de l'original
    const isFactory = this.preset?.isFactoryPresets ?? false;

    const updatedPreset = new Preset(
      this.editedName,
      this.editedSamples,
      this.editedType,
      isFactory
    );

    this.presetsService.updatePreset(this.originalName, updatedPreset)
      .subscribe(response => {
        console.log('Preset mis à jour:', response);
        alert('Preset mis à jour avec succès !');
        this.router.navigate(['/presets']);
      });
  }

  /**
   * Ajouter un nouveau son à la liste
   */
  addSample(): void {
    this.editedSamples.push({ url: '', name: '' });
  }

  /**
   * Supprimer un son de la liste
   */
  removeSample(index: number): void {
    this.editedSamples.splice(index, 1);
  }

  /**
   * Annuler et retourner à la liste
   */
  onCancel(): void {
    this.router.navigate(['/presets']);
  }
}
