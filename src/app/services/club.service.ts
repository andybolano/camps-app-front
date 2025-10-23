import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Category {
  id: number;
  name: string;
  description: string;
  code: string;
  isActive: boolean;
}

export interface ClubCategory {
  id: number;
  isActive: boolean;
  createdAt: string;
  category: Category;
}

export interface Club {
  id: number;
  name: string;
  city: string;
  motto: string;
  shieldUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  clubCategories: ClubCategory[];
}

export interface CreateClubDto {
  name: string;
  city: string;
  motto: string;
  categoryIds?: number[];
}

export interface UpdateClubDto {
  name?: string;
  city?: string;
  motto?: string;
  categoryIds?: number[];
}

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  private apiUrl = `${environment.apiBaseUrl}/clubs`;
  private baseUrl = environment.apiBaseUrl.split('/api')[0]; // Obtener la URL base sin /api

  constructor(private http: HttpClient) {}

  // Método auxiliar para convertir las URLs relativas en URLs absolutas
  private processShieldUrl(club: Club): Club {
    if (club.shieldUrl && !club.shieldUrl.startsWith('http')) {
      // Si la URL no comienza con http, entonces es relativa
      club.shieldUrl = `${this.baseUrl}/${club.shieldUrl}`;
    }
    return club;
  }

  getClubs(): Observable<Club[]> {
    return this.http
      .get<Club[]>(this.apiUrl)
      .pipe(map((clubs) => clubs.map((club) => this.processShieldUrl(club))));
  }

  getClub(id: number): Observable<Club> {
    return this.http
      .get<Club>(`${this.apiUrl}/${id}`)
      .pipe(map((club) => this.processShieldUrl(club)));
  }

  getClubsByCategory(categoryId: number): Observable<Club[]> {
    return this.http
      .get<Club[]>(`${this.apiUrl}/by-category/${categoryId}`)
      .pipe(map((clubs) => clubs.map((club) => this.processShieldUrl(club))));
  }

  createClub(clubDto: CreateClubDto, shield?: File): Observable<Club> {
    // Siempre usar FormData cuando hay shield o categoryIds
    if (shield || (clubDto.categoryIds && clubDto.categoryIds.length > 0)) {
      const formData = new FormData();
      formData.append('name', clubDto.name);
      formData.append('city', clubDto.city);
      formData.append('motto', clubDto.motto);

      // Agregar categoryIds si existen
      if (clubDto.categoryIds && clubDto.categoryIds.length > 0) {
        clubDto.categoryIds.forEach(id => {
          formData.append('categoryIds[]', id.toString());
        });
      }

      // Agregar shield si existe
      if (shield) {
        formData.append('shield', shield);
      }

      return this.http
        .post<Club>(this.apiUrl, formData)
        .pipe(map((club) => this.processShieldUrl(club)));
    } else {
      // Sin escudo ni categorías - usar JSON
      return this.http
        .post<Club>(this.apiUrl, clubDto, {
          headers: { 'Content-Type': 'application/json' }
        })
        .pipe(map((club) => this.processShieldUrl(club)));
    }
  }

  updateClub(id: number, clubDto: UpdateClubDto, shield?: File): Observable<Club> {
    // Usar FormData cuando hay shield o categoryIds
    if (shield || (clubDto.categoryIds && clubDto.categoryIds.length > 0)) {
      const formData = new FormData();
      if (clubDto.name !== undefined) formData.append('name', clubDto.name);
      if (clubDto.city !== undefined) formData.append('city', clubDto.city);
      if (clubDto.motto !== undefined) formData.append('motto', clubDto.motto);

      // Agregar categoryIds si existen
      if (clubDto.categoryIds && clubDto.categoryIds.length > 0) {
        clubDto.categoryIds.forEach(id => {
          formData.append('categoryIds[]', id.toString());
        });
      }

      // Agregar shield si existe
      if (shield) {
        formData.append('shield', shield);
      }

      return this.http
        .patch<Club>(`${this.apiUrl}/${id}`, formData)
        .pipe(map((club) => this.processShieldUrl(club)));
    } else {
      // Sin escudo ni categorías - usar JSON
      return this.http
        .patch<Club>(`${this.apiUrl}/${id}`, clubDto, {
          headers: { 'Content-Type': 'application/json' }
        })
        .pipe(map((club) => this.processShieldUrl(club)));
    }
  }

  deleteClub(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
