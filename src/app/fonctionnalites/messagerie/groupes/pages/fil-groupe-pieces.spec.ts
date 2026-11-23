import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { AttachmentUpload } from '../../../../api/generes/notifications-messagerie/model/attachmentUpload';
import { GroupMessage } from '../../../../api/generes/notifications-messagerie/model/groupMessage';
import { ZoneSaisieMessage } from '../../../../commun/components/zone-saisie-message/zone-saisie-message';
import { ConfirmationService } from '../../../../commun/services/confirmation.service';
import { ToastService } from '../../../../commun/services/toast.service';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { Avancement, PiecesJointesService } from '../../pieces-jointes/pieces-jointes.service';
import { GroupesStore } from '../groupes.store';
import { FilGroupe } from './fil-groupe';

const UPLOAD: AttachmentUpload = { kind: 'IMAGE', publicId: 'p', version: 1, signature: 's', fileName: 'photo.png', sizeBytes: 10 };

/** ALUM-262 : stickers et pièces jointes dans le fil d'un groupe. */
describe('FilGroupe : stickers et pièces jointes', () => {
  let api: { sendGroupMessage: ReturnType<typeof vi.fn> } & Record<string, ReturnType<typeof vi.fn>>;
  let store: { maj: ReturnType<typeof vi.fn>; retirer: ReturnType<typeof vi.fn> };
  let progression: Subject<Avancement<GroupMessage>>;
  let pj: Record<string, unknown> & { envoyer: ReturnType<typeof vi.fn>; liberer: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<FilGroupe>;
  let el: HTMLElement;

  const saisie = () => fixture.debugElement.query(By.directive(ZoneSaisieMessage)).componentInstance as ZoneSaisieMessage;
  const envoyer = () => {
    el.querySelector<HTMLButtonElement>('button[aria-label="Envoyer"]')!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      getGroupById: vi.fn(() => of({ id: 'g1', name: 'Promo', members: [{ userId: 'moi', groupRole: 'MEMBER' }] })),
      getGroupMessages: vi.fn(() => of({ content: [], totalElements: 0 })),
      markGroupAsRead: vi.fn(() => of(null)),
      sendGroupMessage: vi.fn((_id: string, corps: Partial<GroupMessage> & { attachment?: AttachmentUpload }) =>
        of({
          id: 'm9', senderId: 'moi', senderName: 'Moussa', createdAt: '2026-11-23T10:00:00Z', content: corps.content,
          type: corps.sticker ? 'STICKER' : corps.attachment ? 'ATTACHMENT' : 'TEXT', sticker: corps.sticker,
          attachment: corps.attachment ? { kind: corps.attachment.kind, url: 'https://x/o', previewUrl: 'https://x/p', fileName: 'photo.png' } : undefined,
        } as GroupMessage)),
    };
    store = { maj: vi.fn(), retirer: vi.fn() };
    progression = new Subject();
    pj = {
      charger: vi.fn(),
      actives: signal(true),
      acceptImages: signal('.png'),
      acceptDocuments: signal('.pdf'),
      dureeVocalMax: signal(120),
      preparer: vi.fn((fichier: File, kind: 'IMAGE' | 'FILE') => ({ fichier, kind, apercu: 'blob:x' })),
      liberer: vi.fn(),
      // L'envoi au stockage est simulé : la progression vient du test, puis le message part avec une réponse signée.
      envoyer: vi.fn((_p, _c, envoi: (u: AttachmentUpload) => Observable<GroupMessage>) =>
        new Observable<Avancement<GroupMessage>>((s) => {
          const abo = progression.subscribe((a) => s.next(a));
          const fin = progression.subscribe({ complete: () => envoi(UPLOAD).subscribe((m) => { s.next({ resultat: m }); s.complete(); }) });
          return () => { abo.unsubscribe(); fin.unsubscribe(); };
        })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'g1' })) } },
        { provide: GroupMessagingService, useValue: api },
        { provide: GroupesStore, useValue: store },
        { provide: PiecesJointesService, useValue: pj },
        { provide: ConfirmationService, useValue: { demander: vi.fn() } },
        { provide: ToastService, useValue: { succes: vi.fn(), erreur: vi.fn() } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'moi' }), role: () => 'ETUDIANT' } },
      ],
    });
    fixture = TestBed.createComponent(FilGroupe);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('envoie un sticker et l’affiche sans bulle', () => {
    saisie().sticker.emit('bravo');
    fixture.detectChanges();
    expect(api.sendGroupMessage).toHaveBeenCalledWith('g1', { sticker: 'bravo' });
    const bulle = el.querySelector('li.bulle')!;
    expect(bulle.classList).toContain('sticker');
    expect(bulle.querySelector('img')!.getAttribute('alt')).toBe('Sticker Bravo !');
    expect(store.maj).toHaveBeenCalledWith('g1', expect.objectContaining({ lastMessageType: 'STICKER' }));
  });

  it('une photo choisie attend au-dessus de la saisie, puis part avec la légende saisie', () => {
    const fichier = new File(['x'], 'photo.png', { type: 'image/png' });
    saisie().fichier.emit({ fichier, kind: 'IMAGE' });
    fixture.detectChanges();
    expect(el.querySelector('app-piece-a-envoyer')!.textContent).toContain('photo.png');

    saisie().texte.set('Ma soutenance');
    fixture.detectChanges();
    envoyer();
    expect(pj.envoyer).toHaveBeenCalledWith(expect.objectContaining({ fichier, kind: 'IMAGE' }), { groupId: 'g1' }, expect.any(Function));

    progression.next({ progression: 40 });
    fixture.detectChanges();
    expect(el.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('40');

    progression.complete();
    fixture.detectChanges();
    expect(api.sendGroupMessage).toHaveBeenCalledWith('g1', { content: 'Ma soutenance', attachment: UPLOAD });
    expect(el.querySelector('app-piece-a-envoyer')).toBeNull();
    expect(el.querySelector('li.bulle.media img')!.getAttribute('src')).toBe('https://x/p');
    expect(saisie().texte()).toBe('');
    expect(pj.liberer).toHaveBeenCalled();
    expect(store.maj).toHaveBeenCalledWith('g1', expect.objectContaining({ lastMessageType: 'ATTACHMENT', lastMessageAttachmentKind: 'IMAGE' }));
  });

  it('la croix annule l’envoi en cours et rend la main', () => {
    saisie().fichier.emit({ fichier: new File(['x'], 'photo.png'), kind: 'IMAGE' });
    fixture.detectChanges();
    envoyer();
    el.querySelector<HTMLButtonElement>('app-piece-a-envoyer button')!.click();
    fixture.detectChanges();
    progression.complete();
    expect(api.sendGroupMessage).not.toHaveBeenCalled();
    expect(el.querySelector('app-piece-a-envoyer')).toBeNull();
  });

  it('un fichier refusé affiche le message du contrôle', () => {
    TestBed.inject(PiecesJointesService).preparer = vi.fn(() => { throw new Error('refus'); });
    saisie().fichier.emit({ fichier: new File(['x'], 'virus.exe'), kind: 'FILE' });
    fixture.detectChanges();
    expect(el.querySelector('.erreur-envoi')).not.toBeNull();
    expect(el.querySelector('app-piece-a-envoyer')).toBeNull();
  });

  it('un vocal part dès la fin de l’enregistrement, sans légende', () => {
    const fichier = new File(['son'], 'vocal.webm');
    saisie().vocal.emit({ fichier, duree: 5 });
    fixture.detectChanges();
    expect(pj.envoyer).toHaveBeenCalledWith({ fichier, kind: 'AUDIO', duree: 5 }, { groupId: 'g1' }, expect.any(Function));
    progression.complete();
    expect(api.sendGroupMessage).toHaveBeenCalledWith('g1', { content: undefined, attachment: UPLOAD });
  });
});
