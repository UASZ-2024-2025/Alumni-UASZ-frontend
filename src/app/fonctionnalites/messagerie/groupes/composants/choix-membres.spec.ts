import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { ChoixMembres } from './choix-membres';

describe('ChoixMembres', () => {
  let etudiants: { searchStudents: ReturnType<typeof vi.fn> };
  let alumni: { searchAlumni: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<ChoixMembres>;
  let el: HTMLElement;

  const chercher = (texte: string) => {
    const champ = el.querySelector<HTMLInputElement>('input')!;
    champ.value = texte;
    champ.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
  };
  const noms = () => [...el.querySelectorAll('.personne strong')].map((s) => s.textContent);

  beforeEach(() => {
    vi.useFakeTimers();
    etudiants = { searchStudents: vi.fn(() => of({ content: [{ id: 'p1', userId: 'u1', firstName: 'Moussa', lastName: 'Ndiaye', specialty: 'GL' }] })) };
    alumni = { searchAlumni: vi.fn(() => of({ content: [
      { id: 'p2', userId: 'u2', firstName: 'Awa', lastName: 'Diop', currentPosition: 'Développeuse' },
      { id: 'p3', userId: 'u3', firstName: 'Ibou', lastName: 'Ba' },
    ] })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: StudentsService, useValue: etudiants },
        { provide: AlumniService, useValue: alumni },
      ],
    });
    fixture = TestBed.createComponent(ChoixMembres);
    fixture.componentRef.setInput('exclus', ['u3']);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  afterEach(() => vi.useRealTimers());

  it('propose des suggestions dès l’ouverture, sans attendre la saisie', () => {
    vi.advanceTimersByTime(0);
    fixture.detectChanges();
    expect(etudiants.searchStudents).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, 0, 6);
    expect(alumni.searchAlumni).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, 0, 6);
    expect(noms()).toEqual(['Moussa Ndiaye', 'Awa Diop']);
    expect(el.textContent).toContain('Suggestions');
  });

  it('une seule lettre garde les suggestions, sans nouvelle requête', () => {
    chercher('a');
    expect(etudiants.searchStudents).toHaveBeenCalledTimes(1);
    expect(noms()).toEqual(['Moussa Ndiaye', 'Awa Diop']);
  });

  it('cherche dans les deux annuaires, sans les personnes déjà membres', () => {
    chercher(' aw ');
    expect(etudiants.searchStudents).toHaveBeenCalledWith('aw', undefined, undefined, undefined, 0, 6);
    expect(alumni.searchAlumni).toHaveBeenCalledWith('aw', undefined, undefined, undefined, 0, 6);
    expect(noms()).toEqual(['Moussa Ndiaye', 'Awa Diop']);
    expect(el.textContent).toContain('Alumni · Développeuse');
  });

  it("sélectionne par id de compte (userId) et retire la personne des résultats", () => {
    chercher('aw');
    el.querySelector<HTMLButtonElement>('[aria-label="Ajouter Awa Diop"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual([{ userId: 'u2', nom: 'Awa Diop', detail: 'Alumni · Développeuse' }]);
    expect(noms()).toEqual(['Moussa Ndiaye']);
    expect(el.querySelector('.puces')?.textContent).toContain('Awa Diop');

    el.querySelector<HTMLButtonElement>('[aria-label="Retirer Awa Diop"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it("garde les résultats d'un annuaire si l'autre échoue, et signale l'échec des deux", () => {
    alumni.searchAlumni.mockReturnValue(throwError(() => new Error('403')));
    chercher('mo');
    expect(noms()).toEqual(['Moussa Ndiaye']);

    etudiants.searchStudents.mockReturnValue(throwError(() => new Error('500')));
    chercher('mou');
    expect(el.textContent).toContain('La recherche est indisponible pour le moment.');
  });
});
