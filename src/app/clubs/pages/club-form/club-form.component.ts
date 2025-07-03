import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubService, CreateClubDto } from '../../services/club.service';
import { CampService } from '../../services/camp.service';

@Component({
  selector: 'app-club-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './club-form.component.html',
  styleUrl: './club-form.component.scss',
})
export class ClubFormComponent implements OnInit {
  clubForm!: FormGroup;
  isEditMode = false;
  clubId?: number;
  campId!: number;
  campName = 'Cargando...';
  isLoading = false;
  errorMessage = '';
  shieldFile?: File;
  shieldPreview?: string;
  currentShield?: string;
  debug = true; // Habilitar mensajes de depuración

  constructor(
    private fb: FormBuilder,
    private clubService: ClubService,
    private campService: CampService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Obtener campId
    this.route.paramMap.subscribe((params) => {
      const campId = params.get('campId');
      if (campId) {
        this.campId = +campId;
        this.loadCampData(this.campId);

        // Verificar si estamos en modo edición
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.clubId = +id;
          this.loadClubData(this.clubId);
        }
      }
    });
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      name: ['', [Validators.required]],
      city: ['', [Validators.required]],
      participantsCount: [0, [Validators.required, Validators.min(0)]],
      guestsCount: [0, [Validators.required, Validators.min(0)]],
      minorsCount: [0, [Validators.required, Validators.min(0)]],
      economsCount: [0, [Validators.required, Validators.min(0)]],
      companionsCount: [0, [Validators.required, Validators.min(0)]],
      directorCount: [0, [Validators.required, Validators.min(0)]],
      pastorCount: [0, [Validators.required, Validators.min(0)]],
      registrationFee: [0, [Validators.required, Validators.min(0)]],
      isPaid: [false],
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

  loadClubData(id: number): void {
    this.isLoading = true;
    this.clubService.getClub(id).subscribe({
      next: (club) => {
        this.clubForm.setValue({
          name: club.name,
          city: club.city,
          participantsCount: club.participantsCount,
          guestsCount: club.guestsCount,
          minorsCount: club.minorsCount || 0,
          economsCount: club.economsCount,
          companionsCount: club.companionsCount || 0,
          directorCount: club.directorCount || 0,
          pastorCount: club.pastorCount || 0,
          registrationFee: club.registrationFee,
          isPaid: club.isPaid,
        });

        // Guardar la URL del escudo actual si existe
        if (club.shieldUrl) {
          this.currentShield = club.shieldUrl;
          console.log('URL del escudo cargada:', this.currentShield);
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          'Error al cargar los datos del club: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  onShieldChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.shieldFile = inputElement.files[0];

      // Crear una URL para previsualizar la imagen
      if (this.shieldPreview) {
        URL.revokeObjectURL(this.shieldPreview); // Liberar memoria
      }
      this.shieldPreview = URL.createObjectURL(this.shieldFile);
    }
  }

  clearShield(): void {
    this.shieldFile = undefined;
    if (this.shieldPreview) {
      URL.revokeObjectURL(this.shieldPreview);
      this.shieldPreview = undefined;
    }
  }

  onSubmit(): void {
    if (this.clubForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData: CreateClubDto = {
      ...this.clubForm.value,
      campId: this.campId,
    };

    console.log('Form isPaid value:', this.clubForm.get('isPaid')?.value);
    console.log('Form data to submit:', formData);

    if (this.isEditMode && this.clubId) {
      // Actualizar club existente
      this.clubService
        .updateClub(this.clubId, formData, this.shieldFile)
        .subscribe({
          next: (updatedClub) => {
            console.log('Club actualizado con isPaid:', updatedClub.isPaid);
            this.isLoading = false;
            this.router.navigate(['/camps', this.campId, 'clubs']);
          },
          error: (error) => {
            this.errorMessage = 'Error al actualizar el club: ' + error.message;
            this.isLoading = false;
          },
        });
    } else {
      // Crear nuevo club
      this.clubService.createClub(formData, this.shieldFile).subscribe({
        next: (newClub) => {
          console.log('Club creado con isPaid:', newClub.isPaid);
          this.isLoading = false;
          this.router.navigate(['/camps', this.campId, 'clubs']);
        },
        error: (error) => {
          this.errorMessage = 'Error al crear el club: ' + error.message;
          this.isLoading = false;
        },
      });
    }
  }

  onIsPaidChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log('isPaid checkbox changed:', target.checked);
  }

  // Getters para facilitar el acceso en la plantilla
  get name() {
    return this.clubForm.get('name');
  }
  get city() {
    return this.clubForm.get('city');
  }
  get participantsCount() {
    return this.clubForm.get('participantsCount');
  }
  get guestsCount() {
    return this.clubForm.get('guestsCount');
  }
  get minorsCount() {
    return this.clubForm.get('minorsCount');
  }
  get economsCount() {
    return this.clubForm.get('economsCount');
  }
  get companionsCount() {
    return this.clubForm.get('companionsCount');
  }
  get directorCount() {
    return this.clubForm.get('directorCount');
  }
  get pastorCount() {
    return this.clubForm.get('pastorCount');
  }
  get registrationFee() {
    return this.clubForm.get('registrationFee');
  }
  get isPaid() {
    return this.clubForm.get('isPaid');
  }
}
