import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampRankingComponent } from './camp-ranking.component';

describe('CampRankingComponent', () => {
  let component: CampRankingComponent;
  let fixture: ComponentFixture<CampRankingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampRankingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CampRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
