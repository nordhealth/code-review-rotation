/**
 * Auto-seed plugin. Runs once on first deployment when the database is empty.
 * Populates PVC Finance Core team with developers, squad, and rotation history.
 */
export default defineNitroPlugin((nitroApp) => {
  // Defer seeding to first request so hubDatabase() binding is available
  nitroApp.hooks.hookOnce("request", async () => {
    // Only seed if DB is empty
    const existing = await queryDevelopers();
    if (existing.length > 0) return;

    console.log("[seed] Empty database detected — seeding initial data...");

    // Ensure global settings row exists
    await db.insert(settings).values({ id: "global" }).onConflictDoNothing();

    // ── Admin User ──────────────────────────────────────────────────────
    const adminPassword = await hashPassword("admin123!");
    await db
      .insert(users)
      .values({
        email: "joao.goncalves@nordhealth.com",
        passwordHash: adminPassword,
        firstName: "João",
        lastName: "Gonçalves",
        role: "admin",
        emailConfirmed: true,
      })
      .run();
    console.log("[seed] Admin user: joao.goncalves@nordhealth.com / admin123!");

    // ── Developers ──────────────────────────────────────────────────────
    const cuong = await createDeveloper({
      firstName: "Cuong",
      lastName: "Nguyen",
      slackId: "U027R2779R8",
      gitlabId: "cuong.nguyen1",
    });
    const gonzalo = await createDeveloper({
      firstName: "Gonzalo",
      lastName: "Fernández",
      slackId: "U09331TMH34",
      gitlabId: "gonzalo.fernandez",
    });
    const anja = await createDeveloper({
      firstName: "Anja",
      lastName: "Freihube",
      slackId: "U0AD6TWS4D6",
      gitlabId: "anja.freihube",
    });
    const joao = await createDeveloper({
      firstName: "João",
      lastName: "Gonçalves",
      slackId: "U06KCP2D3AB",
      gitlabId: "joao.goncalves",
    });
    const marko = await createDeveloper({
      firstName: "Marko",
      lastName: "Vainio",
      slackId: "UAP3P44FL",
      gitlabId: "marko.vainio",
    });
    const pekka = await createDeveloper({
      firstName: "Pekka",
      lastName: "Korhonen",
      slackId: "U02TZV4ACLQ",
      gitlabId: "pekka.korhonen",
    });
    const sergio = await createDeveloper({
      firstName: "Sergio",
      lastName: "Serrano",
      slackId: "U077679KG1K",
      gitlabId: "sergio.serrano",
    });
    const vilhelm = await createDeveloper({
      firstName: "Vilhelm",
      lastName: "Leppälä",
      slackId: "U01LE4BD9SR",
      gitlabId: "vilhelm.leppala",
    });
    // Former developer (appears in older rotations)
    const miia = await createDeveloper({
      firstName: "Miia",
      lastName: "Leppänen",
      gitlabId: "miia.leppanen",
    });

    // ── Team ────────────────────────────────────────────────────────────
    const team = await createTeam({ name: "PVC Finance Core", defaultReviewerCount: 2 });

    // ── Team Members (all experienced except Anja) ─────────────────────
    await addTeamMember({ teamId: team.id, developerId: cuong.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: gonzalo.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: anja.id, isExperienced: false });
    await addTeamMember({ teamId: team.id, developerId: joao.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: marko.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: pekka.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: sergio.id, isExperienced: true });
    await addTeamMember({ teamId: team.id, developerId: vilhelm.id, isExperienced: true });

    // ── Squad: Bug Sheriff ──────────────────────────────────────────────
    const squad = await createSquad({
      teamId: team.id,
      name: "Bug Sheriff",
      reviewerCount: 3,
      memberDeveloperIds: [
        cuong.id,
        marko.id,
        anja.id,
        pekka.id,
        sergio.id,
        vilhelm.id,
        gonzalo.id,
      ],
    });

    // ── Dev lookup ──────────────────────────────────────────────────────
    const devByName: Record<string, typeof cuong> = {
      Cuong: cuong,
      Gonzalo: gonzalo,
      Anja: anja,
      João: joao,
      Marko: marko,
      Pekka: pekka,
      Sergio: sergio,
      Vilhelm: vilhelm,
      Miia: miia,
    };

    // ── Past Rotation History (devs mode) ──────────────────────────────
    const devRotations: [string, [string, string[]][]][] = [
      [
        "2026-03-11",
        [
          ["Cuong", ["Gonzalo", "Sergio"]],
          ["Marko", ["Anja", "João"]],
          ["João", ["Marko", "Vilhelm"]],
          ["Pekka", ["Cuong", "Vilhelm"]],
          ["Sergio", ["Gonzalo", "Pekka"]],
          ["Vilhelm", ["João", "Sergio"]],
          ["Gonzalo", ["Anja", "Marko"]],
          ["Anja", ["Cuong", "Pekka"]],
        ],
      ],
      [
        "2026-02-25",
        [
          ["Cuong", ["Gonzalo", "Marko"]],
          ["Marko", ["Anja", "João"]],
          ["João", ["Pekka", "Vilhelm"]],
          ["Pekka", ["Cuong", "Sergio"]],
          ["Sergio", ["Anja", "João"]],
          ["Vilhelm", ["Gonzalo", "Pekka"]],
          ["Gonzalo", ["Marko", "Sergio"]],
          ["Anja", ["Cuong", "Vilhelm"]],
        ],
      ],
      [
        "2026-02-11",
        [
          ["Cuong", ["Gonzalo", "Vilhelm"]],
          ["Marko", ["Anja", "Sergio"]],
          ["João", ["Miia", "Pekka"]],
          ["Pekka", ["Cuong", "Miia"]],
          ["Sergio", ["Gonzalo", "Marko"]],
          ["Vilhelm", ["João", "Sergio"]],
          ["Gonzalo", ["Pekka", "Vilhelm"]],
          ["Anja", ["Cuong", "João"]],
        ],
      ],
      [
        "2026-01-28",
        [
          ["Cuong", ["Marko", "Vilhelm"]],
          ["Marko", ["Anja", "Gonzalo"]],
          ["João", ["Cuong", "Sergio"]],
          ["Pekka", ["Miia", "Vilhelm"]],
          ["Sergio", ["João", "Pekka"]],
          ["Vilhelm", ["Gonzalo", "Sergio"]],
          ["Gonzalo", ["Cuong", "Marko"]],
          ["Anja", ["João", "Pekka"]],
          ["Miia", ["Anja", "Vilhelm"]],
        ],
      ],
      [
        "2026-01-14",
        [
          ["Cuong", ["Gonzalo", "Sergio"]],
          ["Marko", ["Anja", "Vilhelm"]],
          ["João", ["Cuong", "Pekka"]],
          ["Pekka", ["Miia", "Sergio"]],
          ["Sergio", ["Marko", "Vilhelm"]],
          ["Vilhelm", ["Gonzalo", "João"]],
          ["Gonzalo", ["Cuong", "Pekka"]],
          ["Anja", ["João", "Marko"]],
          ["Miia", ["Anja", "Gonzalo"]],
        ],
      ],
      [
        "2025-12-31",
        [
          ["Cuong", ["Gonzalo", "Pekka"]],
          ["Marko", ["Anja", "Sergio"]],
          ["João", ["Miia", "Vilhelm"]],
          ["Pekka", ["Cuong", "Vilhelm"]],
          ["Sergio", ["João", "Marko"]],
          ["Vilhelm", ["Gonzalo", "Sergio"]],
          ["Gonzalo", ["Miia", "Pekka"]],
          ["Anja", ["Cuong", "João"]],
          ["Miia", ["Anja", "Marko"]],
        ],
      ],
      [
        "2025-12-17",
        [
          ["Cuong", ["Marko", "Vilhelm"]],
          ["Marko", ["Anja", "Sergio"]],
          ["João", ["Gonzalo", "Pekka"]],
          ["Pekka", ["Cuong", "Miia"]],
          ["Sergio", ["João", "Vilhelm"]],
          ["Vilhelm", ["Gonzalo", "Pekka"]],
          ["Gonzalo", ["Cuong", "Sergio"]],
          ["Anja", ["João", "Marko"]],
          ["Miia", ["Anja", "Vilhelm"]],
        ],
      ],
      [
        "2025-12-03",
        [
          ["Cuong", ["Gonzalo", "Vilhelm"]],
          ["Marko", ["Anja", "Pekka"]],
          ["João", ["Cuong", "Sergio"]],
          ["Pekka", ["Miia", "Vilhelm"]],
          ["Sergio", ["Gonzalo", "Marko"]],
          ["Vilhelm", ["João", "Sergio"]],
          ["Gonzalo", ["Cuong", "Pekka"]],
          ["Anja", ["João", "Marko"]],
          ["Miia", ["Anja", "Gonzalo"]],
        ],
      ],
      [
        "2025-11-19",
        [
          ["Cuong", ["Marko", "Sergio"]],
          ["Marko", ["Anja", "Vilhelm"]],
          ["João", ["Gonzalo", "Pekka"]],
          ["Pekka", ["Cuong", "Miia"]],
          ["Sergio", ["Gonzalo", "João"]],
          ["Vilhelm", ["Pekka", "Sergio"]],
          ["Gonzalo", ["Cuong", "Vilhelm"]],
          ["Anja", ["João", "Marko"]],
          ["Miia", ["Anja", "Gonzalo"]],
        ],
      ],
    ];

    // ── Past Rotation History (teams/Bug Sheriff mode) ─────────────────
    const teamRotations: [string, string[]][] = [
      ["2026-03-11", ["Cuong", "Gonzalo", "Vilhelm"]],
      ["2026-02-25", ["Cuong", "Pekka", "Sergio"]],
      ["2026-02-11", ["Gonzalo", "Miia", "Vilhelm"]],
      ["2026-01-28", ["Anja", "Pekka", "Sergio"]],
      ["2026-01-14", ["Cuong", "Marko", "Vilhelm"]],
      ["2025-12-31", ["Cuong", "Miia", "Pekka"]],
      ["2025-12-17", ["Gonzalo", "Sergio", "Vilhelm"]],
      ["2025-12-03", ["Anja", "Cuong", "Marko"]],
      ["2025-11-19", ["Gonzalo", "Pekka", "Vilhelm"]],
    ];

    // ── Create dev rotations ───────────────────────────────────────────
    for (const [dateStr, assignments] of devRotations) {
      await createRotation({
        teamId: team.id,
        date: new Date(dateStr),
        isManual: false,
        mode: "devs",
        assignments: assignments.map(([targetName, reviewerNames]) => ({
          targetType: "developer" as const,
          targetId: devByName[targetName].id,
          reviewerDeveloperIds: reviewerNames.map((n) => devByName[n].id),
        })),
      });
    }

    // ── Create team rotations ──────────────────────────────────────────
    for (const [dateStr, reviewerNames] of teamRotations) {
      await createRotation({
        teamId: team.id,
        date: new Date(dateStr),
        isManual: false,
        mode: "teams",
        assignments: [
          {
            targetType: "squad" as const,
            targetId: squad.id,
            reviewerDeveloperIds: reviewerNames.map((n) => devByName[n].id),
          },
        ],
      });
    }

    console.log("[seed] Done — 9 developers, 1 team, 1 squad, 18 rotations created.");
  });
});
