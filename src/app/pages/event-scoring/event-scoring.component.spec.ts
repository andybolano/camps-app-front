import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventScoringComponent } from './event-scoring.component';

describe('EventScoringComponent', () => {
  let component: EventScoringComponent;
  let fixture: ComponentFixture<EventScoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventScoringComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EventScoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
