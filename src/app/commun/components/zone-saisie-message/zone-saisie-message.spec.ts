import { TestBed } from '@angular/core/testing';
import { ZoneSaisieMessage } from './zone-saisie-message';

describe('ZoneSaisieMessage', () => {
  const monter = (texte = '', envoiEnCours = false) => {
    const f = TestBed.createComponent(ZoneSaisieMessage);
    f.componentRef.setInput('texte', texte);
    f.componentRef.setInput('envoiEnCours', envoiEnCours);
    const envoyes: number[] = [];
    f.componentInstance.envoyer.subscribe(() => envoyes.push(1));
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, el, envoyes, bouton: () => el.querySelector('button[type="submit"]') as HTMLButtonElement, zone: () => el.querySelector('textarea') as HTMLTextAreaElement };
  };

  it('désactive le bouton tant que le texte est vide ou pendant l’envoi', async () => {
    expect(monter('').bouton().disabled).toBe(true);
    expect(monter('Salut', true).bouton().disabled).toBe(true);
    expect(monter('Salut').bouton().disabled).toBe(false);
  });

  it('affiche un bouton rond à icône : « Envoyer », puis « Enregistrer la modification » en modification', async () => {
    const { f, bouton } = monter('Salut');
    expect(bouton().getAttribute('aria-label')).toBe('Envoyer');
    expect(bouton().textContent?.trim()).toBe('');
    expect(bouton().querySelector('svg')).not.toBeNull();
    f.componentRef.setInput('edition', true);
    f.detectChanges();
    expect(bouton().getAttribute('aria-label')).toBe('Enregistrer la modification');
  });

  it('envoie avec Entrée mais pas avec Maj+Entrée', async () => {
    const { f, zone, envoyes } = monter('Salut');
    zone().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    expect(envoyes.length).toBe(0);
    zone().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(envoyes.length).toBe(1);
    f.detectChanges();
  });

  it('met à jour le texte à la frappe', async () => {
    const { f, zone } = monter();
    zone().value = 'Bonjour';
    zone().dispatchEvent(new Event('input'));
    expect(f.componentInstance.texte()).toBe('Bonjour');
  });

  describe('émojis (ALUM-260)', () => {
    const boutonEmojis = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[aria-label="Émojis"]')!;
    const choisir = (el: HTMLElement, emoji: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('app-selecteur-emoji .emoji')].find((b) => b.textContent?.trim() === emoji)!.click();

    beforeEach(() => localStorage.clear());

    it('ouvre et referme le panneau', () => {
      const { f, el } = monter();
      expect(el.querySelector('app-selecteur-emoji')).toBeNull();
      boutonEmojis(el).click();
      f.detectChanges();
      expect(boutonEmojis(el).getAttribute('aria-expanded')).toBe('true');
      expect(el.querySelector('app-selecteur-emoji')).not.toBeNull();
      boutonEmojis(el).click();
      f.detectChanges();
      expect(el.querySelector('app-selecteur-emoji')).toBeNull();
    });

    it("insère l'émoji à la position du curseur", async () => {
      const { f, el, zone } = monter('Bonjour à tous');
      await f.whenStable();
      f.detectChanges();
      expect(zone().value.length).toBeGreaterThan(0);
      zone().setSelectionRange(7, 7);
      zone().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      boutonEmojis(el).click();
      f.detectChanges();
      choisir(el, '😀');
      expect(f.componentInstance.texte()).toBe('Bonjour😀 à tous');
      choisir(el, '😂'); // le suivant se place juste après
      expect(f.componentInstance.texte()).toBe('Bonjour😀😂 à tous');
    });

    it('remplace le texte sélectionné', async () => {
      const { f, el, zone } = monter('Merci beaucoup');
      await f.whenStable();
      f.detectChanges();
      expect(zone().value.length).toBeGreaterThan(0);
      zone().setSelectionRange(6, 14);
      zone().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      boutonEmojis(el).click();
      f.detectChanges();
      choisir(el, '😀');
      expect(f.componentInstance.texte()).toBe('Merci 😀');
    });

    it('ne dépasse pas la longueur maximale', () => {
      const f = TestBed.createComponent(ZoneSaisieMessage);
      f.componentRef.setInput('texte', 'abc');
      f.componentRef.setInput('longueurMax', 4);
      f.detectChanges();
      const el = f.nativeElement as HTMLElement;
      boutonEmojis(el).click();
      f.detectChanges();
      choisir(el, '😀'); // 2 unités UTF-16 : 5 > 4
      expect(f.componentInstance.texte()).toBe('abc');
    });

    it('ferme le panneau au clic en dehors et à l’envoi', () => {
      const { f, el, envoyes } = monter('Salut');
      boutonEmojis(el).click();
      f.detectChanges();
      document.body.click();
      f.detectChanges();
      expect(el.querySelector('app-selecteur-emoji')).toBeNull();

      boutonEmojis(el).click();
      f.detectChanges();
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      f.detectChanges();
      expect(envoyes.length).toBe(1);
      expect(el.querySelector('app-selecteur-emoji')).toBeNull();
    });
  });
});
