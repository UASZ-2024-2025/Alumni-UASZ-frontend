import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { Accueil } from './accueil';

describe('Accueil', () => {
  const monter = (role: string, compteur: unknown) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthentificationService, useValue: { role: () => role, utilisateur: () => ({ firstName: 'Awa', companyId: 'c1' }) } },
        { provide: OffersService, useValue: { searchOffers: () => of({ totalElements: 7 }) } },
        { provide: ApplicationsService, useValue: { listMyApplications: () => of({ totalElements: 3 }) } },
        { provide: NotificationsService, useValue: { getUnreadNotificationCount: () => compteur } },
      ],
    });
    const fixture = TestBed.createComponent(Accueil);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('salue l’utilisateur, affiche le compteur et les raccourcis de son rôle', () => {
    const el = monter('ETUDIANT', of({ unreadCount: 4 }));
    expect(el.querySelector('h1')!.textContent).toContain('Awa');
    expect(el.querySelector('app-carte-stat')!.textContent).toContain('4');
    const liens = [...el.querySelectorAll('a')].map((a) => a.textContent!.trim());
    expect(liens).toContain('Mon CV');
    expect(liens).not.toContain('Notifications');
    const stats = [...el.querySelectorAll('app-carte-stat')].map((c) => c.textContent!.replace(/\s+/g, ' '));
    expect(stats.some((t) => t.includes('Mes candidatures') && t.includes('3'))).toBe(true);
    expect(stats.some((t) => t.includes('Offres ouvertes') && t.includes('7'))).toBe(true);
  });

  it('adapte les raccourcis à l’entreprise', () => {
    const el = monter('ENTREPRISE', of({ unreadCount: 0 }));
    expect([...el.querySelectorAll('a')].map((a) => a.textContent!.trim())).toContain('Publier une offre');
  });

  it('signale l’erreur de chargement', () => {
    const el = monter('ALUMNI', throwError(() => new ErreurApi(500, 'X', 'Service indisponible')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Service indisponible');
  });
});
