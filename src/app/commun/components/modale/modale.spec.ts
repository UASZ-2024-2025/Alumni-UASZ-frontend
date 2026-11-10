import { TestBed } from '@angular/core/testing';
import { Modale } from './modale';

describe('Modale', () => {
  const monter = (ouvert: boolean) => {
    const fixture = TestBed.createComponent(Modale);
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('ouvert', ouvert);
    fixture.detectChanges();
    return fixture;
  };

  it('ne rend rien quand elle est fermée', () => {
    expect(monter(false).nativeElement.querySelector('dialog')).toBeNull();
  });

  it('affiche le titre quand elle est ouverte', () => {
    expect(monter(true).nativeElement.querySelector('h2').textContent).toBe('Titre');
  });

  it('demande la fermeture avec la croix, le fond et Échap', () => {
    const fixture = monter(true);
    let n = 0;
    fixture.componentInstance.fermer.subscribe(() => n++);
    fixture.nativeElement.querySelector('.croix').click();
    fixture.nativeElement.querySelector('.fond').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(n).toBe(3);
  });
});
