import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Carte } from '../../../commun/components/carte/carte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { CaseACocher } from '../../../commun/components/case-a-cocher/case-a-cocher';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { MenuActions } from '../../../commun/components/menu-actions/menu-actions';
import { Modale } from '../../../commun/components/modale/modale';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { ColonneTableau, Tableau } from '../../../commun/components/tableau/tableau';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../erreurs';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';

@Component({
  selector: 'app-gestion-entreprises',
  imports: [FormsModule, ReactiveFormsModule, Alerte, Avatar, Bouton, Carte, CaseACocher, Champ, EtatVide, Modale, Pagination, Spinner, Tableau, EntetePage, MenuActions],
  templateUrl: './gestion-entreprises.html',
  styleUrl: '../administration.scss',
})
export class GestionEntreprises {
  protected readonly colonnes: ColonneTableau[] = [
    { cle: 'entreprise', libelle: 'Entreprise' },
    { cle: 'secteur', libelle: 'Secteur' },
    { cle: 'contact', libelle: 'Contact' },
    { cle: 'gestionnaire', libelle: 'Gestionnaire' },
    { cle: 'validation', libelle: 'Validation' },
    { cle: 'actions', libelle: 'Actions' },
  ];
  private readonly api = inject(CompaniesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);
  private readonly utilisateurs = inject(UsersService);

