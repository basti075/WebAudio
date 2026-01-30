import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Preset } from './preset.model';

@Injectable({
  providedIn: 'root'
})
export class PresetsService {
  // URL de l'API backend
  // IMPORTANT : Change cette URL selon ton environnement
  // - En local : 'http://localhost:3000'
  // - En production : 'https://webaudio-22k9.onrender.com'
  private apiUrl = 'https://webaudio-22k9.onrender.com/api';

  constructor(private http: HttpClient) { }

  // ------------------------------
  // MÉTHODES CRUD
  // ------------------------------

  /**
   * GET - Récupérer tous les presets
   * Endpoint: GET /presets
   */
  getPresets(): Observable<Preset[]> {
    return this.http.get<Preset[]>(this.apiUrl + '/presets')
      .pipe(
        tap(data => console.log('Presets récupérés:', data)),
        catchError(this.handleError<Preset[]>('getPresets', []))
      );
  }

  /**
   * GET - Récupérer un preset spécifique par son nom
   * Endpoint: GET /presets/:name
   */
  getPreset(name: string): Observable<Preset> {
    return this.http.get<Preset>(this.apiUrl + '/presets/' + name)
      .pipe(
        tap(data => console.log('Preset récupéré:', data)),
        catchError(this.handleError<Preset>('getPreset avec name=' + name))
      );
  }

  /**
   * POST - Créer un nouveau preset
   * Endpoint: POST /presets
   * Body: { name, samples, category }
   */
  addPreset(preset: Preset): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/presets', preset)
      .pipe(
        tap(response => console.log('Preset créé:', response)),
        catchError(this.handleError<any>('addPreset'))
      );
  }

  /**
   * PUT - Mettre à jour un preset existant
   * Endpoint: PUT /presets/:name
   * Body: { name, samples, category }
   */
  updatePreset(oldName: string, preset: Preset): Observable<any> {
    return this.http.put<any>(this.apiUrl + '/presets/' + oldName, preset)
      .pipe(
        tap(response => console.log('Preset mis à jour:', response)),
        catchError(this.handleError<any>('updatePreset'))
      );
  }

  /**
   * DELETE - Supprimer un preset
   * Endpoint: DELETE /presets/:name
   */
  deletePreset(name: string): Observable<any> {
    return this.http.delete<any>(this.apiUrl + '/presets/' + name)
      .pipe(
        tap(response => console.log('Preset supprimé:', response)),
        catchError(this.handleError<any>('deletePreset'))
      );
  }

  // ------------------------------
  // GESTION DES ERREURS
  // ------------------------------

  /**
   * Gestionnaire d'erreurs générique
   * Inspiré du cours Angular (voir cours sur les Observables)
   */
  private handleError<T>(operation: any, result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} a échoué:`, error);

      // Afficher l'erreur à l'utilisateur
      const errorMsg = error?.error?.error || error?.error?.errors?.join(', ') || error?.message || 'Erreur inconnue';
      alert(`Erreur: ${errorMsg}`);

      // Retourner un résultat par défaut pour que l'app continue
      return of(result as T);
    };
  }
}
