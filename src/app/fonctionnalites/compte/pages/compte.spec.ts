import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../commun/services/toast.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { MotDePasse } from './mot-de-passe';
import { Profil } from './profil';

const utilisateur = { id: 'u1', firstName: 'Awa', lastName: 'Diop', email: 'awa@uasz.sn', role: 'ALUMNI', status: 'ACTIF' };

function saisir(el: HTMLElement, libelle: string, valeur: string) {
  const champ = Array.from(el.querySelectorAll('app-champ')).find((c) => c.querySelector('label')?.textContent?.includes(libelle))!;
  const input = champ.querySelector('input,select')! as HTMLInputElement;
  input.value = valeur;
  input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'));
}

describe('Profil', () => {
  const monter = (estAdmin: boolean, api: Partial<Record<'getUserById' | 'updateUser', unknown>>) => {
    const auth = { utilisateur: signal(utilisateur), role: signal('ALUMNI'), estAdministrateur: () => estAdmin, mettreAJourUtilisateur: vi.fn() };
    const toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthentificationService, useValue: auth },
        { provide: UsersService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    const f = TestBed.createComponent(Profil);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement, auth, toast };
  };

  it("charge le profil et verrouille l'email pour un non-administrateur", () => {
    const { el } = monter(false, { getUserById: vi.fn(() => of({ ...utilisateur, phone: '771234567' })) });
    expect((el.querySelector('input[type=email]') as HTMLInputElement).disabled).toBe(true);
    expect((el.querySelector('input[type=tel]') as HTMLInputElement).value).toBe('771234567');
  });

  it("n'envoie pas l'email pour un non-administrateur, ni les champs vides", () => {
    const updateUser = vi.fn(() => of(utilisateur));
    const { f, el, auth, toast } = monter(false, { getUserById: vi.fn(() => of(utilisateur)), updateUser });
    saisir(el, 'Prénom', 'Awa ');
    f.detectChanges();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(updateUser).toHaveBeenCalledWith('u1', { firstName: 'Awa', lastName: 'Diop' });
    expect(auth.mettreAJourUtilisateur).toHaveBeenCalled();
    expect(toast.succes).toHaveBeenCalled();
  });

  it("affiche l'erreur 409 de l'email", () => {
    const updateUser = vi.fn(() => throwError(() => new ErreurApi(409, 'EMAIL_ALREADY_EXISTS', 'x')));
    const { f, el } = monter(true, { getUserById: vi.fn(() => of(utilisateur)), updateUser });
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    f.detectChanges();
    expect(el.textContent).toContain('Cette adresse email est déjà utilisée.');
  });
});

describe('MotDePasse', () => {
  const monter = (changerMotDePasse: unknown) => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthentificationService, useValue: { changerMotDePasse } }] });
    const f = TestBed.createComponent(MotDePasse);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  };
  const soumettre = (f: { detectChanges: () => void }, el: HTMLElement) => {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    f.detectChanges();
  };

  it("n'appelle pas l'API si la politique n'est pas respectée", () => {
    const changer = vi.fn(() => of({}));
    const { f, el } = monter(changer);
    saisir(el, 'Mot de passe actuel', 'Ancien123');
    saisir(el, 'Nouveau mot de passe', 'court');
    saisir(el, 'Confirmer', 'court');
    soumettre(f, el);
    expect(changer).not.toHaveBeenCalled();
  });

  it('refuse un nouveau mot de passe identique à l’actuel', () => {
    const changer = vi.fn(() => of({}));
    const { f, el } = monter(changer);
    saisir(el, 'Mot de passe actuel', 'Ancien123');
    saisir(el, 'Nouveau mot de passe', 'Ancien123');
    saisir(el, 'Confirmer', 'Ancien123');
    soumettre(f, el);
    expect(changer).not.toHaveBeenCalled();
    expect(el.textContent).toContain('différent de l’actuel');
  });

  it('envoie les deux mots de passe quand le formulaire est valide', () => {
    const changer = vi.fn(() => of({}));
    const { f, el } = monter(changer);
    saisir(el, 'Mot de passe actuel', 'Ancien123');
    saisir(el, 'Nouveau mot de passe', 'Nouveau123');
    saisir(el, 'Confirmer', 'Nouveau123');
    soumettre(f, el);
    expect(changer).toHaveBeenCalledWith('Ancien123', 'Nouveau123');
  });

  it("affiche l'erreur renvoyée par le back", () => {
    const { f, el } = monter(vi.fn(() => throwError(() => new ErreurApi(400, 'INVALID_CURRENT_PASSWORD', 'Mot de passe actuel incorrect.'))));
    saisir(el, 'Mot de passe actuel', 'Mauvais123');
    saisir(el, 'Nouveau mot de passe', 'Nouveau123');
    saisir(el, 'Confirmer', 'Nouveau123');
    soumettre(f, el);
    expect(el.textContent).toContain('Mot de passe actuel incorrect.');
  });
});