  protected readonly taille = 20;
  protected readonly entreprises = signal<Company[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly requete = signal('');
  protected readonly partenaire = signal<boolean | undefined>(undefined);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly optionsPartenaire: OptionChamp[] = [
    { valeur: '', libelle: 'Toutes' },
    { valeur: 'oui', libelle: 'Validées (partenaires)' },
    { valeur: 'non', libelle: 'En attente de validation' },
  ];
  protected texteRecherche = '';
  protected choixPartenaire = '';
  protected readonly enCours = signal<string | null>(null);
  /** Fiches créées par les entreprises et pas encore validées : ce sont elles qui attendent l'administrateur. */
  protected readonly enAttente = signal<number | null>(null);
  protected readonly enEdition = signal<Company | null>(null);
  protected readonly formulaireOuvert = signal(false);
  protected readonly envoi = signal(false);

  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));

  // --- Rattachement d'une fiche à un compte ENTREPRISE (ALUM-224, PUT /companies/{id}/owner) ---
  protected readonly comptesEntreprise = signal<User[]>([]);
  protected readonly aRattacher = signal<Company | null>(null);
  protected readonly compteChoisi = signal('');
  protected readonly rattachement = signal(false);
  protected readonly erreurRattachement = signal<string | null>(null);
  protected readonly optionsComptes = computed<OptionChamp[]>(() => [
    { valeur: '', libelle: 'Choisir un compte' },
    ...this.comptesEntreprise().map((u) => ({
      valeur: u.id ?? '',
      libelle: `${u.firstName ?? ''} ${u.lastName ?? ''} (${u.email ?? ''})${u.companyId ? ' : déjà rattaché' : ''}`.trim(),
    })),
  ]);
  private readonly nomsComptes = computed(
    () => new Map(this.comptesEntreprise().map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()])),
  );

  protected readonly formulaire = this.fb.group({
    name: ['', Validators.required],
    sector: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    website: [''],
    contactPhone: [''],
    address: [''],
    description: [''],
  });

  constructor() {
    this.charger();
    this.compterEnAttente();
    this.chargerComptesEntreprise();
  }

  private compterEnAttente(): void {
    this.api.searchCompanies(undefined, false, 0, 1).subscribe({
      next: (r) => this.enAttente.set(r.totalElements ?? 0),
      error: () => this.enAttente.set(null),
    });
  }

  protected voirEnAttente(): void {
    this.choixPartenaire = 'non';
    this.rechercher(this.texteRecherche, 'non');
  }

  /** Nom du gestionnaire s'il s'agit d'un compte ENTREPRISE, sinon null (fiche gérée par l'administration ou un Alumni). */
  protected gestionnaire(c: Company): string | null {
    return (c.ownerId && this.nomsComptes().get(c.ownerId)) || null;
  }

  private chargerComptesEntreprise(): void {
    this.utilisateurs.listUsers('ENTREPRISE', undefined, 0, 100).subscribe({
      next: (r) => this.comptesEntreprise.set(r.content ?? []),
      error: () => this.comptesEntreprise.set([]),
    });
  }

  protected ouvrirRattachement(c: Company): void {
    this.erreurRattachement.set(null);
    this.compteChoisi.set(this.gestionnaire(c) ? (c.ownerId ?? '') : '');
    this.aRattacher.set(c);
  }

  protected fermerRattachement(): void {
    this.aRattacher.set(null);
    this.compteChoisi.set('');
  }

  protected rattacher(): void {
    const c = this.aRattacher();
    const compte = this.compteChoisi();
    if (!c?.id) return;
    if (!compte) {
      this.erreurRattachement.set('Choisissez le compte ENTREPRISE à rattacher.');
      return;
    }
    this.rattachement.set(true);
    this.erreurRattachement.set(null);
    this.api.assignCompanyOwner(c.id, { ownerId: compte }).subscribe({
      next: (maj) => {
        this.rattachement.set(false);
        this.entreprises.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.toast.succes(`${maj.name} est rattachée au compte choisi.`);
        this.fermerRattachement();
        this.chargerComptesEntreprise();
      },
      error: (e) => {
        this.rattachement.set(false);
        this.erreurRattachement.set(
          messageErreur(e, {
            404: 'Cette entreprise ou ce compte n’existe plus.',
            409: 'Ce compte n’est pas un compte ENTREPRISE ou il est déjà rattaché à une autre fiche.',
            503: 'Le service des comptes est momentanément indisponible. Réessayez dans un instant.',
          }),
        );
      },
    });
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api
      .searchCompanies(this.requete() || undefined, this.partenaire(), this.page(), this.taille)
      .subscribe({
        next: (r) => {
          this.entreprises.set(r.content ?? []);
          this.total.set(r.totalElements ?? 0);
          this.chargement.set(false);
        },
        error: (e) => {
          this.erreur.set(messageErreur(e));
          this.chargement.set(false);
        },
      });
  }

  protected rechercher(requete: string, partenaire: string): void {
    this.requete.set(requete.trim());
    this.partenaire.set(partenaire === '' ? undefined : partenaire === 'oui');
    this.page.set(0);
    this.charger();
  }

  protected aller(page: number): void {
    if (page < 0 || page >= this.nbPages()) return;
    this.page.set(page);
    this.charger();
  }

  protected basculerPartenaire(c: Company, estPartenaire: boolean): void {
    if (!c.id) return;
    this.enCours.set(c.id);
    this.erreur.set(null);
    this.api.updateCompany(c.id, { isPartner: estPartenaire }).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.entreprises.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.toast.succes(`${maj.name} ${estPartenaire ? 'est' : "n'est plus"} partenaire.`);
        this.compterEnAttente();
      },
      error: (e) => {
        this.enCours.set(null);
        this.erreur.set(messageErreur(e, { 404: "Cette entreprise n'existe plus." }));
      },
    });
  }

  protected ajouter(): void {
    this.erreur.set(null);
    this.formulaire.reset();
    this.formulaireOuvert.set(true);
  }

  protected modifier(c: Company): void {
    this.erreur.set(null);
    this.enEdition.set(c);
    this.formulaireOuvert.set(true);
    this.formulaire.reset({
      name: c.name ?? '',
      sector: c.sector ?? '',
      contactEmail: c.contactEmail ?? '',
      website: c.website ?? '',
      contactPhone: c.contactPhone ?? '',
      address: c.address ?? '',
      description: c.description ?? '',
    });
  }

  protected annuler(): void {
    this.formulaireOuvert.set(false);
    this.enEdition.set(null);
    this.formulaire.reset();
  }

  protected enregistrer(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const v = this.formulaire.getRawValue();
    // les champs optionnels vides ne sont pas envoyés
    const donnees = {
      ...v,
      website: v.website || undefined,
      contactPhone: v.contactPhone || undefined,
      address: v.address || undefined,
      description: v.description || undefined,
    };
    const edition = this.enEdition();
    this.envoi.set(true);
    this.erreur.set(null);
    const appel = edition?.id
      ? this.api.updateCompany(edition.id, donnees)
      : this.api.createCompany(donnees);
    appel.subscribe({
      next: (c) => {
        this.envoi.set(false);
        this.toast.succes(`${c.name} est ${edition ? 'modifiée' : 'créée'}.`);
        this.annuler();
        this.charger();
        this.compterEnAttente();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e, { 404: "Cette entreprise n'existe plus." }));
      },
    });
  }
}
