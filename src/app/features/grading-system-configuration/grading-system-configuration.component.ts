import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Grade, GradeConfig } from '../../models/grade-config.model';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, filter } from 'rxjs';
import { GradingSystemService } from '../../services/grading-system.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

interface GradeWithRange extends Grade {
  maxPercentage: number;
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
  private readonly gradingSystemService = inject(GradingSystemService);
  isEditFormVisible = false;
  selectedGradeId = signal<string | null>(null);
  private fb = inject(FormBuilder);
  private isLoadingGrade = false;

  gradesWithRanges = computed(() => {
    const grades = this.gradingSystemService.grades();
    return this.calculateRanges(grades);
  });

  gradeForm = this.fb.group({
    minPercentage: [0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100)
    ]],
    maxPercentage: [{ value: 100, disabled: true }],
    symbolicGrade: ['', [
      Validators.required,
      Validators.minLength(2)
    ]],
    descriptiveGrade: ['']
  });

  constructor() {
    this.gradeForm.valueChanges
      .pipe(
        debounceTime(this.AUTO_SAVE_DEBOUNCE_MS),
        filter(() => this.gradeForm.valid && !this.isLoadingGrade),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.saveGrade();
      });

      this.gradeForm.get('minPercentage')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.updateMaxPercentage();
      })
  }

  ngOnInit(): void {
    this.gradingSystemService.loadGrades();
  }

  private updateMaxPercentage(): void {
    const currentMin = this.gradeForm.get('minPercentage')?.value || 0;
    const gradeId = this.selectedGradeId();
    const grades = this.gradesWithRanges();

    const sortedGrades = [...grades]
      .filter(g => g.id !== gradeId)
      .sort((a, b) => a.minPercentage - b.minPercentage);

    const nextGrade = sortedGrades.find(g => g.minPercentage > currentMin);
    const maxValue = nextGrade ? nextGrade.minPercentage - 1 : 100;

    this.gradeForm.patchValue({ maxPercentage: maxValue }, { emitEvent: false });
  }

  selectGrade(gradeId: string): void {
    this.isLoadingGrade = true;
    this.selectedGradeId.set(gradeId);
    this.isEditFormVisible = true;

    const selectedGrade = this.gradesWithRanges().find(g => g.id === gradeId);

    if (selectedGrade) {
      this.gradeForm.patchValue({
        minPercentage: selectedGrade.minPercentage,
        maxPercentage: selectedGrade.maxPercentage,
        symbolicGrade: selectedGrade.symbolicGrade,
        descriptiveGrade: selectedGrade.descriptiveGrade || ''
      });
    }

    setTimeout(() => {
      this.isLoadingGrade = false;
    }, 100);
  }

  addNewGrade(): void {
    this.isLoadingGrade = true;
    this.selectedGradeId.set(null);
    this.isEditFormVisible = true;

    const grades = this.gradesWithRanges();
    const highestPercentage = grades.length > 0
      ? Math.max(...grades.map(g => g.minPercentage))
      : 0;

    const suggestedMin = Math.min(highestPercentage + 10, 100);

    this.gradeForm.reset({
      minPercentage: suggestedMin,
      maxPercentage: 100,
      symbolicGrade: '',
      descriptiveGrade: ''
    });

    setTimeout(() => {
      this.updateMaxPercentage();
      this.isLoadingGrade = false;
    }, 100);
  }

  private saveGrade(): void {
    if (!this.gradeForm.valid) return;

    const gradeConfig: GradeConfig = {
      minPercentage: this.gradeForm.value.minPercentage!,
      symbolicGrade: this.gradeForm.value.symbolicGrade!,
      descriptiveGrade: this.gradeForm.value.descriptiveGrade || undefined
    };

    const gradeId = this.selectedGradeId();

    if (gradeId) {
      this.gradingSystemService.updateGrade(gradeId, gradeConfig).subscribe({
        next: (grade) => {
          console.log('Grade updated:', grade);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            alert(`Error: ${error.error.errorMessage}`);
            this.selectGrade(gradeId);
          } else {
            console.error('Update failed:', error);
          }
        }
      });
    } else {
      this.gradingSystemService.createGrade(gradeConfig).subscribe({
        next: (newGrade) => {
          this.selectedGradeId.set(newGrade.id);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            alert(`Error: ${error.error.errorMessage}`);
          } else {
            console.error('Create failed:', error);
          }
        }
      });
    }
  }

  deleteGrade(gradeId: string, event: Event): void {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this grade?')) {
      this.gradingSystemService.deleteGrade(gradeId).subscribe({
        next: () => {
          if (this.selectedGradeId() === gradeId) {
            this.isEditFormVisible = false;
            this.selectedGradeId.set(null);
            this.gradeForm.reset();
          }
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            alert('Grade not found');
          } else {
            console.error('Delete failed:', error);
          }
        }
      });
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
}