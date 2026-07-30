// lib/data.ts - Active Database-backed reference structures
export interface SurveillanceRemark {
  date: string;
  officer: string;
  text: string;
}

export const remarks: SurveillanceRemark[] = [];
