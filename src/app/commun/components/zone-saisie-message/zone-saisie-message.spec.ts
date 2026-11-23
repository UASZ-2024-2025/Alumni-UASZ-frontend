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
    return { f, el, envoyes, bouton: () => el.querySelector('button') as HTMLButtonElement, zone: () => el.querySelector('textarea') as HTMLTextAreaElement };
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
});
