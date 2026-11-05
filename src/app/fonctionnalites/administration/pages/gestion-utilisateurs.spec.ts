import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { GestionUtilisateurs } from './gestion-utilisateurs';

const awa: User = { id: '1', firstName: 'Awa', lastName: 'Diop', email: 'awa@uasz.sn', role: 'ALUMNI', status: 'ACTIF' };
const moi: User = { id: '5', firstName: 'Admin', lastName: 'UASZ', email: 'admin@uasz.sn', role: 'ADMINISTRATEUR', status: 'ACTIF' };
const fatou: User = { id: '3', firstName: 'Fatou', lastName: 'Sow', email: 'fatou@uasz.sn', role: 'ENSEIGNANT', status: 'EN_ATTENTE' };
const page = (content: User[], totalElements = content.length, p = 0) => ({ content, totalElements, page: p, size: 20 });

describe('GestionUtilisateurs', () => {
  let api: { listUsers: ReturnType<typeof vi.fn>; updateUserStatus: ReturnType<typeof vi.fn>; deleteUser: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<GestionUtilisateurs>;
  let el: HTMLElement;
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };

  const monter = () => {
    fixture = TestBed.createComponent(GestionUtilisateurs);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const bouton = (nom: string) =>
    el.querySelector<HTMLButtonElement>(`button[aria-label="${nom}"]`)!;
  const cliquer = (b: HTMLButtonElement) => { b.click(); fixture.detectChanges(); };
  const cliquerEtAttendre = async (b: HTMLButtonElement) => { b.click(); await fixture.whenStable(); fixture.detectChanges(); };

  beforeEach(() => {
    api = {
      listUsers: vi.fn(() => of(page([awa, moi, fatou]))),
      updateUserStatus: vi.fn(),
      deleteUser: vi.fn(() => of(null)),
    };
    confirmation = { demander: vi.fn(() => Promise.resolve(true)) };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmationService, useValue: confirmation },
        { provide: ToastService, useValue: toast },
        { provide: UsersService, useValue: api },
        { provide: AuthentificationService, useValue: { utilisateur: signal({ id: '5' }) } },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('charge la première page sans filtre', () => {
    monter();
    expect(api.listUsers).toHaveBeenCalledWith(undefined, undefined, 0, 20);
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('affiche un message quand la liste est vide', () => {
    api.listUsers.mockReturnValue(of(page([])));
    monter();
    expect(el.textContent).toContain('Aucun résultat pour ces filtres');
  });

  it('affiche le message du 403 et permet de réessayer', () => {
    api.listUsers.mockReturnValueOnce(throwError(() => new ErreurApi(403, 'FORBIDDEN', 'x')));
    monter();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain("réservée à l'administrateur");
    api.listUsers.mockReturnValue(of(page([awa])));
    cliquer(el.querySelector<HTMLButtonElement>('[role="alert"] button')!);
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('remet la page à 0 et filtre par rôle', () => {
    monter();
    const select = el.querySelectorAll('select')[0] as HTMLSelectElement;
    select.value = 'ALUMNI';
    select.dispatchEvent(new Event('change'));
    expect(api.listUsers).toHaveBeenLastCalledWith('ALUMNI', undefined, 0, 20);
  });

  it('affiche les rôles et statuts en français', () => {
    monter();
    expect(el.textContent).toContain('En attente');
    expect(el.textContent).toContain('Administrateur');
    expect(el.textContent).not.toContain('EN_ATTENTE');
  });

  it('filtre par statut avec les puces', () => {
    monter();
    const puce = [...el.querySelectorAll<HTMLButtonElement>('.puce')].find((b) => b.textContent!.trim() === 'Suspendu')!;
    cliquer(puce);
    expect(api.listUsers).toHaveBeenLastCalledWith(undefined, 'SUSPENDU', 0, 20);
    expect(puce.getAttribute('aria-pressed')).toBe('true');
  });

  it('pagine : Suivant charge la page 1 et se désactive sur la dernière page', () => {
    api.listUsers.mockReturnValue(of(page([awa], 25)));
    monter();
    const suivant = () => [...el.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Suivant')!;
    expect(el.textContent).toContain('Page 1 / 2');
    cliquer(suivant());
    expect(api.listUsers).toHaveBeenLastCalledWith(undefined, undefined, 1, 20);
    expect(suivant().disabled).toBe(true);
  });

  it('suspend après confirmation et remplace la ligne sans recharger', async () => {
    api.updateUserStatus.mockReturnValue(of({ ...awa, status: 'SUSPENDU' }));
    monter();
    await cliquerEtAttendre(bouton('Suspendre Awa Diop'));
    expect(api.updateUserStatus).toHaveBeenCalledWith('1', { status: 'SUSPENDU' });
    expect(api.listUsers).toHaveBeenCalledTimes(1);
    expect(toast.succes).toHaveBeenCalledWith('Awa Diop est suspendu.');
    expect(bouton('Réactiver Awa Diop')).toBeTruthy();
  });

  it("n'appelle pas l'API si la confirmation est refusée", async () => {
    confirmation.demander.mockResolvedValue(false);
    monter();
    await cliquerEtAttendre(bouton('Suspendre Awa Diop'));
    await cliquerEtAttendre(bouton('Supprimer Awa Diop'));
    expect(api.updateUserStatus).not.toHaveBeenCalled();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('active un compte en attente', () => {
    api.updateUserStatus.mockReturnValue(of({ ...fatou, status: 'ACTIF' }));
    monter();
    cliquer(bouton('Activer Fatou Sow'));
    expect(api.updateUserStatus).toHaveBeenCalledWith('3', { status: 'ACTIF' });
  });

  it('supprime puis recharge la liste', async () => {
    monter();
    await cliquerEtAttendre(bouton('Supprimer Awa Diop'));
    expect(api.deleteUser).toHaveBeenCalledWith('1');
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });

  it("recule d'une page quand on supprime le dernier élément d'une page", async () => {
    api.listUsers.mockReturnValue(of(page([awa], 21)));
    monter();
    cliquer([...el.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Suivant')!);
    api.listUsers.mockClear();
    await cliquerEtAttendre(bouton('Supprimer Awa Diop'));
    expect(api.listUsers).toHaveBeenCalledWith(undefined, undefined, 0, 20);
  });

  it('interdit de suspendre ou supprimer son propre compte', () => {
    monter();
    expect(bouton('Suspendre Admin UASZ').disabled).toBe(true);
    expect(bouton('Supprimer Admin UASZ').disabled).toBe(true);
    const composant = fixture.componentInstance as unknown as { supprimer(u: User): void };
    composant.supprimer(moi);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('affiche un message et recharge sur un 404', async () => {
    api.deleteUser.mockReturnValue(throwError(() => new ErreurApi(404, 'USER_NOT_FOUND', 'x')));
    monter();
    await cliquerEtAttendre(bouton('Supprimer Awa Diop'));
    expect(el.querySelector('[role="alert"]')!.textContent).toContain("n'existe plus");
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });
});
