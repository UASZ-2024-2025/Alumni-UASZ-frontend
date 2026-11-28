import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { MODELE_PAR_DEFAUT } from '../modeles/cv.modele';
import { CvPdfService } from '../services/cv-pdf.service';
import { EditeurCv } from './editeur-cv';

const cv = (template: string): CvResponse => ({ id: 'cv-1', title: 'Développeuse Java', template, language: 'Français', skills: [] });
const attendre = () => new Promise((r) => setTimeout(r));

describe('EditeurCv : choix du modèle', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let pdf: { telecharger: ReturnType<typeof vi.fn> };
  let fixture: ReturnType<typeof TestBed.createComponent<EditeurCv>>;
  let el: HTMLElement;

  const ouvrir = async (enregistre: CvResponse | null) => {
    api['getStudentCv'].mockReturnValue(enregistre ? of(enregistre) : throwError(() => new ErreurApi(404, 'CV_NOT_FOUND', 'Pas de CV')));
    fixture = TestBed.createComponent(EditeurCv);
    fixture.detectChanges();
    await attendre();
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  const radio = (code: string) => el.querySelector<HTMLInputElement>(`app-selecteur-modele-cv input[value="${code}"]`)!;
  const coche = () => [...el.querySelectorAll<HTMLInputElement>('app-selecteur-modele-cv input:checked')].map((r) => r.value);
  const modeleApercu = () => el.querySelector('app-apercu-cv article')?.getAttribute('data-modele');
  const indication = () => el.querySelector('app-selecteur-modele-cv ~ p[role="status"]')?.textContent?.trim() ?? null;
  const bouton = (texte: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texte) as HTMLButtonElement;
  const choisir = (code: string) => {
    radio(code).click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      getStudentById: vi.fn(() => of({ id: 's-1', userId: 'u-1', firstName: 'Awa', lastName: 'Diop' })),
      getStudentCv: vi.fn(),
      updateStudentCv: vi.fn(() => of(cv('CLASSIC'))),
    };
    pdf = { telecharger: vi.fn(() => Promise.resolve()) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StudentsService, useValue: api },
        { provide: CvPdfService, useValue: pdf },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: 'u-1', firstName: 'Awa', lastName: 'Diop' }) } },
      ],
    });
  });

  it('retrouve le modèle enregistré à la visite suivante', async () => {
    await ouvrir(cv('CLASSIC'));

    expect(coche()).toEqual(['CLASSIC']);
    expect(modeleApercu()).toBe('CLASSIC');
    expect(indication()).toBeNull();
  });

  it('propose le modèle par défaut tant qu’aucun CV n’est enregistré', async () => {
    await ouvrir(null);

    expect(coche()).toEqual([MODELE_PAR_DEFAUT]);
    expect(modeleApercu()).toBe(MODELE_PAR_DEFAUT);
  });

  it('remplace un modèle inconnu par le modèle par défaut', async () => {
    await ouvrir(cv('ANCIEN_MODELE'));

    expect(coche()).toEqual([MODELE_PAR_DEFAUT]);
    expect(modeleApercu()).toBe(MODELE_PAR_DEFAUT);
  });

  it('met l’aperçu à jour dès qu’on choisit un modèle', async () => {
    await ouvrir(cv('MODERN_BLUE'));
    choisir('UASZ_VERT');
    expect(modeleApercu()).toBe('UASZ_VERT');

    choisir('CLASSIC');
    expect(modeleApercu()).toBe('CLASSIC');
  });

  it('prévient qu’il faut enregistrer pour retrouver le modèle, puis se tait', async () => {
    await ouvrir(cv('MODERN_BLUE'));
    expect(indication()).toBeNull();

    choisir('CLASSIC');
    expect(indication()).toContain('Enregistrez le CV');

    bouton('Enregistrer le CV').click();
    await attendre();
    fixture.detectChanges();
    expect(indication()).toBeNull();
  });

  it('se tait aussi quand on revient au modèle enregistré', async () => {
    await ouvrir(cv('MODERN_BLUE'));
    choisir('CLASSIC');
    choisir('MODERN_BLUE');

    expect(indication()).toBeNull();
  });

  it('enregistre le modèle choisi avec le CV (champ template)', async () => {
    await ouvrir(cv('MODERN_BLUE'));
    choisir('UASZ_VERT');
    bouton('Enregistrer le CV').click();
    await attendre();

    expect(api['updateStudentCv']).toHaveBeenCalledTimes(1);
    expect(api['updateStudentCv'].mock.calls[0][1].template).toBe('UASZ_VERT');
  });

  it('génère le PDF dans le modèle choisi, même non enregistré', async () => {
    await ouvrir(cv('MODERN_BLUE'));
    choisir('CLASSIC');
    bouton('Télécharger en PDF').click();
    await attendre();

    expect(pdf.telecharger).toHaveBeenCalledTimes(1);
    expect(pdf.telecharger.mock.calls[0][0].modele).toBe('CLASSIC');
  });
});
