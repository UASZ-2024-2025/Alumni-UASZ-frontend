import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { OffersService } from '../../../api/generes/offres-emploi/api/offers.service';
import { JobOffer } from '../../../api/generes/offres-emploi/model/jobOffer';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../commun/services/toast.service';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { DetailOffre } from './detail-offre';

const offre: JobOffer = {
  id: 'o1',
  title: 'Développeur Angular',
  type: 'JOB',
  description: 'Vous développez des interfaces web.',
  companyName: 'Orange',
  location: 'Dakar',
  remoteType: 'HYBRID',
  requiredSkills: ['Angular', 'TypeScript'],
  durationMonths: 6,
  deadline: '2026-12-31',
  status: 'OPEN',
};

describe('DetailOffre', () => {
  let api: { getOfferById: ReturnType<typeof vi.fn> };
  let candidaturesApi: { submitApplication: ReturnType<typeof vi.fn> };
  let toast: { succes: ReturnType<typeof vi.fn> };
  let role: string;
  let el: HTMLElement;
  let fixture: ComponentFixture<DetailOffre>;

  function creer(id: string | null = 'o1'): ComponentFixture<DetailOffre> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OffersService, useValue: api },
        { provide: ApplicationsService, useValue: candidaturesApi },
        { provide: StudentsService, useValue: { getStudentCv: vi.fn(() => of({ id: 'cv-1', title: 'Mon CV' })), getStudentById: vi.fn(() => of({})) } },
        { provide: ToastService, useValue: toast },
        { provide: AuthentificationService, useValue: { role: () => role, utilisateur: () => ({ id: 'etu-1' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    fixture = TestBed.createComponent(DetailOffre);
    fixture.detectChanges();
    el = fixture.nativeElement;
    return fixture;
  }

  beforeEach(() => {
    api = { getOfferById: vi.fn(() => of(offre)) };
    candidaturesApi = { submitApplication: vi.fn(() => of({ id: 'a1', status: 'SUBMITTED' })) };
    toast = { succes: vi.fn() };
    role = 'ETUDIANT';
  });

  const boutonPostuler = () =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Postuler');
  const ouvrirEtEnvoyer = () => {
    boutonPostuler()!.click();
    fixture.detectChanges();
    const lettre = el.querySelector<HTMLTextAreaElement>('textarea')!;
    lettre.value = 'Je suis motivé.';
    lettre.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it("charge l'offre demandée et affiche ses informations", () => {
    creer();
    expect(api.getOfferById).toHaveBeenCalledWith('o1');
    expect(el.textContent).toContain('Développeur Angular');
    expect(el.textContent).toContain('Orange');
    expect(el.textContent).toContain('Vous développez des interfaces web.');
    expect(el.textContent).toContain('Angular');
    expect(el.textContent).toContain('TypeScript');
    expect(el.textContent).toContain('Ouverte');
    expect(el.textContent).toContain('Hybride');
    expect(el.textContent).toContain('6 mois');
  });

  it('affiche le bouton Postuler à un étudiant sur une offre ouverte (ALUM-204)', () => {
    creer();
    expect(boutonPostuler()).toBeDefined();
  });

  it("n'affiche pas le bouton Postuler aux autres rôles", () => {
    for (const r of ['ALUMNI', 'ENTREPRISE', 'ADMINISTRATEUR']) {
      TestBed.resetTestingModule();
      role = r;
      creer();
      expect(boutonPostuler()).toBeUndefined();
    }
  });

  it("n'affiche pas le bouton Postuler sur une offre fermée", () => {
    api.getOfferById.mockReturnValue(of({ ...offre, status: 'CLOSED' }));
    creer();
    expect(boutonPostuler()).toBeUndefined();
  });

  it('ouvre le formulaire, envoie la candidature puis affiche la confirmation', () => {
    creer();
    ouvrirEtEnvoyer();
    expect(candidaturesApi.submitApplication).toHaveBeenCalledWith('o1', {
      studentId: 'etu-1', cvId: 'cv-1', coverLetter: 'Je suis motivé.',
    });
    expect(toast.succes).toHaveBeenCalledWith('Votre candidature a été envoyée.');
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.textContent).toContain('Votre candidature a bien été envoyée.');
    expect(el.querySelector('a[href="/candidatures"]')).not.toBeNull();
    expect(boutonPostuler()).toBeUndefined();
  });

  it('affiche le refus du serveur quand l’étudiant a déjà postulé (409), sans planter', () => {
    candidaturesApi.submitApplication.mockReturnValue(
      throwError(() => new ErreurApi(409, 'ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre.')),
    );
    creer();
    ouvrirEtEnvoyer();
    expect(el.querySelector('dialog')).toBeNull();
    expect(el.textContent).toContain('Vous avez déjà postulé à cette offre.');
    expect(el.textContent).toContain('Développeur Angular');
    expect(boutonPostuler()).toBeUndefined();
  });

  it('propose un retour vers la liste', () => {
    creer();
    expect(el.querySelector('a.lien-retour')!.getAttribute('href')).toBe('/offres-emploi');
  });

  it('affiche un message clair quand l’offre est introuvable (404)', () => {
    api.getOfferById.mockReturnValue(throwError(() => new ErreurApi(404, 'OFFER_NOT_FOUND', 'Offre introuvable.')));
    creer();
    expect(el.textContent).toContain('Cette offre est introuvable.');
    expect(el.querySelector('h1')).toBeNull();
  });

  it('affiche le message du service quand la session a expiré (401)', () => {
    api.getOfferById.mockReturnValue(throwError(() => new ErreurApi(401, 'TOKEN_EXPIRED', 'Session expirée.')));
    creer();
    expect(el.textContent).toContain('Session expirée.');
  });

  it("n'appelle pas le service sans identifiant dans l'adresse", () => {
    creer(null);
    expect(api.getOfferById).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Cette offre est introuvable.');
  });
});