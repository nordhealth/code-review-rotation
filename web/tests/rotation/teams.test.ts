import { describe, it, expect } from "vitest";
import {
  runTeamRotation,
  type TeamRotationContext,
  type RotationSquad,
} from "~/server/utils/rotation/teams";

function makeContext(overrides: Partial<TeamRotationContext> = {}): TeamRotationContext {
  return {
    squads: [],
    allDeveloperIds: ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6"],
    experiencedDeveloperIds: ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6"],
    ...overrides,
  };
}

describe("runTeamRotation", () => {
  it("assigns experienced devs when squad has no members", () => {
    const context = makeContext({
      squads: [{ id: "squad1", name: "Team8", reviewerCount: 2, memberIds: [] }],
    });

    const result = runTeamRotation(context);

    expect(result.get("squad1")!.length).toBe(2);
    // All reviewers should be from experienced pool
    for (const id of result.get("squad1")!) {
      expect(context.experiencedDeveloperIds).toContain(id);
    }
  });

  it("uses all members + fills when squad has fewer members than needed", () => {
    const context = makeContext({
      squads: [{ id: "squad1", name: "Team2", reviewerCount: 2, memberIds: ["Dev7"] }],
      allDeveloperIds: ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7"],
    });

    const result = runTeamRotation(context);
    const reviewers = result.get("squad1")!;

    expect(reviewers.length).toBe(2);
    expect(reviewers).toContain("Dev7");
    // Other reviewer should be experienced and not from team
    const otherReviewers = reviewers.filter((id) => id !== "Dev7");
    expect(otherReviewers.length).toBe(1);
    expect(context.experiencedDeveloperIds).toContain(otherReviewers[0]);
  });

  it("selects from members when squad has enough", () => {
    const context = makeContext({
      squads: [
        { id: "squad1", name: "Team1", reviewerCount: 2, memberIds: ["Dev5", "Dev2", "Dev10"] },
      ],
      allDeveloperIds: ["Dev2", "Dev5", "Dev10"],
    });

    const result = runTeamRotation(context);
    const reviewers = result.get("squad1")!;

    expect(reviewers.length).toBe(2);
    // All reviewers should be from team members
    for (const id of reviewers) {
      expect(["Dev5", "Dev2", "Dev10"]).toContain(id);
    }
  });

  it("load-balances across multiple squads", () => {
    const context = makeContext({
      squads: [
        { id: "squad1", name: "Team3", reviewerCount: 2, memberIds: [] },
        { id: "squad2", name: "Team4", reviewerCount: 2, memberIds: [] },
        { id: "squad3", name: "Team5", reviewerCount: 2, memberIds: [] },
      ],
    });

    const result = runTeamRotation(context);

    // Count assignments per developer
    const assignmentCount: Record<string, number> = {};
    for (const [, reviewers] of result) {
      for (const id of reviewers) {
        assignmentCount[id] = (assignmentCount[id] ?? 0) + 1;
      }
    }

    // 3 squads × 2 reviewers = 6 total slots, 5 experienced devs
    // No dev should have more than 2 assignments (6/5 = 1.2, round up)
    for (const count of Object.values(assignmentCount)) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("handles different reviewer numbers per squad", () => {
    const context = makeContext({
      squads: [
        { id: "squad1", name: "Team6", reviewerCount: 1, memberIds: [] },
        { id: "squad2", name: "Team7", reviewerCount: 3, memberIds: [] },
      ],
    });

    const result = runTeamRotation(context);

    expect(result.get("squad1")!.length).toBe(1);
    expect(result.get("squad2")!.length).toBe(3);
  });

  it("avoids repeating same reviewer set across consecutive rotations (100 iterations)", () => {
    const members = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7"];

    let previousAssignments: Map<string, Set<string>> | undefined;

    for (let i = 0; i < 100; i++) {
      const context = makeContext({
        squads: [{ id: "squad1", name: "BugSheriff", reviewerCount: 3, memberIds: members }],
        allDeveloperIds: members,
        experiencedDeveloperIds: members,
        previousAssignments,
      });

      const result = runTeamRotation(context);
      const reviewers = result.get("squad1")!;

      if (previousAssignments) {
        const prev = previousAssignments.get("squad1")!;
        const current = new Set(reviewers);
        const same = current.size === prev.size && [...current].every((id) => prev.has(id));
        expect(same, `Iter ${i}: squad got same reviewers ${[...prev].sort()} twice`).toBe(false);
      }

      previousAssignments = new Map();
      previousAssignments.set("squad1", new Set(reviewers));
    }
  });

  it("avoids repeats with multiple squads (100 iterations)", () => {
    const allDevs = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7", "Dev8"];

    let previousAssignments: Map<string, Set<string>> | undefined;

    for (let i = 0; i < 100; i++) {
      const context = makeContext({
        squads: [
          { id: "squad1", name: "Squad1", reviewerCount: 2, memberIds: [] },
          { id: "squad2", name: "Squad2", reviewerCount: 3, memberIds: allDevs.slice(0, 5) },
        ],
        allDeveloperIds: allDevs,
        experiencedDeveloperIds: allDevs,
        previousAssignments,
      });

      const result = runTeamRotation(context);

      if (previousAssignments) {
        for (const [squadId, reviewerIds] of result) {
          const prev = previousAssignments.get(squadId);
          if (prev && prev.size > 0) {
            const current = new Set(reviewerIds);
            const same = current.size === prev.size && [...current].every((id) => prev.has(id));
            expect(same, `Iter ${i}: ${squadId} got same reviewers twice`).toBe(false);
          }
        }
      }

      previousAssignments = new Map();
      for (const [squadId, reviewerIds] of result) {
        previousAssignments.set(squadId, new Set(reviewerIds));
      }
    }
  });

  it("cooldown: excludes previous reviewers when members >= 2 * reviewerCount (200 iterations)", () => {
    // Bug Sheriff scenario: 7 members, 3 reviewers → 7 >= 6, cooldown applies
    // Previous reviewers must have ZERO overlap with current reviewers
    const members = ["Cuong", "Marko", "Anja", "Pekka", "Sergio", "Vilhelm", "Gonzalo"];

    let previousAssignments: Map<string, Set<string>> | undefined;

    for (let i = 0; i < 200; i++) {
      const context = makeContext({
        squads: [{ id: "squad1", name: "BugSheriff", reviewerCount: 3, memberIds: members }],
        allDeveloperIds: members,
        experiencedDeveloperIds: members,
        previousAssignments,
      });

      const result = runTeamRotation(context);
      const reviewers = result.get("squad1")!;
      const currentSet = new Set(reviewers);

      expect(reviewers.length).toBe(3);

      if (previousAssignments) {
        const prev = previousAssignments.get("squad1")!;
        // With cooldown: ZERO overlap between previous and current
        const overlap = [...currentSet].filter((id) => prev.has(id));
        expect(
          overlap.length,
          `Iter ${i}: overlap ${overlap} between prev ${[...prev].sort()} and current ${[...currentSet].sort()}`,
        ).toBe(0);
      }

      previousAssignments = new Map();
      previousAssignments.set("squad1", currentSet);
    }
  });

  it("handles previousAssignments with empty set for a squad", () => {
    const members = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5"];
    const previous = new Map([["squad1", new Set<string>()]]);

    const context = makeContext({
      squads: [{ id: "squad1", name: "Squad1", reviewerCount: 2, memberIds: members }],
      allDeveloperIds: members,
      experiencedDeveloperIds: members,
      previousAssignments: previous,
    });

    const result = runTeamRotation(context);
    expect(result.get("squad1")!.length).toBe(2);
  });

  it("cooldown does NOT apply when members < 2 * reviewerCount", () => {
    // 5 members, 3 reviewers → 5 < 6, cooldown does NOT apply
    // Some overlap is acceptable (and unavoidable with only 2 non-previous candidates)
    const members = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5"];
    const previous = new Map([["squad1", new Set(["Dev1", "Dev2", "Dev3"])]]);

    const context = makeContext({
      squads: [{ id: "squad1", name: "Squad1", reviewerCount: 3, memberIds: members }],
      allDeveloperIds: members,
      experiencedDeveloperIds: members,
      previousAssignments: previous,
    });

    const result = runTeamRotation(context);
    const reviewers = result.get("squad1")!;

    // Should still select 3 reviewers (algorithm works, just no cooldown exclusion)
    expect(reviewers.length).toBe(3);
  });

  it("cooldown: tracks fair distribution over many rotations (200 iterations)", () => {
    // With 7 members, 3 reviewers, and cooldown, each member should appear roughly equally
    const members = ["Cuong", "Marko", "Anja", "Pekka", "Sergio", "Vilhelm", "Gonzalo"];
    const frequency: Record<string, number> = {};
    for (const m of members) frequency[m] = 0;

    let previousAssignments: Map<string, Set<string>> | undefined;

    for (let i = 0; i < 200; i++) {
      const context = makeContext({
        squads: [{ id: "squad1", name: "BugSheriff", reviewerCount: 3, memberIds: members }],
        allDeveloperIds: members,
        experiencedDeveloperIds: members,
        previousAssignments,
      });

      const result = runTeamRotation(context);
      const reviewers = result.get("squad1")!;

      for (const id of reviewers) {
        frequency[id]++;
      }

      previousAssignments = new Map();
      previousAssignments.set("squad1", new Set(reviewers));
    }

    // 200 rotations × 3 slots = 600 total assignments / 7 members ≈ 85.7 each
    // With cooldown enforcing fair rotation, no one should exceed 50% more than average
    const avg = 600 / 7;
    for (const [name, count] of Object.entries(frequency)) {
      expect(
        count,
        `${name} appeared ${count} times (avg ${avg.toFixed(1)}), too skewed`,
      ).toBeLessThan(avg * 1.5);
      expect(
        count,
        `${name} appeared ${count} times (avg ${avg.toFixed(1)}), too low`,
      ).toBeGreaterThan(avg * 0.5);
    }
  });
});
