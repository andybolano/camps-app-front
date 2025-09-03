import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResultService } from '../../services/result.service';
import { CampService, Camp } from '../../services/camp.service';

@Component({
  selector: 'app-camp-ranking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './camp-ranking.component.html',
  styleUrl: './camp-ranking.component.scss',
})
export class CampRankingComponent implements OnInit {
  campId!: number;
  camp: Camp | null = null;
  isLoading = false;
  errorMessage = '';
  rankingData: any[] = [];

  constructor(
    private resultService: ResultService,
    private campService: CampService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.campId = +params['campId'];
      this.loadCampData();
      this.loadRankingData();
    });
  }

  loadCampData(): void {
    this.isLoading = true;
    this.campService.getCamp(this.campId).subscribe({
      next: (camp) => {
        this.camp = camp;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar los datos del campamento: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  loadRankingData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.resultService.getClubRankingByCamp(this.campId).subscribe({
      next: (data) => {
        this.rankingData = this.sortRankingData(data);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar el ranking: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  // Ordenar datos del ranking por puntaje y luego alfabéticamente
  private sortRankingData(data: any[]): any[] {
    // Ordenar por puntaje descendente y luego alfabéticamente por nombre
    const sortedData = data.sort((a, b) => {
      // Primero comparar por puntaje (descendente)
      const scoreDiff = b.totalScore - a.totalScore;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      // Si los puntajes son iguales, ordenar alfabéticamente (ascendente)
      return a.club.name.localeCompare(b.club.name);
    });

    // Recalcular los rankings después del ordenamiento
    return sortedData.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }

  // Obtener las clases para la medalla según la posición
  getMedalClass(rank: number): string {
    if (rank === 1) return 'medal-gold';
    if (rank === 2) return 'medal-silver';
    if (rank === 3) return 'medal-bronze';
    return '';
  }

  // Método para obtener la clase CSS para la insignia de ranking
  getRankBadgeClass(rank: number): any {
    return {
      'bg-success': rank === 1,
      'bg-primary': rank === 2,
      'bg-info': rank === 3,
      'bg-secondary': rank > 3,
    };
  }

  // Método para obtener el sufijo del ranking (1er, 2do, 3er, etc.)
  getRankSuffix(rank: number): string {
    if (rank === 1) return 'er';
    if (rank === 2) return 'do';
    if (rank === 3) return 'er';
    return 'to';
  }

  goBack(): void {
    this.router.navigate(['/camps', this.campId]);
  }
}
