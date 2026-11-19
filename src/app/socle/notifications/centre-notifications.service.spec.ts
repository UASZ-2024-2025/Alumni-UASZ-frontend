import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotificationsService } from '../../api/generes/notifications-messagerie/api/notifications.service';
import { Notification } from '../../api/generes/notifications-messagerie/model/notification';
import { ErreurApi } from '../../commun/modeles/erreur-api.model';
import { CentreNotificationsService, INTERVALLE_POLLING_MS, TAILLE_PANNEAU } from './centre-notifications.service';

const nonLue: Notification = { id: 'n1', type: 'MESSAGE_RECEIVED', title: 'Nouveau message', isRead: false };
const lue: Notification = { id: 'n2', type: 'SYSTEM_ALERT', title: 'Maintenance', isRead: true };

describe('CentreNotificationsService', () => {
  let api: {
    getUnreadNotificationCount: ReturnType<typeof vi.fn>;
    getUserNotifications: ReturnType<typeof vi.fn>;
    markNotificationAsRead: ReturnType<typeof vi.fn>;
    markAllNotificationsAsRead: ReturnType<typeof vi.fn>;
  };
  let service: CentreNotificationsService;

  const masquerOnglet = (cache: boolean) =>
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => cache });

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      getUnreadNotificationCount: vi.fn(() => of({ unreadCount: 3 })),
      getUserNotifications: vi.fn(() => of({ content: [nonLue, lue], totalElements: 2 })),
      markNotificationAsRead: vi.fn((id: string) => of({ id, isRead: true })),
      markAllNotificationsAsRead: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: NotificationsService, useValue: api }] });
    service = TestBed.inject(CentreNotificationsService);
  });

  afterEach(() => {
    service.arreter();
    masquerOnglet(false);
    vi.useRealTimers();
  });

  describe('polling du compteur', () => {
    it('interroge le compteur tout de suite au démarrage', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
      expect(service.nonLus()).toBe(3);
    });

    it('voit arriver une nouvelle notification sans rechargement, au tour suivant', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 4 }));

      vi.advanceTimersByTime(INTERVALLE_POLLING_MS);

      expect(service.nonLus()).toBe(4);
    });

    it('ne lance qu’un seul polling même si demarrer() est appelé deux fois', () => {
      service.demarrer();
      service.demarrer();
      vi.advanceTimersByTime(1);
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
    });

    it('garde le dernier compteur et continue après une erreur (401, réseau…)', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      api.getUnreadNotificationCount.mockReturnValue(throwError(() => new ErreurApi(0, 'NETWORK', 'Serveur injoignable')));
      vi.advanceTimersByTime(INTERVALLE_POLLING_MS);
      expect(service.nonLus()).toBe(3);

      api.getUnreadNotificationCount.mockReturnValue(of({ unreadCount: 5 }));
      vi.advanceTimersByTime(INTERVALLE_POLLING_MS);
      expect(service.nonLus()).toBe(5);
    });

    it('traite un compteur absent de la réponse comme zéro', () => {
      api.getUnreadNotificationCount.mockReturnValue(of({}));
      service.demarrer();
      vi.advanceTimersByTime(1);
      expect(service.nonLus()).toBe(0);
    });

    it('n’interroge pas le back quand l’onglet est caché, puis rattrape au retour', () => {
      masquerOnglet(true);
      service.demarrer();
      vi.advanceTimersByTime(INTERVALLE_POLLING_MS * 2);
      expect(api.getUnreadNotificationCount).not.toHaveBeenCalled();

      masquerOnglet(false);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
      expect(service.nonLus()).toBe(3);
    });

    it('arreter() coupe le polling et efface l’état de l’utilisateur précédent', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      service.charger();
      expect(service.notifications()).toHaveLength(2);

      service.arreter();
      vi.advanceTimersByTime(INTERVALLE_POLLING_MS * 2);

      expect(api.getUnreadNotificationCount).toHaveBeenCalledTimes(1);
      expect(service.nonLus()).toBe(0);
      expect(service.notifications()).toEqual([]);
    });

    it('peut redémarrer après arreter() (nouvelle connexion)', () => {
      service.demarrer();
      service.arreter();
      service.demarrer();
      vi.advanceTimersByTime(1);
      expect(service.nonLus()).toBe(3);
    });
  });

  describe('charger', () => {
    it('demande la première page des notifications récentes, lues et non lues', () => {
      service.charger();
      expect(api.getUserNotifications).toHaveBeenCalledWith(false, 0, TAILLE_PANNEAU);
      expect(service.notifications()).toEqual([nonLue, lue]);
      expect(service.chargement()).toBe(false);
      expect(service.erreur()).toBeNull();
    });

    it('affiche le message du back en cas d’erreur et garde la liste précédente', () => {
      service.charger();
      api.getUserNotifications.mockReturnValue(throwError(() => new ErreurApi(401, 'TOKEN_EXPIRED', 'Session expirée')));
      service.charger();
      expect(service.erreur()).toBe('Session expirée');
      expect(service.chargement()).toBe(false);
      expect(service.notifications()).toHaveLength(2);
    });

    it('accepte une réponse sans contenu', () => {
      api.getUserNotifications.mockReturnValue(of({}));
      service.charger();
      expect(service.notifications()).toEqual([]);
    });
  });

  describe('marquerLue', () => {
    beforeEach(() => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      service.charger();
    });

    it('marque la notification comme lue et décrémente le compteur', () => {
      service.marquerLue(nonLue);
      expect(api.markNotificationAsRead).toHaveBeenCalledWith('n1');
      expect(service.notifications().find((n) => n.id === 'n1')?.isRead).toBe(true);
      expect(service.nonLus()).toBe(2);
    });

    it('ne rappelle pas le back pour une notification déjà lue', () => {
      service.marquerLue(lue);
      expect(api.markNotificationAsRead).not.toHaveBeenCalled();
      expect(service.nonLus()).toBe(3);
    });

    it('ne descend jamais sous zéro', () => {
      service.nonLus.set(0);
      service.marquerLue(nonLue);
      expect(service.nonLus()).toBe(0);
    });

    it('404 : message clair, rien ne change', () => {
      api.markNotificationAsRead.mockReturnValue(throwError(() => new ErreurApi(404, 'NOTIFICATION_NOT_FOUND', 'Introuvable')));
      service.marquerLue(nonLue);
      expect(service.erreur()).toBe("Cette notification n'existe plus.");
      expect(service.nonLus()).toBe(3);
      expect(service.notifications().find((n) => n.id === 'n1')?.isRead).toBe(false);
    });
  });

  describe('toutMarquerLu', () => {
    it('marque tout comme lu et remet le compteur à zéro', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      service.charger();

      service.toutMarquerLu();

      expect(api.markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
      expect(service.nonLus()).toBe(0);
      expect(service.notifications().every((n) => n.isRead)).toBe(true);
    });

    it('401 : affiche l’erreur et garde le compteur', () => {
      service.demarrer();
      vi.advanceTimersByTime(1);
      api.markAllNotificationsAsRead.mockReturnValue(throwError(() => new ErreurApi(401, 'TOKEN_EXPIRED', 'Session expirée')));

      service.toutMarquerLu();

      expect(service.erreur()).toBe('Session expirée');
      expect(service.nonLus()).toBe(3);
    });
  });
});
