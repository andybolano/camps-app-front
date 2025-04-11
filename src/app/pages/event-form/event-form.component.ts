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
import { EventService } from '../../services/event.service';
import { CampService } from '../../services/camp.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
})
export class EventFormComponent implements OnInit {
  eventForm!: FormGroup;
  campId!: number;
  eventId?: number;
  isEdit = false;
  isLoading = false;
  errorMessage = '';
  campName = '';
  eventTypes = [
    { value: 'REGULAR', label: 'Regular' },
    { value: 'MEMBER_BASED', label: 'Basado en Características de Miembros' },
  ];
  characteristicOptions = [
    { value: 'minorsCount', label: 'Guias menores' },
    { value: 'participantsCount', label: 'Guias bautizados' },
    { value: 'guestsCount', label: 'Guias no bautizados' },
    { value: 'companionsCount', label: 'Acompañantes' },
    { value: 'economsCount', label: 'Economas' },
    { value: 'directorCount', label: 'Director de club' },
    { value: 'pastorCount', label: 'Pastor' },
  ];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private campService: CampService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Obtener campId
    this.route.params.subscribe((params) => {
      this.campId = +params['campId'];
      this.eventId = params['id'] ? +params['id'] : undefined;
      this.isEdit = !!this.eventId;

      // Cargar datos del campamento
      this.loadCampData();

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
      type: ['REGULAR', [Validators.required]],
      maxScore: [100, [Validators.required, Validators.min(1)]],
      items: this.fb.array([]),
      memberBasedItems: this.fb.array([]),
    });

    // Observe type changes to toggle appropriate item sections
    this.eventForm.get('type')?.valueChanges.subscribe((type) => {
      console.log('Event type changed to:', type);
    });
  }

  private loadCampData(): void {
    if (!this.campId) return;

    this.campService.getCamp(this.campId).subscribe({
      next: (camp) => {
        this.campName = camp.name;
      },
      error: (error) => {
        this.errorMessage = `Error al cargar datos del campamento: ${error.message}`;
      },
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
          description: event.description,
          type: event.type || 'REGULAR',
          maxScore: event.maxScore || 100,
        });

        // Cargar los items regulares
        if (event.items && event.items.length > 0) {
          // Limpiar el array primero
          this.clearItems();

          // Añadir cada item
          event.items.forEach((item) => {
            this.addItem(item.name);
          });
        }

        // Cargar los items basados en miembros
        if (event.memberBasedItems && event.memberBasedItems.length > 0) {
          // Limpiar el array primero
          this.clearMemberBasedItems();

          // Añadir cada item
          event.memberBasedItems.forEach((item) => {
            this.addMemberBasedItem(item.name, item.applicableCharacteristics);
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

  get memberBasedItems(): FormArray {
    return this.eventForm.get('memberBasedItems') as FormArray;
  }

  get eventType(): string {
    return this.eventForm.get('type')?.value;
  }

  addItem(name: string = ''): void {
    const itemForm = this.fb.group({
      name: [name, Validators.required],
    });

    this.items.push(itemForm);
  }

  addMemberBasedItem(
    name: string = '',
    applicableCharacteristics: string[] = []
  ): void {
    const itemForm = this.fb.group({
      name: [name, Validators.required],
      applicableCharacteristics: [
        applicableCharacteristics,
        [Validators.required, Validators.minLength(1)],
      ],
      calculationType: ['TOTAL', Validators.required],
    });

    this.memberBasedItems.push(itemForm);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  removeMemberBasedItem(index: number): void {
    this.memberBasedItems.removeAt(index);
  }

  clearItems(): void {
    while (this.items.length !== 0) {
      this.items.removeAt(0);
    }
  }

  clearMemberBasedItems(): void {
    while (this.memberBasedItems.length !== 0) {
      this.memberBasedItems.removeAt(0);
    }
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Preparar datos en el formato que espera el backend
    const eventData = {
      ...this.eventForm.value,
      campId: this.campId,
    };

    // Para eventos regulares, asegurarse de que hay al menos un ítem regular
    if (
      eventData.type === 'REGULAR' &&
      (!eventData.items || eventData.items.length === 0)
    ) {
      this.errorMessage =
        'Los eventos regulares requieren al menos un ítem de calificación.';
      this.isLoading = false;
      window.scrollTo(0, 0);
      return;
    }

    // Para eventos basados en miembros, asegurarse de que hay al menos un ítem basado en miembros
    if (
      eventData.type === 'MEMBER_BASED' &&
      (!eventData.memberBasedItems || eventData.memberBasedItems.length === 0)
    ) {
      this.errorMessage =
        'Los eventos basados en miembros requieren al menos un ítem basado en características.';
      this.isLoading = false;
      window.scrollTo(0, 0);
      return;
    }

    console.log('Enviando datos del evento:', eventData);

    // Enviar según sea creación o edición
    if (this.isEdit && this.eventId) {
      this.eventService.updateEvent(this.eventId, eventData).subscribe({
        next: () => {
          this.router.navigate(['/camps', this.campId, 'events']);
        },
        error: (error) => {
          // Mostrar el mensaje de error del backend cuando sea posible
          if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.message) {
            this.errorMessage = `Error al actualizar el evento: ${error.message}`;
          } else {
            this.errorMessage =
              'Error al actualizar el evento. Contacte al administrador.';
          }
          this.isLoading = false;

          // Desplazar la página hacia arriba para mostrar el mensaje de error
          window.scrollTo(0, 0);
        },
      });
    } else {
      this.eventService.createEvent(eventData).subscribe({
        next: () => {
          this.router.navigate(['/camps', this.campId, 'events']);
        },
        error: (error) => {
          // Mostrar el mensaje de error del backend cuando sea posible
          if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.error && typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.message) {
            this.errorMessage = `Error al crear el evento: ${error.message}`;
          } else {
            this.errorMessage =
              'Error al crear el evento. Contacte al administrador.';
          }
          this.isLoading = false;

          // Desplazar la página hacia arriba para mostrar el mensaje de error
          window.scrollTo(0, 0);
        },
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/camps', this.campId, 'events']);
  }

  addCharacteristic(index: number, value: string): void {
    const mbItemForm = this.getMultiBranchItemAt(index);
    if (!mbItemForm) return;

    const characteristics =
      mbItemForm.get('applicableCharacteristics')?.value || [];
    if (!characteristics.includes(value)) {
      mbItemForm
        .get('applicableCharacteristics')
        ?.setValue([...characteristics, value]);
    }
  }

  removeCharacteristic(index: number, value: string): void {
    const mbItemForm = this.getMultiBranchItemAt(index);
    if (!mbItemForm) return;

    const characteristics =
      mbItemForm.get('applicableCharacteristics')?.value || [];
    mbItemForm
      .get('applicableCharacteristics')
      ?.setValue(characteristics.filter((c: string) => c !== value));
  }

  isCharacteristicSelected(index: number, value: string): boolean {
    const mbItemForm = this.getMultiBranchItemAt(index);
    if (!mbItemForm) return false;

    const characteristics =
      mbItemForm.get('applicableCharacteristics')?.value || [];
    return characteristics.includes(value);
  }

  onCharacteristicChange(event: Event, index: number, value: string): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.addCharacteristic(index, value);
    } else {
      this.removeCharacteristic(index, value);
    }
  }

  private getMultiBranchItemAt(index: number): FormGroup | null {
    return (this.eventForm?.get('memberBasedItems') as FormArray | null)
      ? ((this.eventForm.get('memberBasedItems') as FormArray).at(
          index
        ) as FormGroup)
      : null;
  }
}
