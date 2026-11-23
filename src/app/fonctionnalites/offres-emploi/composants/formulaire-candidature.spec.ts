import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { provideRouter } from '@angular/router';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { FormulaireCandidature, LETTRE_MAX } from './formulaire-candidature';

const cv = { id: 'cv-1', studentId: 'etu-1', title: 'Développeur Java', skills: ['Spring Boot'] };
const profil = { firstName: 'Awa', lastName: 'Diallo', email: 'awa@exemple.sn' };
const creee: Application = { id: 'a1', offerId: 'o1', studentId: 'etu-1', status: 'SUBMITTED' };

describe('FormulaireCandidature (ALUM-204, ALUM-259)', () => {
  let etudiantsApi: { getStudentCv: ReturnType<typeof vi.fn>; getStudentById: ReturnType<typeof vi.fn> };
  let candidaturesApi: { submitApplication: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<FormulaireCandidature>;
  let el: HTMLElement;
  let envoyee: ReturnType<typeof vi.fn<(a: Application) => void>>;
  let dejaPostule: ReturnType<typeof vi.fn<() => void>>;

  function creer(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ firstName: 'Awa', lastName: 'Diallo', phone: '770000000' }) } },
        { provide: StudentsService, useValue: etudiantsApi },
        { provide: ApplicationsService, useValue: candidaturesApi },
      ],
    });
    fixture = TestBed.createComponent(FormulaireCandidature);
    fixture.componentRef.setInput('offreId', 'o1');
    fixture.componentRef.setInput('etudiantId', 'etu-1');
    envoyee = vi.fn<(a: Application) => void>();
    dejaPostule = vi.fn<() => void>();
    fixture.componentInstance.envoyee.subscribe((a) => envoyee(a));
    fixture.componentInstance.dejaPostule.subscribe(() => dejaPostule());
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const lettre = () => el.querySelector<HTMLTextAreaElement>('textarea')!;
  const saisirLettre = (texte: string) => {
    lettre().value = texte;
    lettre().dispatchEvent(new Event('input'));
    lettre().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const envoyer = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    etudiantsApi = { getStudentCv: vi.fn(() => of(cv)), getStudentById: vi.fn(() => of(profil)) };
    candidaturesApi = { submitApplication: vi.fn(() => of(creee)) };
  });

  it("joint automatiquement le CV de l'étudiant connecté, sans liste à choisir", () => {
    creer();
    expect(etudiantsApi.getStudentCv).toHaveBeenCalledWith('etu-1');
    expect(el.querySelector('select')).toBeNull();
    expect(el.querySelector('.cv-titre')!.textContent).toContain('Développeur Java');
    expect(el.querySelector('.cv-etat')!.textContent).toContain('Joint automatiquement');
    expect(el.querySelector('a[href="/mon-espace/cv"]')).not.toBeNull();
  });

  it("déplie et replie l'aperçu du CV", () => {
    creer();
    expect(el.querySelector('app-apercu-cv')).toBeNull();
    const bouton = () => [...el.querySelectorAll('button')].find((b) => /aperçu/.test(b.textContent ?? ''))!;
    bouton().click();
    fixture.detectChanges();
    const apercu = el.querySelector('app-apercu-cv')!;
    expect(apercu.textContent).toContain('Awa Diallo');
    expect(apercu.textContent).toContain('Spring Boot');
    expect(bouton().textContent).toContain("Masquer l'aperçu");
    bouton().click();
    fixture.detectChanges();
    expect(el.querySelector('app-apercu-cv')).toBeNull();
  });

  it("garde l'aperçu même si le profil ne se charge pas", () => {
    etudiantsApi.getStudentById.mockReturnValue(throwError(() => new ErreurApi(500, 'ERREUR', 'Panne')));
    creer();
    expect(el.querySelector('form')).not.toBeNull();
    expect(el.querySelector('app-alerte')).toBeNull();
  });

  it('signale la lettre obligatoire et ne contacte pas le serveur', () => {
    creer();
    envoyer();
    expect(el.textContent).toContain('La lettre de motivation est obligatoire.');
    expect(candidaturesApi.submitApplication).not.toHaveBeenCalled();
  });

  it("refuse une lettre faite d'espaces", () => {
    creer();
    saisirLettre('   ');
    envoyer();
    expect(el.textContent).toContain('La lettre de motivation est obligatoire.');
    expect(candidaturesApi.submitApplication).not.toHaveBeenCalled();
  });

  it('limite la longueur de la lettre', () => {
    creer();
    saisirLettre('a'.repeat(LETTRE_MAX + 1));
    envoyer();
    expect(el.textContent).toContain(`La lettre ne doit pas dépasser ${LETTRE_MAX} caractères.`);
    expect(candidaturesApi.submitApplication).not.toHaveBeenCalled();
  });

  it('envoie la candidature (CV, lettre, étudiant) et émet la candidature créée', () => {
    creer();
    saisirLettre('  Votre offre correspond à mon projet.  ');
    envoyer();
    expect(candidaturesApi.submitApplication).toHaveBeenCalledWith('o1', {
      studentId: 'etu-1',
      cvId: 'cv-1',
      coverLetter: 'Votre offre correspond à mon projet.',
    });
    expect(envoyee).toHaveBeenCalledWith(creee);
  });

  it('prévient la page quand le serveur répond 409 (déjà postulé), sans planter', () => {
    candidaturesApi.submitApplication.mockReturnValue(
      throwError(() => new ErreurApi(409, 'ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre.')),
    );
    creer();
    saisirLettre('Motivé.');
    envoyer();
    expect(dejaPostule).toHaveBeenCalled();
    expect(envoyee).not.toHaveBeenCalled();
  });

  it("affiche l'erreur du serveur et garde le formulaire rempli", () => {
    candidaturesApi.submitApplication.mockReturnValue(
      throwError(() => new ErreurApi(400, 'VALIDATION_ERROR', 'studentId est obligatoire.')),
    );
    creer();
    saisirLettre('Motivé.');
    envoyer();
    expect(el.textContent).toContain('La candidature est incomplète. Vérifiez votre CV et votre lettre.');
    expect(lettre().value).toBe('Motivé.');
  });

  it("explique qu'il faut d'abord créer un CV quand l'étudiant n'en a pas (404)", () => {
    etudiantsApi.getStudentCv.mockReturnValue(throwError(() => new ErreurApi(404, 'CV_NOT_FOUND', 'CV introuvable.')));
    creer();
    expect(el.textContent).toContain("Vous n'avez pas encore de CV sur la plateforme.");
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('a[href="/mon-espace/cv"]')!.textContent).toContain('Créer mon CV');
  });

  it('propose de réessayer quand le CV ne peut pas être chargé', () => {
    etudiantsApi.getStudentCv.mockReturnValueOnce(
      throwError(() => new ErreurApi(0, 'NETWORK', 'Serveur injoignable.')),
    );
    creer();
    expect(el.textContent).toContain('Serveur injoignable.');
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Réessayer'))!.click();
    fixture.detectChanges();
    expect(el.querySelector('form')).not.toBeNull();
  });
});
