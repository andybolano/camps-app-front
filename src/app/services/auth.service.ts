import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Clave para almacenar el token en sessionStorage
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

interface User {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Comprobar si hay un token almacenado al iniciar el servicio
    const token = sessionStorage.getItem(TOKEN_KEY);
    const userJson = sessionStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user data', error);
        this.logout(); // Si hay un error al parsear, hacer logout
      }
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap((response) => {
          // Guardar el token y la información del usuario en sessionStorage
          sessionStorage.setItem(TOKEN_KEY, response.access_token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }),
        catchError((error) => {
          return throwError(
            () =>
              new Error(error.error.message || 'Error en el inicio de sesión'),
          );
        }),
      );
  }

  register(user: User): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(
      catchError((error) => {
        return throwError(
          () => new Error(error.error.message || 'Error en el registro'),
        );
      }),
    );
  }

  logout(): void {
    // Eliminar token y usuario actual de sessionStorage
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return sessionStorage.getItem(TOKEN_KEY) !== null;
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): any {
    const userJson = sessionStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
}
