import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarreLaterale } from './barre-laterale';

describe('BarreLaterale', () => {
  let fixture: ComponentFixture<BarreLaterale>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarreLaterale], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BarreLaterale);
    fixture.componentRef.setInput('elements', [
      { libelle: 'Administration', chemin: '/administration' },
      { libelle: 'Offres', chemin: '/offres-emploi' },
    ]);
    fixture.componentRef.setInput('nom', 'Awa Diallo');
    fixture.componentRef.setInput('role', 'ETUDIANT');
    fixture.detectChanges();
  });

  it('affiche un lien par élément de menu', () => {
    const liens = fixture.nativeElement.querySelectorAll('nav a');
    expect(liens.length).toBe(2);
    expect(liens[0].textContent).toContain('Administration');
  });

  it("affiche l'initiale, le nom et le rôle", () => {
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('A');
    expect(html).toContain('Awa Diallo');
    expect(html).toContain('ETUDIANT');
  });

  it('masque la déconnexion tant que le profil est fermé', () => {
    expect(fixture.nativeElement.querySelector('.deconnexion')).toBeNull();
  });

  it('émet la déconnexion depuis le menu du profil', () => {
    let emis = false;
    fixture.componentInstance.deconnexion.subscribe(() => (emis = true));
    fixture.nativeElement.querySelector('.utilisateur').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.deconnexion').click();
    expect(emis).toBe(true);
  });

  it('ferme le menu au clic en dehors', () => {
    fixture.nativeElement.querySelector('.utilisateur').click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.deconnexion')).toBeNull();
  });
});
