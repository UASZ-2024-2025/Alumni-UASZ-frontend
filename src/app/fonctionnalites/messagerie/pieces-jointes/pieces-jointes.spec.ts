import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageAttachmentsService } from '../../../api/generes/notifications-messagerie/api/messageAttachments.service';
import { AttachmentUpload } from '../../../api/generes/notifications-messagerie/model/attachmentUpload';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ContenuPiece, MessageAvecPiece } from './contenu-piece';
import { duree, extension, taille, texteDernierMessage } from './format';
import { Avancement, PiecesJointesService } from './pieces-jointes.service';

const REGLAGES = {
  enabled: true, maxImageBytes: 1000, maxFileBytes: 2000, maxAudioSeconds: 120,
  imageExtensions: ['jpg', 'png'], fileExtensions: ['pdf', 'docx'],
};

describe('format des pièces jointes', () => {
  it('extension, taille et durée lisibles', () => {
    expect(extension('Rapport Final.PDF')).toBe('pdf');
    expect(extension('sans-extension')).toBe('');
    expect(taille(512)).toBe('512 o');
    expect(taille(350 * 1024)).toBe('350 Ko');
    expect(taille(1.25 * 1024 * 1024)).toBe('1,3 Mo');
    expect(duree(7.4)).toBe('0:07');
    expect(duree(105)).toBe('1:45');
  });

  it('texte du dernier message dans les listes, comme WhatsApp', () => {
    expect(texteDernierMessage('STICKER')).toBe('Sticker');
    expect(texteDernierMessage('ATTACHMENT', 'IMAGE')).toBe('📷 Photo');
    expect(texteDernierMessage('ATTACHMENT', 'IMAGE', 'Ma soutenance')).toBe('📷 Ma soutenance');
    expect(texteDernierMessage('ATTACHMENT', 'FILE')).toBe('📄 Document');
    expect(texteDernierMessage('ATTACHMENT', 'AUDIO', 'ignoré')).toBe('🎤 Message vocal');
    expect(texteDernierMessage('TEXT', undefined, 'Bonjour')).toBe('Bonjour');
  });
});

