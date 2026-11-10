import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthService as AuthApi } from '../../../api/generes/utilisateurs/api/auth.service';
import { AuthResponse } from '../../../api/generes/utilisateurs/model/authResponse';
import { MessageResponse } from '../../../api/generes/utilisateurs/model/messageResponse';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { JETON_IMPOSE, SANS_RENOUVELLEMENT } from '../../intercepteurs-http/contexte-http';
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
  readonly estAdministrateur = computed(() => this.role() === 'ADMINISTRATEUR');

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

  /**
   * Efface la session locale tout de suite (l'écran ne dépend pas du réseau), puis révoque le refresh
   * token côté serveur en meilleur effort. Le jeton d'accès est passé explicitement : la session locale
   * n'existe plus au moment de l'appel. S'il est expiré, on en obtient un nouveau d'abord, sinon le
   * logout recevrait un 401 et le refresh token resterait valide côté serveur.
   */
  deconnecter(): void {
    const s = this._session();
    this.terminerSessionLocale();
    if (!s) return;

    const contexte = (jeton: string) =>
      new HttpContext().set(JETON_IMPOSE, jeton).set(SANS_RENOUVELLEMENT, true);
    const logout = (access: string, refresh: string) =>
      this.api.logoutUser({ refreshToken: refresh }, 'body', false, { context: contexte(access) });

    const accessValide = s.expireLe - Date.now() > 5_000;
    const requete$ = accessValide
      ? logout(s.accessToken, s.refreshToken)
      : this.api
          .refreshToken({ refreshToken: s.refreshToken })
          .pipe(switchMap((r) => logout(r.accessToken!, r.refreshToken!)));

    requete$.subscribe({ error: () => {} });
  }

  /** Changement de mot de passe : le back révoque toutes les sessions, on repasse donc par la connexion. */
  changerMotDePasse(currentPassword: string, newPassword: string): Observable<MessageResponse> {
    return this.api
      .changePassword({ currentPassword, newPassword })
      .pipe(tap(() => this.terminerSessionLocale('mot-de-passe-modifie')));
  }

  /** Met à jour l'utilisateur affiché (ex. : après modification du profil). */
  mettreAJourUtilisateur(utilisateur: User): void {
    const s = this._session();
    if (s) this.sauvegarder({ ...s, utilisateur });
  }

  terminerSessionLocale(info?: 'session-expiree' | 'mot-de-passe-modifie'): void {
    this.jetons.effacer();
    this._session.set(null);
    this.router.navigate(['/connexion'], info ? { queryParams: { info } } : {});
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