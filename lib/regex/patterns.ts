export const PATTERNS = {
  /** YYYY/MM/DD or YYYY-MM-DD */
  DATE_OF_BIRTH: /^\d{4}[/-]\d{2}[/-]\d{2}$/,
  /** 2-letter province code (e.g., ON, AB, BC) */
  HEALTH_CARD_VERSION: /^[A-Z]{2}$/,
  /** 10-digit number */
  HEALTH_CARD_NUMBER: /^\d{10}$/,
  /** Name: letters, spaces, hyphens, apostrophes, 1-50 chars */
  NAME: /^[A-Za-z\s'\-]{1,50}$/,
  /** 10-digit phone/fax number (digits only) */
  FAX_NUMBER: /^\d{10}$/,
  /** Clinic name: letters, numbers, spaces, hyphens, apostrophes, periods, 1-100 chars */
  CLINIC_NAME: /^[A-Za-z0-9\s'\-\.]{1,100}$/,
  /** Title: letters, periods, 1-20 chars (e.g., MD, DO, NP) */
  TITLE: /^[A-Za-z\.]{1,20}$/,
} as const

/**
 * Validate a date-of-birth string beyond regex format.
 * Returns null if valid, or an error message string.
 */
export function validateDateOfBirth(value: string): string | null {
  if (!PATTERNS.DATE_OF_BIRTH.test(value))
    return 'Must be YYYY/MM/DD or YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = value.split(/[/-]/)
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (month < 1 || month > 12) return `Month must be 01–12 (got ${monthStr})`
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth)
    return `Day must be 01–${daysInMonth} for month ${monthStr} (got ${dayStr})`
  if (year < 1900 || year > new Date().getFullYear())
    return `Year must be 1900–${new Date().getFullYear()}`
  return null
}

export const PATTERN_HINTS = {
  DATE_OF_BIRTH: 'e.g., 1990/01/15',
  HEALTH_CARD_VERSION: 'e.g., ON',
  HEALTH_CARD_NUMBER: 'e.g., 1234567890',
  FIRST_NAME: 'e.g., William',
  LAST_NAME: 'e.g., Worthington',
  DOCTOR_NAME: 'e.g., Dr. Smith',
  CLINIC_NAME: 'e.g., Toronto Heart Clinic',
  FAX_NUMBER: 'e.g., 4165551234',
  TITLE: 'e.g., MD',
} as const
