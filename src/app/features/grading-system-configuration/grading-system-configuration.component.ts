import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
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

interface GradeWithRange extends Grade {
  maxPercentage: number;
}

@Component({
  selector: 'app-grading-system-configuration',
  standalone: true,
  imports: [
    HeaderComponent,
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

  private readonly gradingSystemService = inject(GradingSystemService);
  private fb = inject(FormBuilder);
  gradesWithRanges = computed(() => {
    const grades = this.gradingSystemService.grades();
    return this.calculateRanges(grades);
  });

  isEditFormVisible = false;
  selectedGradeId = signal<string | null>(null);


  gradeForm = this.fb.group({
    minPercentage: [0, [
      Validators.required, 
      Validators.min(0), 
      Validators.max(100)
    ]],
    maxPercentage: [0, [
      Validators.required, 
      Validators.min(0), 
      Validators.max(100)
    ]],
    symbolicGrade: ['', [
      Validators.required, 
      Validators.minLength(2)
    ]],
    descriptiveGrade: ['', [
      Validators.required, 
      Validators.minLength(2)
    ]]
  });

  constructor() {
    this.gradeForm.valueChanges
      .pipe(
        debounceTime(300),
        filter(() => this.gradeForm.valid)
      )
      .subscribe(formValue => {
        console.log(formValue);
      });
  }

  ngOnInit(): void {
    this.gradingSystemService.loadGrades();
  }

  onSubmit() {
    if (this.gradeForm.valid) {
      const {
        minPercentage,
        maxPercentage,
        symbolicGrade,
        descriptiveGrade 
      } = this.gradeForm.value;

      const gradeConfig: GradeConfig = {
        minPercentage: minPercentage || 0,
        maxPercentage: maxPercentage || 0,
        symbolicGrade: symbolicGrade || '',
        descriptiveGrade: descriptiveGrade || ''
      };
      
      console.log(gradeConfig);
    }
  }

  setFormValues(gradeConfig: GradeConfig) {
    this.gradeForm.patchValue(gradeConfig);
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

  showEditForm() {
    this.isEditFormVisible = true;
  }

  addNewGrade() {
    this.isEditFormVisible = true;
  }

  selectGrade(gradeId: string): void {
    this.selectedGradeId.set(gradeId);
    this.showEditForm();
  }

  deleteGrade(gradeId: string) {
    // to do popup
  }
}
