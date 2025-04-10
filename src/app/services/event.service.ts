import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Event {
  id: number;
  name: string;
  description: string;
  type?: 'REGULAR' | 'MEMBER_BASED';
  date?: string;
  camp: {
    id: number;
    name?: string;
  };
  items?: {
    id?: number;
    name: string;
    percentage: number;
  }[];
  memberBasedItems?: {
    id?: number;
    name: string;
    percentage: number;
    applicableCharacteristics: string[];
    calculationType?: string;
    isRequired?: boolean;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private apiUrl = `${environment.apiBaseUrl}/events`;

  constructor(private http: HttpClient) {}

  getEventsByCampId(campId: number): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}?campId=${campId}`);
  }

  getEvent(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  createEvent(event: Omit<Event, 'id'>): Observable<Event> {
    return this.http.post<Event>(this.apiUrl, event);
  }

  updateEvent(id: number, event: Omit<Event, 'id'>): Observable<Event> {
    return this.http.patch<Event>(`${this.apiUrl}/${id}`, event);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
