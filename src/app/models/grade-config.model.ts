export interface GradeConfig {
    minPercentage: number;
    maxPercentage?: number;
    symbolicGrade: string;
    descriptiveGrade?: string;
}

export interface Grade {
    id: string;
    minPercentage: number;
    symbolicGrade: string;
    descriptiveGrade?: string;
}