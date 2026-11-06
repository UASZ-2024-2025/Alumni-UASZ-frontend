import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Carte } from '../../../commun/components/carte/carte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Modale } from '../../../commun/components/modale/modale';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../erreurs';

@Component({
  selector: 'app-gestion-entreprises',
  imports: [FormsModule, ReactiveFormsModule, Alerte, Avatar, Bouton, Carte, Champ, EtatVide, Modale, Pagination, Spinner],
  templateUrl: './gestion-entreprises.html',
  styleUrl: '../administration.scss',
})
export class GestionEntreprises {
  private readonly api = inject(CompaniesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);

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
    { valeur: 'oui', libelle: 'Partenaires' },
    { valeur: 'non', libelle: 'Non partenaires' },
  ];
  protected texteRecherche = '';
  protected choixPartenaire = '';
  protected readonly enCours = signal<string | null>(null);
  protected readonly enEdition = signal<Company | null>(null);
  protected readonly formulaireOuvert = signal(false);
  protected readonly envoi = signal(false);

  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));

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
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e, { 404: "Cette entreprise n'existe plus." }));
      },
    });
  }
}
