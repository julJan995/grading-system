import { TestBed } from '@angular/core/testing';

import { GradingSystemService } from './grading-system.service';

describe('GradingSystemService', () => {
  let service: GradingSystemService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GradingSystemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
