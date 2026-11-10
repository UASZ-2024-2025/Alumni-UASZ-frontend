import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BASE_PATH } from '../../api/generes/utilisateurs/variables';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { erreurInterceptor } from './erreur.interceptor';
import { jetonInterceptor } from './jeton.interceptor';
import { renouvellementInterceptor } from './renouvellement.interceptor';
import { environment } from '../../../environments/environment';

const BASE = environment.urlsApi.utilisateurs;
const utilisateur = { id: 'u1', email: 'a@b.sn', role: 'ALUMNI' } as const;
const session = (acc: string, ref: string, expireLe = Date.now() + 900_000) => ({
  accessToken: acc, refreshToken: ref, expireLe, utilisateur,
});

describe('session HTTP', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthentificationService;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('alumni.session', JSON.stringify(session('acc1', 'ref1')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([erreurInterceptor, jetonInterceptor, renouvellementInterceptor])),
        provideHttpClientTesting(),
        { provide: BASE_PATH, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthentificationService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
  });
  afterEach(() => { ctrl.verify(); localStorage.clear(); });

  const authResp = (acc: string, ref: string) => ({ accessToken: acc, refreshToken: ref, expiresIn: 900, user: utilisateur });

  it('401 -> refresh -> rejeu avec le nouveau jeton', () => {
    let ok: unknown;
    http.get(`${BASE}/users/u1`).subscribe((r) => (ok = r));
    const r1 = ctrl.expectOne(`${BASE}/users/u1`);
    expect(r1.request.headers.get('Authorization')).toBe('Bearer acc1');
    r1.flush({ code: 'UNAUTHORIZED' }, { status: 401, statusText: 'x' });
    ctrl.expectOne(`${BASE}/auth/refresh-token`).flush(authResp('acc2', 'ref2'));
    const r2 = ctrl.expectOne(`${BASE}/users/u1`);
    expect(r2.request.headers.get('Authorization')).toBe('Bearer acc2');
    r2.flush({ id: 'u1' });
    expect(ok).toEqual({ id: 'u1' });
    expect(auth.estConnecte()).toBe(true);
  });

  it('3 requêtes 401 simultanées -> un seul refresh', () => {
    for (let i = 0; i < 3; i++) http.get(`${BASE}/users/${i}`).subscribe();
    ctrl.match((q) => q.url.includes('/users/')).forEach((r) => r.flush({}, { status: 401, statusText: 'x' }));
    ctrl.expectOne(`${BASE}/auth/refresh-token`).flush(authResp('acc2', 'ref2'));
    ctrl.match((q) => q.url.includes('/users/')).forEach((r) => r.flush({}));
  });

  it("un échec du REJEU (404) ne ferme pas la session", () => {
    let err: ErreurApi | undefined;
    http.get(`${BASE}/users/u1`).subscribe({ error: (e) => (err = e) });
    ctrl.expectOne(`${BASE}/users/u1`).flush({}, { status: 401, statusText: 'x' });
    ctrl.expectOne(`${BASE}/auth/refresh-token`).flush(authResp('acc2', 'ref2'));
    ctrl.expectOne(`${BASE}/users/u1`).flush({ code: 'USER_NOT_FOUND', message: 'nf' }, { status: 404, statusText: 'x' });
    expect(err?.statut).toBe(404);
    expect(auth.estConnecte()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refresh refusé (401) -> session fermée', () => {
    http.get(`${BASE}/users/u1`).subscribe({ error: () => {} });
    ctrl.expectOne(`${BASE}/users/u1`).flush({}, { status: 401, statusText: 'x' });
    ctrl.expectOne(`${BASE}/auth/refresh-token`).flush({ code: 'INVALID_REFRESH_TOKEN' }, { status: 401, statusText: 'x' });
    expect(auth.estConnecte()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/connexion'], { queryParams: { info: 'session-expiree' } });
  });

  it('panne réseau pendant le refresh -> session conservée', () => {
    http.get(`${BASE}/users/u1`).subscribe({ error: () => {} });
    ctrl.expectOne(`${BASE}/users/u1`).flush({}, { status: 401, statusText: 'x' });
    ctrl.expectOne(`${BASE}/auth/refresh-token`).error(new ProgressEvent('error'));
    expect(auth.estConnecte()).toBe(true);
  });

  it('401 sur une route publique (login) : pas de refresh, pas de Bearer', () => {
    http.post(`${BASE}/auth/login`, {}).subscribe({ error: () => {} });
    const r = ctrl.expectOne(`${BASE}/auth/login`);
    expect(r.request.headers.has('Authorization')).toBe(false);
    r.flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'x' });
    expect(auth.estConnecte()).toBe(true);
  });

  it('déconnexion avec jeton valide : logout avec Bearer explicite et refresh token courant', () => {
    auth.deconnecter();
    expect(auth.estConnecte()).toBe(false);
    const r = ctrl.expectOne(`${BASE}/auth/logout`);
    expect(r.request.headers.get('Authorization')).toBe('Bearer acc1');
    expect(r.request.body).toEqual({ refreshToken: 'ref1' });
    r.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('déconnexion avec jeton expiré : refresh puis logout du NOUVEAU refresh token', () => {
    localStorage.setItem('alumni.session', JSON.stringify(session('old', 'ref1', Date.now() - 1000)));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([erreurInterceptor, jetonInterceptor, renouvellementInterceptor])), provideHttpClientTesting(), { provide: BASE_PATH, useValue: BASE }],
    });
    const c = TestBed.inject(HttpTestingController);
    const a = TestBed.inject(AuthentificationService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    a.deconnecter();
    c.expectOne(`${BASE}/auth/refresh-token`).flush(authResp('acc9', 'ref9'));
    const l = c.expectOne(`${BASE}/auth/logout`);
    expect(l.request.headers.get('Authorization')).toBe('Bearer acc9');
    expect(l.request.body).toEqual({ refreshToken: 'ref9' });
    l.flush(null, { status: 204, statusText: 'No Content' });
    c.verify();
  });

  it('changement de mot de passe : succès -> session fermée', () => {
    auth.changerMotDePasse('Ancien123', 'Nouveau123').subscribe();
    const r = ctrl.expectOne(`${BASE}/auth/change-password`);
    expect(r.request.headers.get('Authorization')).toBe('Bearer acc1');
    r.flush({ message: 'ok' });
    expect(auth.estConnecte()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/connexion'], { queryParams: { info: 'mot-de-passe-modifie' } });
  });
});
