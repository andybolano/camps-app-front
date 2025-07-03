import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Camp, CampService } from '../../services/camp.service';

@Component({
  selector: 'app-camps',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './camps.component.html',
  styleUrl: './camps.component.scss',
})
export class CampsComponent implements OnInit {
  camps: Camp[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private campService: CampService) {}

  ngOnInit(): void {
    this.loadCamps();
  }

  loadCamps(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.campService.getCamps().subscribe({
      next: (camps) => {
        this.camps = camps;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los campamentos: ' + error.message;
        this.isLoading = false;
      },
    });
  }

  onDeleteCamp(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar este campamento?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    this.campService.deleteCamp(id).subscribe({
      next: () => {
        this.camps = this.camps.filter((camp) => camp.id !== id);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al eliminar campamento:', error);

        if (error.error?.message?.includes('clubes o eventos relacionados')) {
          this.errorMessage =
            '⚠️ No se puede eliminar el campamento porque tiene clubes o eventos asociados. Elimine primero estos datos relacionados.';
        } else {
          this.errorMessage =
            'Error al eliminar el campamento: ' +
            (error.error?.message || error.message || 'Error desconocido');
        }
        
        this.isLoading = false;
      },
    });
  }

  // Verificar si un campamento tiene datos relacionados
  hasCampRelatedData(camp: Camp): boolean {
    return Boolean(
      (camp.clubs && camp.clubs.length > 0) ||
      (camp.events && camp.events.length > 0)
    );
  }
  
  // Obtener un tooltip informativo sobre por qué no se puede eliminar
  getCampDeleteTooltip(camp: Camp): string {
    if (!this.hasCampRelatedData(camp)) {
      return '';
    }
    
    const relatedItems = [];
    if (camp.clubs && camp.clubs.length > 0) {
      relatedItems.push(`${camp.clubs.length} club(es)`);
    }
    if (camp.events && camp.events.length > 0) {
      relatedItems.push(`${camp.events.length} evento(s)`);
    }
    
    return `No se puede eliminar: tiene ${relatedItems.join(' y ')} relacionados`;
  }
}
