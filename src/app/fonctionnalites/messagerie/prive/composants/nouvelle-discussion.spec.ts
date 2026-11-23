import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../../api/generes/alumni/api/companies.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { Contact, NouvelleDiscussion } from './nouvelle-discussion';

describe('NouvelleDiscussion', () => {
  let etudiants: { searchStudents: ReturnType<typeof vi.fn> };
  let alumni: { searchAlumni: ReturnType<typeof vi.fn> };
  let entreprises: { searchCompanies: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<NouvelleDiscussion>;
  let el: HTMLElement;

  const rafraichir = () => {
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
  };
  const chercher = (texte: string) => {
    const champ = el.querySelector<HTMLInputElement>('.recherche input')!;
    champ.value = texte;
    champ.dispatchEvent(new Event('input'));
    rafraichir();
  };
  const onglet = (libelle: string) => {
    [...el.querySelectorAll<HTMLButtonElement>('.filtre')].find((b) => b.textContent?.trim() === libelle)!.click();
    rafraichir();
  };
  const categories = () => [...el.querySelectorAll('.categorie')].map((h) => h.textContent?.trim());
  const noms = () => [...el.querySelectorAll('.personne strong')].map((s) => s.textContent?.trim());

  beforeEach(() => {
    vi.useFakeTimers();
    etudiants = { searchStudents: vi.fn(() => of({ content: [{ userId: 'u1', firstName: 'Moussa', lastName: 'Ndiaye', specialty: 'GL' }] })) };
    alumni = { searchAlumni: vi.fn(() => of({ content: [
      { userId: 'u2', firstName: 'Awa', lastName: 'Diop', currentPosition: 'Développeuse' },
      { userId: 'moi', firstName: 'Moi', lastName: 'Même' },
    ] })) };
    entreprises = { searchCompanies: vi.fn(() => of({ content: [
      { id: 'c1', ownerId: 'u3', name: 'Sonatel', sector: 'Télécoms' },
      { id: 'c2', name: 'Partenaire sans compte' },
    ] })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: StudentsService, useValue: etudiants },
        { provide: AlumniService, useValue: alumni },
        { provide: CompaniesService, useValue: entreprises },
      ],
    });
    fixture = TestBed.createComponent(NouvelleDiscussion);
    fixture.componentRef.setInput('exclus', ['moi']);
    fixture.detectChanges();
    el = fixture.nativeElement;
    rafraichir();
  });

  afterEach(() => vi.useRealTimers());

  it('propose dès l’ouverture des personnes classées par catégorie, sans soi-même ni entreprise sans compte', () => {
    expect(categories()).toEqual(['Étudiants', 'Alumni', 'Entreprises']);
    expect(noms()).toEqual(['Moussa Ndiaye', 'Awa Diop', 'Sonatel']);
    expect(el.textContent).toContain('Suggestions');
    expect(el.textContent).toContain('Télécoms');
  });

  it('cherche dans les trois annuaires à partir de 2 lettres', () => {
    chercher(' so ');
    expect(etudiants.searchStudents).toHaveBeenLastCalledWith('so', undefined, undefined, undefined, 0, 5);
    expect(alumni.searchAlumni).toHaveBeenLastCalledWith('so', undefined, undefined, undefined, 0, 5);
    expect(entreprises.searchCompanies).toHaveBeenLastCalledWith('so', undefined, 0, 5);
    expect(el.textContent).not.toContain('Suggestions');
  });

  it('un onglet limite la recherche à une seule catégorie', () => {
    onglet('Entreprises');
    expect(entreprises.searchCompanies).toHaveBeenLastCalledWith(undefined, undefined, 0, 15);
    expect(etudiants.searchStudents).toHaveBeenCalledTimes(1);
    expect(categories()).toEqual(['Entreprises']);
    expect(noms()).toEqual(['Sonatel']);
  });

  it('choisir une personne la transmet avec sa catégorie', () => {
    const choisis: Contact[] = [];
    fixture.componentInstance.choisi.subscribe((c) => choisis.push(c));
    el.querySelector<HTMLButtonElement>('[aria-label="Écrire à Sonatel"]')!.click();
    expect(choisis).toEqual([{ userId: 'u3', nom: 'Sonatel', role: 'ENTREPRISE', detail: 'Télécoms' }]);
  });

  it('une catégorie en panne n’empêche pas les autres ; toutes en panne : message clair', () => {
    alumni.searchAlumni.mockReturnValue(throwError(() => new Error('x')));
    chercher('aw');
    expect(categories()).toEqual(['Étudiants', 'Entreprises']);

    etudiants.searchStudents.mockReturnValue(throwError(() => new Error('x')));
    entreprises.searchCompanies.mockReturnValue(throwError(() => new Error('x')));
    chercher('awa');
    expect(el.textContent).toContain('La recherche est indisponible pour le moment.');
  });
});
