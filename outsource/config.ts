/**
 * Centralized configuration for outsource modules
 */

/**
 * Course information used across all outsource modules
 */
export interface CourseInfo {
  institution: string;  // Institution code (e.g., 'yrk')
  course: string;       // Course code (e.g., 'cs')
  year: string;         // Year code (e.g., '2')
}

/**
 * Default course information used for API calls and code submissions
 */
export const defaultCourseInfo: CourseInfo = {
  institution: 'test',
  course: 'test_course',
  year: '0'
};

/**
 * Build the active sessions API path using course info
 */
export function buildActiveSessionsPath(courseInfo: CourseInfo = defaultCourseInfo): string {
  return `/api/app/active/${courseInfo.institution}/${courseInfo.course}/${courseInfo.year}`;
}

/**
 * Build the submit code data object using course info
 */
export function buildSubmitCodeData(
  rejectID: string | number,
  moduleCode: string | null,
  checkinCode: string | number,
  token: string,
  courseInfo: CourseInfo = defaultCourseInfo
): Record<string, string> {
  return {
    "inst": courseInfo.institution,
    "crs": courseInfo.course,
    "yr": courseInfo.year,
    "md": moduleCode || '',
    "grp": String(rejectID),
    "chc": String(checkinCode),
    "tk": token
  };
} 