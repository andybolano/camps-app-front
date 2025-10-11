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
  allEvents: any[] = [];

  constructor(
    private resultService: ResultService,
    private campService: CampService,
    private route: ActivatedRoute,
    private router: Router
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
        this.extractAllEvents(data);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar el ranking: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  // Extraer todos los eventos únicos de los datos de ranking
  private extractAllEvents(data: any[]): void {
    const eventsMap = new Map();

    data.forEach((clubData) => {
      clubData.eventResults.forEach((eventResult: any) => {
        if (!eventsMap.has(eventResult.event.id)) {
          eventsMap.set(eventResult.event.id, eventResult.event);
        }
      });
    });

    // Convertir a array y ordenar alfabéticamente por nombre del evento
    this.allEvents = Array.from(eventsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  // Obtener puntaje de un club para un evento específico
  getEventScore(clubData: any, eventId: number): number {
    const eventResult = clubData.eventResults.find(
      (er: any) => er.event.id === eventId
    );
    return eventResult ? eventResult.score : 0;
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
      rank: index + 1,
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

  // Método para exportar la tabla a Excel
  exportToExcel(): void {
    if (!this.rankingData || this.rankingData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear el contenido CSV
    let csvContent = '';

    // Encabezados
    const headers = ['Posición', 'Club', 'Ciudad'];
    this.allEvents.forEach((event) => {
      headers.push(event.name);
    });
    headers.push('Total');

    csvContent += headers.join(',') + '\n';

    // Datos
    this.rankingData.forEach((item) => {
      const row = [
        item.rank,
        `"${item.club.name}"`, // Comillas para manejar nombres con comas
        `"${item.club.city}"`,
      ];

      // Agregar puntajes de eventos
      this.allEvents.forEach((event) => {
        const score = this.getEventScore(item, event.id);
        row.push(score.toFixed(1));
      });

      // Agregar total
      row.push(item.totalScore.toFixed(1));

      csvContent += row.join(',') + '\n';
    });

    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // Nombre del archivo con fecha y nombre del campamento
      const campName = this.camp?.name || 'Campamento';
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Ranking_${campName.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      )}_${date}.csv`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
