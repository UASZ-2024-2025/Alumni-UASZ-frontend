import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { FicheEtudiant } from './fiche-etudiant';

describe('FicheEtudiant : bouton Contacter', () => {
  let el: HTMLElement;

  const creer = (profil: Partial<StudentProfile>, moiId = 'u-2') => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 's1' })) } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: moiId }), role: () => 'ETUDIANT' } },
        {
          provide: StudentsService,
          useValue: {
            getStudentById: vi.fn(() => of({ id: 's1', ...profil } as StudentProfile)),
            getStudentCv: vi.fn(() => NEVER),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(FicheEtudiant);
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
