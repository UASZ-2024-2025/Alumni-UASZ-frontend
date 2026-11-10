import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { GestionUtilisateurs } from './gestion-utilisateurs';

const awa: User = { id: '1', firstName: 'Awa', lastName: 'Diop', email: 'awa@uasz.sn', role: 'ALUMNI', status: 'ACTIF' };
const moi: User = { id: '5', firstName: 'Admin', lastName: 'UASZ', email: 'admin@uasz.sn', role: 'ADMINISTRATEUR', status: 'ACTIF' };

describe('GestionUtilisateurs : création et modification', () => {
  let api: { listUsers: ReturnType<typeof vi.fn>; createUser: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn> };
  let auth: { utilisateur: ReturnType<typeof signal>; mettreAJourUtilisateur: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<GestionUtilisateurs>;
  let el: HTMLElement;

  const champ = (libelle: string) =>
    Array.from(el.querySelectorAll('app-champ'))
      .find((c) => c.querySelector('label')?.textContent?.includes(libelle))!
      .querySelector('input,select') as HTMLInputElement;
  const saisir = (libelle: string, valeur: string) => {
    const c = champ(libelle);
    c.value = valeur;
    c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
  };
  const bouton = (nom: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${nom}"]`)!;
  const soumettre = () => {
    el.querySelector('app-modale form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const ouvrirCreation = () => {
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Créer un utilisateur'))!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      listUsers: vi.fn(() => of({ content: [awa, moi], totalElements: 2, page: 0, size: 20 })),
      createUser: vi.fn(() => of({ ...awa, id: '9', email: 'nouveau@uasz.sn' })),
      updateUser: vi.fn((_id: string, corps: object) => of({ ...awa, ...corps })),
    };
    auth = { utilisateur: signal({ id: '5' }), mettreAJourUtilisateur: vi.fn() };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: api },
        { provide: AuthentificationService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmationService, useValue: { demander: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(GestionUtilisateurs);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('crée un utilisateur avec son rôle puis recharge la liste', () => {
    ouvrirCreation();
    saisir('Prénom', ' Ibou ');
    saisir('Nom', 'Ndiaye');
    saisir('Email', 'nouveau@uasz.sn');
    saisir('Rôle', 'ENTREPRISE');
    soumettre();
    expect(api.createUser).toHaveBeenCalledWith({ firstName: 'Ibou', lastName: 'Ndiaye', email: 'nouveau@uasz.sn', phone: undefined, role: 'ENTREPRISE' });
    expect(toast.succes).toHaveBeenCalledWith('Compte créé. Une invitation a été envoyée à nouveau@uasz.sn.');
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });

  it("n'appelle pas l'API si un champ obligatoire manque", () => {
    ouvrirCreation();
    saisir('Prénom', 'Ibou');
    soumettre();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("affiche l'erreur 409 dans la modale sans la fermer", () => {
    api.createUser.mockReturnValue(throwError(() => new ErreurApi(409, 'EMAIL_ALREADY_EXISTS', 'x')));
    ouvrirCreation();
    saisir('Prénom', 'Ibou');
    saisir('Nom', 'Ndiaye');
    saisir('Email', 'awa@uasz.sn');
    soumettre();
    expect(el.querySelector('app-modale')!.textContent).toContain('Cette adresse email est déjà utilisée.');
  });

  it("modifie un utilisateur sans envoyer l'email s'il n'a pas changé", () => {
    bouton('Modifier Awa Diop').click();
    fixture.detectChanges();
    saisir('Téléphone', '771234567');
    soumettre();
    expect(api.updateUser).toHaveBeenCalledWith('1', { firstName: 'Awa', lastName: 'Diop', email: undefined, phone: '771234567' });
    expect(auth.mettreAJourUtilisateur).not.toHaveBeenCalled();
  });

  it('met à jour la session quand on modifie son propre compte', () => {
    api.updateUser.mockImplementation((_id: string, corps: object) => of({ ...moi, ...corps }));
    bouton('Modifier Admin UASZ').click();
    fixture.detectChanges();
    saisir('Prénom', 'Root');
    soumettre();
    expect(auth.mettreAJourUtilisateur).toHaveBeenCalled();
  });
});
