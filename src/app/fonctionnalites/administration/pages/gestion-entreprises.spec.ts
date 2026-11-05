import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { GestionEntreprises } from './gestion-entreprises';

const orange: Company = { id: 'c1', name: 'Orange', sector: 'Télécoms', contactEmail: 'rh@orange.sn', isPartner: false };
const page = (content: Company[]) => ({ content, totalElements: content.length, page: 0, size: 20 });

describe('GestionEntreprises', () => {
  let api: Record<'searchCompanies' | 'createCompany' | 'updateCompany', ReturnType<typeof vi.fn>>;
  let fixture: ComponentFixture<GestionEntreprises>;
  let el: HTMLElement;

  const saisir = (nom: string, valeur: string) => {
    const champ = el.querySelector<HTMLInputElement>(`[formControlName="${nom}"]`)!;
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
  };
  const soumettre = () => {
    el.querySelector<HTMLFormElement>('form.formulaire')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      searchCompanies: vi.fn(() => of(page([orange]))),
      createCompany: vi.fn(() => of({ ...orange, id: 'c2', name: 'Sonatel' })),
      updateCompany: vi.fn(() => of({ ...orange, isPartner: true })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CompaniesService, useValue: api }] });
    fixture = TestBed.createComponent(GestionEntreprises);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('charge la liste au démarrage', () => {
    expect(api.searchCompanies).toHaveBeenCalledWith(undefined, undefined, 0, 20);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('recherche avec le texte et le filtre partenaire', () => {
    el.querySelector<HTMLInputElement>('input[type="search"]')!.value = ' Oran ';
    el.querySelector<HTMLSelectElement>('select')!.value = 'oui';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(api.searchCompanies).toHaveBeenLastCalledWith('Oran', true, 0, 20);
  });

  it('passe une entreprise partenaire', () => {
    const case_ = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    case_.checked = true;
    case_.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(api.updateCompany).toHaveBeenCalledWith('c1', { isPartner: true });
    expect(el.textContent).toContain('Orange est partenaire.');
  });

  it('refuse un formulaire invalide', () => {
    saisir('name', 'Sonatel');
    saisir('contactEmail', 'pas-un-email');
    soumettre();
    expect(api.createCompany).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Le secteur est obligatoire.');
    expect(el.textContent).toContain('Un email valide est obligatoire.');
  });

  it("crée une entreprise sans envoyer les champs optionnels vides", () => {
    saisir('name', 'Sonatel');
    saisir('sector', 'Télécoms');
    saisir('contactEmail', 'rh@sonatel.sn');
    soumettre();
    expect(api.createCompany).toHaveBeenCalledWith({
      name: 'Sonatel', sector: 'Télécoms', contactEmail: 'rh@sonatel.sn',
      website: undefined, contactPhone: undefined, address: undefined, description: undefined,
    });
    expect(api.searchCompanies).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('Sonatel est créée.');
  });

  it('modifie une entreprise existante à partir du formulaire prérempli', () => {
    el.querySelector<HTMLButtonElement>('button[aria-label="Modifier Orange"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('[formControlName="name"]')!.value).toBe('Orange');
    saisir('sector', 'Mobile');
    soumettre();
    expect(api.updateCompany).toHaveBeenCalledWith('c1', expect.objectContaining({ sector: 'Mobile' }));
  });

  it('affiche le message du 409 à la création', () => {
    api.createCompany.mockReturnValue(throwError(() => new ErreurApi(409, 'EXISTS', 'Nom déjà utilisé')));
    saisir('name', 'Orange');
    saisir('sector', 'Télécoms');
    saisir('contactEmail', 'a@b.sn');
    soumettre();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Nom déjà utilisé');
  });
});
