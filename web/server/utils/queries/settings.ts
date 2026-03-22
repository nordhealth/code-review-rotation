import type { RotationDay, ScheduleConfig, SquadOverrides } from '../rotation/schedule'
import { settings } from '../../db/schema'
import { mergeSchedule, mergeSquadSchedule } from '../rotation/schedule'

export type { ScheduleConfig as EffectiveSchedule }

export async function querySettings() {
  const [existing] = await db.select().from(settings).where(eq(settings.id, 'global'))
  if (existing)
    return existing

  const [inserted] = await db
    .insert(settings)
    .values({ id: 'global' })
    .onConflictDoNothing()
    .returning()

  return inserted ?? (await db.select().from(settings).where(eq(settings.id, 'global')))[0]
}

export async function updateSettings(
  data: Partial<{
    defaultRotationIntervalDays: number
    defaultRotationDay: RotationDay
    defaultRotationTimezone: string
  }>,
) {
  const [updated] = await db
    .update(settings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(settings.id, 'global'))
    .returning()
  return updated
}

export async function getEffectiveSchedule(team: {
  rotationIntervalDays: number | null
  rotationDay: string | null
  rotationTimezone: string | null
}): Promise<ScheduleConfig> {
  const global = await querySettings()
  return mergeSchedule(global, team)
}

export async function getEffectiveSquadSchedule(
  team: {
    rotationIntervalDays: number | null
    rotationDay: string | null
    rotationTimezone: string | null
  },
  squad: SquadOverrides,
): Promise<ScheduleConfig> {
  const teamSchedule = await getEffectiveSchedule(team)
  return mergeSquadSchedule(teamSchedule, squad)
}
