-- Phase 4 admin reports: extend ExportJobType enum with the three XLSX
-- report kinds produced by /admin/reports/* endpoints. Additive only.

ALTER TYPE "ExportJobType" ADD VALUE IF NOT EXISTS 'ADMIN_STUDENT_REPORT_XLSX';
ALTER TYPE "ExportJobType" ADD VALUE IF NOT EXISTS 'ADMIN_TEACHER_REPORT_XLSX';
ALTER TYPE "ExportJobType" ADD VALUE IF NOT EXISTS 'ADMIN_COURSE_REPORT_XLSX';
