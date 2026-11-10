import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { AuthService as AuthApi } from '../../../api/generes/utilisateurs/api/auth.service';
import { AuthResponse } from '../../../api/generes/utilisateurs/model/authResponse';
import { Session, RoleApplicatif } from '../modeles/session.model';
import { JetonService } from '../stockage/jeton.service';

@Injectable({ providedIn: 'root' })
export class AuthentificationService {
  private readonly api = inject(AuthApi);
  private readonly jetons = inject(JetonService);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(this.jetons.lire());
  readonly session = this._session.asReadonly();
  readonly estConnecte = computed(() => this._session() !== null);
  readonly utilisateur = computed(() => this._session()?.utilisateur ?? null);
  readonly role = computed(() => this._session()?.utilisateur.role as RoleApplicatif | undefined);

  // partage un seul refresh entre plusieurs requêtes 401 simultanées
  private refreshEnCours$?: Observable<Session>;

  get accessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }

  connecter(email: string, password: string): Observable<Session> {
    return this.api.loginUser({ email, password }).pipe(
      map((r) => this.versSession(r)),
      tap((s) => this.sauvegarder(s)),
    );
  }

  rafraichir(): Observable<Session> {
    if (!this.refreshEnCours$) {
      const refreshToken = this._session()?.refreshToken;
      if (!refreshToken) return throwError(() => new Error('Aucun refresh token'));

      this.refreshEnCours$ = this.api.refreshToken({ refreshToken }).pipe(
        map((r) => this.versSession(r, this._session()?.utilisateur)),
        tap((s) => this.sauvegarder(s)),
        finalize(() => (this.refreshEnCours$ = undefined)),
        shareReplay(1),
      );
    }
    return this.refreshEnCours$;
  }

  deconnecter(): void {
    const refreshToken = this._session()?.refreshToken;
    if (refreshToken) {
      // meilleur effort : on ignore l'échec, la session locale est effacée dans tous les cas
      this.api.logoutUser({ refreshToken }).subscribe({ error: () => {} });
    }
    this.terminerSessionLocale();
  }

  terminerSessionLocale(): void {
    this.jetons.effacer();
    this._session.set(null);
    this.router.navigate(['/connexion']);
  }

  private versSession(r: AuthResponse, utilisateurParDefaut?: Session['utilisateur']): Session {
    return {
      accessToken: r.accessToken!,
      refreshToken: r.refreshToken!,
      expireLe: Date.now() + (r.expiresIn ?? 0) * 1000,
      utilisateur: r.user ?? utilisateurParDefaut!,
    };
  }

  private sauvegarder(s: Session): void {
    this.jetons.enregistrer(s);
    this._session.set(s);
  }
}