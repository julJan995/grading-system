import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, tick } from '@angular/core/testing';

import { GradingSystemService } from './grading-system.service';
import { Grade, GradeConfig } from '../models/grade-config.model';

describe('GradingSystemService', () => {
  let service: GradingSystemService;
  let httpMock: HttpTestingController;

  const mockGrades: Grade[] = [
    { id: 'ungr-12345678', minPercentage: 90, symbolicGrade: 'A+', descriptiveGrade: 'Excellent' },
    { id: 'ungr-87654321', minPercentage: 80, symbolicGrade: 'A', descriptiveGrade: 'Very Good' },
    { id: 'ungr-11111111', minPercentage: 70, symbolicGrade: 'B+', descriptiveGrade: 'Good' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GradingSystemService]
    });
    service = TestBed.inject(GradingSystemService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty grades signal', () => {
      expect(service.grades()).toEqual([]);
    });
  });

  describe('loadGrades', () => {
    it('should load grades from HTTP and update signal', () => {
      service.loadGrades();

      const req = httpMock.expectOne('/assets/grades.json');
      expect(req.request.method).toBe('GET');
      
      req.flush(mockGrades);

      expect(service.grades()).toEqual(mockGrades);
    });

    it('should handle HTTP error gracefully', () => {
      spyOn(console, 'error');
      service.loadGrades();

      const req = httpMock.expectOne('/assets/grades.json');
      req.error(new ProgressEvent('Network error'));

      expect(console.error).toHaveBeenCalled();
      expect(service.grades()).toEqual([]);
    });
  });

  describe('getGrades', () => {
    beforeEach(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush(mockGrades);
    });

    it('should return grades with delay', fakeAsync(() => {
      let result: Grade[] = [];
      
      service.getGrades().subscribe(grades => {
        result = grades;
      });

      tick(300);
      
      expect(result).toEqual(mockGrades);
    }));
  });

  describe('getGradeById', () => {
    beforeEach(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush(mockGrades);
    });

    it('should return grade by id', fakeAsync(() => {
      let result: Grade | undefined;
      
      service.getGradeById('ungr-12345678').subscribe(grade => {
        result = grade;
      });

      tick(300);
      
      expect(result).toEqual(mockGrades[0]);
    }));

    it('should return 404 error for non-existent grade', fakeAsync(() => {
      let error: any = null;
      
      service.getGradeById('non-existent').subscribe({
        next: () => fail('Should have failed'),
        error: (err: any) => error = err
      });

      tick(300);
      
      expect(error).toBeTruthy();
      expect(error.status).toBe(404);
      expect(error.error?.message).toBe('Grade not found');
    }));
  });

  describe('createGrade', () => {
    beforeEach(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush(mockGrades);
    });

    it('should create new grade successfully', fakeAsync(() => {
      const newGradeConfig: GradeConfig = {
        minPercentage: 60,
        symbolicGrade: 'B',
        descriptiveGrade: 'Average'
      };

      let result: Grade | undefined;
      
      service.createGrade(newGradeConfig).subscribe(grade => {
        result = grade;
      });

      tick(300);
      
      expect(result).toBeTruthy();
      expect(result!.minPercentage).toBe(60);
      expect(result!.symbolicGrade).toBe('B');
      expect(result!.id).toContain('ungr-');
      expect(service.grades().length).toBe(4);
    }));

    it('should return conflict error for duplicate percentage', fakeAsync(() => {
      const duplicateConfig: GradeConfig = {
        minPercentage: 90,
        symbolicGrade: 'A++',
        descriptiveGrade: 'Perfect'
      };

      let error: any = null;
      
      service.createGrade(duplicateConfig).subscribe({
        next: () => fail('Should have failed'),
        error: (err: any) => error = err
      });

      tick(300);
      
      expect(error).toBeTruthy();
      expect(error.status).toBe(409);
      expect(error.error?.errorCode).toBe('AS014');
      expect(error.error?.errorMessage).toBe('Minimum percentage value is already used!');
    }));
  });

  describe('updateGrade', () => {
    beforeEach(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush(mockGrades);
    });

    it('should update existing grade successfully', fakeAsync(() => {
      const updateConfig: GradeConfig = {
        minPercentage: 85,
        symbolicGrade: 'A-',
        descriptiveGrade: 'Good Work'
      };

      let result: Grade | undefined;
      
      service.updateGrade('ungr-87654321', updateConfig).subscribe(grade => {
        result = grade;
      });

      tick(300);
      
      expect(result).toBeTruthy();
      expect(result!.minPercentage).toBe(85);
      expect(result!.symbolicGrade).toBe('A-');
      expect(service.grades().find(g => g.id === 'ungr-87654321')?.minPercentage).toBe(85);
    }));

    it('should return 404 error for non-existent grade', fakeAsync(() => {
      const updateConfig: GradeConfig = {
        minPercentage: 85,
        symbolicGrade: 'A-'
      };

      let error: any = null;
      
      service.updateGrade('non-existent', updateConfig).subscribe({
        next: () => fail('Should have failed'),
        error: (err: any) => error = err
      });

      tick(300);
      
      expect(error).toBeTruthy();
      expect(error.status).toBe(404);
    }));

    it('should return conflict error for duplicate percentage', fakeAsync(() => {
      const conflictConfig: GradeConfig = {
        minPercentage: 90,
        symbolicGrade: 'A-'
      };

      let error: any = null;
      
      service.updateGrade('ungr-87654321', conflictConfig).subscribe({
        next: () => fail('Should have failed'),
        error: (err: any) => error = err
      });

      tick(300);
      
      expect(error).toBeTruthy();
      expect(error.status).toBe(409);
      expect(error.error?.errorMessage).toBe('Minimum percentage value is already used!');
    }));
  });

  describe('deleteGrade', () => {
    beforeEach(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush(mockGrades);
    });

    it('should delete grade successfully', fakeAsync(() => {
      let completed = false;
      
      service.deleteGrade('ungr-87654321').subscribe(() => {
        completed = true;
      });

      tick(300);
      
      expect(completed).toBe(true);
      expect(service.grades().length).toBe(2);
      expect(service.grades().find(g => g.id === 'ungr-87654321')).toBeUndefined();
    }));

    it('should return 404 error for non-existent grade', fakeAsync(() => {
      let error: any = null;
      
      service.deleteGrade('non-existent').subscribe({
        next: () => fail('Should have failed'),
        error: (err: any) => error = err
      });

      tick(300);
      
      expect(error).toBeTruthy();
      expect(error.status).toBe(404);
    }));
  });

  describe('Signal Updates', () => {
    it('should update signal after CRUD operations', fakeAsync(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush([mockGrades[0]]);
      
      expect(service.grades().length).toBe(1);
      service.createGrade({
        minPercentage: 60,
        symbolicGrade: 'B'
      }).subscribe();
      tick(300);
      
      expect(service.grades().length).toBe(2);

      const gradeToUpdate = service.grades()[0];
      service.updateGrade(gradeToUpdate.id, {
        minPercentage: 95,
        symbolicGrade: 'A++'
      }).subscribe();
      tick(300);
      
      const updatedGrade = service.grades().find(g => g.id === gradeToUpdate.id);
      expect(updatedGrade).toBeTruthy();
      expect(updatedGrade!.symbolicGrade).toBe('A++');

      service.deleteGrade(gradeToUpdate.id).subscribe();
      tick(300);
      
      expect(service.grades().length).toBe(1);
    }));
  });

  describe('Private Methods (via public interface)', () => {
    it('should generate unique IDs with correct prefix', fakeAsync(() => {
      service.loadGrades();
      const req = httpMock.expectOne('/assets/grades.json');
      req.flush([]);

      let grade1: Grade | undefined;
      let grade2: Grade | undefined;

      service.createGrade({ minPercentage: 60, symbolicGrade: 'B' }).subscribe(g => grade1 = g);
      tick(300);
      
      service.createGrade({ minPercentage: 50, symbolicGrade: 'C' }).subscribe(g => grade2 = g);
      tick(300);

      expect(grade1).toBeTruthy();
      expect(grade2).toBeTruthy();
      expect(grade1!.id).toContain('ungr-');
      expect(grade2!.id).toContain('ungr-');
      expect(grade1!.id).not.toBe(grade2!.id);
    }));
  });
});