describe('PiecesJointesService', () => {
  let api: { getAttachmentSettings: ReturnType<typeof vi.fn>; createAttachmentUpload: ReturnType<typeof vi.fn> };
  let http: HttpTestingController;
  let service: PiecesJointesService;

  beforeEach(() => {
    api = {
      getAttachmentSettings: vi.fn(() => of(REGLAGES)),
      createAttachmentUpload: vi.fn(() => of({
        uploadUrl: 'https://api.cloudinary.com/v1_1/demo/raw/upload', apiKey: 'k', timestamp: 1700000000,
        signature: 'sig-ticket', publicId: 'alumni/u1/abc.pdf', type: 'authenticated',
      })),
    };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MessageAttachmentsService, useValue: api }],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PiecesJointesService);
    URL.createObjectURL = vi.fn(() => 'blob:apercu');
    URL.revokeObjectURL = vi.fn();
  });

  it('lit les réglages une seule fois et en déduit les champs fichier', () => {
    expect(service.actives()).toBe(false);
    service.charger();
    service.charger();
    expect(api.getAttachmentSettings).toHaveBeenCalledTimes(1);
    expect(service.actives()).toBe(true);
    expect(service.acceptImages()).toBe('.jpg,.png');
    expect(service.acceptDocuments()).toBe('.pdf,.docx');
  });

  it('reste désactivé si les réglages sont illisibles, et réessaie plus tard', () => {
    api.getAttachmentSettings.mockReturnValueOnce(throwError(() => new ErreurApi(500, 'X', 'x')));
    service.charger();
    expect(service.actives()).toBe(false);
    service.charger();
    expect(api.getAttachmentSettings).toHaveBeenCalledTimes(2);
  });

  it('refuse un fichier d’un type non accepté, trop lourd ou vide, avec un message clair', () => {
    service.charger();
    const refus = (f: File, kind: 'IMAGE' | 'FILE') => {
      try {
        service.preparer(f, kind);
      } catch (e) {
        return (e as ErreurApi).message;
      }
      return null;
    };
    expect(refus(new File(['x'], 'virus.exe'), 'FILE')).toContain('Type de document non accepté (.exe)');
    expect(refus(new File(['x'], 'photo.gif'), 'IMAGE')).toContain("Format d'image non accepté");
    expect(refus(new File(['x'.repeat(1500)], 'photo.png'), 'IMAGE')).toContain('Fichier trop volumineux');
    expect(refus(new File([], 'vide.pdf'), 'FILE')).toBe('Ce fichier est vide.');
    const photo = service.preparer(new File(['x'], 'photo.PNG'), 'IMAGE');
    expect(photo.apercu).toBe('blob:apercu');
    expect(service.preparer(new File(['x'], 'cours.pdf'), 'FILE').apercu).toBeUndefined();
  });

  it('envoie le fichier au stockage sans le jeton de l’application, puis le message avec la réponse signée', () => {
    service.charger();
    const fichier = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' });
    const envoi = vi.fn((upload: AttachmentUpload) => of({ id: 'm1', upload }));
    const recu: Avancement<unknown>[] = [];
    service.envoyer({ fichier, kind: 'FILE' }, { recipientId: 'u2' }, envoi).subscribe((a) => recu.push(a));

    expect(api.createAttachmentUpload).toHaveBeenCalledWith({ kind: 'FILE', fileName: 'cours.pdf', recipientId: 'u2' });
    const req = http.expectOne('https://api.cloudinary.com/v1_1/demo/raw/upload');
    expect(req.request.headers.has('Authorization')).toBe(false);
    const corps = req.request.body as FormData;
    expect(corps.get('public_id')).toBe('alumni/u1/abc.pdf');
    expect(corps.get('signature')).toBe('sig-ticket');
    expect(corps.get('type')).toBe('authenticated');
    expect(corps.has('allowed_formats')).toBe(false);
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    req.flush({ public_id: 'alumni/u1/abc.pdf', version: 7, signature: 'sig-reponse', bytes: 8 });

    expect(recu[0]).toEqual({ progression: 50 });
    expect(envoi).toHaveBeenCalledWith({
      kind: 'FILE', publicId: 'alumni/u1/abc.pdf', version: 7, signature: 'sig-reponse', format: undefined,
      fileName: 'cours.pdf', sizeBytes: 8, durationSeconds: undefined, width: undefined, height: undefined,
    });
    expect(recu.at(-1)).toEqual({ resultat: expect.objectContaining({ id: 'm1' }) });
  });

  it('un vocal garde la durée mesurée si le stockage ne la donne pas', () => {
    const envoi = vi.fn((upload: AttachmentUpload) => of(upload));
    service.envoyer({ fichier: new File(['son'], 'vocal.webm'), kind: 'AUDIO', duree: 4.2 }, { groupId: 'g1' }, envoi).subscribe();
    http.expectOne(() => true).flush({ public_id: 'p', version: 1, signature: 's', format: 'webm' });
    expect(envoi.mock.calls[0][0].durationSeconds).toBe(4.2);
  });

  it('un échec du stockage devient une erreur claire', () => {
    let erreur: ErreurApi | undefined;
    service.envoyer({ fichier: new File(['x'], 'a.pdf'), kind: 'FILE' }, { recipientId: 'u2' }, () => of(null))
      .subscribe({ error: (e) => (erreur = e) });
    http.expectOne(() => true).flush({ error: { message: 'Invalid' } }, { status: 400, statusText: 'Bad Request' });
    expect(erreur?.message).toContain("Le fichier n'a pas pu être envoyé");
  });
});

describe('ContenuPiece', () => {
  const monter = (message: MessageAvecPiece) => {
    const f = TestBed.createComponent(ContenuPiece);
    f.componentRef.setInput('message', message);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche un sticker connu, ou « Sticker » pour un code inconnu', () => {
    const img = monter({ type: 'STICKER', sticker: 'bravo' }).querySelector('img')!;
    expect(img.getAttribute('src')).toBe('stickers/bravo.svg');
    expect(img.alt).toBe('Sticker Bravo !');
    expect(monter({ type: 'STICKER', sticker: 'futur' }).textContent?.trim()).toBe('Sticker');
  });

  it('affiche l’aperçu d’une photo, qui ouvre l’original', () => {
    const el = monter({ type: 'ATTACHMENT', attachment: { kind: 'IMAGE', url: 'https://x/o.jpg', previewUrl: 'https://x/p.jpg', fileName: 'o.jpg', width: 4, height: 3 } });
    expect(el.querySelector('a')!.getAttribute('href')).toBe('https://x/o.jpg');
    expect(el.querySelector('img')!.getAttribute('src')).toBe('https://x/p.jpg');
  });

  it('affiche un document à télécharger avec son format et sa taille', () => {
    const el = monter({ type: 'ATTACHMENT', attachment: { kind: 'FILE', url: 'https://x/c.pdf', fileName: 'cours.pdf', format: 'pdf', sizeBytes: 2048 } });
    const lien = el.querySelector('a.document')!;
    expect(lien.getAttribute('aria-label')).toBe('Télécharger cours.pdf');
    expect(lien.textContent).toContain('PDF · 2 Ko');
  });

  it('affiche un lecteur pour un vocal, avec sa durée', () => {
    const el = monter({ type: 'ATTACHMENT', attachment: { kind: 'AUDIO', url: 'https://x/v.mp3', durationSeconds: 12 } });
    expect(el.querySelector('audio')!.getAttribute('src')).toBe('https://x/v.mp3');
    expect(el.querySelector('.duree')!.textContent).toBe('0:12');
  });
});
