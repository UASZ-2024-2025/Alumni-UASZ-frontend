import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMessage } from '../../../../api/generes/notifications-messagerie/model/groupMessage';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
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
  let api: Record<'getGroupById' | 'getGroupMessages' | 'sendGroupMessage' | 'markGroupAsRead', ReturnType<typeof vi.fn>>;
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
    const e = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true });
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
    };
    store = { maj: vi.fn(), retirer: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'g1' })) } },
        { provide: GroupMessagingService, useValue: api },
        { provide: GroupesStore, useValue: store },
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

  it('envoie avec Entrée, passe à la ligne avec Maj+Entrée', () => {
    creer();
    saisir('  Bonjour  ');
    expect(entree(true).defaultPrevented).toBe(false);
    expect(api.sendGroupMessage).not.toHaveBeenCalled();

    expect(entree().defaultPrevented).toBe(true);
    expect(api.sendGroupMessage).toHaveBeenCalledWith('g1', { content: 'Bonjour' });
    expect(zone().value).toBe('');
    expect(el.querySelectorAll('.bulle.moi').length).toBe(2);
    expect(store.maj).toHaveBeenCalledWith('g1', { lastMessage: 'Bonjour', lastMessageTime: '2026-11-18T10:00:00Z' });
  });

  it("n'envoie pas un message vide et garde le brouillon si l'envoi échoue", () => {
    creer();
    saisir('   ');
    entree();
    expect(api.sendGroupMessage).not.toHaveBeenCalled();

    api.sendGroupMessage.mockReturnValue(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'Interdit')));
    saisir('Toujours là ?');
    entree();
    expect(el.querySelector('.erreur-envoi')?.textContent).toContain('Vous ne faites plus partie de ce groupe.');
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
});
