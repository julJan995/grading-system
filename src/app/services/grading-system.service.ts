import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { Grade, GradeConfig } from '../models/grade-config.model';

@Injectable({
  providedIn: 'root'
})
export class GradingSystemService {
  private readonly http = inject(HttpClient);
  private readonly GRADES_JSON_PATH = '/assets/grades.json';
  private readonly MOCK_DELAY_MS = 300;
  private readonly ID_PREFIX = 'ungr-';
  private readonly CONFLICT_ERROR_CODE = 'AS014';
  private readonly CONFLICT_ERROR_MESSAGE = 'Minimum percentage value is already used!';
  private mockDatabase: Grade[] = [];
  private _gradesSignal = signal<Grade[]>([]);
  readonly grades = computed(() => this._gradesSignal());

  loadGrades(): void {
    this.http.get<Grade[]>(this.GRADES_JSON_PATH)
      .subscribe({
        next: (grades) => {
          this.mockDatabase = [...grades];
          this._gradesSignal.set([...grades]);
        },
        error: (error) => console.error('Failed to load grades:', error)
      });
  }

  getGrades(): Observable<Grade[]> {
    return of([...this.mockDatabase]).pipe(delay(this.MOCK_DELAY_MS));
  }

  getGradeById(gradeId: string): Observable<Grade> {
    const grade = this.mockDatabase.find(g => g.id === gradeId);
    if (!grade) {
      return throwError(() => new HttpErrorResponse({
        error: { message: 'Grade not found' },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.MOCK_DELAY_MS));
    }
    return of(grade).pipe(delay(this.MOCK_DELAY_MS));
  }

  createGrade(gradeConfig: GradeConfig): Observable<Grade> {
    if (this.isDuplicatePercentage(this.mockDatabase, gradeConfig.minPercentage)) {
      return this.createConflictError().pipe(delay(this.MOCK_DELAY_MS));
    }

    const newGrade: Grade = {
      id: this.generateId(),
      minPercentage: gradeConfig.minPercentage,
      symbolicGrade: gradeConfig.symbolicGrade,
      descriptiveGrade: gradeConfig.descriptiveGrade
    };

    this.mockDatabase.push(newGrade);
    this._gradesSignal.set([...this.mockDatabase]);
    
    return of(newGrade).pipe(delay(this.MOCK_DELAY_MS));
  }

  updateGrade(gradeId: string, gradeConfig: GradeConfig): Observable<Grade> {
    const gradeIndex = this.mockDatabase.findIndex(g => g.id === gradeId);
    
    if (gradeIndex === -1) {
      return throwError(() => new HttpErrorResponse({
        error: { message: 'Grade not found' },
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.MOCK_DELAY_MS));
    }

    const isDuplicate = this.mockDatabase.some(g => 
      g.id !== gradeId && g.minPercentage === gradeConfig.minPercentage
    );
    
    if (isDuplicate) {
      return this.createConflictError().pipe(delay(this.MOCK_DELAY_MS));
    }

    this.mockDatabase[gradeIndex] = {
      ...this.mockDatabase[gradeIndex],
      minPercentage: gradeConfig.minPercentage,
      symbolicGrade: gradeConfig.symbolicGrade,
      descriptiveGrade: gradeConfig.descriptiveGrade
    };
    
    this._gradesSignal.set([...this.mockDatabase]);
    
    return of(this.mockDatabase[gradeIndex]).pipe(delay(this.MOCK_DELAY_MS));
  }

  deleteGrade(gradeId: string): Observable<void> {
    const gradeIndex = this.mockDatabase.findIndex(g => g.id === gradeId);
    
    if (gradeIndex === -1) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found'
      })).pipe(delay(this.MOCK_DELAY_MS));
    }

    this.mockDatabase.splice(gradeIndex, 1);
    
    this._gradesSignal.set([...this.mockDatabase]);
    
    return of(void 0).pipe(delay(this.MOCK_DELAY_MS));
  }

  private createConflictError(): Observable<never> {
    return throwError(() => new HttpErrorResponse({
      error: {
        errorCode: this.CONFLICT_ERROR_CODE,
        errorMessage: this.CONFLICT_ERROR_MESSAGE
      },
      status: 409,
      statusText: 'Conflict'
    }));
  }

  private isDuplicatePercentage(existingGrades: Grade[], minPercentage: number): boolean {
    return existingGrades.some(grade => grade.minPercentage === minPercentage);
  }

  private generateId(): string {
    return `${this.ID_PREFIX}${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  }
}