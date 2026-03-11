import { squads, squadMembers, developers } from "../../db/schema";

export async function querySquads(teamId: string) {
  const teamSquads = await db.select().from(squads).where(eq(squads.teamId, teamId));

  if (teamSquads.length === 0) return [];

  const squadIds = teamSquads.map((s) => s.id);

  const members = await db
    .select({
      squadId: squadMembers.squadId,
      memberId: squadMembers.id,
      developer: {
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slackId: developers.slackId,
        gitlabId: developers.gitlabId,
      },
    })
    .from(squadMembers)
    .innerJoin(developers, eq(squadMembers.developerId, developers.id))
    .where(inArray(squadMembers.squadId, squadIds));

  const membersBySquad = new Map<string, typeof members>();
  for (const m of members) {
    const existing = membersBySquad.get(m.squadId) ?? [];
    existing.push(m);
    membersBySquad.set(m.squadId, existing);
  }

  return teamSquads.map((squad) => ({
    ...squad,
    members: (membersBySquad.get(squad.id) ?? []).map((m) => ({
      id: m.memberId,
      developer: m.developer,
    })),
  }));
}

export async function querySquadById(squadId: string) {
  const [squad] = await db.select().from(squads).where(eq(squads.id, squadId));
  if (!squad) return null;

  const members = await db
    .select({
      memberId: squadMembers.id,
      developer: {
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slackId: developers.slackId,
        gitlabId: developers.gitlabId,
      },
    })
    .from(squadMembers)
    .innerJoin(developers, eq(squadMembers.developerId, developers.id))
    .where(eq(squadMembers.squadId, squadId));

  return {
    ...squad,
    members: members.map((m) => ({ id: m.memberId, developer: m.developer })),
  };
}

export async function createSquad(data: {
  teamId: string;
  name: string;
  reviewerCount: number;
  memberDeveloperIds: string[];
}) {
  const [squad] = await db
    .insert(squads)
    .values({
      teamId: data.teamId,
      name: data.name,
      reviewerCount: data.reviewerCount,
    })
    .returning();

  if (data.memberDeveloperIds.length > 0) {
    await db.insert(squadMembers).values(
      data.memberDeveloperIds.map((devId) => ({
        squadId: squad.id,
        developerId: devId,
      })),
    );
  }

  return squad;
}

export async function updateSquad(
  squadId: string,
  data: Partial<{
    name: string;
    reviewerCount: number;
    memberDeveloperIds: string[];
  }>,
) {
  const { memberDeveloperIds, ...squadData } = data;

  let squad = null;
  if (Object.keys(squadData).length > 0) {
    const [updated] = await db
      .update(squads)
      .set(squadData)
      .where(eq(squads.id, squadId))
      .returning();
    squad = updated;
  } else {
    const [existing] = await db.select().from(squads).where(eq(squads.id, squadId));
    squad = existing;
  }

  if (memberDeveloperIds !== undefined) {
    await db.delete(squadMembers).where(eq(squadMembers.squadId, squadId));

    if (memberDeveloperIds.length > 0) {
      await db.insert(squadMembers).values(
        memberDeveloperIds.map((devId) => ({
          squadId,
          developerId: devId,
        })),
      );
    }
  }

  return squad ?? null;
}

export async function deleteSquad(squadId: string) {
  await db.delete(squads).where(eq(squads.id, squadId));
}
