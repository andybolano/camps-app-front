import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Club, ClubService } from '../../services/club.service';

@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './club-detail.component.html',
  styleUrl: './club-detail.component.scss',
})
export class ClubDetailComponent implements OnInit {
  clubId!: number;
  club: Club | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private clubService: ClubService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const clubId = params.get('id');

      if (clubId) {
        this.clubId = +clubId;
        this.loadClubData();
      }
    });
  }

  loadClubData(): void {
    this.isLoading = true;
    this.clubService.getClub(this.clubId).subscribe({
      next: (club) => {
        this.club = club;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar datos del club: ${error.message}`;
        this.isLoading = false;
      },
    });
  }
}
