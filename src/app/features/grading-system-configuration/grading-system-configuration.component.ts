import { Component, OnInit, inject } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GradeConfig } from '../../models/grade-config.model';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, filter } from 'rxjs';

@Component({
  selector: 'app-grading-system-configuration',
  standalone: true,
  imports: [
    HeaderComponent,
    ReactiveFormsModule, 
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  templateUrl: './grading-system-configuration.component.html',
  styleUrl: './grading-system-configuration.component.scss'
})
export class GradingSystemConfigurationComponent implements OnInit {

  private fb = inject(FormBuilder);

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
    grade: ['', [
      Validators.required, 
      Validators.minLength(2)
    ]],
    gradeDescription: ['', [
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
    
  }

  onSubmit() {
    if (this.gradeForm.valid) {
      const {
        minPercentage,
        maxPercentage,
        grade,
        gradeDescription 
      } = this.gradeForm.value;
      
      const gradeConfig: GradeConfig = {
        minPercentage: minPercentage || 0,
        maxPercentage: maxPercentage || 0,
        grade: grade || '',
        gradeDescription: gradeDescription || ''
      };
      
      console.log(gradeConfig);
    }
  }

  setFormValues(gradeConfig: GradeConfig) {
    this.gradeForm.patchValue(gradeConfig);
  }

}
