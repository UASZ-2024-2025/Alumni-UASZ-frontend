import { TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

describe('Avatar', () => {
  const rendu = (nom: string) => {
    const f = TestBed.createComponent(Avatar);
    f.componentRef.setInput('nom', nom);
    f.detectChanges();
    return f.nativeElement.textContent.trim();
  };

  it.each([['Awa Diop', 'AD'], ['  moussa  ', 'M'], ['', '?'], ['Jean Pierre Martin', 'JP']])('« %s » → %s', (nom, attendu) => {
    expect(rendu(nom)).toBe(attendu);
  });
});
