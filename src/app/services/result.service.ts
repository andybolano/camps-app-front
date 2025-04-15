import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

export interface ResultScore {
  eventItemId: number;
  score: number;
}

export interface MemberBasedResultScore {
  eventItemId: number;
  matchCount: number;
  totalWithCharacteristic: number;
}

export interface Result {
  id?: number;
  eventId: number;
  clubId: number;
  event?: {
    id: number;
    name: string;
    date?: string;
    description?: string;
    type?: 'REGULAR' | 'MEMBER_BASED';
  };
  totalScore?: number;
  rank?: number;
  club?: {
    id: number;
    name: string;
  };
  scores?: ResultScore[];
  items?: ResultScore[];
  memberBasedScores?: MemberBasedResultScore[];
  memberBasedItems?: MemberBasedResultScore[];
  resultDetail?: {
    eventName: string;
    eventDate?: string;
    totalScore: number;
    rank?: number;
    items: {
      name: string;
      percentage: number;
      score: number;
      weightedScore: number;
    }[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class ResultService {
  private apiUrl = `${environment.apiBaseUrl}/results`;

  constructor(private http: HttpClient) {}

  // Obtener resultados por evento
  getResultsByEvent(eventId: number): Observable<Result[]> {
    return this.http
      .get<Result[]>(`${this.apiUrl}?eventId=${eventId}`)
      .pipe(map((results) => this.normalizeResults(results)));
  }

  // Obtener un resultado específico (por id)
  getResult(id: number): Observable<Result> {
    return this.http
      .get<Result>(`${this.apiUrl}/${id}`)
      .pipe(map((result) => this.normalizeResult(result)));
  }

  // Verificar si ya existe un resultado para un evento y club
  getResultByEventAndClub(
    eventId: number,
    clubId: number,
  ): Observable<Result[]> {
    return this.http
      .get<Result[]>(`${this.apiUrl}?eventId=${eventId}&clubId=${clubId}`)
      .pipe(map((results) => this.normalizeResults(results)));
  }

  // Crear nuevo resultado
  createResult(result: Result): Observable<Result> {
    // Adaptar el formato para el backend (scores -> items, memberBasedScores -> memberBasedItems)
    const backendFormat = {
      clubId: result.clubId,
      eventId: result.eventId,
      items: result.scores,
      memberBasedItems: result.memberBasedScores,
      totalScore: result.totalScore, // Enviar la puntuación total calculada
    };

    console.log('Enviando resultado al backend:', backendFormat);
    return this.http.post<Result>(this.apiUrl, backendFormat);
  }

  // Actualizar resultado existente
  updateResult(id: number, result: Omit<Result, 'id'>): Observable<Result> {
    // Adaptar el formato para el backend (scores -> items, memberBasedScores -> memberBasedItems)
    const backendFormat = {
      clubId: result.clubId,
      eventId: result.eventId,
      items: result.scores,
      memberBasedItems: result.memberBasedScores,
      totalScore: result.totalScore, // Enviar la puntuación total calculada
    };

    console.log('Actualizando resultado en el backend:', backendFormat);
    return this.http.patch<Result>(`${this.apiUrl}/${id}`, backendFormat);
  }

  // Eliminar resultado
  deleteResult(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Función para normalizar un resultado (asegurar que tenga scores y memberBasedScores)
  private normalizeResult(result: Result): Result {
    console.log('Normalizando resultado del backend:', result);
    if (result) {
      // Asegurar que eventId esté presente
      if (!result.eventId && result.event && result.event.id) {
        console.log(
          `Asignando eventId (${result.event.id}) desde la propiedad event.id`,
        );
        result.eventId = result.event.id;
      }

      // Normalizar items regulares
      if ((result as any).items && !result.scores) {
        console.log('Estructura de items del backend:', (result as any).items);

        // Convertir la estructura de items del backend al formato esperado por el frontend
        const eventId = result.eventId || (result as any).event?.id;

        result.scores = ((result as any).items || [])
          .filter((item: any) => {
            // Verificar que el eventItem exista y que pertenezca al evento correcto
            const itemEventId = item.eventItem?.event?.id;
            if (itemEventId && eventId && itemEventId !== eventId) {
              console.warn(
                `[WARNING] Item ${item.eventItem?.id} pertenece al evento ${itemEventId}, pero el resultado es del evento ${eventId}`,
              );
              return false; // Filtrar este item
            }
            return true; // Mantener este item
          })
          .map((item: any) => {
            return {
              eventItemId: item.eventItem?.id || 0,
              score: item.score,
            };
          });

        console.log(
          'Items convertidos a scores (después de filtrar):',
          result.scores,
        );
      }

      // Normalizar memberBasedItems
      if ((result as any).memberBasedItems && !result.memberBasedScores) {
        console.log(
          'Estructura de memberBasedItems del backend:',
          (result as any).memberBasedItems,
        );

        // Convertir la estructura de memberBasedItems del backend al formato esperado por el frontend
        const eventId = result.eventId || (result as any).event?.id;

        result.memberBasedScores = ((result as any).memberBasedItems || [])
          .filter((item: any) => {
            // Verificar que el eventItem exista y que pertenezca al evento correcto
            const itemEventId = item.eventItem?.event?.id;
            if (itemEventId && eventId && itemEventId !== eventId) {
              console.warn(
                `[WARNING] MemberBasedItem ${item.eventItem?.id} pertenece al evento ${itemEventId}, pero el resultado es del evento ${eventId}`,
              );
              return false; // Filtrar este item
            }
            return true; // Mantener este item
          })
          .map((item: any) => {
            return {
              eventItemId: item.eventItem?.id || 0,
              matchCount: item.matchCount,
              totalWithCharacteristic: item.totalWithCharacteristic,
            };
          });

        console.log(
          'MemberBasedItems convertidos a memberBasedScores (después de filtrar):',
          result.memberBasedScores,
        );
      }
    }
    console.log('Resultado normalizado:', result);
    return result;
  }

  // Función para normalizar un array de resultados
  private normalizeResults(results: Result[]): Result[] {
    return results.map((result) => this.normalizeResult(result));
  }

  // Obtener resultados por evento con ranking
  getResultsByEventWithRanking(eventId: number): Observable<Result[]> {
    return this.getResultsByEvent(eventId).pipe(
      map((results) => {
        // Ordenar resultados por puntuación de mayor a menor
        const sortedResults = [...results].sort(
          (a, b) => (b.totalScore || 0) - (a.totalScore || 0),
        );

        // Asignar ranking
        return sortedResults.map((result, index) => ({
          ...result,
          rank: index + 1, // Posición en el ranking (1-based)
        }));
      }),
    );
  }

  // Obtener el ranking general de los clubes para un campamento
  getClubRankingByCamp(campId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ranking/${campId}`).pipe(
      map((rankingData) => {
        console.log('Ranking general del campamento:', rankingData);
        return rankingData;
      }),
    );
  }

  getResultsByClub(clubId: number): Observable<Result[]> {
    console.log(`Obteniendo resultados para el club ${clubId}`);
    return this.http.get<Result[]>(`${this.apiUrl}?clubId=${clubId}`).pipe(
      map((results) => {
        console.log(
          'Resultados sin procesar del backend:',
          JSON.stringify(results),
        );
        return this.normalizeResults(results);
      }),
    );
  }
}
