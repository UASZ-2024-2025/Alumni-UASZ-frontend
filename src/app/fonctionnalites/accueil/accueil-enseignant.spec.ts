import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { AnalyticsReportsService } from '../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../api/generes/analyses-correspondances/api/dashboard.service';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { ApplicationsService } from '../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../api/generes/offres-emploi/api/offers.service';
import { UsersService } from '../../api/generes/utilisateurs/api/users.service';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';
import { Accueil } from './accueil';
import { AccueilEnseignant } from './accueil-enseignant';

/** Faux services : le tableau de bord commun les injecte, mais ne les appelle pas tant que ALUM-182 n'est pas livré. */
const fauxServices = [
  { provide: DashboardService, useValue: {} },
  { provide: AnalyticsReportsService, useValue: {} },
  { provide: UsersService, useValue: {} },
];

describe('AccueilEnseignant', () => {
  const monter = (compteur: unknown) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthentificationService, useValue: { role: () => 'ENSEIGNANT', utilisateur: () => ({ firstName: 'Moussa' }) } },
        { provide: NotificationsService, useValue: { getUnreadNotificationCount: () => compteur } },
        ...fauxServices,
      ],
    });
    const fixture = TestBed.createComponent(AccueilEnseignant);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('salue l’enseignant, affiche les notifications et un raccourci', () => {
    const el = monter(of({ unreadCount: 5 }));
    expect(el.querySelector('.salutation')!.textContent).toContain('Moussa');
    expect(el.querySelector('app-carte-stat')!.textContent).toContain('5');
    expect(el.textContent).toContain('Consulter l’annuaire');
  });

  it('affiche un état vide tant que les statistiques ne sont pas ouvertes aux enseignants', () => {
    const el = monter(of({ unreadCount: 0 }));
    expect(el.textContent).toContain('Statistiques bientôt disponibles');
    expect(el.querySelector('app-etat-vide')).not.toBeNull();
  });

  it('affiche un indicateur pendant le chargement', () => {
    const el = monter(NEVER);
    expect(el.querySelector('app-spinner')).not.toBeNull();
  });

  it('signale l’erreur de chargement avec un bouton Réessayer', () => {
    const el = monter(throwError(() => new ErreurApi(500, 'X', 'Service indisponible')));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Service indisponible');
    expect(el.textContent).toContain('Réessayer');
  });
});

describe('Accueil : affichage selon le rôle', () => {
  const monter = (role: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthentificationService, useValue: { role: () => role, utilisateur: () => ({ firstName: 'Awa' }) } },
        { provide: OffersService, useValue: { searchOffers: () => of({ totalElements: 7, content: [] }) } },
        { provide: ApplicationsService, useValue: { listMyApplications: () => of({ totalElements: 3 }) } },
        { provide: NotificationsService, useValue: { getUnreadNotificationCount: () => of({ unreadCount: 1 }) } },
        ...fauxServices,
      ],
    });
    const fixture = TestBed.createComponent(Accueil);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('montre la page enseignant uniquement pour le rôle ENSEIGNANT', () => {
    expect(monter('ENSEIGNANT').querySelector('app-accueil-enseignant')).not.toBeNull();
  });

  it('ne montre pas la page enseignant aux autres rôles', () => {
    TestBed.resetTestingModule();
    expect(monter('ETUDIANT').querySelector('app-accueil-enseignant')).toBeNull();
  });
});

