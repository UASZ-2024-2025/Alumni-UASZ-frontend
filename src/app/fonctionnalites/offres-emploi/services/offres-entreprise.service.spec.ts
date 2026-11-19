import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BASE_PATH } from '../../../api/generes/offres-emploi/variables';
import { NouvelleOffre, OffresEntrepriseService } from './offres-entreprise.service';

const BASE = 'http://test/v1';
const NOUVELLE: NouvelleOffre = {
  title: 'Développeur Angular', type: 'JOB', description: 'Mission',
  location: 'Ziguinchor', requiredSkills: ['Angular'],
};

describe('OffresEntrepriseService', () => {
  let service: OffresEntrepriseService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BASE_PATH, useValue: BASE }],
    });
    service = TestBed.inject(OffresEntrepriseService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it("publie une offre avec POST /offers et l'id de l'entreprise connectée", () => {
    const suivant = vi.fn();
    service.publier(NOUVELLE).subscribe(suivant);

    const req = http.expectOne(`${BASE}/offers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ...NOUVELLE, companyId: service.idEntreprise() });
    req.flush({ id: 'o1', title: 'Développeur Angular', status: 'OPEN' }, { status: 201, statusText: 'Created' });
    expect(suivant).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', status: 'OPEN' }));
  });

  it("liste les offres de l'entreprise avec GET /offers filtré par companyId", () => {
    const suivant = vi.fn();
    service.mesOffres(2, 10).subscribe(suivant);

    const req = http.expectOne((r) => r.url === `${BASE}/offers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('companyId')).toBe(service.idEntreprise());
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ content: [{ id: 'o1' }], totalElements: 1, page: 2, size: 10 });
    expect(suivant).toHaveBeenCalledWith(expect.objectContaining({ totalElements: 1 }));
  });

  [400, 401, 403, 404].forEach((status) =>
    it(`propage le refus ${status} lors de la publication`, () => {
      const erreur = vi.fn();
      service.publier(NOUVELLE).subscribe({ error: erreur });
      http.expectOne(`${BASE}/offers`).flush({ code: 'ERREUR', message: 'refus' }, { status, statusText: 'Erreur' });
      expect(erreur).toHaveBeenCalledTimes(1);
      expect(erreur.mock.calls[0][0].status).toBe(status);
    }),
  );

  [401, 403, 404].forEach((status) =>
    it(`propage le refus ${status} lors de la liste`, () => {
      const erreur = vi.fn();
      service.mesOffres().subscribe({ error: erreur });
      http.expectOne((r) => r.url === `${BASE}/offers`).flush({ code: 'ERREUR' }, { status, statusText: 'Erreur' });
      expect(erreur.mock.calls[0][0].status).toBe(status);
    }),
  );
});