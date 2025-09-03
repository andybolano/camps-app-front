import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Club, ClubService } from '../../services/club.service';
import { CampService } from '../../services/camp.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.scss',
})
export class ClubsComponent implements OnInit {
  clubs: Club[] = [];
  filteredClubs: Club[] = [];
  searchTerm = '';
  campId!: number;
  campName = 'Cargando...';
  isLoading = false;
  errorMessage = '';

  constructor(
    private clubService: ClubService,
    private campService: CampService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const campId = params.get('campId');
      if (campId) {
        this.campId = +campId;
        this.loadCampData(this.campId);
        this.loadClubs(this.campId);
      }
    });
  }

  loadCampData(campId: number): void {
    this.campService.getCamp(campId).subscribe({
      next: (camp) => {
        this.campName = camp.name;
      },
      error: (error) => {
        this.errorMessage =
          'Error al cargar los datos del campamento: ' + error.message;
      },
    });
  }

  loadClubs(campId: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clubService.getClubsByCamp(campId).subscribe({
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

  filterClubs(): void {
    if (!this.searchTerm) {
      this.filteredClubs = [...this.clubs];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredClubs = this.clubs.filter((club) =>
      club.name.toLowerCase().includes(searchLower)
    );
  }

  onSearchChange(): void {
    this.filterClubs();
  }

  onDeleteClub(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar este club?')) {
      return;
    }

    this.isLoading = true;
    this.clubService.deleteClub(id).subscribe({
      next: () => {
        // Recargar la lista completa desde el servidor para asegurar sincronización
        this.loadClubs(this.campId);
      },
      error: (error) => {
        this.errorMessage = 'Error al eliminar el club: ' + error.message;
        this.isLoading = false;
      },
    });
  }
}
