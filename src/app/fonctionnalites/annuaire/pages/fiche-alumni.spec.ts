import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { AlumniProfile } from '../../../api/generes/alumni/model/alumniProfile';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { FicheAlumni } from './fiche-alumni';

describe('FicheAlumni : bouton Contacter', () => {
  let el: HTMLElement;

  const creer = (profil: Partial<AlumniProfile>, moiId = 'u-2') => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a1' })) } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: moiId }), role: () => 'ETUDIANT' } },
        {
          provide: AlumniService,
          useValue: {
            getAlumniById: vi.fn(() => of({ id: 'a1', ...profil } as AlumniProfile)),
            getAlumniExperiences: vi.fn(() => of([])),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(FicheAlumni);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  it("ouvre le fil de messagerie avec l'identifiant du compte (userId)", () => {
    creer({ userId: 'u-9' });
    const lien = el.querySelector('a[href="/messagerie/u-9"]');
    expect(lien?.textContent).toContain('Contacter');
  });

  it('masque le bouton sur son propre profil', () => {
    creer({ userId: 'u-2' });
    expect(el.textContent).not.toContain('Contacter');
  });

  it("masque le bouton quand le profil n'a pas de userId", () => {
    creer({});
    expect(el.textContent).not.toContain('Contacter');
  });
});