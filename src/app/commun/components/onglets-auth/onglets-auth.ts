import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Onglets Connexion / Inscription. */
@Component({
  selector: 'app-onglets-auth',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './onglets-auth.html',
  styleUrl: './onglets-auth.scss',
})
export class OngletsAuth {}
