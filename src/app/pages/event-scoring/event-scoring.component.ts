import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
} from '@angular/forms';
import { EventService, Event } from '../../services/event.service';
import {
  ResultService,
  Result,
  ResultScore,
  MemberBasedResultScore,
} from '../../services/result.service';
import { ClubService, Club } from '../../services/club.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-scoring',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    FormsModule,
  ],
  templateUrl: './event-scoring.component.html',
  styleUrl: './event-scoring.component.scss',
})
export class EventScoringComponent implements OnInit {
  bulkScoringForm!: FormGroup;
  event: Event | null = null;
  clubs: Club[] = [];
  campId!: number;
  eventId!: number;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  existingResults: Result[] = []; // Resultados existentes para este evento
  staticSortedClubIndices: number[] = []; // Orden fijo de clubes para la vista

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private clubService: ClubService,
    private resultService: ResultService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.campId = +params['campId'];
      this.eventId = +params['eventId'];
      this.loadData();
    });
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Cargar evento, clubes y resultados existentes en paralelo
      const [event, clubs, existingResults] = await Promise.all([
        this.eventService.getEvent(this.eventId).toPromise(),
        this.clubService.getClubsByCamp(this.campId).toPromise(),
        this.resultService.getResultsByEvent(this.eventId).toPromise()
      ]);
      
      this.event = event!;
      this.clubs = clubs!;
      this.existingResults = existingResults!;
      
      this.initBulkForm();
      this.isLoading = false;
    } catch (error: any) {
      this.errorMessage = `Error al cargar los datos: ${error.message}`;
      this.isLoading = false;
    }
  }

  private initBulkForm(): void {
    if (!this.event || !this.clubs.length) return;
    
    this.bulkScoringForm = this.fb.group({
      clubs: this.fb.array(this.clubs.map(club => this.createClubFormGroup(club)))
    });
    
    // Establecer el orden inicial basado en los puntajes actuales
    this.updateStaticSortOrder();
  }

  private createClubFormGroup(club: Club): FormGroup {
    // Buscar el resultado existente usando club.id (que viene de la estructura del club)
    const existingResult = this.existingResults.find(r => r.club?.id === club.id);
    
    const clubGroup: any = this.fb.group({
      clubId: [club.id],
      clubName: [club.name]
    });
    
    // Agregar controles según el tipo de evento
    if (this.event?.type === 'REGULAR' && this.event.items) {
      const scoresGroup = this.fb.group({});
      
      this.event.items.forEach(item => {
        // Buscar el score existente en la nueva estructura de la API
        const existingScore = existingResult?.items?.find(i => i.eventItem?.id === item.id);
        scoresGroup.addControl(
          item.id!.toString(), 
          this.fb.control(existingScore?.score || 0, [
            Validators.required,
            Validators.min(0),
            Validators.max(this.event?.maxScore || 100)
          ])
        );
      });
      
      clubGroup.addControl('scores', scoresGroup);
    } else if (this.event?.type === 'MEMBER_BASED' && this.event.memberBasedItems) {
      const memberScoresGroup = this.fb.group({});
      
      this.event.memberBasedItems.forEach(item => {
        // Buscar el memberBasedScore existente en la nueva estructura
        const existingScore = existingResult?.memberBasedItems?.find(i => i.eventItem?.id === item.id);
        memberScoresGroup.addControl(
          item.id!.toString(),
          this.fb.group({
            matchCount: [existingScore?.matchCount || 0, [Validators.required, Validators.min(0)]],
            totalWithCharacteristic: [existingScore?.totalWithCharacteristic || 0, [Validators.required, Validators.min(0)]]
          })
        );
      });
      
      clubGroup.addControl('memberBasedScores', memberScoresGroup);
    }
    
    return clubGroup;
  }

  get clubsFormArray(): FormArray {
    return this.bulkScoringForm?.get('clubs') as FormArray;
  }

  // Obtener índices de clubes en orden estático (no cambia durante edición)
  get sortedClubIndices(): number[] {
    return this.staticSortedClubIndices;
  }

  // Actualizar el orden estático basado en puntajes actuales
  private updateStaticSortOrder(): void {
    if (!this.clubsFormArray) return;
    
    const clubsWithIndex = this.clubsFormArray.controls.map((control, index) => ({
      index,
      total: this.calculateClubTotal(index),
      clubName: control.get('clubName')?.value || ''
    }));
    
    // Ordenar por total descendente (mayor a menor) y luego alfabéticamente por nombre
    clubsWithIndex.sort((a, b) => {
      // Primero comparar por puntaje (descendente)
      const scoreDiff = b.total - a.total;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      // Si los puntajes son iguales, ordenar alfabéticamente (ascendente)
      return a.clubName.localeCompare(b.clubName);
    });
    
    this.staticSortedClubIndices = clubsWithIndex.map(club => club.index);
  }

  // Obtener la posición de ranking de un club (1-based)
  getClubRanking(clubIndex: number): number {
    const sortedIndices = this.sortedClubIndices;
    const position = sortedIndices.indexOf(clubIndex);
    return position + 1; // 1-based ranking
  }

  // Obtener la clase CSS para la medalla de ranking
  getRankingBadgeClass(clubIndex: number): string {
    const rank = this.getClubRanking(clubIndex);
    if (rank === 1) return 'bg-warning text-dark'; // Oro
    if (rank === 2) return 'bg-secondary text-white'; // Plata
    if (rank === 3) return 'bg-danger text-white'; // Bronce
    return 'bg-primary text-white'; // Otros
  }

  calculateClubTotal(clubIndex: number): number {
    const clubControl = this.clubsFormArray.at(clubIndex);
    if (!clubControl || !this.event) return 0;
    
    if (this.event.type === 'REGULAR') {
      const scoresControl = clubControl.get('scores');
      if (!scoresControl) return 0;
      
      let total = 0;
      this.event.items?.forEach(item => {
        const score = scoresControl.get(item.id!.toString())?.value || 0;
        total += parseFloat(score);
      });
      
      return Math.round(total * 100) / 100;
    } else if (this.event.type === 'MEMBER_BASED') {
      const memberScoresControl = clubControl.get('memberBasedScores');
      if (!memberScoresControl) return 0;
      
      let totalPercentage = 0;
      let itemCount = 0;
      
      this.event.memberBasedItems?.forEach(item => {
        const itemControl = memberScoresControl.get(item.id!.toString());
        if (itemControl) {
          const matchCount = parseFloat(itemControl.get('matchCount')?.value) || 0;
          const totalCount = parseFloat(itemControl.get('totalWithCharacteristic')?.value) || 0;
          
          if (totalCount > 0) {
            totalPercentage += (matchCount / totalCount) * 100;
            itemCount++;
          }
        }
      });
      
      const averagePercentage = itemCount > 0 ? totalPercentage / itemCount : 0;
      const maxScore = this.event.maxScore || 100;
      return Math.round((averagePercentage * maxScore / 100) * 100) / 100;
    }
    
    return 0;
  }

  // Validar si el total de un club excede el puntaje máximo
  isClubTotalExceeded(clubIndex: number): boolean {
    if (!this.event?.maxScore) return false;
    const total = this.calculateClubTotal(clubIndex);
    return total > this.event.maxScore;
  }

  // Obtener mensaje de error para club con puntaje excedido
  getClubTotalError(clubIndex: number): string {
    if (!this.isClubTotalExceeded(clubIndex)) return '';
    const total = this.calculateClubTotal(clubIndex);
    const maxScore = this.event?.maxScore || 0;
    return `El puntaje total (${total}) excede el máximo permitido (${maxScore})`;
  }

  // Validar si hay algún club con puntaje excedido
  hasAnyClubExceeded(): boolean {
    if (!this.clubsFormArray || !this.event?.maxScore) return false;
    
    for (let i = 0; i < this.clubsFormArray.length; i++) {
      if (this.isClubTotalExceeded(i)) {
        return true;
      }
    }
    return false;
  }

  onSubmit(): void {
    if (this.bulkScoringForm.invalid) {
      this.bulkScoringForm.markAllAsTouched();
      return;
    }

    // Validar que ningún club exceda el puntaje máximo
    if (this.hasAnyClubExceeded()) {
      this.errorMessage = 'No se puede guardar: Hay clubes con puntajes que exceden el máximo permitido del evento.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bulkData = {
      eventId: this.eventId,
      results: this.prepareBulkResults()
    };

    this.resultService.createBulkResults(bulkData).subscribe({
      next: (response) => {
        this.successMessage = 'Calificaciones guardadas correctamente para todos los clubes.';
        this.isLoading = false;
        
        // Actualizar el orden de ranking después de guardar
        this.updateStaticSortOrder();
        
        // Recargar los datos para mostrar los resultados actualizados
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = `Error al guardar calificaciones: ${error.error?.message || error.message || error}`;
        this.isLoading = false;
      }
    });
  }

  private prepareBulkResults(): any[] {
    const results: any[] = [];
    
    this.clubsFormArray.controls.forEach((clubControl, index) => {
      const clubId = clubControl.get('clubId')?.value;
      const totalScore = this.calculateClubTotal(index);
      
      const result: any = {
        clubId,
        totalScore,
        items: []
      };
      
      if (this.event?.type === 'REGULAR') {
        const scoresControl = clubControl.get('scores');
        this.event.items?.forEach(item => {
          const score = scoresControl?.get(item.id!.toString())?.value || 0;
          result.items.push({
            eventItemId: item.id,
            score: parseFloat(score)
          });
        });
      } else if (this.event?.type === 'MEMBER_BASED') {
        const memberScoresControl = clubControl.get('memberBasedScores');
        this.event.memberBasedItems?.forEach(item => {
          const itemControl = memberScoresControl?.get(item.id!.toString());
          const matchCount = itemControl?.get('matchCount')?.value || 0;
          const totalCount = itemControl?.get('totalWithCharacteristic')?.value || 0;
          
          result.items.push({
            eventItemId: item.id,
            matchCount: parseInt(matchCount),
            totalWithCharacteristic: parseInt(totalCount)
          });
        });
      }
      
      results.push(result);
    });
    
    return results;
  }

  getItemPercentage(clubIndex: number, itemId: number): number {
    const clubControl = this.clubsFormArray.at(clubIndex);
    if (!clubControl) return 0;
    
    const memberScoresControl = clubControl.get('memberBasedScores');
    if (!memberScoresControl) return 0;
    
    const itemControl = memberScoresControl.get(itemId.toString());
    if (!itemControl) return 0;
    
    const matchCount = parseFloat(itemControl.get('matchCount')?.value) || 0;
    const totalCount = parseFloat(itemControl.get('totalWithCharacteristic')?.value) || 0;
    
    if (totalCount === 0) return 0;
    
    return Math.round((matchCount / totalCount) * 100);
  }

  // Actualizar manualmente el orden de ranking
  updateRankingOrder(): void {
    this.updateStaticSortOrder();
  }

  // TrackBy function para optimizar el rendering
  trackByClubIndex(index: number, clubIndex: number): number {
    return clubIndex;
  }

  goBack(): void {
    this.router.navigate(['/camps', this.campId, 'events']);
  }
}
