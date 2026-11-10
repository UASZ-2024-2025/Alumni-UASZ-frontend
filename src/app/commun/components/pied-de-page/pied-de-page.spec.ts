import { TestBed } from '@angular/core/testing';
import { PiedDePage } from './pied-de-page';

describe('PiedDePage', () => {
  it("affiche l'année courante et le nom de l'université", () => {
    const fixture = TestBed.createComponent(PiedDePage);
    fixture.detectChanges();
    const texte: string = fixture.nativeElement.textContent;
    expect(texte).toContain(String(new Date().getFullYear()));
    expect(texte).toContain('Université Assane Seck de Ziguinchor');
  });
});
