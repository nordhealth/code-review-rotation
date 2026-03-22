import type { GlobalDefaults, ScheduleConfig, SquadOverrides, TeamOverrides } from '~/server/utils/rotation/schedule'
import { describe, expect, it } from 'vitest'
import {
  computeNextRotationDate,

  isRotationDue,
  mergeSchedule,
  mergeSquadSchedule,
  ROTATION_DAYS,
  ROTATION_HOUR,
  ROTATION_MINUTE,

} from '~/server/utils/rotation/schedule'

// ── Constants ───────────────────────────────────────────────────────────────

describe('rOTATION_DAYS', () => {
  it('contains all 7 days of the week', () => {
    expect(ROTATION_DAYS).toHaveLength(7)
    expect(ROTATION_DAYS).toContain('monday')
    expect(ROTATION_DAYS).toContain('sunday')
  })
})

describe('rOTATION_HOUR / ROTATION_MINUTE', () => {
  it('defaults to 04:00', () => {
    expect(ROTATION_HOUR).toBe(4)
    expect(ROTATION_MINUTE).toBe(0)
  })
})

// ── mergeSchedule ───────────────────────────────────────────────────────────

describe('mergeSchedule', () => {
  const global: GlobalDefaults = {
    defaultRotationIntervalDays: 14,
    defaultRotationDay: 'wednesday',
    defaultRotationTimezone: 'Europe/Helsinki',
  }

  it('returns global defaults when all team overrides are null', () => {
    const team: TeamOverrides = {
      rotationIntervalDays: null,
      rotationDay: null,
      rotationTimezone: null,
    }
    const result = mergeSchedule(global, team)
    expect(result).toEqual({
      intervalDays: 14,
      day: 'wednesday',
      timezone: 'Europe/Helsinki',
    })
  })

  it('uses team overrides when provided', () => {
    const team: TeamOverrides = {
      rotationIntervalDays: 7,
      rotationDay: 'friday',
      rotationTimezone: 'America/New_York',
    }
    const result = mergeSchedule(global, team)
    expect(result).toEqual({
      intervalDays: 7,
      day: 'friday',
      timezone: 'America/New_York',
    })
  })

  it('mixes team overrides and global defaults', () => {
    const team: TeamOverrides = {
      rotationIntervalDays: 7,
      rotationDay: 'monday',
      rotationTimezone: null,
    }
    const result = mergeSchedule(global, team)
    expect(result).toEqual({
      intervalDays: 7,
      day: 'monday',
      timezone: 'Europe/Helsinki',
    })
  })
})

// ── mergeSquadSchedule ──────────────────────────────────────────────────────

describe('mergeSquadSchedule', () => {
  const teamSchedule: ScheduleConfig = {
    intervalDays: 14,
    day: 'wednesday',
    timezone: 'Europe/Helsinki',
  }

  it('returns team schedule when all squad overrides are null', () => {
    const squad: SquadOverrides = {
      rotationIntervalDays: null,
      rotationDay: null,
      rotationTimezone: null,
    }
    expect(mergeSquadSchedule(teamSchedule, squad)).toEqual(teamSchedule)
  })

  it('uses squad overrides when provided', () => {
    const squad: SquadOverrides = {
      rotationIntervalDays: 7,
      rotationDay: 'friday',
      rotationTimezone: 'America/New_York',
    }
    expect(mergeSquadSchedule(teamSchedule, squad)).toEqual({
      intervalDays: 7,
      day: 'friday',
      timezone: 'America/New_York',
    })
  })

  it('mixes squad overrides and team defaults', () => {
    const squad: SquadOverrides = {
      rotationIntervalDays: 7,
      rotationDay: null,
      rotationTimezone: null,
    }
    expect(mergeSquadSchedule(teamSchedule, squad)).toEqual({
      intervalDays: 7,
      day: 'wednesday',
      timezone: 'Europe/Helsinki',
    })
  })
})

// ── isRotationDue ───────────────────────────────────────────────────────────

