import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { GradingSystemConfigurationComponent } from './grading-system-configuration.component';
import { GradingSystemService } from '../../services/grading-system.service';
import { Grade } from '../../models/grade-config.model';

describe('GradingSystemConfigurationComponent', () => {
  const mockGrades: Grade[] = [
    { id: '1', minPercentage: 90, symbolicGrade: 'A+', descriptiveGrade: 'Excellent' },
    { id: '2', minPercentage: 80, symbolicGrade: 'A', descriptiveGrade: 'Very Good' },
    { id: '3', minPercentage: 70, symbolicGrade: 'B+', descriptiveGrade: 'Good' }
  ];
  let component: GradingSystemConfigurationComponent;
  let fixture: ComponentFixture<GradingSystemConfigurationComponent>;
  let mockGradingSystemService: jasmine.SpyObj<GradingSystemService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let gradesSignal = signal(mockGrades);

  beforeEach(async () => {
    gradesSignal = signal(mockGrades);
    
    const gradingServiceSpy = jasmine.createSpyObj('GradingSystemService', [
      'loadGrades', 'updateGrade', 'createGrade', 'deleteGrade'
    ]);

    gradingServiceSpy.updateGrade.and.returnValue(of({} as Grade));
    gradingServiceSpy.createGrade.and.returnValue(of({} as Grade));
    gradingServiceSpy.deleteGrade.and.returnValue(of(void 0));

    Object.defineProperty(gradingServiceSpy, 'grades', {
      get: () => gradesSignal.asReadonly(),
      configurable: true
    });

    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        GradingSystemConfigurationComponent,
        ReactiveFormsModule
      ],
      providers: [
        provideNoopAnimations(),
        { provide: GradingSystemService, useValue: gradingServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GradingSystemConfigurationComponent);
    component = fixture.componentInstance;
    mockGradingSystemService = TestBed.inject(GradingSystemService) as jasmine.SpyObj<GradingSystemService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.selectedGradeId()).toBeNull();
      expect(component.isLoadingGrade()).toBeFalse();
      expect(component.isSaving()).toBeFalse();
      expect(component.isEditFormVisible).toBeFalse();
    });

    it('should call loadGrades on ngOnInit', () => {
      component.ngOnInit();
      expect(mockGradingSystemService.loadGrades).toHaveBeenCalled();
    });

    it('should have valid form with default values', () => {
      fixture.detectChanges();
      
      expect(component.gradeForm.get('minPercentage')?.value).toBe(0);
      expect(component.gradeForm.get('maxPercentage')?.value).toBe(100);
      expect(component.gradeForm.get('symbolicGrade')?.value).toBe('');
      expect(component.gradeForm.get('descriptiveGrade')?.value).toBe('');
    });
  });

  describe('Grades with Ranges Computation', () => {
    it('should calculate ranges correctly', () => {
      fixture.detectChanges();
      const gradesWithRanges = component.gradesWithRanges();

      expect(gradesWithRanges).toEqual([
        { id: '3', minPercentage: 70, symbolicGrade: 'B+', descriptiveGrade: 'Good', maxPercentage: 79 },
        { id: '2', minPercentage: 80, symbolicGrade: 'A', descriptiveGrade: 'Very Good', maxPercentage: 89 },
        { id: '1', minPercentage: 90, symbolicGrade: 'A+', descriptiveGrade: 'Excellent', maxPercentage: 100 }
      ]);
    });

    it('should handle empty grades list', () => {
      gradesSignal.set([]);
      fixture.detectChanges();
      
      const gradesWithRanges = component.gradesWithRanges();
      expect(gradesWithRanges).toEqual([]);
    });
  });

  describe('Select Grade', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select grade and populate form', () => {
      const gradeId = '2';
      
      component.selectGrade(gradeId);

      expect(component.selectedGradeId()).toBe(gradeId);
      expect(component.isEditFormVisible).toBeTrue();
      expect(component.gradeForm.get('minPercentage')?.value).toBe(80);
      expect(component.gradeForm.get('maxPercentage')?.value).toBe(89);
      expect(component.gradeForm.get('symbolicGrade')?.value).toBe('A');
      expect(component.gradeForm.get('descriptiveGrade')?.value).toBe('Very Good');
    });

    it('should handle selecting non-existent grade', () => {
      component.selectGrade('non-existent');

      expect(component.selectedGradeId()).toBe('non-existent');
      expect(component.isEditFormVisible).toBeTrue();
      expect(component.gradeForm.get('symbolicGrade')?.value).toBe('');
    });
  });

  describe('Add New Grade', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should prepare form for new grade', () => {
      component.addNewGrade();

      expect(component.selectedGradeId()).toBeNull();
      expect(component.isEditFormVisible).toBeTrue();
      expect(component.gradeForm.get('minPercentage')?.value).toBe(100);
      expect(component.gradeForm.get('maxPercentage')?.value).toBe(100);
      expect(component.gradeForm.get('symbolicGrade')?.value).toBe('');
      expect(component.gradeForm.get('descriptiveGrade')?.value).toBe('');
    });

    it('should suggest 10 for first grade when no grades exist', () => {
      gradesSignal.set([]);
      fixture.detectChanges();

      component.addNewGrade();

      expect(component.gradeForm.get('minPercentage')?.value).toBe(10);
    });

    it('should cap suggestion at 100%', () => {
      const highGrades: Grade[] = [
        { id: '1', minPercentage: 95, symbolicGrade: 'A+', descriptiveGrade: 'Excellent' }
      ];
      gradesSignal.set(highGrades);
      fixture.detectChanges();

      component.addNewGrade();

      expect(component.gradeForm.get('minPercentage')?.value).toBe(100);
    });
  });

  describe('Update Max Percentage', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('should set max percentage to 100 for new grade', () => {
      component.addNewGrade();
      component.gradeForm.patchValue({ minPercentage: 95 });
      fixture.detectChanges();

      expect(component.gradeForm.get('maxPercentage')?.value).toBe(100);
    });

    it('should calculate max percentage based on next grade', () => {
      component.selectGrade('3');
      fixture.detectChanges();
      
      component.gradeForm.patchValue({ minPercentage: 75 });
      fixture.detectChanges();

      expect(component.gradeForm.get('maxPercentage')?.value).toBe(79);
    });

    it('should set max to 100 for highest grade', () => {
      component.selectGrade('1');
      fixture.detectChanges();
      
      component.gradeForm.patchValue({ minPercentage: 95 });
      fixture.detectChanges();

      expect(component.gradeForm.get('maxPercentage')?.value).toBe(100);
    });
  });

  describe('Save Grade', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('should update existing grade successfully', fakeAsync(() => {
      const updatedGrade: Grade = { id: '2', minPercentage: 85, symbolicGrade: 'A', descriptiveGrade: 'Very Good' };
      mockGradingSystemService.updateGrade.and.returnValue(of(updatedGrade));

      component.selectGrade('2');
      fixture.detectChanges();
      
      component.gradeForm.patchValue({ 
        minPercentage: 85,
        symbolicGrade: 'A+' 
      });
      component.gradeForm.markAsDirty();
      fixture.detectChanges();

      tick(1001);
      fixture.detectChanges();

      expect(mockGradingSystemService.updateGrade).toHaveBeenCalledWith('2', jasmine.any(Object));
      expect(mockSnackBar.open).toHaveBeenCalledWith('Grade updated successfully', 'Close', jasmine.any(Object));
    }));

    it('should create new grade successfully', fakeAsync(() => {
      const newGrade: Grade = { id: '4', minPercentage: 60, symbolicGrade: 'B+', descriptiveGrade: 'Average' };
      mockGradingSystemService.createGrade.and.returnValue(of(newGrade));

      component.addNewGrade();
      fixture.detectChanges();
      
      component.gradeForm.patchValue({
        minPercentage: 60,
        symbolicGrade: 'B+',
        descriptiveGrade: 'Average'
      });
      component.gradeForm.markAsDirty();
      fixture.detectChanges();

      tick(1001);
      fixture.detectChanges();

      expect(mockGradingSystemService.createGrade).toHaveBeenCalledWith(jasmine.any(Object));
      expect(component.selectedGradeId()).toBe('4');
      expect(mockSnackBar.open).toHaveBeenCalledWith('Grade created successfully', 'Close', jasmine.any(Object));
    }));

    it('should not save when form is invalid', fakeAsync(() => {
      component.addNewGrade();
      component.gradeForm.patchValue({
        minPercentage: null,
        symbolicGrade: 'A',
      });
      component.gradeForm.markAsDirty();

      tick(1001);

      expect(mockGradingSystemService.createGrade).not.toHaveBeenCalled();
      expect(mockGradingSystemService.updateGrade).not.toHaveBeenCalled();
    }));

    it('should handle 409 conflict error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        status: 409,
        error: { errorMessage: 'Grade already exists' }
      });
      mockGradingSystemService.updateGrade.and.returnValue(throwError(() => errorResponse));

      component.selectGrade('2');
      component.gradeForm.patchValue({ 
        symbolicGrade: 'A+' 
      });
      component.gradeForm.markAsDirty();

      tick(1001);

      expect(mockSnackBar.open).toHaveBeenCalledWith('Error: Grade already exists', 'Close', jasmine.any(Object));
    }));

    it('should handle generic error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({ status: 500 });
      mockGradingSystemService.createGrade.and.returnValue(throwError(() => errorResponse));

      component.addNewGrade();
      component.gradeForm.patchValue({
        minPercentage: 60,
        symbolicGrade: 'B+'
      });
      component.gradeForm.markAsDirty();

      tick(1001);

      expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to save grade. Please try again.', 'Close', jasmine.any(Object));
    }));
  });

  describe('Delete Grade', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should delete grade successfully', () => {
      mockGradingSystemService.deleteGrade.and.returnValue(of(void 0));
      spyOn(window, 'confirm').and.returnValue(true);

      const event = new Event('click');
      component.deleteGrade('2', event);

      expect(mockGradingSystemService.deleteGrade).toHaveBeenCalledWith('2');
      expect(mockSnackBar.open).toHaveBeenCalledWith('Grade deleted successfully', 'Close', jasmine.any(Object));
    });

    it('should not delete when user cancels confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      const event = new Event('click');
      component.deleteGrade('2', event);

      expect(mockGradingSystemService.deleteGrade).not.toHaveBeenCalled();
    });

    it('should clear form when deleting selected grade', () => {
      mockGradingSystemService.deleteGrade.and.returnValue(of(void 0));
      spyOn(window, 'confirm').and.returnValue(true);

      component.selectGrade('2');
      expect(component.selectedGradeId()).toBe('2');

      const event = new Event('click');
      component.deleteGrade('2', event);

      expect(component.selectedGradeId()).toBeNull();
      expect(component.isEditFormVisible).toBeFalse();
    });

    it('should handle 404 error', () => {
      const errorResponse = new HttpErrorResponse({ status: 404 });
      mockGradingSystemService.deleteGrade.and.returnValue(throwError(() => errorResponse));
      spyOn(window, 'confirm').and.returnValue(true);

      const event = new Event('click');
      component.deleteGrade('2', event);

      expect(mockSnackBar.open).toHaveBeenCalledWith('Grade not found', 'Close', jasmine.any(Object));
    });

    it('should stop event propagation', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteGrade('2', event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Form Subscriptions', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('should auto-save valid form after debounce', fakeAsync(() => {
      const newGrade = { id: '4', minPercentage: 60, symbolicGrade: 'B+', descriptiveGrade: 'Average' };
      mockGradingSystemService.createGrade.and.returnValue(of(newGrade));

      component.addNewGrade();
      fixture.detectChanges();
      
      component.gradeForm.patchValue({
        minPercentage: 60,
        symbolicGrade: 'B+',
        descriptiveGrade: 'Average'
      });
      component.gradeForm.markAsDirty();
      fixture.detectChanges();

      tick(500);
      expect(mockGradingSystemService.createGrade).not.toHaveBeenCalled();

      tick(500);
      fixture.detectChanges();
      expect(mockGradingSystemService.createGrade).toHaveBeenCalled();
    }));

    it('should update max percentage when min percentage changes', fakeAsync(() => {
      component.selectGrade('3');
      fixture.detectChanges();
      
      expect(component.gradeForm.get('maxPercentage')?.value).toBe(79);

      component.gradeForm.patchValue({ minPercentage: 85 });
      fixture.detectChanges();
      tick(100);

      const newMax = component.gradeForm.get('maxPercentage')?.value;
      expect(newMax).toBe(89);
    }));
  });

  describe('Loading States', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('should manage loading state correctly', () => {
      expect(component.isLoadingGrade()).toBeFalse();

      component.selectGrade('1');
      expect(component.isLoadingGrade()).toBeFalse();
    });

    it('should manage saving state correctly', fakeAsync(() => {
      const newGrade = { id: '4', minPercentage: 60, symbolicGrade: 'B+', descriptiveGrade: 'Average' };
      mockGradingSystemService.createGrade.and.returnValue(of(newGrade));

      component.addNewGrade();
      component.gradeForm.patchValue({
        minPercentage: 60,
        symbolicGrade: 'B+'
      });
      component.gradeForm.markAsDirty();

      expect(component.isSaving()).toBeFalse();

      tick(1001);
      fixture.detectChanges();

      expect(component.isSaving()).toBeFalse();
    }));
  });
});