import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { PrivateMessagingService } from '../../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { PrivateMessage } from '../../../../api/generes/notifications-messagerie/model/privateMessage';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { ConversationsStore } from '../conversations.store';
import { FilConversation } from './fil-conversation';

const MOI = 'u-1';
const AUTRE = 'u-2';
const message = (id: string, senderId: string, content: string, createdAt: string, isRead = true): PrivateMessage => ({
  id,
  senderId,
  senderName: senderId === MOI ? 'Moussa Ndiaye' : 'Awa Diop',
  recipientId: senderId === MOI ? AUTRE : MOI,
  recipientName: senderId === MOI ? 'Awa Diop' : 'Moussa Ndiaye',
  content,
  isRead,
  createdAt,
});

const ancien = message('m1', AUTRE, 'Bonjour Moussa', '2026-11-18T09:00:00Z');
const reponse = message('m2', MOI, 'Bonjour Awa', '2026-11-18T09:05:00Z');
const recent = message('m3', AUTRE, 'Tu as vu le stage ?', '2026-11-18T09:10:00Z', false);
const page = (content: PrivateMessage[], totalElements = content.length) => ({ content, totalElements, page: 0, size: 30 });
const erreurApi = { statut: 500, code: 'SERVER_ERROR', message: 'Erreur serveur' } as ErreurApi;

