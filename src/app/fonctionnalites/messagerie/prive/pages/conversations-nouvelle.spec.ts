import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../../api/generes/alumni/api/companies.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { PrivateMessagingService } from '../../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { NouvelleDiscussion } from '../composants/nouvelle-discussion';
import { ConversationsStore } from '../conversations.store';
import { Conversations } from './conversations';

describe('Conversations : nouvelle discussion (ALUM-263)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PrivateMessagingService, useValue: { listConversations: () => of([]) } },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'moi' }) } },
        { provide: StudentsService, useValue: { searchStudents: () => of({ content: [] }) } },
        { provide: AlumniService, useValue: { searchAlumni: () => of({ content: [] }) } },
        { provide: CompaniesService, useValue: { searchCompanies: () => of({ content: [] }) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('le bouton ouvre le choix du destinataire ; choisir ouvre le fil avec son nom et sa catégorie', async () => {
    const fixture = TestBed.createComponent(Conversations);
    const el: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(el.textContent).toContain('Aucune discussion pour l');

    el.querySelector<HTMLButtonElement>('[aria-label="Nouvelle discussion"]')!.click();
    fixture.detectChanges();
    const choix = fixture.debugElement.query(By.directive(NouvelleDiscussion));
    expect(choix).toBeTruthy();
    expect(choix.componentInstance.exclus()).toEqual(['moi']);
    expect(el.querySelector('.recherche input[name="recherche"]')).toBeNull();

    const naviguer = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (choix.componentInstance as NouvelleDiscussion).choisi.emit({ userId: 'u3', nom: 'Sonatel', role: 'ENTREPRISE', detail: '' });
    fixture.detectChanges();
    expect(naviguer).toHaveBeenCalledWith(['/messagerie', 'u3']);
    expect(fixture.debugElement.query(By.directive(NouvelleDiscussion))).toBeNull();
    const store = fixture.debugElement.injector.get(ConversationsStore);
    expect(store.contact('u3')).toEqual({ userId: 'u3', nom: 'Sonatel', role: 'ENTREPRISE' });
  });
});
