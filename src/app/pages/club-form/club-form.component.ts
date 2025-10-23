import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubService, CreateClubDto, UpdateClubDto } from '../../services/club.service';
import { CategoryService, Category } from '../../services/category.service';

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
  isLoading = false;
  errorMessage = '';
  shieldFile?: File;
  shieldPreview?: string;
  currentShield?: string;
  categories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private clubService: ClubService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.clubId = +id;
        this.loadClubData(this.clubId);
      }
    });
  }

  initForm(): void {
    this.clubForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required]],
      motto: ['', [Validators.required, Validators.minLength(5)]],
      categoryIds: this.fb.array([]),
    });
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.filter(c => c.isActive);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  loadClubData(id: number): void {
    this.isLoading = true;
    this.clubService.getClub(id).subscribe({
      next: (club) => {
        this.clubForm.patchValue({
          name: club.name,
          city: club.city,
          motto: club.motto,
        });

        // Cargar las categorías seleccionadas
        const categoryIds = club.clubCategories.map(cc => cc.category.id);
        const categoryIdsArray = this.clubForm.get('categoryIds') as FormArray;
        categoryIdsArray.clear();
        categoryIds.forEach(id => {
          categoryIdsArray.push(new FormControl(id));
        });

        if (club.shieldUrl) {
          this.currentShield = club.shieldUrl;
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los datos del club: ' + error.message;
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

  get categoryIdsArray(): FormArray {
    return this.clubForm.get('categoryIds') as FormArray;
  }

  isCategorySelected(categoryId: number): boolean {
    return this.categoryIdsArray.value.includes(categoryId);
  }

  onCategoryChange(categoryId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const categoryIdsArray = this.categoryIdsArray;

    if (checkbox.checked) {
      // Agregar categoría
      if (!categoryIdsArray.value.includes(categoryId)) {
        categoryIdsArray.push(new FormControl(categoryId));
      }
    } else {
      // Remover categoría
      const index = categoryIdsArray.value.indexOf(categoryId);
      if (index >= 0) {
        categoryIdsArray.removeAt(index);
      }
    }
  }

  onSubmit(): void {
    if (this.clubForm.invalid) {
      Object.keys(this.clubForm.controls).forEach(key => {
        const control = this.clubForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValue = this.clubForm.value;

    if (this.isEditMode && this.clubId) {
      // Actualizar club existente
      const updateData: UpdateClubDto = {
        name: formValue.name,
        city: formValue.city,
        motto: formValue.motto,
        categoryIds: formValue.categoryIds || []
      };

      this.clubService
        .updateClub(this.clubId, updateData, this.shieldFile)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/clubs']);
          },
          error: (error) => {
            this.errorMessage = 'Error al actualizar el club: ' + error.message;
            this.isLoading = false;
          },
        });
    } else {
      // Crear nuevo club
      const createData: CreateClubDto = {
        name: formValue.name,
        city: formValue.city,
        motto: formValue.motto,
        categoryIds: formValue.categoryIds || []
      };

      this.clubService.createClub(createData, this.shieldFile).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/clubs']);
        },
        error: (error) => {
          this.errorMessage = 'Error al crear el club: ' + error.message;
          this.isLoading = false;
        },
      });
    }
  }

  // Getters para facilitar el acceso en la plantilla
  get name() {
    return this.clubForm.get('name');
  }
  get city() {
    return this.clubForm.get('city');
  }
  get motto() {
    return this.clubForm.get('motto');
  }
}
