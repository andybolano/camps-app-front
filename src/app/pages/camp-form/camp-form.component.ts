import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CampService, CreateCampDto } from '../../services/camp.service';
import { Category, CategoryService } from '../../services/category.service';

@Component({
  selector: 'app-camp-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './camp-form.component.html',
  styleUrl: './camp-form.component.scss',
})
export class CampFormComponent implements OnInit {
  campForm!: FormGroup;
  isEditMode = false;
  campId?: number;
  isLoading = false;
  errorMessage = '';
  logoFile?: File;
  logoPreview?: string;
  currentLogo?: string;
  categories: Category[] = [];
  loadingCategories = false;

  constructor(
    private fb: FormBuilder,
    private campService: CampService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    // Verificar si estamos en modo edición
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.campId = +id;
        this.loadCampData(this.campId);
      }
    });
  }

  initForm(): void {
    this.campForm = this.fb.group({
      name: ['', [Validators.required]],
      location: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      targetCategoryId: ['', [Validators.required]],
      description: [''],
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.filter(c => c.isActive);
        this.loadingCategories = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar las categorías: ' + error.message;
        this.loadingCategories = false;
      },
    });
  }

  loadCampData(id: number): void {
    this.isLoading = true;
    this.campService.getCamp(id).subscribe({
      next: (camp) => {
        // Formatear fechas para input type="date"
        const startDate = camp.startDate
          ? new Date(camp.startDate).toISOString().split('T')[0]
          : '';
        const endDate = camp.endDate
          ? new Date(camp.endDate).toISOString().split('T')[0]
          : '';

        // Extraer el targetCategoryId del objeto targetCategory o usar el campo directo
        const targetCategoryId = camp.targetCategory?.id || camp.targetCategoryId || '';

        this.campForm.patchValue({
          name: camp.name,
          location: camp.location,
          startDate: startDate,
          endDate: endDate,
          targetCategoryId: targetCategoryId,
          description: camp.description || '',
        });

        // Guardar la URL del logo actual si existe
        if (camp.logoUrl) {
          this.currentLogo = camp.logoUrl;
          console.log('URL del logo cargada:', this.currentLogo);
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          'Error al cargar los datos del campamento: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  onLogoChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.logoFile = inputElement.files[0];

      // Crear una URL para previsualizar la imagen
      if (this.logoPreview) {
        URL.revokeObjectURL(this.logoPreview); // Liberar memoria
      }
      this.logoPreview = URL.createObjectURL(this.logoFile);
    }
  }

  onSubmit(): void {
    if (this.campForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData: CreateCampDto = this.campForm.value;

    if (this.isEditMode && this.campId) {
      // Actualizar campamento existente
      this.campService
        .updateCamp(this.campId, formData, this.logoFile)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/camps']);
          },
          error: (error) => {
            this.errorMessage =
              'Error al actualizar el campamento: ' + error.message;
            this.isLoading = false;
          },
        });
    } else {
      // Crear nuevo campamento
      this.campService.createCamp(formData, this.logoFile).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/camps']);
        },
        error: (error) => {
          this.errorMessage = 'Error al crear el campamento: ' + error.message;
          this.isLoading = false;
        },
      });
    }
  }

  // Método para limpiar la imagen seleccionada
  clearLogo(): void {
    this.logoFile = undefined;
    if (this.logoPreview) {
      URL.revokeObjectURL(this.logoPreview);
      this.logoPreview = undefined;
    }
  }

  // Getters para facilitar el acceso en la plantilla
  get name() {
    return this.campForm.get('name');
  }
  get location() {
    return this.campForm.get('location');
  }
  get startDate() {
    return this.campForm.get('startDate');
  }
  get endDate() {
    return this.campForm.get('endDate');
  }
  get targetCategoryId() {
    return this.campForm.get('targetCategoryId');
  }
  get description() {
    return this.campForm.get('description');
  }
}
