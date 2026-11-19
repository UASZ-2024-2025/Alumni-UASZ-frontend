import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastService } from '../../../commun/services/toast.service';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';
import { PublierOffre } from './publier-offre';

describe('PublierOffre', () => {
  const publier = vi.fn();
  let fixture: ComponentFixture<PublierOffre>;
  let el: HTMLElement;

  beforeEach(() => {
    publier.mockReset();
    TestBed.configureTestingModule({
      imports: [PublierOffre],
      providers: [provideRouter([]), { provide: OffresEntrepriseService, useValue: { publier } }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(ToastService), 'succes');
    fixture = TestBed.createComponent(PublierOffre);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  // --- Aides : remplissent le formulaire comme un utilisateur ---
  const champ = <T extends HTMLElement>(libelle: string): T => {
    const label = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.includes(libelle));
    return el.querySelector<T>(`#${label?.getAttribute('for')}`) as T;
  };
  const saisir = (libelle: string, valeur: string) => {
    const c = champ<HTMLInputElement>(libelle);
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
  };
  const choisir = (libelle: string, valeur: string) => {
    const c = champ<HTMLSelectElement>(libelle);
    c.value = valeur;
    c.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const ajouterCompetence = (texte: string) => {
    const c = champ<HTMLInputElement>('Compétences requises');
    c.value = texte;
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  };
  const remplirFormulaireValide = () => {
    saisir('Intitulé du poste', 'Développeur Angular');
    saisir('Lieu', 'Ziguinchor');
    saisir('Description', 'Mission de développement.');
    ajouterCompetence('Angular');
    ajouterCompetence('SQL');
  };
  const soumettre = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it("n'appelle pas le serveur et affiche les erreurs quand le formulaire est invalide (400 côté front)", () => {
    soumettre();
    expect(publier).not.toHaveBeenCalled();
    expect(el.textContent).toContain("L'intitulé est obligatoire.");
    expect(el.textContent).toContain('Le lieu est obligatoire.');
    expect(el.textContent).toContain('La description est obligatoire.');
    expect(el.textContent).toContain('Ajoutez au moins une compétence.');
  });

  it('publie une offre valide, affiche un toast et redirige vers « Mes offres »', () => {
    publier.mockReturnValue(of({ id: 'o1' }));
    remplirFormulaireValide();
    soumettre();

    expect(publier).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Développeur Angular',
        type: 'JOB',
        location: 'Ziguinchor',
        description: 'Mission de développement.',
        requiredSkills: ['Angular', 'SQL'],
      }),
    );
    expect(publier.mock.calls[0][0].durationMonths).toBeUndefined();
    expect(TestBed.inject(ToastService).succes).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/offres-emploi/mes-offres']);
  });

  it('affiche la durée seulement pour un stage et l\'envoie en nombre', () => {
    publier.mockReturnValue(of({ id: 'o2' }));
    expect(el.textContent).not.toContain('Durée (en mois)');

    choisir("Type d'offre", 'INTERNSHIP');
    expect(el.textContent).toContain('Durée (en mois)');

    saisir('Durée (en mois)', '6');
    remplirFormulaireValide();
    soumettre();
    expect(publier).toHaveBeenCalledWith(expect.objectContaining({ type: 'INTERNSHIP', durationMonths: 6 }));
  });

  const refus: [number, string][] = [
    [400, 'Certaines informations sont invalides'],
    [401, 'Votre session a expiré'],
    [403, 'pas encore validée'],
    [404, 'Entreprise introuvable'],
  ];
  refus.forEach(([status, message]) =>
    it(`affiche le message adapté pour un refus ${status}`, () => {
        publier.mockReturnValue(throwError(() => new ErreurApi(status, 'ERREUR', 'Message du back.')));      remplirFormulaireValide();
      soumettre();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
      expect(TestBed.inject(ToastService).succes).not.toHaveBeenCalled();
      expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    }),
  );
});