import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Carte } from './carte';

@Component({ imports: [Carte], template: '<app-carte [titre]="titre"><p>contenu</p></app-carte>' })
class Hote {
  titre?: string = 'Inscriptions';
}

describe('Carte', () => {
  const monter = (titre?: string) => {
    const f = TestBed.createComponent(Hote);
    f.componentInstance.titre = titre;
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche le titre et le contenu projeté', () => {
    const el = monter('Inscriptions');
    expect(el.querySelector('h2')!.textContent).toBe('Inscriptions');
    expect(el.textContent).toContain('contenu');
  });

  it("n'affiche pas de titre quand il est absent", () => {
    expect(monter().querySelector('h2')).toBeNull();
  });
});
