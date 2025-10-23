import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Club, ClubService } from '../../services/club.service';
import { FormsModule } from '@angular/forms';
import { CampRegistration, CampRegistrationService } from '../../services/camp-registration.service';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.scss',
})
export class ClubsComponent implements OnInit {
  clubs: Club[] = [];
  filteredClubs: Club[] = [];
  campRegistrations: CampRegistration[] = [];
  filteredRegistrations: CampRegistration[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  campId?: number;
  isInCampContext = false;

  // Modal de confirmación de eliminación
  clubToDelete: Club | null = null;
  confirmationText = '';
  canConfirmDelete = false;
  isDeletingClub = false;

  constructor(
    private clubService: ClubService,
    private campRegistrationService: CampRegistrationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Verificar si estamos en el contexto de un campamento
    this.route.paramMap.subscribe((params) => {
      const campId = params.get('campId');
      if (campId) {
        this.campId = +campId;
        this.isInCampContext = true;
        this.loadCampRegistrations();
      } else {
        this.isInCampContext = false;
        this.loadClubs();
      }
    });
  }

  loadClubs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs.sort((a, b) => a.name.localeCompare(b.name));
        this.filteredClubs = [...this.clubs];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los clubes: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  loadCampRegistrations(): void {
    if (!this.campId) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.campRegistrationService.getCampRegistrations(this.campId).subscribe({
      next: (registrations) => {
        this.campRegistrations = registrations.sort((a, b) =>
          a.clubCategory.club.name.localeCompare(b.clubCategory.club.name)
        );
        this.filteredRegistrations = [...this.campRegistrations];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los registros del campamento: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  filterClubs(): void {
    if (this.isInCampContext) {
      this.filterRegistrations();
      return;
    }

    if (!this.searchTerm) {
      this.filteredClubs = [...this.clubs];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredClubs = this.clubs.filter((club) =>
      club.name.toLowerCase().includes(searchLower)
    );
  }

  filterRegistrations(): void {
    if (!this.searchTerm) {
      this.filteredRegistrations = [...this.campRegistrations];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredRegistrations = this.campRegistrations.filter((reg) =>
      reg.clubCategory.club.name.toLowerCase().includes(searchLower) ||
      reg.clubCategory.club.city.toLowerCase().includes(searchLower)
    );
  }

  onSearchChange(): void {
    this.filterClubs();
  }

  onDeleteClub(id: number): void {
    const club = this.clubs.find(c => c.id === id);
    if (!club) return;
    
    this.clubToDelete = club;
    this.confirmationText = '';
    this.canConfirmDelete = false;
    this.isDeletingClub = false;
    
    // Mostrar el modal usando Bootstrap
    const modalElement = document.getElementById('deleteClubModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  onConfirmationTextChange(): void {
    this.canConfirmDelete = this.confirmationText === this.clubToDelete?.name;
  }

  cancelDelete(): void {
    this.clubToDelete = null;
    this.confirmationText = '';
    this.canConfirmDelete = false;
    this.isDeletingClub = false;
  }

  confirmDelete(): void {
    if (!this.clubToDelete || !this.canConfirmDelete) return;

    this.isDeletingClub = true;
    const clubId = this.clubToDelete.id;

    this.clubService.deleteClub(clubId).subscribe({
      next: () => {
        // Ocultar el modal
        const modalElement = document.getElementById('deleteClubModal');
        if (modalElement) {
          const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
          modal?.hide();
        }

        // Limpiar estado del modal
        this.cancelDelete();

        // Recargar la lista
        this.loadClubs();
      },
      error: (error) => {
        this.errorMessage = 'Error al eliminar el club: ' + error.message;
        this.isDeletingClub = false;
      },
    });
  }
}
