import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: 'camps',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/camps/camps.component').then((c) => c.CampsComponent),
  },
  {
    path: 'camps/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/camp-form/camp-form.component').then(
        (c) => c.CampFormComponent,
      ),
  },
  {
    path: 'camps/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/camp-form/camp-form.component').then(
        (c) => c.CampFormComponent,
      ),
  },
  {
    path: 'camps/:campId/clubs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/clubs/clubs.component').then((c) => c.ClubsComponent),
  },
  {
    path: 'camps/:campId/clubs/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/club-form/club-form.component').then(
        (c) => c.ClubFormComponent,
      ),
  },
  {
    path: 'camps/:campId/clubs/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/club-form/club-form.component').then(
        (c) => c.ClubFormComponent,
      ),
  },
  {
    path: 'camps/:campId/clubs/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/club-detail/club-detail.component').then(
        (c) => c.ClubDetailComponent,
      ),
  },
  {
    path: 'camps/:campId/events',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/events/events.component').then((c) => c.EventsComponent),
  },
  {
    path: 'camps/:campId/events/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/event-form/event-form.component').then(
        (c) => c.EventFormComponent,
      ),
  },
  {
    path: 'camps/:campId/events/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/event-form/event-form.component').then(
        (c) => c.EventFormComponent,
      ),
  },
  {
    path: 'camps/:campId/events/:eventId/score',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/event-scoring/event-scoring.component').then(
        (c) => c.EventScoringComponent,
      ),
  },
  {
    path: 'camps/:campId/ranking',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/camp-ranking/camp-ranking.component').then(
        (c) => c.CampRankingComponent,
      ),
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
