import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './connexion.html',
})
export class Connexion {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthentificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly formulaire = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly erreur = signal<ErreurApi | null>(null);
  protected readonly chargement = signal(false);
  protected readonly info = this.route.snapshot.queryParamMap.get('info');

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    const { email, password } = this.formulaire.getRawValue();

    this.auth.connecter(email, password).subscribe({
      next: () => {
        const cible = this.route.snapshot.queryParamMap.get('redirection');
        const sure = cible && cible.startsWith('/') && !cible.startsWith('//') ? cible : '/';
        this.router.navigateByUrl(sure);
      },
      error: (e: unknown) => {
        this.chargement.set(false);
        this.erreur.set(
          e instanceof ErreurApi ? e : new ErreurApi(0, 'ERREUR_INCONNUE', 'Une erreur est survenue.'),
        );
      },
    });
  }
}
