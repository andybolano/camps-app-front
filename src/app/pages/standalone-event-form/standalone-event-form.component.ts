import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventService, CreateEventDto } from '../../services/event.service';

@Component({
  selector: 'app-standalone-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './standalone-event-form.component.html',
  styleUrl: './standalone-event-form.component.scss',
})
export class StandaloneEventFormComponent implements OnInit {
  eventForm!: FormGroup;
  eventId?: number;
  isEdit = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Verificar si es edición
    this.route.params.subscribe((params) => {
      this.eventId = params['id'] ? +params['id'] : undefined;
      this.isEdit = !!this.eventId;

      // Si es edición, cargar datos del evento
      if (this.isEdit && this.eventId) {
        this.loadEventData(this.eventId);
      }
    });
  }

  private initForm(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      type: [{ value: 'REGULAR', disabled: true }, [Validators.required]],
      maxScore: [100, [Validators.required, Validators.min(1)]],
      items: this.fb.array([]),
    });
  }

  private loadEventData(eventId: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.getEvent(eventId).subscribe({
      next: (event) => {
        // Actualizar el formulario con los datos del evento
        this.eventForm.patchValue({
          name: event.name,
          description: event.description || '',
          type: event.type || 'REGULAR',
          maxScore: event.maxScore || 100,
        });

        // Cargar los items
        if (event.items && event.items.length > 0) {
          this.clearItems();
          event.items.forEach((item) => {
            this.addItem(item.name);
          });
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar el evento: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  get items(): FormArray {
    return this.eventForm.get('items') as FormArray;
  }

  addItem(name: string = ''): void {
    const itemForm = this.fb.group({
      name: [name, Validators.required],
    });

    this.items.push(itemForm);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  clearItems(): void {
    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    // Validar que haya al menos un item
    if (this.items.length === 0) {
      this.errorMessage = 'Debe agregar al menos un ítem al evento.';
      window.scrollTo(0, 0);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Preparar datos en el formato que espera el backend
    const eventData: CreateEventDto = {
      name: this.eventForm.get('name')?.value,
      description: this.eventForm.get('description')?.value,
      maxScore: this.eventForm.get('maxScore')?.value,
      type: 'REGULAR', // Por ahora solo REGULAR
      items: this.items.value,
    };

    console.log('Enviando datos del evento:', eventData);

    // Enviar según sea creación o edición
    if (this.isEdit && this.eventId) {
      this.eventService.updateEvent(this.eventId, eventData).subscribe({
        next: () => {
          this.router.navigate(['/events']);
        },
        error: (error) => {
          this.handleError(error, 'actualizar');
        },
      });
    } else {
      this.eventService.createEvent(eventData).subscribe({
        next: () => {
          this.router.navigate(['/events']);
        },
        error: (error) => {
          this.handleError(error, 'crear');
        },
      });
    }
  }

  private handleError(error: any, action: string): void {
    if (error.error && error.error.message) {
      this.errorMessage = error.error.message;
    } else if (error.error && typeof error.error === 'string') {
      this.errorMessage = error.error;
    } else if (error.message) {
      this.errorMessage = `Error al ${action} el evento: ${error.message}`;
    } else {
      this.errorMessage = `Error al ${action} el evento. Contacte al administrador.`;
    }
    this.isLoading = false;
    window.scrollTo(0, 0);
  }

  cancel(): void {
    this.router.navigate(['/events']);
  }
}
