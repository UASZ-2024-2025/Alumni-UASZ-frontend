import { TestBed } from '@angular/core/testing';
import { BarreRecherche } from './barre-recherche';

describe('BarreRecherche', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const creer = async () => {
    const f = TestBed.createComponent(BarreRecherche);
    f.detectChanges();
    await f.whenStable(); // ngModel s'enregistre de façon asynchrone
    const recherches: string[] = [];
    let reinit = 0;
    f.componentInstance.recherche.subscribe((t) => recherches.push(t));
    f.componentInstance.reinitialiser.subscribe(() => reinit++);
    const el = f.nativeElement as HTMLElement;
    const saisir = (t: string) => {
      const input = el.querySelector('input')!;
      input.value = t;
      input.dispatchEvent(new Event('input'));
    };
    return { f, el, recherches, saisir, reinit: () => reinit };
  };

  it("n'émet qu'une fois, après le délai, avec le texte nettoyé", async () => {
    const { recherches, saisir } = await creer();
    saisir('de');
    saisir(' dev ');
    vi.advanceTimersByTime(299);
    expect(recherches).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(recherches).toEqual(['dev']);
  });

  it('efface la saisie et prévient le parent', async () => {
    const { el, recherches, saisir, reinit } = await creer();
    saisir('dev');
    el.querySelector('button')!.click();
    vi.advanceTimersByTime(500);
    expect(recherches).toEqual(['']);
    expect(reinit()).toBe(1);
  });
});
