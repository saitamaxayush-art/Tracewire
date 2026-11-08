// Single source for the product name and contact details.
// Rename the product by changing `name` here. Nothing else in the app hard-codes it.

export const brand = {
  name: 'Tracewire',
  tagline: 'Analyst console for bank fraud detection',
  /** Placeholder contact. Replace with the project team's real address before submission. */
  contactEmail: 'team@example.edu',
  contactLabel: 'Project team (contact placeholder)',
  courseLabel: 'DBMS course project',
  legalEffectiveDate: '2026-11-08',
} as const;

export type Brand = typeof brand;
