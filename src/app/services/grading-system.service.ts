import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, delay, of, switchMap, throwError } from 'rxjs';
import { Grade } from '../models/grade-config.model';

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

  private _grades = signal<Grade[]>([]);
  readonly grades = this._grades.asReadonly();

  loadGrades(): void {
    this.http.get<Grade[]>(this.GRADES_JSON_PATH)
      .subscribe(grades => this._grades.set(grades));
  }

  getGrades(): Observable<Grade[]> {
    return this.http.get<Grade[]>(this.GRADES_JSON_PATH);
  }

  getGradeById(gradeId: string): Observable<Grade> {
    return this.getGrades().pipe(
      switchMap(grades => {
        const grade = grades.find(g => g.id === gradeId);
        if (!grade) {
          const notFoundError = new HttpErrorResponse({
            error: { message: 'Grade not found' },
            status: 404,
            statusText: 'Not Found'
          });
          return throwError(() => notFoundError);
        }
        return of(grade).pipe(delay(this.MOCK_DELAY_MS));
      }),
      catchError(this.handleError)
    );
  }

  createGrade(grade: Grade): Observable<Grade> {
    return this.getGrades().pipe(
      switchMap(existingGrades => {
        if (this.isDuplicatePercentage(existingGrades, grade.minPercentage)) {
          return this.createConflictError();
        }
        return this.createMockResponse(grade);
      }),
      catchError(this.handleError)
    );
  }

  private isDuplicatePercentage(existingGrades: Grade[], minPercentage: number): boolean {
    return existingGrades.some(grade => grade.minPercentage === minPercentage);
  }

  private createConflictError(): Observable<never> {
    const error = new HttpErrorResponse({
      error: {
        errorCode: this.CONFLICT_ERROR_CODE,
        errorMessage: this.CONFLICT_ERROR_MESSAGE
      },
      status: 409,
      statusText: 'Conflict'
    });
    return throwError(() => error);
  }

  private createMockResponse(grade: Grade): Observable<Grade> {
    const mockResponse: Grade = {
      id: this.generateId(),
      minPercentage: grade.minPercentage,
      symbolicGrade: grade.symbolicGrade
    };

    return of(mockResponse).pipe(delay(this.MOCK_DELAY_MS));
  }

  private generateId(): string {
    return `${this.ID_PREFIX}${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('GradeService error:', error);
    return throwError(() => error);
  };
}
