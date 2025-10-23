import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/layout/layout.component').then((c) => c.LayoutComponent),
    children: [
      // Módulo de Clubes - Independiente
      {
        path: 'clubs',
        loadComponent: () =>
          import('./pages/clubs/clubs.component').then((c) => c.ClubsComponent),
      },
      {
        path: 'clubs/new',
        loadComponent: () =>
          import('./pages/club-form/club-form.component').then(
            (c) => c.ClubFormComponent,
          ),
      },
      {
        path: 'clubs/:id/edit',
        loadComponent: () =>
          import('./pages/club-form/club-form.component').then(
            (c) => c.ClubFormComponent,
          ),
      },
      {
        path: 'clubs/:id',
        loadComponent: () =>
          import('./pages/club-detail/club-detail.component').then(
            (c) => c.ClubDetailComponent,
          ),
      },
      // Módulo de Campamentos
      {
        path: 'camps',
        loadComponent: () =>
          import('./pages/camps/camps.component').then((c) => c.CampsComponent),
      },
      {
        path: 'camps/new',
        loadComponent: () =>
          import('./pages/camp-form/camp-form.component').then(
            (c) => c.CampFormComponent,
          ),
      },
      {
        path: 'camps/:id/edit',
        loadComponent: () =>
          import('./pages/camp-form/camp-form.component').then(
            (c) => c.CampFormComponent,
          ),
      },
      {
        path: 'camps/:campId/clubs',
        loadComponent: () =>
          import('./pages/clubs/clubs.component').then((c) => c.ClubsComponent),
      },
      {
        path: 'camps/:campId/clubs/enroll',
        loadComponent: () =>
          import('./pages/camp-club-enrollment/camp-club-enrollment.component').then(
            (c) => c.CampClubEnrollmentComponent,
          ),
      },
      {
        path: 'camps/:campId/clubs/new',
        loadComponent: () =>
          import('./pages/club-form/club-form.component').then(
            (c) => c.ClubFormComponent,
          ),
      },
      {
        path: 'camps/:campId/clubs/:id/edit',
        loadComponent: () =>
          import('./pages/club-form/club-form.component').then(
            (c) => c.ClubFormComponent,
          ),
      },
      {
        path: 'camps/:campId/clubs/:id',
        loadComponent: () =>
          import('./pages/club-detail/club-detail.component').then(
            (c) => c.ClubDetailComponent,
          ),
      },
      {
        path: 'camps/:campId/ranking',
        loadComponent: () =>
          import('./pages/camp-ranking/camp-ranking.component').then(
            (c) => c.CampRankingComponent,
          ),
      },
      // Módulo de Eventos - Independiente
      {
        path: 'events',
        loadComponent: () =>
          import('./pages/events/events.component').then((c) => c.EventsComponent),
      },
      {
        path: 'events/new',
        loadComponent: () =>
          import('./pages/standalone-event-form/standalone-event-form.component').then(
            (c) => c.StandaloneEventFormComponent,
          ),
      },
      {
        path: 'events/:id/edit',
        loadComponent: () =>
          import('./pages/standalone-event-form/standalone-event-form.component').then(
            (c) => c.StandaloneEventFormComponent,
          ),
      },
      // Módulo de Eventos - Campamentos
      {
        path: 'camps/:campId/events',
        loadComponent: () =>
          import('./pages/events/events.component').then((c) => c.EventsComponent),
      },
      {
        path: 'camps/:campId/events/new',
        loadComponent: () =>
          import('./pages/event-form/event-form.component').then(
            (c) => c.EventFormComponent,
          ),
      },
      {
        path: 'camps/:campId/events/:id/edit',
        loadComponent: () =>
          import('./pages/event-form/event-form.component').then(
            (c) => c.EventFormComponent,
          ),
      },
      {
        path: 'camps/:campId/events/:eventId/score',
        loadComponent: () =>
          import('./pages/event-scoring/event-scoring.component').then(
            (c) => c.EventScoringComponent,
          ),
      },
      { path: '', redirectTo: '/clubs', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
