import { Component, computed, input } from '@angular/core';
import { DonneesCv, periode, titresSections } from '../modeles/cv.modele';

/** Aperçu du CV, fidèle à la mise en page du PDF généré par CvPdfService. */
@Component({
  selector: 'app-apercu-cv',
  template: `
    <article class="feuille" [attr.data-modele]="donnees().modele" aria-label="Aperçu du CV">
      <header>
        <h2>{{ nomComplet() }}</h2>
        @if (donnees().titre) { <p class="titre">{{ donnees().titre }}</p> }
        <p class="contact">{{ contact() }}</p>
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
              <p class="intitule">{{ [e.position, e.companyName].filter(presente).join(' – ') }}</p>
              @if (periode(e.startDate, e.endDate, donnees().langue)) {
                <p class="periode">{{ periode(e.startDate, e.endDate, donnees().langue) }}</p>
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
              <p class="intitule">{{ [f.degree, f.fieldOfStudy].filter(presente).join(' – ') }}</p>
              <p class="periode">{{ [f.institution, periode(f.startDate, f.endDate, donnees().langue)].filter(presente).join('   |   ') }}</p>
            </div>
          }
        </section>
      }

      @if (donnees().competences.length) {
        <section>
          <h3>{{ t().competences }}</h3>
          <p class="texte">{{ donnees().competences.join('  •  ') }}</p>
        </section>
      }

      @if (donnees().langues.length) {
        <section>
          <h3>{{ t().langues }}</h3>
          <p class="texte">{{ langues() }}</p>
        </section>
      }
    </article>
  `,
  styleUrl: './apercu-cv.scss',
})
export class ApercuCv {
  readonly donnees = input.required<DonneesCv>();

  protected readonly t = computed(() => titresSections(this.donnees().langue));
  protected readonly nomComplet = computed(() => `${this.donnees().prenom} ${this.donnees().nom}`.trim() || 'Nom Prénom');
  protected readonly contact = computed(() => [this.donnees().email, this.donnees().telephone].filter(Boolean).join('   |   '));
  protected readonly langues = computed(() =>
    this.donnees()
      .langues.filter((l) => l.language.trim())
      .map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language))
      .join('  •  '),
  );

  protected readonly periode = periode;
  protected readonly presente = (v: string) => !!v && v.trim() !== '';
}
