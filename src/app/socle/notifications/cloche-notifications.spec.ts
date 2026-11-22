import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Notification } from '../../api/generes/notifications-messagerie/model/notification';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../authentification/services/authentification.service';
import { ClocheNotifications } from './cloche-notifications';
import { CentreNotificationsService, INTERVALLE_POLLING_MS } from './centre-notifications.service';

const statut: Notification = { id: 'n1', type: 'APPLICATION_STATUS_CHANGED', title: 'Candidature mise à jour', content: 'En cours d’examen', isRead: false, createdAt: '2026-11-18T09:30:00Z' };
const alerte: Notification = { id: 'n2', type: 'SYSTEM_ALERT', title: 'Maintenance', isRead: false, createdAt: '2026-11-17T09:30:00Z' };
const ancienne: Notification = { id: 'n3', type: 'MESSAGE_RECEIVED', title: 'Ancien message', isRead: true, createdAt: '2026-11-01T09:30:00Z' };

describe('ClocheNotifications', () => {
  let api: {
    getUnreadNotificationCount: ReturnType<typeof vi.fn>;
    getUserNotifications: ReturnType<typeof vi.fn>;
    markNotificationAsRead: ReturnType<typeof vi.fn>;
    markAllNotificationsAsRead: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<ClocheNotifications>;
  let el: HTMLElement;

  const bouton = () => el.querySelector<HTMLButtonElement>('.cloche button')!;
  const panneau = () => el.querySelector('.panneau');
  const elements = () => [...el.querySelectorAll<HTMLElement>('.element')];
  const boutonsElements = () => [...el.querySelectorAll<HTMLButtonElement>('.element button')];
  const ouvrir = () => {
    bouton().click();
    fixture.detectChanges();
  };
  /** Laisse passer un tour de polling. */
  const tourDePolling = (ms = INTERVALLE_POLLING_MS) => {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      getUnreadNotificationCount: vi.fn(() => of({ unreadCount: 2 })),
      getUserNotifications: vi.fn(() => of({ content: [statut, alerte, ancienne], totalElements: 3 })),
      markNotificationAsRead: vi.fn((id: string) => of({ id, isRead: true })),
      markAllNotificationsAsRead: vi.fn(() => of(null)),
    };
    router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationsService, useValue: api },
        { provide: Router, useValue: router },
        { provide: AuthentificationService, useValue: { role: () => 'ETUDIANT' } },
      ],
    });
    fixture = TestBed.createComponent(ClocheNotifications);
    fixture.detectChanges();
    el = fixture.nativeElement;
    tourDePolling(1); // premier relevé du compteur
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  describe('compteur', () => {
    it('affiche le nombre de notifications non lues et le dit aux lecteurs d’écran', () => {
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('2');
      expect(bouton().getAttribute('aria-label')).toBe('Notifications, 2 non lues');
    });

    it('accorde le libellé au singulier', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 1 }));
      tourDePolling();
      expect(bouton().getAttribute('aria-label')).toBe('Notifications, 1 non lue');
    });

    it('n’affiche aucune pastille quand tout est lu', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 0 }));
      tourDePolling();
      expect(el.querySelector('.compteur')).toBeNull();
      expect(bouton().getAttribute('aria-label')).toBe('Notifications');
    });

    it('plafonne l’affichage à 99+', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 250 }));
      tourDePolling();
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('99+');
    });

    it('met le compteur à jour tout seul quand un nouveau message arrive, sans recharger', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 3 }));
      tourDePolling();
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('3');
    });

    it('garde le compteur affiché quand le polling échoue', () => {
      api.getUnreadNotificationCount.mockReturnValue(throwError(() => new ErreurApi(0, 'NETWORK', 'Serveur injoignable')));
      tourDePolling();
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('2');
    });

    it('arrête le polling quand la cloche est détruite (déconnexion)', () => {
      const appels = api.getUnreadNotificationCount.mock.calls.length;
      fixture.destroy();
      vi.advanceTimersByTime(INTERVALLE_POLLING_MS * 2);
      expect(api.getUnreadNotificationCount.mock.calls.length).toBe(appels);
      expect(TestBed.inject(CentreNotificationsService).nonLus()).toBe(0);
    });
  });

  describe('panneau', () => {
    it('est fermé au départ', () => {
      expect(panneau()).toBeNull();
      expect(bouton().getAttribute('aria-expanded')).toBe('false');
    });

    it('s’ouvre au clic et liste les notifications, les non lues en évidence', () => {
      ouvrir();
      expect(bouton().getAttribute('aria-expanded')).toBe('true');
      expect(api.getUserNotifications).toHaveBeenCalledTimes(1);
      expect(elements()).toHaveLength(3);
      expect(elements()[0].textContent).toContain('Candidature mise à jour');
      expect(elements()[0].textContent).toContain('En cours d’examen');
      expect(elements().map((e) => e.classList.contains('non-lue'))).toEqual([true, true, false]);
    });

    it('se referme au deuxième clic sur la cloche', () => {
      ouvrir();
      ouvrir();
      expect(panneau()).toBeNull();
    });

    it('se referme avec Échap', () => {
      ouvrir();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(panneau()).toBeNull();
    });

    it('se referme au clic à l’extérieur mais pas à l’intérieur', () => {
      ouvrir();
      panneau()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(panneau()).not.toBeNull();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(panneau()).toBeNull();
    });

    it('affiche un état vide quand il n’y a aucune notification', () => {
      api.getUserNotifications.mockReturnValue(of({ content: [], totalElements: 0 }));
      ouvrir();
      expect(el.textContent).toContain('Aucune notification');
    });

    it('affiche l’erreur de chargement (401, 500…) au lieu de la liste', () => {
      api.getUserNotifications.mockReturnValue(throwError(() => new ErreurApi(500, 'X', 'Service indisponible')));
      ouvrir();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Service indisponible');
      expect(elements()).toHaveLength(0);
    });

    it('recharge la liste quand un nouveau message arrive panneau ouvert', () => {
      ouvrir();
      expect(api.getUserNotifications).toHaveBeenCalledTimes(1);

      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 3 }));
      tourDePolling();

      expect(api.getUserNotifications).toHaveBeenCalledTimes(2);
    });

    it('ne recharge pas la liste quand le compteur baisse', () => {
      ouvrir();
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 1 }));
      tourDePolling();
      expect(api.getUserNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('tout marquer comme lu', () => {
    it('vide le compteur et retire la mise en évidence', () => {
      ouvrir();
      const action = [...el.querySelectorAll<HTMLButtonElement>('.panneau-entete button')].find((b) => b.textContent?.includes('Tout marquer'))!;
      action.click();
      fixture.detectChanges();

      expect(api.markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
      expect(el.querySelector('.compteur')).toBeNull();
      expect(elements().some((e) => e.classList.contains('non-lue'))).toBe(false);
    });

    it('est désactivé quand il n’y a rien de non lu', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 0 }));
      tourDePolling();
      ouvrir();
      const action = [...el.querySelectorAll<HTMLButtonElement>('.panneau-entete button')].find((b) => b.textContent?.includes('Tout marquer'))!;
      expect(action.disabled).toBe(true);
    });

    it('affiche l’erreur et garde le compteur si le back refuse', () => {
      api.markAllNotificationsAsRead.mockReturnValue(throwError(() => new ErreurApi(401, 'TOKEN_EXPIRED', 'Session expirée')));
      ouvrir();
      [...el.querySelectorAll<HTMLButtonElement>('.panneau-entete button')].find((b) => b.textContent?.includes('Tout marquer'))!.click();
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Session expirée');
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('2');
    });
  });

  describe('lien vers l’élément concerné', () => {
    it('marque la notification comme lue, ouvre l’écran concerné et ferme le panneau', () => {
      ouvrir();
      boutonsElements()[0].click();
      fixture.detectChanges();

      expect(api.markNotificationAsRead).toHaveBeenCalledWith('n1');
      expect(router.navigateByUrl).toHaveBeenCalledWith('/candidatures');
      expect(panneau()).toBeNull();
      expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('1');
    });

    it('ne rappelle pas le back pour une notification déjà lue, mais navigue quand même', () => {
      ouvrir();
      boutonsElements()[2].click();
      expect(api.markNotificationAsRead).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/messagerie');
    });

    it('ne navigue pas pour une notification sans destination (alerte système)', () => {
      ouvrir();
      boutonsElements()[1].click();
      expect(api.markNotificationAsRead).toHaveBeenCalledWith('n2');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
