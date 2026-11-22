import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMessage } from '../../../../api/generes/notifications-messagerie/model/groupMessage';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { ConfirmationService } from '../../../../commun/services/confirmation.service';
import { ToastService } from '../../../../commun/services/toast.service';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { GroupesStore } from '../groupes.store';
import { FilGroupe } from './fil-groupe';

const groupe: Group = {
  id: 'g1', name: 'Promo GL 2025', ownerId: 'u3',
  members: [
    { userId: 'u3', userName: 'Fatou Sow', groupRole: 'OWNER' },
    { userId: 'moi', userName: 'Moussa Ndiaye', groupRole: 'MEMBER' },
  ],
};
const messages: GroupMessage[] = [
  { id: 'm2', senderId: 'moi', senderName: 'Moussa Ndiaye', content: 'Merci !', createdAt: '2026-11-18T09:05:00Z' },
  { id: 'm1', senderId: 'u3', senderName: 'Fatou Sow', content: 'Bienvenue', createdAt: '2026-11-18T09:00:00Z' },
];

describe('FilGroupe', () => {
  let api: Record<'getGroupById' | 'getGroupMessages' | 'sendGroupMessage' | 'markGroupAsRead' | 'deleteGroupMessage' | 'updateGroupPreferences' | 'editGroupMessage', ReturnType<typeof vi.fn>>;
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let store: { maj: ReturnType<typeof vi.fn>; retirer: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<FilGroupe>;
  let el: HTMLElement;

  const creer = () => {
    fixture = TestBed.createComponent(FilGroupe);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const zone = () => el.querySelector<HTMLTextAreaElement>('textarea')!;
  const saisir = (texte: string) => {
    zone().value = texte;
    zone().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const entree = (shiftKey = false) => {
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true, bubbles: true });
    zone().dispatchEvent(e);
    fixture.detectChanges();
    return e;
  };

  beforeEach(() => {
    api = {
      getGroupById: vi.fn(() => of(groupe)),
      getGroupMessages: vi.fn(() => of({ content: messages, totalElements: 2 })),
      sendGroupMessage: vi.fn((_id: string, { content }: { content: string }) =>
        of({ id: 'm3', senderId: 'moi', senderName: 'Moussa Ndiaye', content, createdAt: '2026-11-18T10:00:00Z' })),
      markGroupAsRead: vi.fn(() => of(null)),
      deleteGroupMessage: vi.fn(() => of(null)),
      updateGroupPreferences: vi.fn(() => of({ pinned: true, archived: false, muted: false })),
      editGroupMessage: vi.fn((_g: string, id: string, { content }: { content: string }) =>
        of({ ...messages[0], id, content, editedAt: '2026-11-18T09:10:00Z' })),
    };
    confirmation = { demander: vi.fn(() => Promise.resolve(true)) };
    store = { maj: vi.fn(), retirer: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'g1' })) } },
        { provide: GroupMessagingService, useValue: api },
        { provide: GroupesStore, useValue: store },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: ToastService, useValue: { succes: vi.fn(), erreur: vi.fn() } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'moi' }), role: () => 'ETUDIANT' } },
      ],
    });
  });

  it('affiche le fil dans l’ordre, mes bulles à droite, et marque le groupe comme lu', () => {
    creer();
    expect(api.getGroupMessages).toHaveBeenCalledWith('g1', 0, 30);
    const bulles = [...el.querySelectorAll('.bulle')];
    expect(bulles.map((b) => b.querySelector('p')?.firstChild?.textContent)).toEqual(['Bienvenue', 'Merci !']);
    expect(bulles[0].classList).not.toContain('moi');
    expect(bulles[0].querySelector('.auteur')?.textContent).toContain('Fatou Sow');
    expect(bulles[1].classList).toContain('moi');
    expect(bulles[1].querySelector('.auteur')).toBeNull();
    expect(el.querySelector('.entete-fil small')?.textContent).toBe('Fatou Sow, Vous');
    expect(api.markGroupAsRead).toHaveBeenCalledWith('g1');
    expect(store.maj).toHaveBeenCalledWith('g1', { unreadCount: 0 });
  });

  it("refuse l'accès à un non-membre (403) : ni messages ni zone de saisie", () => {
    api.getGroupById.mockReturnValue(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Interdit')));
    creer();
    expect(el.textContent).toContain('Accès réservé aux membres');
    expect(el.querySelector('.bulle')).toBeNull();
    expect(el.querySelector('textarea')).toBeNull();
    expect(api.markGroupAsRead).not.toHaveBeenCalled();
  });

  it('signale un groupe introuvable (404)', () => {
    api.getGroupById.mockReturnValue(throwError(() => new ErreurApi(404, 'GROUP_NOT_FOUND', 'Introuvable')));
    creer();
    expect(el.textContent).toContain('Groupe introuvable');
  });

  it('envoie avec Entrée, passe à la ligne avec Maj+Entrée', async () => {
    creer();
    saisir('  Bonjour  ');
    expect(entree(true).defaultPrevented).toBe(false);
    expect(api.sendGroupMessage).not.toHaveBeenCalled();

    expect(entree().defaultPrevented).toBe(true);
    expect(api.sendGroupMessage).toHaveBeenCalledWith('g1', { content: 'Bonjour' });
    fixture.detectChanges();
    await fixture.whenStable(); // ngModel réécrit la valeur au tour suivant
    fixture.detectChanges();
    expect(zone().value).toBe('');
    expect(el.querySelectorAll('.bulle.moi').length).toBe(2);
    expect(store.maj).toHaveBeenCalledWith('g1', {
      lastMessage: 'Bonjour', lastMessageTime: '2026-11-18T10:00:00Z', lastMessageType: 'TEXT', lastMessageSenderName: 'Moussa Ndiaye',
    });
  });

  it("n'envoie pas un message vide et garde le brouillon si l'envoi échoue", () => {
    creer();
    saisir('   ');
    entree();
    expect(api.sendGroupMessage).not.toHaveBeenCalled();

    api.sendGroupMessage.mockReturnValue(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Interdit')));
    saisir('Toujours là ?');
    entree();
    expect(el.querySelector('.erreur-envoi')?.textContent).toContain('Vous ne pouvez pas écrire dans ce groupe');
    expect(zone().value).toBe('Toujours là ?');
  });

  it('propose les messages précédents tant que tout n’est pas chargé', () => {
    api.getGroupMessages.mockReturnValueOnce(of({ content: messages, totalElements: 3 }));
    creer();
    api.getGroupMessages.mockReturnValueOnce(of({ content: [{ id: 'm0', senderId: 'u3', content: 'Premier', createdAt: '2026-11-17T09:00:00Z' }], totalElements: 3 }));
    el.querySelector<HTMLButtonElement>('.plus-anciens button')!.click();
    fixture.detectChanges();
    expect(api.getGroupMessages).toHaveBeenLastCalledWith('g1', 1, 30);
    expect(el.querySelectorAll('.bulle').length).toBe(3);
    expect(el.querySelector('.plus-anciens')).toBeNull();
  });

  it('affiche les événements du groupe et les messages supprimés', () => {
    api.getGroupMessages.mockReturnValue(of({ totalElements: 3, content: [
      { id: 's1', senderId: 'u3', type: 'SYSTEM', content: 'Fatou Sow a créé le groupe « Promo GL 2025 »', createdAt: '2026-11-18T08:00:00Z' },
      { id: 'm1', senderId: 'u3', senderName: 'Fatou Sow', type: 'TEXT', deleted: true, createdAt: '2026-11-18T09:00:00Z' },
      { id: 'm2', senderId: 'moi', senderName: 'Moussa Ndiaye', type: 'TEXT', content: 'Merci !', createdAt: '2026-11-18T09:05:00Z' },
    ] }));
    creer();
    expect(el.querySelector('.evenement')?.textContent).toContain('a créé le groupe');
    const supprime = el.querySelector('.bulle.supprime')!;
    expect(supprime.textContent).toContain('Ce message a été supprimé');
    // Un simple membre ne supprime que ses propres messages.
    expect(supprime.querySelector('.actions-bulle')).toBeNull();
    expect(el.querySelectorAll('.bulle .actions-bulle').length).toBe(1);
  });

  it('supprime son message pour tous après confirmation', async () => {
    creer();
    el.querySelector<HTMLButtonElement>('.bulle.moi button[aria-label^="Supprimer"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.deleteGroupMessage).toHaveBeenCalledWith('g1', 'm2');
    expect(el.querySelector('.bulle.moi')?.textContent).toContain('Vous avez supprimé ce message');
  });

  it('un administrateur du groupe peut supprimer le message des autres', () => {
    api.getGroupById.mockReturnValue(of({ ...groupe, members: [groupe.members![0], { userId: 'moi', groupRole: 'ADMIN' }] }));
    creer();
    expect(el.querySelectorAll('.bulle .actions-bulle').length).toBe(2);
  });

  it('remplace la saisie quand seuls les administrateurs peuvent écrire', () => {
    api.getGroupById.mockReturnValue(of({ ...groupe, settings: { onlyAdminsCanSend: true } }));
    creer();
    expect(el.querySelector('textarea')).toBeNull();
    expect(el.querySelector('.lecture-seule')?.textContent).toContain('Seuls les administrateurs peuvent envoyer des messages');
  });

  it('épingle le groupe depuis le menu ⋮', () => {
    creer();
    el.querySelector<HTMLButtonElement>('.menu app-bouton button')!.click();
    fixture.detectChanges();
    [...el.querySelectorAll<HTMLButtonElement>('.options app-bouton button')].find((b) => b.textContent?.trim() === 'Épingler')!.click();
    fixture.detectChanges();
    expect(api.updateGroupPreferences).toHaveBeenCalledWith('g1', { pinned: true });
    expect(store.maj).toHaveBeenCalledWith('g1', { preferences: { pinned: true, archived: false, muted: false } });
    expect(el.querySelector('.options')).toBeNull();
  });

  describe('modification d’un message', () => {
    const boutonModifier = () => el.querySelector<HTMLButtonElement>('.bulle.moi button[aria-label="Modifier ce message"]');

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-18T09:10:00Z')); // 5 minutes après « Merci ! »
    });
    afterEach(() => vi.useRealTimers());

    it('reprend le message dans la saisie, l’enregistre et affiche « Modifié »', async () => {
      creer();
      expect(el.querySelector('.bulle:not(.moi) button[aria-label="Modifier ce message"]')).toBeNull(); // pas le message des autres
      boutonModifier()!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(zone().value).toBe('Merci !');
      expect(el.querySelector('.bandeau-edition')?.textContent).toContain('Modifier le message');
      expect(el.querySelector('app-zone-saisie-message button[type="submit"]')?.textContent).toContain('Enregistrer');

      saisir('Merci beaucoup !');
      entree();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(api.editGroupMessage).toHaveBeenCalledWith('g1', 'm2', { content: 'Merci beaucoup !' });
      expect(api.sendGroupMessage).not.toHaveBeenCalled();
      expect(el.querySelector('.bulle.moi')?.textContent).toContain('Merci beaucoup !');
      expect(el.querySelector('.bulle.moi .modifie')?.textContent).toContain('Modifié');
      expect(el.querySelector('.bandeau-edition')).toBeNull();
      expect(zone().value).toBe('');
      expect(store.maj).toHaveBeenCalledWith('g1', { lastMessage: 'Merci beaucoup !' });
    });

    it('Échap annule la modification et rend le brouillon en cours', () => {
      creer();
      saisir('brouillon');
      boutonModifier()!.click();
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(el.querySelector('.bandeau-edition')).toBeNull();
      expect(zone().value).toBe('brouillon');
    });

    it('ne propose plus la modification 15 minutes après l’envoi', () => {
      vi.setSystemTime(new Date('2026-11-18T09:21:00Z'));
      creer();
      expect(boutonModifier()).toBeNull();
    });
  });
});
