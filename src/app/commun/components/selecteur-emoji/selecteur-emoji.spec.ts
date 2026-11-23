import { TestBed } from '@angular/core/testing';
import { CATEGORIES_EMOJI, CLE_RECENTS } from './emojis';
import { SelecteurEmoji } from './selecteur-emoji';

describe('SelecteurEmoji (ALUM-260)', () => {
  beforeEach(() => localStorage.removeItem(CLE_RECENTS));

  const monter = () => {
    const f = TestBed.createComponent(SelecteurEmoji);
    const choisis: string[] = [];
    let fermetures = 0;
    f.componentInstance.choisi.subscribe((e) => choisis.push(e));
    f.componentInstance.fermer.subscribe(() => fermetures++);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const onglet = (libelle: string) => el.querySelector<HTMLButtonElement>(`[role="tab"][aria-label="${libelle}"]`)!;
    const emojis = () => [...el.querySelectorAll<HTMLButtonElement>('.emoji')].map((b) => b.textContent?.trim());
    const bouton = (emoji: string) => [...el.querySelectorAll<HTMLButtonElement>('.emoji')].find((b) => b.textContent?.trim() === emoji)!;
    return { f, el, choisis, onglet, emojis, bouton, fermetures: () => fermetures };
  };

  it('ouvre sur les smileys et change de catégorie', () => {
    const { f, el, onglet, emojis } = monter();
    expect(el.querySelector('.titre')!.textContent).toContain('Smileys et émotions');
    expect(emojis()).toContain('😂');
    onglet('Célébrations').click();
    f.detectChanges();
    expect(emojis()).toContain('🎓');
    expect(emojis()).not.toContain('😂');
  });

  it('chaque catégorie contient des émojis distincts', () => {
    for (const c of CATEGORIES_EMOJI) expect(new Set(c.emojis).size).toBe(c.emojis.length);
  });

  it("émet l'émoji choisi et le mémorise dans les récents", () => {
    const { choisis, bouton } = monter();
    bouton('😂').click();
    expect(choisis).toEqual(['😂']);
    expect(JSON.parse(localStorage.getItem(CLE_RECENTS)!)).toEqual(['😂']);
  });

  it('ouvre sur « Récents », le plus récent en premier et sans doublon', () => {
    localStorage.setItem(CLE_RECENTS, JSON.stringify(['👍', '🎉']));
    const { el, emojis, bouton } = monter();
    expect(el.querySelector('.titre')!.textContent).toContain('Récents');
    expect(emojis()).toEqual(['👍', '🎉']);
    bouton('🎉').click();
    expect(JSON.parse(localStorage.getItem(CLE_RECENTS)!)).toEqual(['🎉', '👍']);
  });

  it('ignore des récents illisibles', () => {
    localStorage.setItem(CLE_RECENTS, '{pas du json');
    const { el } = monter();
    expect(el.querySelector('.titre')!.textContent).toContain('Smileys');
  });

  it('demande la fermeture sur Échap', () => {
    const { el, fermetures } = monter();
    el.querySelector('.panneau')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fermetures()).toBe(1);
  });
});
