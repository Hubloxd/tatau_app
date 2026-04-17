import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { publicLandingGuard } from './core/guards/public-landing.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [publicLandingGuard],
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'feed',
    loadComponent: () =>
      import('./pages/placeholder/placeholder').then(
        (m) => m.PlaceholderComponent,
      ),
    data: {
      pageTitle: 'Dla Ciebie',
      body:
        'Spersonalizowany feed — w przygotowaniu. Tutaj trafią zdjęcia zgodnie z Twoimi zainteresowaniami.',
    },
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./pages/placeholder/placeholder').then(
        (m) => m.PlaceholderComponent,
      ),
    data: {
      pageTitle: 'Odkrywaj',
      body:
        'Wyszukiwanie kont i inspiracji — w przygotowaniu. Wróć później, by przeszukiwać bazę.',
    },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/placeholder/placeholder').then(
        (m) => m.PlaceholderComponent,
      ),
    data: {
      pageTitle: 'Profil',
      body:
        'Twój profil i galeria — w przygotowaniu. Po zalogowaniu zobaczysz tu swoje zdjęcia.',
    },
  },
  { path: '**', redirectTo: '' },
];
