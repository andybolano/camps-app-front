import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Club, ClubService } from '../../services/club.service';
import { CampService, Camp } from '../../services/camp.service';
import { CampRegistrationService, CampRegistration } from '../../services/camp-registration.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-camp-club-enrollment',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './camp-club-enrollment.component.html',
  styleUrl: './camp-club-enrollment.component.scss'
})
export class CampClubEnrollmentComponent implements OnInit {
  campId!: number;
  camp: Camp | null = null;
  clubs: Club[] = [];
  enrolledClubIds: Set<number> = new Set();
  selectedClubIds: Set<number> = new Set();
  isLoading = false;
  isEnrolling = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clubService: ClubService,
    private campService: CampService,
    private campRegistrationService: CampRegistrationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const campId = params.get('campId');
      if (campId) {
        this.campId = +campId;
        this.loadCampData();
      }
    });
  }

  loadCampData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.campService.getCamp(this.campId).subscribe({
      next: (camp) => {
        this.camp = camp;
        // Cargar clubes por la categoría del campamento
        if (camp.targetCategory) {
          this.loadClubsByCategory(camp.targetCategory.id);
        } else {
          this.errorMessage = 'Este campamento no tiene una categoría objetivo definida.';
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar datos del campamento: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  loadClubsByCategory(categoryId: number): void {
    // Primero cargar los clubes ya inscritos
    this.campRegistrationService.getCampRegistrations(this.campId).subscribe({
      next: (registrations) => {
        // Guardar los IDs de los clubes ya inscritos
        this.enrolledClubIds = new Set(
          registrations.map(reg => reg.clubCategory.club.id)
        );

        // Luego cargar todos los clubes de la categoría
        this.clubService.getClubsByCategory(categoryId).subscribe({
          next: (clubs) => {
            // Filtrar los clubes que ya están inscritos
            this.clubs = clubs
              .filter(club => !this.enrolledClubIds.has(club.id))
              .sort((a, b) => a.name.localeCompare(b.name));
            this.isLoading = false;
          },
          error: (error) => {
            this.errorMessage = 'Error al cargar clubes: ' + error.message;
            this.isLoading = false;
          },
        });
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar registros del campamento: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  toggleClubSelection(clubId: number): void {
    if (this.selectedClubIds.has(clubId)) {
      this.selectedClubIds.delete(clubId);
    } else {
      this.selectedClubIds.add(clubId);
    }
  }

  isClubSelected(clubId: number): boolean {
    return this.selectedClubIds.has(clubId);
  }

  selectAll(): void {
    this.clubs.forEach(club => this.selectedClubIds.add(club.id));
  }

  deselectAll(): void {
    this.selectedClubIds.clear();
  }

  enrollSelectedClubs(): void {
    if (this.selectedClubIds.size === 0 || !this.camp) {
      return;
    }

    this.isEnrolling = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Crear las peticiones de inscripción para cada club seleccionado
    const enrollmentRequests = Array.from(this.selectedClubIds).map(clubId =>
      this.campRegistrationService.createCampRegistration({
        campId: this.campId,
        clubId: clubId,
        categoryId: this.camp!.targetCategory!.id
      })
    );

    // Ejecutar todas las peticiones en paralelo
    forkJoin(enrollmentRequests).subscribe({
      next: (results) => {
        this.successMessage = `${results.length} club(es) inscrito(s) exitosamente.`;
        this.isEnrolling = false;

        // Redirigir a la lista de clubes del campamento después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/camps', this.campId, 'clubs']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = 'Error al inscribir clubes: ' + (error.error?.message || error.message);
        this.isEnrolling = false;
      },
    });
  }

  get selectedCount(): number {
    return this.selectedClubIds.size;
  }
}
