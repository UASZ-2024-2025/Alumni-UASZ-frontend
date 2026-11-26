import { Component, computed, input } from '@angular/core';
import { DonneesCv, initialesCv, periode, titresSections } from '../modeles/cv.modele';

/** Aperçu du CV, fidèle à la mise en page du PDF généré par CvPdfService. */
@Component({
  selector: 'app-apercu-cv',
  template: `
    <article class="feuille" [attr.data-modele]="donnees().modele" aria-label="Aperçu du CV">
      <aside>
        @if (donnees().photo; as photo) {
          <img class="photo" [src]="photo" [alt]="'Photo de ' + nomComplet()" />
        } @else {
          <span class="initiales" aria-hidden="true">{{ initiales() }}</span>
        }
        @if (contacts().length) {
          <h3>{{ t().contact }}</h3>
          @for (c of contacts(); track c) { <p class="texte">{{ c }}</p> }
        }
        @if (donnees().competences.length) {
          <h3>{{ t().competences }}</h3>
          <ul>
            @for (c of donnees().competences; track $index) { <li>{{ c }}</li> }
          </ul>
        }
        @if (languesListe().length) {
          <h3>{{ t().langues }}</h3>
          @for (l of languesListe(); track $index) {
            <p class="intitule">{{ l.language }}</p>
            @if (l.proficiency) { <p class="periode">{{ l.proficiency }}</p> }
          }
        }
        @if (donnees().interets.length) {
          <h3>{{ t().interets }}</h3>
          <ul>
            @for (c of donnees().interets; track $index) { <li>{{ c }}</li> }
          </ul>
        }
      </aside>

      <div class="principal">
        <header>
          <h2>{{ nomComplet() }}</h2>
          @if (donnees().titre) { <p class="titre">{{ donnees().titre }}</p> }
        </header>

        @if (donnees().resume.trim()) {
          <section>
            <h3>{{ t().resume }}</h3>
            <p class="texte">{{ donnees().resume }}</p>
          </section>
        }

        @if (donnees().experiences.length) {
          <section>
            <h3>{{ t().experiences }}</h3>
            @for (e of donnees().experiences; track $index) {
              <div class="bloc">
                <p class="intitule">{{ e.position || e.companyName }}</p>
                @if ([e.position ? e.companyName : '', periode(e.startDate, e.endDate, donnees().langue)].filter(presente).length) {
                  <p class="periode">{{ [e.position ? e.companyName : '', periode(e.startDate, e.endDate, donnees().langue)].filter(presente).join('   |   ') }}</p>
                }
                @if (e.description.trim()) { <p class="texte">{{ e.description }}</p> }
              </div>
            }
          </section>
        }

        @if (donnees().formations.length) {
          <section>
            <h3>{{ t().formations }}</h3>
            @for (f of donnees().formations; track $index) {
              <div class="bloc">
                <p class="intitule">{{ [f.degree, f.fieldOfStudy].filter(presente).join(' – ') || f.institution }}</p>
                <p class="periode">{{ [[f.degree, f.fieldOfStudy].filter(presente).length ? f.institution : '', periode(f.startDate, f.endDate, donnees().langue)].filter(presente).join('   |   ') }}</p>
              </div>
            }
          </section>
        }
      </div>
    </article>
  `,
  styleUrl: './apercu-cv.scss',
})
export class ApercuCv {
  readonly donnees = input.required<DonneesCv>();

  protected readonly t = computed(() => titresSections(this.donnees().langue));
  protected readonly nomComplet = computed(() => `${this.donnees().prenom} ${this.donnees().nom}`.trim() || 'Nom Prénom');
  protected readonly initiales = computed(() => initialesCv(this.donnees()));
  protected readonly contacts = computed(() => [this.donnees().email, this.donnees().telephone].filter(Boolean));
  protected readonly languesListe = computed(() => this.donnees().langues.filter((l) => l.language.trim()));

  protected readonly periode = periode;
  protected readonly presente = (v: string) => !!v && v.trim() !== '';
}
