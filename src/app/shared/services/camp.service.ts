import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Camp {
  id: number;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
  logoUrl?: string;
  clubs?: any[]; // Información de clubes relacionados
  events?: any[]; // Información de eventos relacionados
}

export interface CreateCampDto {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CampService {
  private apiUrl = `${environment.apiBaseUrl}/camps`;
  private baseUrl = environment.apiBaseUrl.split('/api')[0]; // Obtener la URL base sin /api

  constructor(private http: HttpClient) {}

  // Método auxiliar para convertir las URLs relativas en URLs absolutas
  private processLogoUrl(camp: Camp): Camp {
    if (camp.logoUrl && !camp.logoUrl.startsWith('http')) {
      // Si la URL no comienza con http, entonces es relativa
      camp.logoUrl = `${this.baseUrl}/${camp.logoUrl}`;
    }
    return camp;
  }

  getCamps(): Observable<Camp[]> {
    return this.http
      .get<Camp[]>(`${this.apiUrl}?relations=true`)
      .pipe(map((camps) => camps.map((camp) => this.processLogoUrl(camp))));
  }

  getCamp(id: number): Observable<Camp> {
    return this.http
      .get<Camp>(`${this.apiUrl}/${id}`)
      .pipe(map((camp) => this.processLogoUrl(camp)));
  }

  createCamp(camp: CreateCampDto, logo?: File): Observable<Camp> {
    const formData = new FormData();

    // Agregar los campos del formulario
    formData.append('name', camp.name);
    formData.append('location', camp.location);
    formData.append('startDate', camp.startDate);
    formData.append('endDate', camp.endDate);

    if (camp.description) {
      formData.append('description', camp.description);
    }

    // Agregar el logo si existe
    if (logo) {
      formData.append('logo', logo);
    }

    return this.http
      .post<Camp>(this.apiUrl, formData)
      .pipe(map((camp) => this.processLogoUrl(camp)));
  }

  updateCamp(
    id: number,
    camp: Partial<CreateCampDto>,
    logo?: File,
  ): Observable<Camp> {
    const formData = new FormData();

    // Agregar solo los campos que están presentes
    if (camp.name !== undefined) formData.append('name', camp.name);
    if (camp.location !== undefined) formData.append('location', camp.location);
    if (camp.startDate !== undefined)
      formData.append('startDate', camp.startDate);
    if (camp.endDate !== undefined) formData.append('endDate', camp.endDate);
    if (camp.description !== undefined)
      formData.append('description', camp.description);

    // Agregar el logo si existe
    if (logo) {
      formData.append('logo', logo);
    }

    return this.http
      .patch<Camp>(`${this.apiUrl}/${id}`, formData)
      .pipe(map((camp) => this.processLogoUrl(camp)));
  }

  deleteCamp(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
