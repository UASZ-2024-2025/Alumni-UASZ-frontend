import { TestBed } from '@angular/core/testing';
import { VocalEnregistre } from '../enregistreur-vocal/enregistreur-vocal';
import { FichierChoisi, ZoneSaisieMessage } from './zone-saisie-message';

/** ALUM-262 : stickers, trombone et micro de la zone de saisie. */
describe('ZoneSaisieMessage : stickers, pièces jointes et vocal', () => {
  const monter = (options: { texte?: string; piecesJointes?: boolean; stickers?: boolean; pieceEnAttente?: boolean } = {}) => {
    const f = TestBed.createComponent(ZoneSaisieMessage);
    f.componentRef.setInput('texte', options.texte ?? '');
    f.componentRef.setInput('piecesJointes', options.piecesJointes ?? true);
    f.componentRef.setInput('stickers', options.stickers ?? true);
    f.componentRef.setInput('pieceEnAttente', options.pieceEnAttente ?? false);
    const sortie = { stickers: [] as string[], fichiers: [] as FichierChoisi[], vocaux: [] as VocalEnregistre[], envois: 0 };
    f.componentInstance.sticker.subscribe((s) => sortie.stickers.push(s));
    f.componentInstance.fichier.subscribe((x) => sortie.fichiers.push(x));
    f.componentInstance.vocal.subscribe((v) => sortie.vocaux.push(v));
    f.componentInstance.envoyer.subscribe(() => sortie.envois++);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const bouton = (libelle: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${libelle}"]`);
    return { f, el, sortie, bouton };
  };

  describe('avec un navigateur qui sait enregistrer', () => {
    beforeEach(() => {
      vi.stubGlobal('MediaRecorder', class {});
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(() => undefined)) } });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    });

    it('affiche le micro à la place de l’envoi tant que rien n’est saisi', () => {
      const { f, bouton } = monter();
      expect(bouton('Enregistrer un message vocal')).not.toBeNull();
      expect(bouton('Envoyer')).toBeNull();
      f.componentRef.setInput('texte', 'Salut');
      f.detectChanges();
      expect(bouton('Enregistrer un message vocal')).toBeNull();
      expect(bouton('Envoyer')).not.toBeNull();
    });

    it('le micro lance l’enregistreur, qui remplace la saisie', () => {
      const { f, el, bouton } = monter();
      bouton('Enregistrer un message vocal')!.click();
      f.detectChanges();
      expect(el.querySelector('app-enregistreur-vocal')).not.toBeNull();
      expect(el.querySelector('textarea')).toBeNull();
    });

    it('pas de micro pendant une modification ni quand une pièce attend', () => {
      const avecPiece = monter({ pieceEnAttente: true });
      expect(avecPiece.bouton('Enregistrer un message vocal')).toBeNull();
      expect(avecPiece.bouton('Envoyer')!.disabled).toBe(false); // envoi sans légende
    });
  });

  it('sans micro disponible, garde le bouton d’envoi', () => {
    const { bouton } = monter();
    expect(bouton('Enregistrer un message vocal')).toBeNull();
    expect(bouton('Envoyer')!.disabled).toBe(true);
  });

  it('un clic sur un sticker l’envoie et referme le panneau', () => {
    const { f, el, sortie, bouton } = monter();
    bouton('Stickers')!.click();
    f.detectChanges();
    expect(el.querySelectorAll('app-selecteur-sticker .sticker').length).toBe(12);
    bouton('Envoyer le sticker Bravo !')!.click();
    f.detectChanges();
    expect(sortie.stickers).toEqual(['bravo']);
    expect(el.querySelector('app-selecteur-sticker')).toBeNull();
  });

  it('le trombone propose une photo ou un document et transmet le fichier choisi', () => {
    const { f, el, sortie, bouton } = monter();
    bouton('Joindre une photo ou un document')!.click();
    f.detectChanges();
    const choix = [...el.querySelectorAll<HTMLButtonElement>('.joindre button')].map((b) => b.textContent?.trim());
    expect(choix).toEqual(['Photo', 'Document']);

    const champ = el.querySelectorAll<HTMLInputElement>('input[type="file"]')[1];
    const fichier = new File(['%PDF'], 'cours.pdf', { type: 'application/pdf' });
    Object.defineProperty(champ, 'files', { value: [fichier], configurable: true });
    champ.dispatchEvent(new Event('change'));
    expect(sortie.fichiers).toEqual([{ fichier, kind: 'FILE' }]);
  });

  it('masque stickers et trombone en modification, et le trombone si les pièces jointes sont désactivées', () => {
    const edition = monter({ texte: 'Bonjour' });
    edition.f.componentRef.setInput('edition', true);
    edition.f.detectChanges();
    expect(edition.bouton('Stickers')).toBeNull();
    expect(edition.bouton('Joindre une photo ou un document')).toBeNull();

    const sansStockage = monter({ piecesJointes: false });
    expect(sansStockage.bouton('Joindre une photo ou un document')).toBeNull();
    expect(sansStockage.bouton('Stickers')).not.toBeNull();
  });
});