describe('isRotationDue', () => {
  const schedule: ScheduleConfig = {
    intervalDays: 14,
    day: 'wednesday',
    timezone: 'UTC',
  }

  it('returns true when day matches, time is past, and interval elapsed', () => {
    // Wed Mar 25 2026 05:00 UTC (past 04:00)
    const now = new Date('2026-03-25T05:00:00Z')
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    expect(isRotationDue(schedule, now, lastRotation)).toBe(true)
  })

  it('returns true when there is no last rotation', () => {
    const now = new Date('2026-03-25T05:00:00Z')
    expect(isRotationDue(schedule, now, null)).toBe(true)
  })

  it('returns false when day does not match', () => {
    // Thu Mar 26 2026 05:00 UTC
    const now = new Date('2026-03-26T05:00:00Z')
    expect(isRotationDue(schedule, now, null)).toBe(false)
  })

  it('returns false when time has not been reached', () => {
    // Wed Mar 25 2026 03:00 UTC (before 04:00)
    const now = new Date('2026-03-25T03:00:00Z')
    expect(isRotationDue(schedule, now, null)).toBe(false)
  })

  it('returns false when interval has not elapsed', () => {
    const now = new Date('2026-03-25T05:00:00Z')
    const lastRotation = new Date('2026-03-18T04:00:00Z')
    expect(isRotationDue(schedule, now, lastRotation)).toBe(false)
  })

  it('returns true at exact 04:00', () => {
    const now = new Date('2026-03-25T04:00:00Z')
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    expect(isRotationDue(schedule, now, lastRotation)).toBe(true)
  })

  it('returns false when same hour but minutes not reached', () => {
    // Wed Mar 25 2026 03:59 UTC
    const now = new Date('2026-03-25T03:59:00Z')
    expect(isRotationDue(schedule, now, null)).toBe(false)
  })

  it('handles non-UTC timezone', () => {
    const helsinkiSchedule: ScheduleConfig = {
      intervalDays: 7,
      day: 'wednesday',
      timezone: 'Europe/Helsinki',
    }
    // Wed Mar 25 2026 is still EET (UTC+2), DST switch is Mar 29
    // 02:00 UTC = 04:00 EET — exactly at rotation time
    const now = new Date('2026-03-25T02:00:00Z')
    expect(isRotationDue(helsinkiSchedule, now, null)).toBe(true)
  })
})

// ── computeNextRotationDate ─────────────────────────────────────────────────

describe('computeNextRotationDate', () => {
  const schedule: ScheduleConfig = {
    intervalDays: 14,
    day: 'wednesday',
    timezone: 'UTC',
  }

  it('returns null when there is no last rotation', () => {
    expect(computeNextRotationDate(schedule, null)).toBeNull()
  })

  it('computes next rotation date from last rotation', () => {
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    const result = computeNextRotationDate(schedule, lastRotation)

    expect(result).not.toBeNull()
    expect(result!.getFullYear()).toBe(2026)
    expect(result!.getMonth()).toBe(2)
    expect(result!.getDate()).toBe(25)
    expect(result!.getHours()).toBe(4)
    expect(result!.getMinutes()).toBe(0)
  })

  it('aligns to the next target day when interval lands on wrong day', () => {
    const mondaySchedule: ScheduleConfig = {
      intervalDays: 14,
      day: 'monday',
      timezone: 'UTC',
    }
    // 14 days after Wed Mar 11 = Wed Mar 25, next Monday = Mar 30
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    const result = computeNextRotationDate(mondaySchedule, lastRotation)

    expect(result).not.toBeNull()
    expect(result!.getDate()).toBe(30)
    expect(result!.getDay()).toBe(1)
    expect(result!.getHours()).toBe(4)
  })

  it('does not shift forward when interval already lands on the right day', () => {
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    const result = computeNextRotationDate(schedule, lastRotation)

    expect(result).not.toBeNull()
    expect(result!.getDay()).toBe(3)
    expect(result!.getDate()).toBe(25)
  })

  it('handles short interval (e.g. 3 days)', () => {
    const shortSchedule: ScheduleConfig = {
      intervalDays: 3,
      day: 'friday',
      timezone: 'UTC',
    }
    // 3 days after Wed Mar 11 = Sat Mar 14, next Friday = Mar 20
    const lastRotation = new Date('2026-03-11T04:00:00Z')
    const result = computeNextRotationDate(shortSchedule, lastRotation)

    expect(result).not.toBeNull()
    expect(result!.getDay()).toBe(5)
    expect(result!.getDate()).toBe(20)
    expect(result!.getHours()).toBe(4)
  })

  it('sets seconds and milliseconds to zero', () => {
    const lastRotation = new Date('2026-03-11T04:33:45.123Z')
    const result = computeNextRotationDate(schedule, lastRotation)
    expect(result).not.toBeNull()
    expect(result!.getSeconds()).toBe(0)
    expect(result!.getMilliseconds()).toBe(0)
  })
})
