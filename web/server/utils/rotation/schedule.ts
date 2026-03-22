export const ROTATION_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type RotationDay = (typeof ROTATION_DAYS)[number]

export const ROTATION_HOUR = 4
export const ROTATION_MINUTE = 0

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export interface ScheduleConfig {
  intervalDays: number
  day: RotationDay
  timezone: string
}

export interface GlobalDefaults {
  defaultRotationIntervalDays: number
  defaultRotationDay: string
  defaultRotationTimezone: string
}

export interface TeamOverrides {
  rotationIntervalDays: number | null
  rotationDay: string | null
  rotationTimezone: string | null
}

export interface SquadOverrides {
  rotationIntervalDays: number | null
  rotationDay: string | null
  rotationTimezone: string | null
}

/**
 * Merge team-level overrides with global defaults.
 * Null team values fall through to the global default.
 */
export function mergeSchedule(global: GlobalDefaults, team: TeamOverrides): ScheduleConfig {
  return {
    intervalDays: team.rotationIntervalDays ?? global.defaultRotationIntervalDays,
    day: (team.rotationDay ?? global.defaultRotationDay) as RotationDay,
    timezone: team.rotationTimezone ?? global.defaultRotationTimezone,
  }
}

/**
 * Layer squad-level overrides on top of an already-resolved team schedule.
 * Null squad values fall through to the team schedule.
 */
export function mergeSquadSchedule(
  teamSchedule: ScheduleConfig,
  squad: SquadOverrides,
): ScheduleConfig {
  return {
    intervalDays: squad.rotationIntervalDays ?? teamSchedule.intervalDays,
    day: (squad.rotationDay ?? teamSchedule.day) as RotationDay,
    timezone: squad.rotationTimezone ?? teamSchedule.timezone,
  }
}

/**
 * Determine if a rotation is due for a team at a given moment.
 *
 * A rotation is due when:
 * 1. The current day of the week (in the team's timezone) matches the schedule day
 * 2. The current time (in the team's timezone) is at or past 04:00
 * 3. Enough days have elapsed since the last rotation (or there is no last rotation)
 */
export function isRotationDue(
  schedule: ScheduleConfig,
  now: Date,
  lastRotationDate: Date | null,
): boolean {
  // Check day of week in the team's timezone
  const teamNow = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }))
  const currentDay = DAY_NAMES[teamNow.getDay()]
  if (currentDay !== schedule.day)
    return false

  // Check if we're past 04:00
  if (
    teamNow.getHours() < ROTATION_HOUR
    || (teamNow.getHours() === ROTATION_HOUR && teamNow.getMinutes() < ROTATION_MINUTE)
  ) {
    return false
  }

  // Check interval since last rotation
  if (lastRotationDate) {
    const daysSince = (now.getTime() - lastRotationDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < schedule.intervalDays)
      return false
  }

  return true
}

/**
 * Compute the next rotation date given the last rotation date and schedule config.
 * Returns null if there is no last rotation to base the calculation on.
 *
 * The next date is: last rotation + interval days, then aligned forward to
 * the next occurrence of the configured day of the week, at 04:00.
 */
export function computeNextRotationDate(
  schedule: ScheduleConfig,
  lastRotationDate: Date | null,
): Date | null {
  if (!lastRotationDate)
    return null

  const candidate = new Date(
    lastRotationDate.getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000,
  )

  // Align to the target day of week
  const targetDayIndex = DAY_INDEX[schedule.day]
  const candidateDay = candidate.getDay()
  const dayDifference = (targetDayIndex - candidateDay + 7) % 7
  if (dayDifference > 0) {
    candidate.setDate(candidate.getDate() + dayDifference)
  }

  // Set to 04:00
  candidate.setHours(ROTATION_HOUR, ROTATION_MINUTE, 0, 0)

  return candidate
}
