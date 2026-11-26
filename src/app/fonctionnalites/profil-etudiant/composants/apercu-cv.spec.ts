import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { cvInitial, DonneesCv } from '../modeles/cv.modele';
import { ApercuCv } from './apercu-cv';

const afficher = (photo: string | null) => {
  const fixture = TestBed.createComponent(ApercuCv);
  const d: DonneesCv = { ...cvInitial(null, null), prenom: 'Awa', nom: 'Diop', photo };
  fixture.componentRef.setInput('donnees', d);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
};

describe('ApercuCv : photo (ALUM-256)', () => {
  it('affiche la photo à la place des initiales', () => {
    const el = afficher('data:image/jpeg;base64,AAAA');
    const img = el.querySelector('img.photo') as HTMLImageElement;

    expect(img.src).toBe('data:image/jpeg;base64,AAAA');
    expect(img.alt).toBe('Photo de Awa Diop');
    expect(el.querySelector('.initiales')).toBeNull();
  });

  it('affiche les initiales sans photo', () => {
    const el = afficher(null);

    expect(el.querySelector('img.photo')).toBeNull();
    expect(el.querySelector('.initiales')?.textContent).toBe('AD');
  });
});