describe('FilConversation', () => {
  let api: {
    getConversationMessages: ReturnType<typeof vi.fn>;
    sendPrivateMessage: ReturnType<typeof vi.fn>;
    markConversationAsRead: ReturnType<typeof vi.fn>;
  };
  let store: { liste: ReturnType<typeof vi.fn>; maj: ReturnType<typeof vi.fn>; apresEnvoi: ReturnType<typeof vi.fn> };
  let params: BehaviorSubject<ParamMap>;
  let fixture: ComponentFixture<FilConversation>;
  let el: HTMLElement;

  const stabiliser = async (ms = 0) => {
    // Pas de `whenStable()` avec de faux minuteurs : le planificateur d'Angular attendrait un minuteur gelé.
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };
  const ouvrir = async () => {
    fixture = TestBed.createComponent(FilConversation);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await stabiliser();
  };
  const textes = () => [...el.querySelectorAll('.texte')].map((n) => n.textContent?.trim());
  const saisir = (texte: string) => {
    const zone = el.querySelector('textarea') as HTMLTextAreaElement;
    zone.value = texte;
    zone.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const soumettre = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await stabiliser();
  };
  const boutonEnvoyer = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      getConversationMessages: vi.fn(() => of(page([recent, reponse, ancien]))), // du plus récent au plus ancien
      sendPrivateMessage: vi.fn((id: string, { content }: { content: string }) =>
        of(message('m9', MOI, content, '2026-11-18T09:20:00Z')),
      ),
      markConversationAsRead: vi.fn(() => of(null)),
    };
    store = { liste: vi.fn(() => []), maj: vi.fn(), apresEnvoi: vi.fn() };
    params = new BehaviorSubject(convertToParamMap({ recipientId: AUTRE }));
    TestBed.configureTestingModule({
      providers: [
        { provide: PrivateMessagingService, useValue: api },
        { provide: ConversationsStore, useValue: store },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: MOI }) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('charge la première page de la conversation avec l’interlocuteur de l’URL', async () => {
    await ouvrir();
    expect(api.getConversationMessages).toHaveBeenCalledWith(AUTRE, 0, 30);
  });

  it('affiche les messages du plus ancien au plus récent, même si le back les renvoie à l’envers', async () => {
    await ouvrir();
    expect(textes()).toEqual(['Bonjour Moussa', 'Bonjour Awa', 'Tu as vu le stage ?']);
  });

  it('aligne mes messages à droite et nomme l’interlocuteur en en-tête', async () => {
    await ouvrir();
    const miens = el.querySelectorAll('.ligne.moi');
    expect(miens).toHaveLength(1);
    expect(miens[0].textContent).toContain('Bonjour Awa');
    expect(el.querySelector('h2')?.textContent).toContain('Awa Diop');
  });

  it('marque la conversation comme lue quand l’autre a des messages non lus', async () => {
    await ouvrir();
    expect(api.markConversationAsRead).toHaveBeenCalledTimes(1);
    expect(api.markConversationAsRead).toHaveBeenCalledWith(AUTRE);
    expect(store.maj).toHaveBeenCalledWith(AUTRE, { unreadCount: 0 });
  });

  it('ne marque rien comme lu quand tout est déjà lu', async () => {
    api.getConversationMessages.mockReturnValue(of(page([reponse, ancien])));
    await ouvrir();
    expect(api.markConversationAsRead).not.toHaveBeenCalled();
  });

  it('ne réessaie pas le marquage « lu » à chaque rafraîchissement s’il échoue', async () => {
    api.markConversationAsRead.mockReturnValue(throwError(() => erreurApi));
    await ouvrir();
    await stabiliser(5000);
    await stabiliser(5000);
    expect(api.markConversationAsRead).toHaveBeenCalledTimes(1);
  });

  it('affiche un état vide invitant à écrire le premier message', async () => {
    api.getConversationMessages.mockReturnValue(of(page([])));
    await ouvrir();
    expect(el.querySelector('app-etat-vide')?.textContent).toContain('Aucun message');
  });

  it('affiche une erreur si le chargement échoue, sans spinner', async () => {
    api.getConversationMessages.mockReturnValue(throwError(() => erreurApi));
    await ouvrir();
    expect(el.querySelector('app-alerte')).not.toBeNull();
    expect(el.querySelector('app-spinner')).toBeNull();
  });

  it('affiche les nouveaux messages au rafraîchissement automatique', async () => {
    api.getConversationMessages.mockReturnValue(of(page([ancien])));
    await ouvrir();
    expect(textes()).toEqual(['Bonjour Moussa']);

    api.getConversationMessages.mockReturnValue(of(page([recent, ancien])));
    await stabiliser(5000);
    expect(textes()).toEqual(['Bonjour Moussa', 'Tu as vu le stage ?']);
  });

  it('arrête le rafraîchissement quand on quitte la page', async () => {
    await ouvrir();
    const appels = api.getConversationMessages.mock.calls.length;
    fixture.destroy();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(api.getConversationMessages).toHaveBeenCalledTimes(appels);
  });

  it('recharge le fil quand on passe à un autre interlocuteur', async () => {
    await ouvrir();
    params.next(convertToParamMap({ recipientId: 'u-3' }));
    await stabiliser();
    expect(api.getConversationMessages).toHaveBeenLastCalledWith('u-3', 0, 30);
  });

  describe('envoi', () => {
    it('envoie le texte à l’interlocuteur, l’affiche et vide le champ', async () => {
      await ouvrir();
      saisir('  Merci Awa !  ');
      await soumettre();
      expect(api.sendPrivateMessage).toHaveBeenCalledWith(AUTRE, { content: 'Merci Awa !' });
      expect(textes()).toContain('Merci Awa !');
      expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
      expect(store.apresEnvoi).toHaveBeenCalledTimes(1);
    });

    it('n’envoie pas un message vide et désactive le bouton', async () => {
      await ouvrir();
      expect(boutonEnvoyer().disabled).toBe(true);
      saisir('    ');
      expect(boutonEnvoyer().disabled).toBe(true);
      await soumettre();
      expect(api.sendPrivateMessage).not.toHaveBeenCalled();
    });

    it('active le bouton dès qu’il y a du texte', async () => {
      await ouvrir();
      saisir('Bonjour');
      expect(boutonEnvoyer().disabled).toBe(false);
    });

    it('envoie avec la touche Entrée mais pas avec Maj + Entrée', async () => {
      await ouvrir();
      saisir('Salut');
      const zone = el.querySelector('textarea')!;
      zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true }));
      await stabiliser();
      expect(api.sendPrivateMessage).not.toHaveBeenCalled();
      zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      await stabiliser();
      expect(api.sendPrivateMessage).toHaveBeenCalledTimes(1);
    });

    it('conserve le texte saisi et affiche une erreur si l’envoi échoue', async () => {
      api.sendPrivateMessage.mockReturnValue(throwError(() => erreurApi));
      await ouvrir();
      saisir('Un message important');
      await soumettre();
      expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Un message important');
      expect(el.querySelector('form app-alerte')).not.toBeNull();
    });
  });

  describe('historique', () => {
    it('propose les messages précédents quand il en reste, et les charge page par page', async () => {
      api.getConversationMessages.mockImplementation((id: string, numero: number) =>
        of(numero === 0 ? page([recent, reponse], 3) : page([ancien], 3)),
      );
      await ouvrir();
      const bouton = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Messages précédents'))!;
      expect(bouton).toBeDefined();

      bouton.click();
      await stabiliser();
      expect(api.getConversationMessages).toHaveBeenCalledWith(AUTRE, 1, 30);
      expect(textes()).toEqual(['Bonjour Moussa', 'Bonjour Awa', 'Tu as vu le stage ?']);
      expect([...el.querySelectorAll('button')].some((b) => b.textContent?.includes('Messages précédents'))).toBe(false);
    });

    it('n’affiche pas ce bouton quand tout est chargé', async () => {
      await ouvrir();
      expect([...el.querySelectorAll('button')].some((b) => b.textContent?.includes('Messages précédents'))).toBe(false);
    });
  });
});
