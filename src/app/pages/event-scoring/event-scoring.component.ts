import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventService, Event } from '../../services/event.service';
import {
  ResultService,
  Result,
  ResultScore,
  MemberBasedResultScore,
} from '../../services/result.service';
import { ClubService, Club } from '../../services/club.service';

@Component({
  selector: 'app-event-scoring',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-scoring.component.html',
  styleUrl: './event-scoring.component.scss',
})
export class EventScoringComponent implements OnInit {
  scoringForm!: FormGroup;
  event: Event | null = null;
  clubs: Club[] = [];
  campId!: number;
  eventId!: number;
  selectedClubId: number | null = null;
  existingResult: Result | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  totalScore = 0; // Puntuación total calculada
  eventResults: Result[] = []; // Resultados de todos los clubes para este evento
  currentRank = 0; // Ranking actual del club seleccionado

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private clubService: ClubService,
    private resultService: ResultService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.params.subscribe((params) => {
      this.campId = +params['campId'];
      this.eventId = +params['eventId'];

      // Cargar eventos y resultados independientemente de la selección de club
      Promise.all([this.loadEvent(), this.loadClubs()]).then(() => {
        // Cargar los resultados para mostrar el ranking
        this.loadEventResults();

        // Si ya hay un club seleccionado, verificar resultados existentes
        const clubId = this.scoringForm.get('clubId')?.value;
        if (clubId) {
          this.selectedClubId = clubId;
          this.checkExistingResult(this.eventId, clubId);
          this.updateCurrentRank(); // Actualizar el ranking cuando cambia el club
          // Si es evento basado en miembros, actualizar con datos del club
          if (this.event?.type === 'MEMBER_BASED') {
            this.loadClubData(clubId);
          }
        } else {
          this.selectedClubId = null;
          this.existingResult = null;
          this.totalScore = 0;
          this.currentRank = 0; // Reiniciar el ranking
        }
      });
    });
  }

  private initForm(): void {
    this.scoringForm = this.fb.group({
      clubId: [null, Validators.required],
      scores: this.fb.array([]),
    });

    // Escuchar cambios en el club seleccionado
    this.scoringForm.get('clubId')?.valueChanges.subscribe((clubId) => {
      if (clubId) {
        this.selectedClubId = clubId;
        this.checkExistingResult(this.eventId, clubId);
        this.updateCurrentRank(); // Actualizar el ranking cuando cambia el club

        // Si es evento basado en miembros, actualizar con datos del club
        if (this.event?.type === 'MEMBER_BASED') {
          this.loadClubData(clubId);
        }
      } else {
        this.selectedClubId = null;
        this.existingResult = null;
        this.totalScore = 0;
        this.currentRank = 0; // Reiniciar el ranking
      }
    });

    // Suscribirse a cambios en los puntajes para recalcular el total
    this.scoringForm.valueChanges.subscribe(() => {
      if (this.scoringForm.get('scores')) {
        this.calculateTotalScore();
      }
    });
  }

  private loadEvent(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    return new Promise<void>((resolve) => {
      this.eventService.getEvent(this.eventId).subscribe({
        next: (event) => {
          this.event = event;
          this.buildScoresForm();
          this.isLoading = false;
          resolve();
        },
        error: (error) => {
          this.errorMessage = `Error al cargar el evento: ${error.message}`;
          this.isLoading = false;
          resolve();
        },
      });
    });
  }

  private loadClubs(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.clubService.getClubsByCamp(this.campId).subscribe({
        next: (clubs) => {
          this.clubs = clubs;
          resolve();
        },
        error: (error) => {
          this.errorMessage = `Error al cargar los clubes: ${error.message}`;
          resolve();
        },
      });
    });
  }

  private buildScoresForm(): void {
    if (!this.event) {
      console.warn('No hay evento para construir el formulario');
      return;
    }

    console.log('Tipo de evento:', this.event.type);

    if (this.event.type === 'REGULAR') {
      this.buildRegularScoresForm();
    } else if (this.event.type === 'MEMBER_BASED') {
      this.buildMemberBasedScoresForm();
    } else {
      console.warn(`Tipo de evento desconocido: ${this.event.type}`);
    }
  }

  private buildRegularScoresForm(): void {
    if (!this.event || !this.event.items || this.event.items.length === 0) {
      console.warn('No hay items regulares para construir el formulario');
      return;
    }

    console.log(
      'Construyendo formulario con items regulares:',
      this.event.items
    );
    const scoresGroup = this.fb.group({});

    // Crear un control para cada ítem del evento
    this.event.items.forEach((item) => {
      console.log(
        `Añadiendo control para item id=${item.id}, nombre=${item.name}`
      );
      scoresGroup.addControl(
        item.id!.toString(),
        this.fb.control(0, [
          Validators.required,
          Validators.min(0),
          Validators.max(this.event?.maxScore ?? 100),
        ])
      );
    });

    this.scoringForm.setControl('scores', scoresGroup);
    console.log(
      'Formulario para items regulares construido:',
      this.scoringForm.value
    );
  }

  private buildMemberBasedScoresForm(): void {
    if (
      !this.event ||
      !this.event.memberBasedItems ||
      this.event.memberBasedItems.length === 0
    ) {
      console.warn(
        'No hay items basados en miembros para construir el formulario'
      );
      return;
    }

    console.log(
      'Construyendo formulario con items basados en miembros:',
      this.event.memberBasedItems
    );

    // Crear grupo para los scores regulares (vacío en este caso)
    const scoresGroup = this.fb.group({});
    this.scoringForm.setControl('scores', scoresGroup);

    // Crear grupo para los scores basados en miembros
    const memberBasedScoresGroup = this.fb.group({});

    // Crear un control para cada ítem basado en miembros
    this.event.memberBasedItems.forEach((item) => {
      console.log(
        `Añadiendo control para item basado en miembros id=${item.id}, nombre=${item.name}`
      );

      // Crear un grupo para cada item con controles para matchCount y totalWithCharacteristic
      const itemGroup = this.fb.group({
        matchCount: [0, [Validators.required, Validators.min(0)]],
        totalWithCharacteristic: [
          { value: 0, disabled: true },
          [Validators.required, Validators.min(0)],
        ],
      });

      // Añadir el grupo al grupo principal de scores basados en miembros
      memberBasedScoresGroup.addControl(item.id!.toString(), itemGroup);
    });

    this.scoringForm.setControl('memberBasedScores', memberBasedScoresGroup);
    console.log(
      'Formulario para items basados en miembros construido:',
      this.scoringForm.value
    );
  }

  private loadEventResults(): void {
    if (!this.eventId) return;

    this.resultService.getResultsByEventWithRanking(this.eventId).subscribe({
      next: (results) => {
        this.eventResults = results;
        console.log('Resultados del evento con ranking:', this.eventResults);
        this.updateCurrentRank();
      },
      error: (error) => {
        console.error('Error al cargar resultados del evento:', error);
      },
    });
  }

  private updateCurrentRank(): void {
    if (!this.selectedClubId || this.eventResults.length === 0) {
      this.currentRank = 0;
      return;
    }

    const result = this.eventResults.find(
      (r) => r.clubId === this.selectedClubId
    );
    this.currentRank = result?.rank || 0;
  }

  private checkExistingResult(eventId: number, clubId: number): void {
    if (!eventId || !clubId) {
      console.warn(
        'No se pueden verificar resultados sin eventId y clubId válidos'
      );
      return;
    }

    if (!this.scoringForm || !this.scoringForm.get('scores')) {
      console.warn('El formulario aún no está completamente inicializado');
      // Intentar recargar cuando el formulario esté listo
      setTimeout(() => this.checkExistingResult(eventId, clubId), 500);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log(
      `Verificando resultados existentes para evento=${eventId}, club=${clubId}`
    );
    this.resultService.getResultByEventAndClub(eventId, clubId).subscribe({
      next: (results) => {
        console.log('Resultados obtenidos:', results);
        if (results.length > 0) {
          this.existingResult = results[0];
          console.log('Result existente:', this.existingResult);
          this.updateCurrentRank();

          // Asegurarse de que el formulario esté listo antes de poblarlo
          setTimeout(() => {
            this.populateFormWithExistingResult();
            this.isLoading = false;
          }, 0);
        } else {
          this.existingResult = null;
          this.resetScores();
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error al verificar calificaciones:', error);
        this.errorMessage = `Error al verificar calificaciones existentes: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  private populateFormWithExistingResult(): void {
    if (!this.existingResult || !this.scoringForm) return;

    console.log(
      'Intentando cargar resultado existente al formulario:',
      this.existingResult
    );

    // Obtener el tipo de evento
    const eventType = this.event?.type || 'REGULAR';

    if (eventType === 'REGULAR') {
      // Procesar los scores regulares
      if (this.existingResult.scores && this.existingResult.scores.length > 0) {
        const scoresGroup = this.scoringForm.get('scores') as FormGroup;
        if (!scoresGroup) {
          console.error('No se encontró el grupo de scores en el formulario');
          return;
        }

        // Procesar cada score
        this.existingResult.scores.forEach((score) => {
          const control = scoresGroup.get(score.eventItemId.toString());
          if (control) {
            console.log(
              `Asignando valor ${score.score} al control del item ${score.eventItemId}`
            );
            control.setValue(score.score);
          } else {
            console.warn(
              `No se encontró el control para el item ${score.eventItemId}`
            );
          }
        });

        // Recalcular el total
        this.calculateTotalScore();
      } else {
        console.warn('No hay scores en el resultado existente');
      }
    } else if (eventType === 'MEMBER_BASED') {
      // Procesar los scores basados en miembros
      if (
        this.existingResult.memberBasedScores &&
        this.existingResult.memberBasedScores.length > 0
      ) {
        const memberBasedScoresGroup = this.scoringForm.get(
          'memberBasedScores'
        ) as FormGroup;
        if (!memberBasedScoresGroup) {
          console.error(
            'No se encontró el grupo de memberBasedScores en el formulario'
          );
          return;
        }

        // Procesar cada score basado en miembros
        this.existingResult.memberBasedScores.forEach((score) => {
          const itemGroup = memberBasedScoresGroup.get(
            score.eventItemId.toString()
          );
          if (itemGroup) {
            console.log(
              `Asignando valores matchCount=${score.matchCount}, totalWithCharacteristic=${score.totalWithCharacteristic} al item ${score.eventItemId}`
            );
            itemGroup.get('matchCount')?.setValue(score.matchCount);

            // Usar el método correcto para establecer el valor del control deshabilitado
            const totalControl = itemGroup.get('totalWithCharacteristic');
            if (totalControl) {
              totalControl.setValue(score.totalWithCharacteristic, {
                emitEvent: false,
              });
              // Asegurarse de que esté deshabilitado
              totalControl.disable({ emitEvent: false });
            }
          } else {
            console.warn(
              `No se encontró el grupo para el item basado en miembros ${score.eventItemId}`
            );
          }
        });

        // Recalcular el total
        this.calculateTotalScore();
      } else {
        console.warn('No hay memberBasedScores en el resultado existente');
      }
    }
  }

  private resetScores(): void {
    if (!this.event || !this.event.items) {
      return;
    }

    const scoresGroup = this.scoringForm.get('scores') as FormGroup;

    // Restablecer todos los valores a 0
    this.event.items.forEach((item) => {
      const control = scoresGroup.get(item.id!.toString());
      if (control) {
        control.setValue(0);
      }
    });

    // Actualizar puntuación total
    this.totalScore = 0;
  }

  onSubmit(): void {
    if (this.scoringForm.invalid) {
      this.scoringForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Obtener tipo de evento
    const eventType = this.event?.type || 'REGULAR';

    // Obtener club y evento seleccionados
    const clubId = this.scoringForm.get('clubId')?.value;
    const eventId = this.eventId;

    if (!clubId || !eventId) {
      this.errorMessage =
        'Debe seleccionar un club y un evento para calificar.';
      this.isLoading = false;
      return;
    }

    // Calcular puntuación total
    const totalScore = this.calculateTotalScore();

    // Preparar datos para enviar
    const resultData: Result = {
      clubId,
      eventId,
      totalScore,
      // Datos específicos según el tipo de evento
    };

    if (eventType === 'REGULAR') {
      // Preparar scores regulares
      const scoresGroup = this.scoringForm.get('scores') as FormGroup;
      const scores: ResultScore[] = [];

      if (scoresGroup) {
        // Convertir el objeto de controles a un array de scores
        Object.keys(scoresGroup.controls).forEach((itemId) => {
          const control = scoresGroup.get(itemId);
          if (control) {
            scores.push({
              eventItemId: +itemId,
              score: parseFloat(control.value) || 0,
            });
          }
        });
      }

      resultData.scores = scores;
    } else if (eventType === 'MEMBER_BASED') {
      // Preparar scores basados en miembros
      const memberBasedScoresGroup = this.scoringForm.get(
        'memberBasedScores'
      ) as FormGroup;
      const memberBasedScores: MemberBasedResultScore[] = [];

      if (memberBasedScoresGroup) {
        // Convertir el objeto de controles a un array de memberBasedScores
        Object.keys(memberBasedScoresGroup.controls).forEach((itemId) => {
          const itemGroup = memberBasedScoresGroup.get(itemId) as FormGroup;
          if (itemGroup) {
            memberBasedScores.push({
              eventItemId: +itemId,
              matchCount: parseFloat(itemGroup.get('matchCount')?.value) || 0,
              totalWithCharacteristic:
                parseFloat(itemGroup.get('totalWithCharacteristic')?.value) ||
                0,
            });
          }
        });
      }

      resultData.memberBasedScores = memberBasedScores;
    }

    console.log('Enviando datos de calificación:', resultData);

    // Si ya existe un resultado, actualizarlo; de lo contrario, crear uno nuevo
    if (this.existingResult && this.existingResult.id) {
      this.resultService
        .updateResult(this.existingResult.id, resultData)
        .subscribe({
          next: (result) => {
            this.successMessage = 'Calificación actualizada correctamente.';
            this.existingResult = result;
            this.isLoading = false;

            // Recargar los resultados para actualizar el ranking
            this.loadEventResults();
          },
          error: (error) => {
            this.errorMessage = `Error al actualizar calificación: ${
              error.error?.message || error.message || error
            }`;
            this.isLoading = false;
          },
        });
    } else {
      this.resultService.createResult(resultData).subscribe({
        next: (result) => {
          this.successMessage = 'Calificación registrada correctamente.';
          this.existingResult = result;
          this.isLoading = false;

          // Recargar los resultados para actualizar el ranking
          this.loadEventResults();
        },
        error: (error) => {
          this.errorMessage = `Error al registrar calificación: ${
            error.error?.message || error.message || error
          }`;
          this.isLoading = false;
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/camps', this.campId, 'events']);
  }

  // Método para recargar manualmente las calificaciones existentes
  reloadExistingScores(): void {
    if (this.selectedClubId && this.eventId) {
      console.log('Recargando calificaciones para club', this.selectedClubId);
      this.checkExistingResult(this.eventId, this.selectedClubId);
    }
  }

  // Método para calcular la puntuación total
  calculateTotalScore(): number {
    if (!this.event) return 0;

    if (this.event.type === 'REGULAR') {
      const scores = this.scoringForm.get('scores')?.value;
      if (!scores) return 0;

      let regularTotal = 0;
      for (const [itemId, score] of Object.entries(scores)) {
        const item = this.event.items?.find((i) => i.id?.toString() === itemId);
        if (item) {
          const numericScore = Number(score);
          if (!isNaN(numericScore) && numericScore >= 0) {
            regularTotal += numericScore;
          }
        }
      }

      regularTotal = Math.round(regularTotal * 100) / 100;

      const eventMaxScore = this.event.maxScore || 100;
      if (regularTotal > eventMaxScore) {
        this.errorMessage = `La puntuación total (${regularTotal.toFixed(
          2
        )}) no puede exceder el puntaje máximo del evento (${eventMaxScore})`;
      } else {
        this.errorMessage = '';
      }

      this.totalScore = regularTotal;
      return this.totalScore;
    } else if (this.event.type === 'MEMBER_BASED') {
      const averagePercentage = this.getSumOfPercentages();
      const eventMaxScore = this.event.maxScore || 100;
      const memberBasedTotal = (averagePercentage * eventMaxScore) / 100;

      this.totalScore = Math.round(memberBasedTotal * 100) / 100;
      this.errorMessage = '';

      return this.totalScore;
    }

    return 0;
  }

  // Método para obtener el sufijo del ranking (1st, 2nd, 3rd, etc.)
  getRankSuffix(rank: number): string {
    if (rank === 1) return 'er';
    if (rank === 2) return 'do';
    if (rank === 3) return 'er';
    return 'to';
  }

  // Método para obtener el nombre de un club por su ID
  getClubName(clubId: number | null): string {
    if (!clubId) return '';
    const club = this.clubs.find((c) => c.id === clubId);
    return club?.name || '';
  }

  // Método para obtener la clase CSS para la insignia de ranking
  getRankBadgeClass(rank: number | undefined): any {
    if (!rank) return 'bg-secondary';

    return {
      'bg-success': rank === 1,
      'bg-primary': rank === 2,
      'bg-info': rank === 3,
      'bg-secondary': rank > 3,
    };
  }

  getItemPercentage(itemId: number | undefined): number {
    if (!itemId) {
      return 0;
    }

    const memberBasedScoresGroup = this.scoringForm.get(
      'memberBasedScores'
    ) as FormGroup;
    if (!memberBasedScoresGroup) {
      return 0;
    }

    const itemGroup = memberBasedScoresGroup.get(
      itemId.toString()
    ) as FormGroup;
    if (!itemGroup) {
      return 0;
    }

    const matchCount = parseFloat(itemGroup.get('matchCount')?.value) || 0;
    const totalWithChar =
      parseFloat(itemGroup.get('totalWithCharacteristic')?.value) || 0;

    if (totalWithChar === 0) {
      return 0;
    }

    const percentage = (matchCount / totalWithChar) * 100;
    return Math.round(percentage);
  }

  getSumOfPercentages(): number {
    if (!this.event || this.event.type !== 'MEMBER_BASED') return 0;

    let sum = 0;
    let count = 0;
    for (const item of this.event.memberBasedItems || []) {
      const percentage = this.getItemPercentage(item.id);
      sum += percentage;
      count++;
    }
    return count > 0 ? Math.round(sum / count) : 0;
  }

  // Método para cargar datos de un club específico
  private loadClubData(clubId: number): void {
    if (!clubId) return;

    this.isLoading = true;
    this.clubService.getClub(clubId).subscribe({
      next: (club) => {
        console.log('Datos del club cargados:', club);
        this.updateMemberBasedFormWithClubData(club);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del club:', error);
        this.errorMessage = `Error al cargar datos del club: ${error.message}`;
        this.isLoading = false;
      },
    });
  }

  // Actualizar el formulario con datos del club para eventos basados en miembros
  private updateMemberBasedFormWithClubData(club: Club): void {
    if (
      !this.event?.memberBasedItems ||
      this.event.memberBasedItems.length === 0 ||
      !club
    ) {
      return;
    }

    const memberBasedScoresGroup = this.scoringForm.get(
      'memberBasedScores'
    ) as FormGroup;
    if (!memberBasedScoresGroup) {
      console.warn(
        'No se encontró el grupo de memberBasedScores en el formulario'
      );
      return;
    }

    // Para cada item basado en miembros, actualizar el formulario con los datos del club
    this.event.memberBasedItems.forEach((item) => {
      if (
        item.id &&
        item.applicableCharacteristics &&
        item.applicableCharacteristics.length > 0
      ) {
        const itemGroup = memberBasedScoresGroup.get(
          item.id.toString()
        ) as FormGroup;
        if (!itemGroup) return;

        // Sumar todas las características aplicables
        let totalValue = 0;
        const characteristicsFound: string[] = [];

        // Iterar por todas las características aplicables
        item.applicableCharacteristics.forEach((characteristic) => {
          // Si el club tiene la característica mencionada, sumar su valor al total
          if (characteristic in club) {
            const charValue = (club as any)[characteristic] || 0;
            totalValue += charValue;
            characteristicsFound.push(characteristic);
            console.log(
              `Característica ${characteristic} encontrada en club con valor: ${charValue}`
            );
          } else {
            console.warn(
              `La característica ${characteristic} no se encontró en los datos del club`
            );
          }
        });

        // Actualizar el formulario con la suma de valores
        if (characteristicsFound.length > 0) {
          // Obtener el control y establecer el valor aunque esté deshabilitado
          const totalControl = itemGroup.get('totalWithCharacteristic');
          if (totalControl) {
            totalControl.setValue(totalValue, { emitEvent: false });
            // Asegurarse de que esté deshabilitado
            totalControl.disable({ emitEvent: false });
          }

          // Si no hay un resultado existente, podemos establecer matchCount igual al total
          // como valor predeterminado (100% de cumplimiento)
          if (!this.existingResult) {
            itemGroup.get('matchCount')?.setValue(totalValue);
          }

          console.log(
            `Total de características (${characteristicsFound.join(
              ', '
            )}): ${totalValue}`
          );
        }
      }
    });

    // Recalcular puntuación total
    this.calculateTotalScore();
  }
}
