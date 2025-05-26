import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradingSystemConfigurationComponent } from './grading-system-configuration.component';

describe('GradingSystemConfigurationComponent', () => {
  let component: GradingSystemConfigurationComponent;
  let fixture: ComponentFixture<GradingSystemConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradingSystemConfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradingSystemConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
