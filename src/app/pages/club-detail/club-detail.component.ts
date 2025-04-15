import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Club, ClubService } from '../../services/club.service';
import { Result, ResultService } from '../../services/result.service';
import { CampService } from '../../services/camp.service';
import { EventService } from '../../services/event.service';
import { FormsModule } from '@angular/forms';

declare const bootstrap: any; // Declaración para usar Bootstrap JS

@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './club-detail.component.html',
  styleUrl: './club-detail.component.scss',
})
export class ClubDetailComponent implements OnInit {
  @ViewChild('resultModal') resultModal!: ElementRef;

  clubId!: number;
  campId!: number;
  club: Club | null = null;
  results: Result[] = [];
  filteredResults: Result[] = [];
  isLoading = true;
  errorMessage = '';
  searchTerm = '';
  sortColumn = 'event.name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Propiedades para el modal
  currentResult: Result | null = null;
  resultDetail: {
    eventName: string;
    eventDate?: string;
    totalScore: number;
    rank?: number;
    items: {
      name: string;
      percentage: number;
      score: number;
      weightedScore: number;
    }[];
  } | null = null;

  modal: any;

  constructor(
    private clubService: ClubService,
    private resultService: ResultService,
    private campService: CampService,
    private eventService: EventService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const clubId = params.get('id');
      const campId = params.get('campId');

      if (clubId && campId) {
        this.clubId = +clubId;
        this.campId = +campId;
        this.loadClubData();
        this.loadClubResults();
      }
    });
  }

  ngAfterViewInit() {
    // Inicializar el modal de Bootstrap
    this.modal = new bootstrap.Modal(this.resultModal.nativeElement);
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

  loadClubResults(): void {
    this.resultService.getResultsByClub(this.clubId).subscribe({
      next: (results) => {
        this.results = results;
        this.filteredResults = [...results];
        this.sortResults();
        console.log('Resultados obtenidos:', results);
      },
      error: (error) => {
        this.errorMessage = `Error al cargar resultados: ${error.message}`;
      },
    });
  }

  filterResults(): void {
    if (!this.searchTerm) {
      this.filteredResults = [...this.results];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredResults = this.results.filter((result) =>
        (result.event?.name || 'Evento desconocido')
          .toLowerCase()
          .includes(searchLower)
      );
    }
    this.sortResults();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortResults();
  }

  sortResults(): void {
    this.filteredResults.sort((a, b) => {
      const aValue =
        this.sortColumn === 'event.name'
          ? (a.event?.name || 'Evento desconocido').toLowerCase()
          : (a[this.sortColumn as keyof Result] || '').toString().toLowerCase();
      const bValue =
        this.sortColumn === 'event.name'
          ? (b.event?.name || 'Evento desconocido').toLowerCase()
          : (b[this.sortColumn as keyof Result] || '').toString().toLowerCase();

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Abre el modal con los detalles del resultado
  showResultDetail(result: Result): void {
    this.currentResult = result;
    console.log('Mostrando detalle para resultado:', result);

    // Inicializar el objeto de detalle
    this.resultDetail = {
      eventName: result.event?.name || 'Evento desconocido',
      eventDate: result.event?.date,
      totalScore: result.totalScore || 0,
      rank: result.rank,
      items: [],
    };

    // Obtener eventId desde el resultado o desde la propiedad event si está disponible
    const eventId = result.eventId || result.event?.id;

    if (!eventId) {
      console.error(
        'No se pudo determinar el ID del evento para este resultado:',
        result
      );
      this.resultDetail.items = [];
      this.openModal();
      return;
    }

    // Siempre obtenemos el resultado completo para asegurar todos los datos
    this.resultService.getResult(result.id!).subscribe({
      next: (detailedResult) => {
        console.log('Resultado detallado obtenido:', detailedResult);

        // Usar el eventId del resultado detallado o el que ya teníamos
        const detailedEventId =
          detailedResult.eventId || result.event?.id || eventId;

        // Luego, obtenemos el evento para tener los detalles de los items
        this.eventService.getEvent(detailedEventId).subscribe({
          next: (event) => {
            console.log('Evento obtenido:', event);
            this.processItems(detailedResult, event);
            this.openModal();
          },
          error: (error) => {
            console.error('Error al cargar evento:', error);
            // Abrimos el modal aún sin los detalles del evento
            this.openModal();
          },
        });
      },
      error: (error) => {
        console.error('Error al cargar detalles del resultado:', error);
        // Intentamos continuar con los datos que tenemos
        this.eventService.getEvent(eventId).subscribe({
          next: (event) => {
            console.log('Evento obtenido (tras error):', event);
            this.processItems(result, event);
            this.openModal();
          },
          error: () => this.openModal(), // Abrimos el modal aún sin datos completos
        });
      },
    });
  }

  private processItems(result: Result, event: any): void {
    if (!this.resultDetail) return;

    console.log('Procesando items. Resultado:', result);
    console.log('Evento obtenido para procesar items:', event);

    // Si el evento no tiene items ni memberBasedItems, mostramos un mensaje en la consola
    if (
      (!event.items || !Array.isArray(event.items)) &&
      (!event.memberBasedItems || !Array.isArray(event.memberBasedItems))
    ) {
      console.warn(
        'El evento no tiene items ni memberBasedItems definidos o no son arrays:',
        event
      );
      this.resultDetail.items = [];
      return;
    }

    // Dependiendo del tipo de evento, usamos los items apropiados
    if (
      event.type === 'MEMBER_BASED' &&
      event.memberBasedItems &&
      Array.isArray(event.memberBasedItems)
    ) {
      console.log(
        'Evento de tipo MEMBER_BASED. Procesando memberBasedItems:',
        event.memberBasedItems
      );

      // Extraer los scores del resultado para eventos basados en miembros
      let memberBasedResultItems: any[] = [];

      // Primera fuente: propiedad memberBasedItems en formato anidado
      if (result.memberBasedItems && Array.isArray(result.memberBasedItems)) {
        console.log(
          'Usando memberBasedItems del resultado:',
          result.memberBasedItems
        );
        memberBasedResultItems = result.memberBasedItems;
      }
      // Segunda fuente: propiedad memberBasedScores para resultados normalizados
      else if (
        result.memberBasedScores &&
        Array.isArray(result.memberBasedScores)
      ) {
        console.log(
          'Usando memberBasedScores del resultado:',
          result.memberBasedScores
        );
        memberBasedResultItems = result.memberBasedScores;
      }

      // Para detectar el caso especial de items con estructura completa
      const hasNestedEventItem =
        memberBasedResultItems.length > 0 &&
        typeof memberBasedResultItems[0] === 'object' &&
        'eventItem' in memberBasedResultItems[0];

      console.log(
        'MemberBasedItems tienen estructura anidada:',
        hasNestedEventItem
      );

      // Mapear los items del evento basado en miembros
      this.resultDetail.items = event.memberBasedItems.map((eventItem: any) => {
        let score = 0;
        let matchCount = 0;
        let totalWithCharacteristic = 0;

        // Buscar la puntuación correspondiente
        if (hasNestedEventItem) {
          // Formato anidado: item.eventItem.id
          const matchingItem = memberBasedResultItems.find(
            (item) => item.eventItem && item.eventItem.id === eventItem.id
          );
          if (matchingItem) {
            score = matchingItem.score || 0;
            matchCount = matchingItem.matchCount || 0;
            totalWithCharacteristic = matchingItem.totalWithCharacteristic || 0;
          }
        } else {
          // Formato plano: item.eventItemId
          const matchingItem = memberBasedResultItems.find(
            (item) => item.eventItemId === eventItem.id
          );
          if (matchingItem) {
            score = matchingItem.score || 0;
            matchCount = matchingItem.matchCount || 0;
            totalWithCharacteristic = matchingItem.totalWithCharacteristic || 0;
          }
        }

        const percentage = eventItem.percentage || 0;
        const weightedScore = (score * percentage) / 100;

        // Añadir información adicional para eventos MEMBER_BASED en nombre del item
        const matchInfo =
          totalWithCharacteristic > 0
            ? ` (${matchCount}/${totalWithCharacteristic})`
            : '';

        return {
          name: (eventItem.name || `Ítem ${eventItem.id}`) + matchInfo,
          percentage: percentage,
          score: score,
          weightedScore: weightedScore,
        };
      });
    } else {
      // Código existente para eventos REGULAR
      console.log('Items del evento:', event.items);

      // Extraer los scores del resultado
      let resultItems: any[] = [];

      // Primera fuente: propiedad items en formato anidado
      if (result.items && Array.isArray(result.items)) {
        console.log('Usando items del resultado:', result.items);
        resultItems = result.items;
      }
      // Segunda fuente: propiedad scores para resultados normalizados
      else if (result.scores && Array.isArray(result.scores)) {
        console.log('Usando scores del resultado:', result.scores);
        resultItems = result.scores;
      }

      // Para detectar el caso especial de items con estructura completa
      const hasNestedEventItem =
        resultItems.length > 0 &&
        typeof resultItems[0] === 'object' &&
        'eventItem' in resultItems[0];

      console.log('Items tienen estructura anidada:', hasNestedEventItem);

      // Mapear los items del evento
      this.resultDetail.items = event.items.map((eventItem: any) => {
        let score = 0;

        // Buscar la puntuación correspondiente
        if (hasNestedEventItem) {
          // Formato anidado: item.eventItem.id
          const matchingItem = resultItems.find(
            (item) => item.eventItem && item.eventItem.id === eventItem.id
          );
          if (matchingItem) score = matchingItem.score || 0;
        } else {
          // Formato plano: item.eventItemId
          const matchingItem = resultItems.find(
            (item) => item.eventItemId === eventItem.id
          );
          if (matchingItem) score = matchingItem.score || 0;
        }

        const percentage = eventItem.percentage || 0;
        const weightedScore = (score * percentage) / 100;

        return {
          name: eventItem.name || `Ítem ${eventItem.id}`,
          percentage: percentage,
          score: score,
          weightedScore: weightedScore,
        };
      });
    }

    console.log('Items procesados para el modal:', this.resultDetail.items);
  }

  // Abrir el modal
  private openModal(): void {
    if (this.modal) {
      this.modal.show();
    }
  }

  // Función auxiliar para formatear la fecha
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
