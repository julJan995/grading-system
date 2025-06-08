import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Grade, GradeConfig } from '../../models/grade-config.model';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, filter, switchMap, of } from 'rxjs';
import { GradingSystemService } from '../../services/grading-system.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

interface GradeWithRange extends Grade {
  maxPercentage: number;
}

interface FormValue {
  minPercentage: number | null;
  maxPercentage: number | null;
  symbolicGrade: string | null;
  descriptiveGrade: string | null;
}

@Component({
  selector: 'app-grading-system-configuration',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './grading-system-configuration.component.html',
  styleUrl: './grading-system-configuration.component.scss'
})
export class GradingSystemConfigurationComponent implements OnInit {
  private readonly AUTO_SAVE_DEBOUNCE_MS = 1000;
  private readonly MIN_SYMBOLIC_GRADE_LENGTH = 2;
  private readonly PERCENTAGE_SUGGESTION_STEP = 10;

  private readonly gradingSystemService = inject(GradingSystemService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly selectedGradeId = signal<string | null>(null);
  readonly isLoadingGrade = signal(false);
  readonly isSaving = signal(false);
  isEditFormVisible = false;

  readonly gradeForm = this.fb.group({
    minPercentage: [0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100)
    ]],
    maxPercentage: [
      {
        value: 100,
        disabled: false
      }
    ],
    symbolicGrade: ['', [
      Validators.required,
      Validators.minLength(this.MIN_SYMBOLIC_GRADE_LENGTH)
    ]],
    descriptiveGrade: ['']
  });

  readonly gradesWithRanges = computed(() => {
    const grades = this.gradingSystemService.grades();
    return this.calculateRanges(grades);
  });

  readonly isFormValid = computed(() => this.gradeForm.valid);

  constructor() {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  selectGrade(gradeId: string): void {
    this.setLoadingState(true);
    this.selectedGradeId.set(gradeId);
    this.isEditFormVisible = true;
  
    const selectedGrade = this.gradesWithRanges().find(g => g.id === gradeId);
  
    if (selectedGrade) {
      this.populateForm(selectedGrade);
    }
  
    this.setLoadingState(false);
  }

  addNewGrade(): void {
    this.setLoadingState(true);
    this.selectedGradeId.set(null);
    this.isEditFormVisible = true;
  
    const suggestedMinPercentage = this.calculateSuggestedMinPercentage();
    
    this.gradeForm.reset({
      minPercentage: suggestedMinPercentage,
      maxPercentage: 100,
      symbolicGrade: '',
      descriptiveGrade: ''
    }, { emitEvent: false });
  
    this.updateMaxPercentage();
    this.setLoadingState(false);
  }

  deleteGrade(gradeId: string, event: Event): void {
    event.stopPropagation();
    this.showDeleteConfirmation(gradeId);
  }

  private loadInitialData(): void {
    this.gradingSystemService.loadGrades();
  }

  private setupFormSubscriptions(): void {
    this.gradeForm.valueChanges
      .pipe(
        debounceTime(this.AUTO_SAVE_DEBOUNCE_MS),
        filter(() => this.shouldAutoSave()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.saveGrade();
      });

    this.gradeForm.get('minPercentage')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMaxPercentage();
      });
  }

  private shouldAutoSave(): boolean {
    return this.gradeForm.valid && 
           !this.isLoadingGrade() && 
           !this.isSaving() &&
           this.isEditFormVisible;
  }

  private setLoadingState(loading: boolean): void {
    this.isLoadingGrade.set(loading);
  }

  private setSavingState(saving: boolean): void {
    this.isSaving.set(saving);
  }

  private populateForm(grade: GradeWithRange): void {
    this.gradeForm.patchValue({
      minPercentage: grade.minPercentage,
      maxPercentage: grade.maxPercentage,
      symbolicGrade: grade.symbolicGrade,
      descriptiveGrade: grade.descriptiveGrade || ''
    }, { emitEvent: false });
  }

  private calculateSuggestedMinPercentage(): number {
    const grades = this.gradesWithRanges();
    const highestPercentage = grades.length > 0
      ? Math.max(...grades.map(g => g.minPercentage))
      : 0;

    return Math.min(highestPercentage + this.PERCENTAGE_SUGGESTION_STEP, 100);
  }

  private updateMaxPercentage(): void {
    const gradeId = this.selectedGradeId();
    
    if (gradeId === null) {
      this.gradeForm.patchValue({ maxPercentage: 100 }, { emitEvent: false });
      return;
    }

    const formValue = this.gradeForm.value as FormValue;
    const currentMin = formValue.minPercentage ?? 0;
    const grades = this.gradesWithRanges();

    const sortedGrades = [...grades]
      .filter(g => g.id !== gradeId)
      .sort((a, b) => a.minPercentage - b.minPercentage);

    const nextGrade = sortedGrades.find(g => g.minPercentage > currentMin);
    const maxValue = nextGrade ? nextGrade.minPercentage - 1 : 100;

    this.gradeForm.patchValue({ maxPercentage: maxValue }, { emitEvent: false });
  }

  private saveGrade(): void {
    if (!this.gradeForm.valid) {
      this.showError('Please fill in all required fields correctly.');
      return;
    }

    this.setSavingState(true);
    const gradeConfig = this.buildGradeConfig();
    const gradeId = this.selectedGradeId();

    if (gradeId) {
      this.updateExistingGrade(gradeId, gradeConfig);
    } else {
      this.createNewGrade(gradeConfig);
    }
  }

  private buildGradeConfig(): GradeConfig {
    const formValue = this.gradeForm.value as FormValue;
    
    if (formValue.minPercentage === null || formValue.symbolicGrade === null) {
      throw new Error('Required form values are missing');
    }

    return {
      minPercentage: formValue.minPercentage,
      symbolicGrade: formValue.symbolicGrade,
      descriptiveGrade: formValue.descriptiveGrade || undefined
    };
  }

  private updateExistingGrade(gradeId: string, gradeConfig: GradeConfig): void {
    this.gradingSystemService.updateGrade(gradeId, gradeConfig)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showSuccess('Grade updated successfully');
          this.setSavingState(false);
        },
        error: (error: HttpErrorResponse) => {
          this.handleSaveError(error, gradeId);
          this.setSavingState(false);
        }
      });
  }

  private createNewGrade(gradeConfig: GradeConfig): void {
    this.gradingSystemService.createGrade(gradeConfig)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newGrade) => {
          this.selectedGradeId.set(newGrade.id);
          this.showSuccess('Grade created successfully');
          this.setSavingState(false);
        },
        error: (error: HttpErrorResponse) => {
          this.handleSaveError(error);
          this.setSavingState(false);
        }
      });
  }

  private handleSaveError(error: HttpErrorResponse, gradeId?: string): void {
    if (error.status === 409) {
      const errorMessage = error.error?.errorMessage || 'Conflict occurred';
      this.showError(`Error: ${errorMessage}`);
      
      if (gradeId) {
        this.selectGrade(gradeId);
      }
    } else {
      this.showError('Failed to save grade. Please try again.');
    }
  }

  private showDeleteConfirmation(gradeId: string): void {
    if (confirm('Are you sure you want to delete this grade?')) {
      this.performDelete(gradeId);
    }
  }

  private performDelete(gradeId: string): void {
    this.gradingSystemService.deleteGrade(gradeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.handleSuccessfulDelete(gradeId);
          this.showSuccess('Grade deleted successfully');
        },
        error: (error: HttpErrorResponse) => {
          this.handleDeleteError(error);
        }
      });
  }

  private handleSuccessfulDelete(gradeId: string): void {
    if (this.selectedGradeId() === gradeId) {
      this.isEditFormVisible = false;
      this.selectedGradeId.set(null);
      this.gradeForm.reset();
    }
  }

  private handleDeleteError(error: HttpErrorResponse): void {
    if (error.status === 404) {
      this.showError('Grade not found');
    } else {
      this.showError('Failed to delete grade. Please try again.');
    }
  }

  private calculateRanges(grades: Grade[]): GradeWithRange[] {
    const sorted = [...grades].sort((a, b) => a.minPercentage - b.minPercentage);

    return sorted.map((grade, index) => ({
      ...grade,
      maxPercentage: index < sorted.length - 1
        ? sorted[index + 1].minPercentage - 1
        : 100
    }));
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}