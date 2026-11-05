import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  const monter = (page: number, nbPages: number) => {
    const f = TestBed.createComponent(Pagination);
    f.componentRef.setInput('page', page);
    f.componentRef.setInput('nbPages', nbPages);
    const demandes: number[] = [];
    f.componentInstance.changement.subscribe((n) => demandes.push(n));
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const [precedent, suivant] = Array.from(el.querySelectorAll('button'));
    return { el, precedent, suivant, demandes };
  };

  it('affiche la page courante en partant de 1', () => {
    expect(monter(1, 3).el.textContent).toContain('Page 2 / 3');
  });

  it('désactive Précédent sur la première page et Suivant sur la dernière', () => {
    const debut = monter(0, 2);
    expect(debut.precedent.disabled).toBe(true);
    expect(debut.suivant.disabled).toBe(false);
    const fin = monter(1, 2);
    expect(fin.suivant.disabled).toBe(true);
  });

  it('émet la page demandée', () => {
    const { precedent, suivant, demandes } = monter(1, 3);
    precedent.click();
    suivant.click();
    expect(demandes).toEqual([0, 2]);
  });
});
