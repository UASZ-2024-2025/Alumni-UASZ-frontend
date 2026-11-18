import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { Statistiques } from './pages/statistiques';
import { STATISTIQUES_ROUTES } from './statistiques.routes';

describe('Accès à /statistiques (ALUM-187)', () => {
  const route = STATISTIQUES_ROUTES[0];
  const tester = (role: string | null) => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthentificationService, useValue: { role: signal(role) } }] });
    const snapshot = { data: route.data } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => (route.canActivate![0] as any)(snapshot, {}));
  };

  it.each(['ENSEIGNANT', 'ADMINISTRATEUR'])('laisse passer %s', (role) => {
    expect(tester(role)).toBe(true);
  });

  it.each(['ETUDIANT', 'ALUMNI', null])('redirige %s vers /acces-refuse', (role) => {
    const resultat = tester(role);
    expect(resultat).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultat)).toBe('/acces-refuse');
  });

  it("charge la vraie page, plus la page en construction", async () => {
    const composant = await (route.loadComponent as () => Promise<unknown>)();
    expect(composant).toBe(Statistiques);
  });
});
