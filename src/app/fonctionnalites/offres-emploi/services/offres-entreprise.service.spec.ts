import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BASE_PATH } from '../../../api/generes/offres-emploi/variables';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { CODE_COMPTE_NON_RATTACHE, NouvelleOffre, OffresEntrepriseService } from './offres-entreprise.service';

const BASE = 'http://test/v1';
const ID_ENTREPRISE = 'c0ffee00-0000-4000-8000-000000000001';
const NOUVELLE: NouvelleOffre = {
  title: 'Développeur Angular', type: 'JOB', description: 'Mission',
  location: 'Ziguinchor', requiredSkills: ['Angular'],
};

describe('OffresEntrepriseService', () => {
  let service: OffresEntrepriseService;
  let http: HttpTestingController;
  const utilisateur = signal<User | null>(null);

  beforeEach(() => {
    utilisateur.set({ id: 'u4', role: 'ENTREPRISE', companyId: ID_ENTREPRISE });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BASE_PATH, useValue: BASE },
        { provide: AuthentificationService, useValue: { utilisateur } },
      ],
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
    expect(req.request.body).toEqual({ ...NOUVELLE, companyId: ID_ENTREPRISE });
    req.flush({ id: 'o1', title: 'Développeur Angular', status: 'OPEN' }, { status: 201, statusText: 'Created' });
    expect(suivant).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', status: 'OPEN' }));
  });

  it("liste les offres de l'entreprise avec GET /offers filtré par companyId", () => {
    const suivant = vi.fn();
    service.mesOffres(2, 10).subscribe(suivant);

    const req = http.expectOne((r) => r.url === `${BASE}/offers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('companyId')).toBe(ID_ENTREPRISE);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ content: [{ id: 'o1' }], totalElements: 1, page: 2, size: 10 });
    expect(suivant).toHaveBeenCalledWith(expect.objectContaining({ totalElements: 1 }));
  });

  it("lit l'id de l'entreprise dans la session (User.companyId), sans valeur en dur", () => {
    expect(service.idEntreprise()).toBe(ID_ENTREPRISE);
    utilisateur.set({ id: 'u9', role: 'ENTREPRISE', companyId: 'autre-fiche' });
    expect(service.idEntreprise()).toBe('autre-fiche');
  });

  it("refuse de publier sans appeler l'API quand le compte n'est rattaché à aucune fiche", () => {
    utilisateur.set({ id: 'u6', role: 'ENTREPRISE' });
    const erreur = vi.fn();
    service.publier(NOUVELLE).subscribe({ error: erreur });

    http.expectNone(`${BASE}/offers`);
    const e = erreur.mock.calls[0][0] as ErreurApi;
    expect(e).toBeInstanceOf(ErreurApi);
    expect(e.statut).toBe(403);
    expect(e.code).toBe(CODE_COMPTE_NON_RATTACHE);
  });

  it("ne liste rien sans appeler l'API quand le compte n'est rattaché à aucune fiche", () => {
    utilisateur.set(null);
    const erreur = vi.fn();
    service.mesOffres().subscribe({ error: erreur });

    http.expectNone((r) => r.url === `${BASE}/offers`);
    expect((erreur.mock.calls[0][0] as ErreurApi).code).toBe(CODE_COMPTE_NON_RATTACHE);
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

  it("liste les candidatures d'une offre avec GET /offers/{id}/applications", () => {
    const suivant = vi.fn();
    service.candidaturesRecues('o1').subscribe(suivant);

    const req = http.expectOne(`${BASE}/offers/o1/applications`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'a1', studentName: 'Moussa Ndiaye', status: 'SUBMITTED' }]);
    expect(suivant).toHaveBeenCalledWith([expect.objectContaining({ id: 'a1' })]);
  });

  it("change le statut d'une candidature avec PATCH /applications/{id}/status", () => {
    const suivant = vi.fn();
    service.changerStatut('a1', 'UNDER_REVIEW').subscribe(suivant);

    const req = http.expectOne(`${BASE}/applications/a1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'UNDER_REVIEW' });
    req.flush({ id: 'a1', status: 'UNDER_REVIEW' });
    expect(suivant).toHaveBeenCalledWith(expect.objectContaining({ status: 'UNDER_REVIEW' }));
  });

  [400, 403, 404].forEach((status) =>
    it(`propage le refus ${status} lors du changement de statut`, () => {
      const erreur = vi.fn();
      service.changerStatut('a1', 'REJECTED').subscribe({ error: erreur });
      http.expectOne(`${BASE}/applications/a1/status`).flush({ code: 'ERREUR' }, { status, statusText: 'Erreur' });
      expect(erreur.mock.calls[0][0].status).toBe(status);
    }),
  );

  it("propage le refus 403 lors de la liste des candidatures d'une offre d'un autre", () => {
    const erreur = vi.fn();
    service.candidaturesRecues('o2').subscribe({ error: erreur });
    http.expectOne(`${BASE}/offers/o2/applications`).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    expect(erreur.mock.calls[0][0].status).toBe(403);
  });
});
