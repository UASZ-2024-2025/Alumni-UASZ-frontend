import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MESSAGE_POLITIQUE_MDP = '8 à 72 caractères, avec au moins une lettre et un chiffre.';

/** Même règle que le back (PasswordPolicy) : 8 caractères min, 72 octets max, une lettre et un chiffre. */
export const validateurPolitiqueMotDePasse: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = (c.value ?? '') as string;
  if (!v) return null; // « obligatoire » est géré par Validators.required
  const octets = new TextEncoder().encode(v).length;
  const valide = v.length >= 8 && octets <= 72 && /\p{L}/u.test(v) && /\p{Nd}/u.test(v);
  return valide ? null : { politique: true };
};

/** Validateur de groupe : le champ de confirmation doit être identique au mot de passe. */
export const confirmationIdentique =
  (champ: string, confirmation: string): ValidatorFn =>
  (g: AbstractControl): ValidationErrors | null =>
    g.get(champ)?.value === g.get(confirmation)?.value ? null : { confirmation: true };
