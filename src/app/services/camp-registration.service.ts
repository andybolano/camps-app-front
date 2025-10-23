import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CampRegistration {
  id: number;
  campId: number;
  clubCategoryId: number;
  numberOfParticipants: number;
  numberOfLeaders: number;
  numberOfGuests: number;
  totalParticipants: number;
  totalCost: number;
  isPaid: boolean;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  camp: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    location: string;
  };
  clubCategory: {
    id: number;
    isActive: boolean;
    club: {
      id: number;
      name: string;
      city: string;
    };
    category: {
      id: number;
      name: string;
      code: string;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class CampRegistrationService {
  private apiUrl = `${environment.apiBaseUrl}/camp-registrations`;

  constructor(private http: HttpClient) {}

  getCampRegistrations(campId?: number): Observable<CampRegistration[]> {
    const url = campId ? `${this.apiUrl}?campId=${campId}` : this.apiUrl;
    return this.http.get<CampRegistration[]>(url);
  }

  getCampRegistration(id: number): Observable<CampRegistration> {
    return this.http.get<CampRegistration>(`${this.apiUrl}/${id}`);
  }

  createCampRegistration(data: {
    campId: number;
    clubId: number;
    categoryId: number;
  }): Observable<CampRegistration> {
    return this.http.post<CampRegistration>(this.apiUrl, data);
  }
}
