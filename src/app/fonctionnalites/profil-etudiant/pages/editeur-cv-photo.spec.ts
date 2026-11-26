import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { PhotoCvService } from '../services/photo-cv.service';
import { EditeurCv } from './editeur-cv';

const APERCU = 'data:image/jpeg;base64,APERCU';
const CV: CvResponse = {
  id: 'cv-1',
  title: 'Développeuse Java',
  template: 'MODERN_BLUE',
  language: 'Français',
  skills: [],
};
const attendre = () => new Promise((r) => setTimeout(r));

describe('EditeurCv : photo du CV (ALUM-256)', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let el: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<EditeurCv>>;

  const ouvrir = async (cv: CvResponse | null) => {
    api['getStudentCv'].mockReturnValue(
      cv ? of(cv) : throwError(() => new ErreurApi(404, 'CV_NOT_FOUND', 'Pas de CV')),
    );
    fixture = TestBed.createComponent(EditeurCv);
    fixture.detectChanges();
    await attendre();
    fixture.detectChanges();
    el = fixture.nativeElement;
  };

  const choisir = async (type: string, taille = 1000) => {
    const input = el.querySelector('input[type="file"]') as HTMLInputElement;
    const fichier = new File([new Uint8Array(taille)], 'photo', { type });
    Object.defineProperty(input, 'files', { value: [fichier], configurable: true });
    input.dispatchEvent(new Event('change'));
    await attendre();
    fixture.detectChanges();
    return fichier;
  };

  const vignette = () => el.querySelector('img.vignette-photo') as HTMLImageElement | null;
  const photoApercu = () => el.querySelector('app-apercu-cv img.photo') as HTMLImageElement | null;
  const bouton = (texte: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texte) as
      HTMLButtonElement | undefined;

  beforeEach(() => {
    api = {
      getStudentById: vi.fn(() =>
        of({ id: 's-1', userId: 'u-1', firstName: 'Awa', lastName: 'Diop' }),
      ),
      getStudentCv: vi.fn(),
      getStudentCvPhoto: vi.fn(() => of(new Blob(['x'], { type: 'image/png' }))),
      updateStudentCvPhoto: vi.fn(() => of(null)),
      deleteStudentCvPhoto: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StudentsService, useValue: api },
        {
          provide: AuthentificationService,
          useValue: { utilisateur: () => ({ id: 'u-1', firstName: 'Awa', lastName: 'Diop' }) },
        },
        { provide: PhotoCvService, useValue: { carree: vi.fn(async () => APERCU) } },
      ],
    });
  });

  it('charge la photo enregistrée et l’affiche dans la vignette et dans l’aperçu', async () => {
    await ouvrir({ ...CV, hasPhoto: true });

    expect(api['getStudentCvPhoto']).toHaveBeenCalledWith('u-1');
    expect(vignette()?.src).toBe(APERCU);
    expect(photoApercu()?.src).toBe(APERCU);
  });

  it('ne demande pas de photo quand le CV n’en a pas : les initiales restent', async () => {
    await ouvrir({ ...CV, hasPhoto: false });

    expect(api['getStudentCvPhoto']).not.toHaveBeenCalled();
    expect(photoApercu()).toBeNull();
    expect(el.querySelector('app-apercu-cv .initiales')?.textContent).toBe('AD');
  });

  it('ajoute une photo avant même le premier enregistrement du CV, avec aperçu immédiat', async () => {
    await ouvrir(null);
    const fichier = await choisir('image/png');

    expect(api['updateStudentCvPhoto']).toHaveBeenCalledWith('u-1', fichier);
    expect(photoApercu()?.src).toBe(APERCU);
    expect(el.textContent).toContain('Photo ajoutée.');
  });

  it('refuse un autre format sans appeler le serveur', async () => {
    await ouvrir(CV);
    await choisir('image/gif');

    expect(api['updateStudentCvPhoto']).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Format non accepté : choisissez une image JPEG ou PNG.');
    expect(photoApercu()).toBeNull();
  });

  it('remet l’ancienne photo si le serveur refuse la nouvelle', async () => {
    await ouvrir({ ...CV, hasPhoto: true });
    TestBed.inject(PhotoCvService).carree = vi.fn(async () => 'data:image/jpeg;base64,NOUVELLE');
    api['updateStudentCvPhoto'].mockReturnValue(
      throwError(() => new ErreurApi(400, 'INVALID_PHOTO_FORMAT', 'Format')),
    );
    await choisir('image/jpeg');

    expect(photoApercu()?.src).toBe(APERCU);
    expect(el.textContent).toContain(
      'Photo refusée : choisissez une image JPEG ou PNG de 2 Mo maximum.',
    );
  });

  it('remplace puis supprime la photo', async () => {
    await ouvrir({ ...CV, hasPhoto: true });
    await choisir('image/jpeg');
    expect(el.textContent).toContain('Photo remplacée.');

    bouton('Supprimer la photo')!.click();
    fixture.detectChanges();

    expect(api['deleteStudentCvPhoto']).toHaveBeenCalledWith('u-1');
    expect(photoApercu()).toBeNull();
    expect(vignette()).toBeNull();
    expect(el.textContent).toContain('Photo supprimée.');
  });
});
