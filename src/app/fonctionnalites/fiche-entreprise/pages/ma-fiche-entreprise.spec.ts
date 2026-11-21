import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../commun/services/toast.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { MaFicheEntreprise } from './ma-fiche-entreprise';

const FICHE: Company = {
  id: 'f1', ownerId: 'u4', name: 'Gainde 2000', sector: 'Informatique',
  contactEmail: 'rh@gainde.sn', isPartner: false,
};
const introuvable = () => throwError(() => new ErreurApi(404, 'COMPANY_NOT_FOUND', 'Pas de fiche'));

describe('MaFicheEntreprise', () => {
  let api: Record<'getMyCompany' | 'createCompany' | 'updateCompany', ReturnType<typeof vi.fn>>;
  let utilisateur: ReturnType<typeof signal<User | null>>;
  let mettreAJourUtilisateur: ReturnType<typeof vi.fn>;
  let toast: { succes: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<MaFicheEntreprise>;
  let el: HTMLElement;

  const monter = (fiche$: Observable<Company>) => {
    api.getMyCompany.mockReturnValue(fiche$);
    fixture = TestBed.createComponent(MaFicheEntreprise);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const saisir = (nom: string, valeur: string) => {
    const champ = el.querySelector<HTMLInputElement>(`app-champ[formControlName="${nom}"] input`)!;
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
  };
  const soumettre = () => {
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const remplir = () => {
    saisir('name', ' Gainde 2000 ');
    saisir('sector', 'Informatique');
    saisir('contactEmail', 'rh@gainde.sn');
  };

  beforeEach(() => {
    api = { getMyCompany: vi.fn(), createCompany: vi.fn(), updateCompany: vi.fn() };
    utilisateur = signal<User | null>({ id: 'u4', role: 'ENTREPRISE' });
    mettreAJourUtilisateur = vi.fn((u: User) => utilisateur.set(u));
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      imports: [MaFicheEntreprise],
      providers: [
        provideRouter([]),
        { provide: CompaniesService, useValue: api },
        { provide: AuthentificationService, useValue: { utilisateur, mettreAJourUtilisateur } },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it("propose le formulaire de création quand le compte n'a pas de fiche (404)", () => {
    monter(introuvable());
    expect(el.textContent).toContain("Votre compte n'est rattaché à aucune entreprise");
    expect(el.textContent).toContain('Créer ma fiche');
  });

  it('crée la fiche, sans les champs facultatifs vides, et met le companyId dans la session', () => {
    monter(introuvable());
    api.createCompany.mockReturnValue(of(FICHE));
    remplir();
    soumettre();

    expect(api.createCompany).toHaveBeenCalledWith({
      name: 'Gainde 2000', sector: 'Informatique', contactEmail: 'rh@gainde.sn',
      contactPhone: undefined, website: undefined, address: undefined, description: undefined,
    });
    expect(mettreAJourUtilisateur).toHaveBeenCalledWith({ id: 'u4', role: 'ENTREPRISE', companyId: 'f1' });
    expect(toast.succes).toHaveBeenCalledWith('Votre fiche entreprise est créée.');
    expect(el.textContent).toContain('En attente de validation');
  });

  it("n'envoie pas un formulaire incomplet", () => {
    monter(introuvable());
    saisir('name', 'Gainde 2000');
    saisir('website', 'gainde.sn');
    soumettre();
    expect(api.createCompany).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Le secteur est obligatoire.');
    expect(el.textContent).toContain('http:// ou https://');
  });

  it('affiche la fiche existante, son statut, et synchronise la session', () => {
    monter(of({ ...FICHE, isPartner: true }));
    expect(el.textContent).toContain('Gainde 2000');
    expect(el.textContent).toContain('Partenaire validé');
    expect(el.querySelector('a[href="/offres-emploi/publier"]')).not.toBeNull();
    expect(mettreAJourUtilisateur).toHaveBeenCalledWith(expect.objectContaining({ companyId: 'f1' }));
  });

  it('ne touche pas à la session quand le companyId est déjà le bon', () => {
    utilisateur.set({ id: 'u4', role: 'ENTREPRISE', companyId: 'f1' });
    monter(of(FICHE));
    expect(mettreAJourUtilisateur).not.toHaveBeenCalled();
  });

  it('modifie la fiche existante avec PUT /companies/{id}', () => {
    monter(of(FICHE));
    api.updateCompany.mockReturnValue(of({ ...FICHE, sector: 'Numérique' }));
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Modifier ma fiche'))!.click();
    fixture.detectChanges();
    saisir('sector', 'Numérique');
    soumettre();

    expect(api.updateCompany).toHaveBeenCalledWith('f1', expect.objectContaining({ sector: 'Numérique' }));
    expect(toast.succes).toHaveBeenCalledWith('Votre fiche entreprise est enregistrée.');
    expect(el.textContent).toContain('Numérique');
  });

  it('explique le refus 409 et recharge la fiche déjà rattachée au compte', () => {
    monter(introuvable());
    api.createCompany.mockReturnValue(
      throwError(() => new ErreurApi(409, 'COMPANY_ALREADY_EXISTS', 'Un compte ne gère qu’une fiche')),
    );
    api.getMyCompany.mockReturnValue(of(FICHE));
    remplir();
    soumettre();

    expect(api.getMyCompany).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('Gainde 2000');
  });

  it('affiche une erreur de chargement autre que 404 avec un bouton Réessayer', () => {
    monter(throwError(() => new ErreurApi(503, 'INDISPONIBLE', 'Service indisponible')));
    expect(el.textContent).toContain('Service indisponible');
    api.getMyCompany.mockReturnValue(of(FICHE));
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Réessayer'))!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Gainde 2000');
  });
});
