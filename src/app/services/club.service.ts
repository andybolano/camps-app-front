import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MemberCharacteristic {
  id?: number;
  name: string;
  value: number;
  matchCount?: number;
}

export interface Club {
  id: number;
  name: string;
  city: string;
  participantsCount: number;
  guestsCount: number;
  minorsCount: number;
  economsCount: number;
  companionsCount: number;
  directorCount: number;
  pastorCount: number;
  registrationFee: number;
  isPaid: boolean;
  shieldUrl?: string;
  camp: {
    id: number;
    name: string;
  };
  memberCharacteristics?: MemberCharacteristic[];
}

export interface CreateClubDto {
  name: string;
  city: string;
  participantsCount: number;
  guestsCount: number;
  minorsCount: number;
  economsCount: number;
  companionsCount: number;
  directorCount: number;
  pastorCount: number;
  registrationFee: number;
  isPaid?: boolean;
  shieldUrl?: string;
  campId: number;
  memberCharacteristics?: Omit<MemberCharacteristic, 'id'>[];
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

  getClubsByCamp(campId: number): Observable<Club[]> {
    return this.http
      .get<Club[]>(`${this.apiUrl}?campId=${campId}`)
      .pipe(map((clubs) => clubs.map((club) => this.processShieldUrl(club))));
  }

  getClub(id: number): Observable<Club> {
    return this.http
      .get<Club>(`${this.apiUrl}/${id}`)
      .pipe(map((club) => this.processShieldUrl(club)));
  }

  createClub(club: CreateClubDto, shield?: File): Observable<Club> {
    const formData = new FormData();

    // Agregar los campos del formulario
    formData.append('name', club.name);
    formData.append('city', club.city);
    formData.append('participantsCount', club.participantsCount.toString());
    formData.append('guestsCount', club.guestsCount.toString());
    formData.append('minorsCount', club.minorsCount.toString());
    formData.append('economsCount', club.economsCount.toString());
    formData.append('companionsCount', club.companionsCount.toString());
    formData.append('directorCount', club.directorCount.toString());
    formData.append('pastorCount', club.pastorCount.toString());
    formData.append('registrationFee', club.registrationFee.toString());
    formData.append('campId', club.campId.toString());

    if (club.isPaid !== undefined) {
      formData.append('isPaid', club.isPaid ? '1' : '0');
    }

    console.log('Creating club with isPaid:', club.isPaid);

    // Agregar el escudo si existe
    if (shield) {
      formData.append('shield', shield);
    }

    return this.http
      .post<Club>(this.apiUrl, formData)
      .pipe(map((club) => this.processShieldUrl(club)));
  }

  updateClub(
    id: number,
    club: Partial<CreateClubDto>,
    shield?: File
  ): Observable<Club> {
    const formData = new FormData();

    // Agregar solo los campos que están presentes
    if (club.name !== undefined) formData.append('name', club.name);
    if (club.city !== undefined) formData.append('city', club.city);
    if (club.participantsCount !== undefined)
      formData.append('participantsCount', club.participantsCount.toString());
    if (club.guestsCount !== undefined)
      formData.append('guestsCount', club.guestsCount.toString());
    if (club.minorsCount !== undefined)
      formData.append('minorsCount', club.minorsCount.toString());
    if (club.economsCount !== undefined)
      formData.append('economsCount', club.economsCount.toString());
    if (club.companionsCount !== undefined)
      formData.append('companionsCount', club.companionsCount.toString());
    if (club.directorCount !== undefined)
      formData.append('directorCount', club.directorCount.toString());
    if (club.pastorCount !== undefined)
      formData.append('pastorCount', club.pastorCount.toString());
    if (club.registrationFee !== undefined)
      formData.append('registrationFee', club.registrationFee.toString());
    if (club.isPaid !== undefined)
      formData.append('isPaid', club.isPaid ? '1' : '0');
    if (club.campId !== undefined)
      formData.append('campId', club.campId.toString());

    // Agregar el escudo si existe
    if (shield) {
      formData.append('shield', shield);
    }

    console.log('Updating club with isPaid:', club.isPaid);

    return this.http
      .patch<Club>(`${this.apiUrl}/${id}`, formData)
      .pipe(map((club) => this.processShieldUrl(club)));
  }

  deleteClub(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
