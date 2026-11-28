/** Couleur au format attendu par jsPDF (setFillColor, setTextColor, setDrawColor). */
export type Rvb = [number, number, number];

/**
 * Lit une variable de la charte (src/styles/_variables.scss) et la convertit en RVB pour le PDF.
 * Le PDF n'a pas de CSS : c'est ce qui lui permet de partager les couleurs de l'aperçu sans les recopier.
 * Une variable absente ou illisible donne du noir (le PDF reste généré, mais ça se voit).
 */
export function couleurCharte(variable: string): Rvb {
  const brute = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return versRvb(brute) ?? [0, 0, 0];
}

/** `#rgb`, `#rrggbb` ou `rgb(r, g, b)` vers [r, g, b] ; `null` si le format n'est pas reconnu. */
export function versRvb(valeur: string): Rvb | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valeur);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rvb;
  }
  const rvb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(valeur);
  return rvb ? ([Number(rvb[1]), Number(rvb[2]), Number(rvb[3])] as Rvb) : null;
}
