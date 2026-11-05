import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { messageErreur } from '../erreurs';

@Component({
  selector: 'app-gestion-entreprises',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-entreprises.html',
  styleUrl: '../administration.scss',
})
export class GestionEntreprises {
  private readonly api = inject(CompaniesService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly taille = 20;
  protected readonly entreprises = signal<Company[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly requete = signal('');
  protected readonly partenaire = signal<boolean | undefined>(undefined);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);
  protected readonly enCours = signal<string | null>(null);
  protected readonly enEdition = signal<Company | null>(null);
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
    this.succes.set(null);
    this.erreur.set(null);
    this.api.updateCompany(c.id, { isPartner: estPartenaire }).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.entreprises.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.succes.set(`${maj.name} ${estPartenaire ? 'est' : "n'est plus"} partenaire.`);
      },
      error: (e) => {
        this.enCours.set(null);
        this.erreur.set(messageErreur(e, { 404: "Cette entreprise n'existe plus." }));
      },
    });
  }

  protected modifier(c: Company): void {
    this.enEdition.set(c);
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
    this.succes.set(null);
    this.erreur.set(null);
    const appel = edition?.id
      ? this.api.updateCompany(edition.id, donnees)
      : this.api.createCompany(donnees);
    appel.subscribe({
      next: (c) => {
        this.envoi.set(false);
        this.succes.set(`${c.name} est ${edition ? 'modifiée' : 'créée'}.`);
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
