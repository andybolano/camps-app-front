import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Club, ClubService } from '../../services/club.service';
import { CampService } from '../../services/camp.service';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './clubs.component.html',
  styleUrl: './clubs.component.scss',
})
export class ClubsComponent implements OnInit {
  clubs: Club[] = [];
  campId!: number;
  campName = 'Cargando...';
  isLoading = false;
  errorMessage = '';

  constructor(
    private clubService: ClubService,
    private campService: CampService,
    private route: ActivatedRoute,
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
        this.clubs = clubs;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los clubes: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  onDeleteClub(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar este club?')) {
      return;
    }

    this.isLoading = true;
    this.clubService.deleteClub(id).subscribe({
      next: () => {
        this.clubs = this.clubs.filter((club) => club.id !== id);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al eliminar el club: ' + error.message;
        this.isLoading = false;
      },
    });
  }
}
