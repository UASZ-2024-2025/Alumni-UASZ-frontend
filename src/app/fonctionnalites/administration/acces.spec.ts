import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Route, Router, UrlTree } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

function routeAdministration(): Route {
  const trouvee = routes
    .flatMap((r) => r.children ?? [])
    .find((r) => r.path === 'administration');
  return trouvee!;
}

describe("Accès à /administration (critère d'acceptation AL-51)", () => {
  const tester = (role: string | null) => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthentificationService, useValue: { role: signal(role) } }],
    });
    const route = routeAdministration();
    const snapshot = { data: route.data } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => (route.canActivate![0] as any)(snapshot, {}));
  };

  it('est déclarée avec une garde de rôle limitée à ADMINISTRATEUR', () => {
    expect(routeAdministration().data).toEqual({ roles: ['ADMINISTRATEUR'] });
  });

  it("laisse passer l'administrateur", () => {
    expect(tester('ADMINISTRATEUR')).toBe(true);
  });

  it.each(['ENSEIGNANT', 'ALUMNI', null])('redirige %s vers /', (role) => {
    const resultat = tester(role);
    expect(resultat).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultat)).toBe('/acces-refuse');
  });
});
