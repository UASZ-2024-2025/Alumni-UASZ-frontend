import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { GroupSummary } from '../../../../api/generes/notifications-messagerie/model/groupSummary';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../../commun/services/toast.service';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { Groupes } from './groupes';

const ancien: GroupSummary = { id: 'g2', name: 'Club Data', memberCount: 3, lastMessage: 'Atelier samedi', lastMessageTime: '2026-11-10T09:00:00Z', unreadCount: 0 };
const recent: GroupSummary = { id: 'g1', name: 'Promo GL 2025', memberCount: 5, lastMessage: 'Bien noté', lastMessageTime: '2026-11-17T09:00:00Z', unreadCount: 3 };

describe('Groupes', () => {
  let api: { listGroups: ReturnType<typeof vi.fn>; createGroup: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<Groupes>;
  let el: HTMLElement;

  const creer = () => {
    fixture = TestBed.createComponent(Groupes);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const saisir = (selecteur: string, valeur: string) => {
    const champ = el.querySelector<HTMLInputElement>(selecteur)!;
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      listGroups: vi.fn(() => of([ancien, recent])),
      createGroup: vi.fn((corps: { name: string }) => of({ id: 'g9', name: corps.name, members: [{ userId: 'moi' }], createdAt: '2026-11-18T10:00:00Z' })),
    };
    toast = { succes: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GroupMessagingService, useValue: api },
        { provide: StudentsService, useValue: { searchStudents: vi.fn(() => of({ content: [] })) } },
        { provide: AlumniService, useValue: { searchAlumni: vi.fn(() => of({ content: [] })) } },
        { provide: ToastService, useValue: toast },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'moi' }) } },
      ],
    });
  });

  it('liste les groupes, le plus récent en haut, avec ses non-lus', () => {
    creer();
    const lignes = [...el.querySelectorAll('.conversation')];
    expect(lignes.map((l) => l.querySelector('.nom')?.textContent)).toEqual(['Promo GL 2025', 'Club Data']);
    expect(lignes[0].getAttribute('href')).toBe('/groupes/g1');
    expect(lignes[0].querySelector('.pastille')?.textContent).toBe('3');
    expect(lignes[1].querySelector('.pastille')).toBeNull();
    expect(lignes[0].querySelector('.apercu')?.textContent).toBe('Bien noté');
  });

  it('filtre la liste par nom', () => {
    creer();
    saisir('.recherche input', 'data');
    expect([...el.querySelectorAll('.conversation .nom')].map((n) => n.textContent)).toEqual(['Club Data']);
  });

  it("invite à créer un groupe quand il n'y en a aucun", () => {
    api.listGroups.mockReturnValue(of([]));
    creer();
    expect(el.textContent).toContain("Aucun groupe pour l'instant");
  });

  it('affiche une erreur de chargement et permet de réessayer', () => {
    api.listGroups.mockReturnValueOnce(throwError(() => new ErreurApi(0, 'RESEAU', 'Serveur injoignable.')));
    creer();
    expect(el.querySelector('app-alerte')?.textContent).toContain('Serveur injoignable.');
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Réessayer'))!.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('.conversation').length).toBe(2);
  });

  it('crée un groupe puis ouvre son fil', async () => {
    creer();
    const naviguer = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('.entete-liste .bouton-rond')!.click();
    fixture.detectChanges();
    await fixture.whenStable(); // dans un <form>, ngModel se branche au tour suivant

    el.querySelector<HTMLFormElement>('.formulaire')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.createGroup).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Le nom du groupe est obligatoire.');

    saisir('.formulaire app-champ input', '  Projet tutoré  ');
    el.querySelector<HTMLFormElement>('.formulaire')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.createGroup).toHaveBeenCalledWith({ name: 'Projet tutoré', description: undefined, memberIds: [] });
    expect(naviguer).toHaveBeenCalledWith(['/groupes', 'g9']);
    expect(toast.succes).toHaveBeenCalledWith('Groupe « Projet tutoré » créé.');
    expect(el.querySelector('.conversation .nom')?.textContent).toBe('Projet tutoré');
  });
});
