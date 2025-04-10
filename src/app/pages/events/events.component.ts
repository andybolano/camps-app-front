import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Event, EventService } from '../../services/event.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss',
})
export class EventsComponent implements OnInit {
  events: Event[] = [];
  campId: number = 0;
  campName: string = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.campId = +params['campId']; // Convertir a número
      this.loadEvents();
    });
  }

  loadEvents(): void {
    if (!this.campId) {
      this.errorMessage = 'ID de campamento no válido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.getEventsByCampId(this.campId).subscribe({
      next: (events) => {
        this.events = events;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los eventos: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  onDeleteEvent(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar este evento?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.deleteEvent(id).subscribe({
      next: () => {
        this.events = this.events.filter((event) => event.id !== id);
        this.isLoading = false;
      },
      error: (error) => {
        // Mostrar el mensaje de error del backend cuando sea posible
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          this.errorMessage = error.error;
        } else if (error.message) {
          this.errorMessage = 'Error al eliminar el evento: ' + error.message;
        } else {
          this.errorMessage =
            'Error al eliminar el evento. Contacte al administrador.';
        }
        this.isLoading = false;

        // Desplazar la página hacia arriba para mostrar el mensaje de error
        window.scrollTo(0, 0);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/camps']);
  }

  getTotalPercentage(event: any): number {
    if (!event.items || event.items.length === 0) {
      return 0;
    }
    return event.items.reduce(
      (total: number, item: any) => total + (item.percentage || 0),
      0,
    );
  }
}
