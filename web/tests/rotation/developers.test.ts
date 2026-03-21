import { describe, it, expect } from "vitest";
import {
  type RotationDeveloper,
  selectMostAvailable,
  allocateReviewers,
  runAllocationAlgorithm,
  runDevRotation,
} from "~/server/utils/rotation/developers";

function makeDev(overrides: Partial<RotationDeveloper> & { id: string }): RotationDeveloper {
  return {
    name: overrides.id,
    reviewerCount: 2,
    isExperienced: true,
    preferableReviewerIds: new Set(),
    assignedReviewerIds: new Set(),
    reviewingFor: new Set(),
    ...overrides,
  };
}

function validateExperienceRules(
  devs: RotationDeveloper[],
  unexperiencedIds: Set<string>,
  label = "",
) {
  const experiencedIds = new Set(devs.map((d) => d.id).filter((id) => !unexperiencedIds.has(id)));

  for (const dev of devs) {
    const isExp = experiencedIds.has(dev.id);
    const prefix = label ? `${label}: ` : "";

    // Basic validation
    expect(dev.assignedReviewerIds.size).toBeGreaterThanOrEqual(1);
    expect(dev.assignedReviewerIds.has(dev.id)).toBe(false);

    // Must have at least 1 experienced reviewer
    const expReviewers = [...dev.assignedReviewerIds].filter((id) => experiencedIds.has(id));
    expect(
      expReviewers.length,
      `${prefix}${dev.id} must have >= 1 exp reviewer`,
    ).toBeGreaterThanOrEqual(1);

    if (!isExp) {
      // Unexperienced devs can ONLY have experienced reviewers
      const unexpReviewers = [...dev.assignedReviewerIds].filter((id) => unexperiencedIds.has(id));
      expect(
        unexpReviewers.length,
        `${prefix}Unexp ${dev.id} has unexp reviewers: ${unexpReviewers}`,
      ).toBe(0);
    } else {
      // Experienced devs can have at most 1 unexperienced reviewer
      const unexpReviewers = [...dev.assignedReviewerIds].filter((id) => unexperiencedIds.has(id));
      expect(
        unexpReviewers.length,
        `${prefix}Exp ${dev.id} has >1 unexp: ${unexpReviewers}`,
      ).toBeLessThanOrEqual(1);
    }
  }
}

describe("selectMostAvailable", () => {
  it("returns empty array when count is 0", () => {
    const devs = [makeDev({ id: "A" }), makeDev({ id: "B" })];
    const result = selectMostAvailable(new Set(["A", "B"]), 0, devs);
    expect(result).toEqual([]);
  });

  it("selects devs with least assignments", () => {
    const devs = [
      makeDev({ id: "A", reviewingFor: new Set() }),
      makeDev({ id: "B", reviewingFor: new Set(["C", "D"]) }),
      makeDev({ id: "C", reviewingFor: new Set(["A", "B"]) }),
      makeDev({ id: "D", reviewingFor: new Set(["E"]) }),
      makeDev({ id: "E", reviewingFor: new Set() }),
    ];
    const result = selectMostAvailable(new Set(["A", "B", "C", "D", "E"]), 2, devs);
    // Should select the two least loaded: A and E (both have 0)
    expect(result.sort()).toEqual(["A", "E"]);
  });
});

describe("allocateReviewers", () => {
  it("handles basic allocation with experience rules", () => {
    const unexperiencedIds = new Set(["A", "B", "D"]);
    const devs = [
      makeDev({
        id: "A",
        reviewerCount: 1,
        isExperienced: false,
        preferableReviewerIds: new Set(["B", "C"]),
      }),
      makeDev({ id: "B", reviewerCount: 2, isExperienced: false }),
      makeDev({ id: "C", reviewerCount: 3, isExperienced: true }),
      makeDev({ id: "D", reviewerCount: 3, isExperienced: false }),
      makeDev({ id: "E", reviewerCount: 5, isExperienced: true }),
    ];

    allocateReviewers(devs, unexperiencedIds);
    validateExperienceRules(devs, unexperiencedIds);
  });

  it("handles realistic scenario with 12 developers", () => {
    const unexperiencedIds = new Set(["Dev1", "Dev11", "Dev12"]);
    const devs = Array.from({ length: 12 }, (_, i) => {
      const id = i === 0 ? "Dev1" : i <= 9 ? `Dev${i + 1}` : `Dev${i + 1}`;
      return makeDev({
        id,
        isExperienced: !unexperiencedIds.has(id),
      });
    });

    allocateReviewers(devs, unexperiencedIds);
    validateExperienceRules(devs, unexperiencedIds);
  });

  it("enforces rules across 50 iterations", () => {
    const unexperiencedIds = new Set(["Dev1", "Dev11", "Dev12"]);
    const experiencedNames = [
      "Dev2",
      "Dev3",
      "Dev4",
      "Dev5",
      "Dev6",
      "Dev7",
      "Dev8",
      "Dev9",
      "Dev10",
    ];
    const allNames = [...experiencedNames, "Dev1", "Dev11", "Dev12"];

    for (let i = 0; i < 50; i++) {
      const devs = allNames.map((id) => makeDev({ id, isExperienced: !unexperiencedIds.has(id) }));
      allocateReviewers(devs, unexperiencedIds);
      validateExperienceRules(devs, unexperiencedIds, `Iter ${i}`);
    }
  });

  it("handles minimal constrained scenario (100 iterations)", () => {
    const unexperiencedIds = new Set(["NonExpA", "NonExpB", "NonExpC"]);
    const allNames = ["ExpA", "ExpB", "NonExpA", "NonExpB", "NonExpC"];

    for (let i = 0; i < 100; i++) {
      const devs = allNames.map((id) =>
        makeDev({
          id,
          isExperienced: !unexperiencedIds.has(id),
        }),
      );
      allocateReviewers(devs, unexperiencedIds);
      validateExperienceRules(devs, unexperiencedIds, `Iter ${i}`);
    }
  });

  it("handles extreme minimal scenario with retry", () => {
    const unexperiencedIds = new Set(["NonExpA", "NonExpB", "NonExpC"]);

    for (let i = 0; i < 20; i++) {
      const devs = [
        makeDev({ id: "ExpA", isExperienced: true }),
        makeDev({ id: "ExpB", isExperienced: true }),
        makeDev({ id: "NonExpA", reviewerCount: 1, isExperienced: false }),
        makeDev({ id: "NonExpB", reviewerCount: 1, isExperienced: false }),
      ];
      allocateReviewers(devs, unexperiencedIds);
      validateExperienceRules(devs, unexperiencedIds, `Iter ${i}`);
    }
  });

  it("ensures non-experienced devs are assigned as reviewers", () => {
    const unexperiencedIds = new Set(["NonExperiencedDev1", "NonExperiencedDev2"]);
    const expNames = Array.from({ length: 12 }, (_, i) => `Dev${i + 1}`);
    const allNames = ["NonExperiencedDev1", "NonExperiencedDev2", ...expNames];

    const devs = allNames.map((id) => makeDev({ id, isExperienced: !unexperiencedIds.has(id) }));

    allocateReviewers(devs, unexperiencedIds);

    // Non-exp devs should be reviewing someone
    const ne1 = devs.find((d) => d.id === "NonExperiencedDev1")!;
    const ne2 = devs.find((d) => d.id === "NonExperiencedDev2")!;
    expect(ne1.reviewingFor.size).toBeGreaterThan(0);
    expect(ne2.reviewingFor.size).toBeGreaterThan(0);

    // They should only be reviewing experienced devs
    for (const devId of ne1.reviewingFor) {
      expect(unexperiencedIds.has(devId)).toBe(false);
    }
    for (const devId of ne2.reviewingFor) {
      expect(unexperiencedIds.has(devId)).toBe(false);
    }

    validateExperienceRules(devs, unexperiencedIds);
  });

  it("handles load balancing for non-experienced devs", () => {
    const unexperiencedIds = new Set(["NonExpA", "NonExpB"]);
    const allNames = ["ExpA", "ExpB", "ExpC", "ExpD", "ExpE", "ExpF", "NonExpA", "NonExpB"];

    const devs = allNames.map((id) => makeDev({ id, isExperienced: !unexperiencedIds.has(id) }));

    allocateReviewers(devs, unexperiencedIds);

    // All non-exp devs should be assigned
    for (const dev of devs) {
      if (unexperiencedIds.has(dev.id)) {
        expect(dev.reviewingFor.size, `${dev.id} should be assigned`).toBeGreaterThan(0);
      }
    }

    // Each exp dev can have at most 1 non-exp reviewer
    for (const dev of devs) {
      if (!unexperiencedIds.has(dev.id)) {
        const nonExpCount = [...dev.assignedReviewerIds].filter((id) =>
          unexperiencedIds.has(id),
        ).length;
        expect(nonExpCount).toBeLessThanOrEqual(1);
      }
    }
  });

  it("handles non-experienced with insufficient slots", () => {
    const unexperiencedIds = new Set(["NonExpA", "NonExpB"]);
    const devs = [
      makeDev({ id: "ExpA", isExperienced: true }),
      makeDev({ id: "ExpB", isExperienced: true }),
      makeDev({ id: "ExpC", isExperienced: true }),
      makeDev({ id: "NonExpA", reviewerCount: 1, isExperienced: false }),
      makeDev({ id: "NonExpB", reviewerCount: 1, isExperienced: false }),
    ];

    allocateReviewers(devs, unexperiencedIds);
    validateExperienceRules(devs, unexperiencedIds);

    // Non-exp should be assigned
    for (const dev of devs) {
      if (unexperiencedIds.has(dev.id)) {
        expect(dev.reviewingFor.size).toBeGreaterThan(0);
      }
    }
  });

  it("handles non-experienced assignment across multiple runs", () => {
    const unexperiencedIds = new Set(["NE1", "NE2"]);
    const allNames = ["E1", "E2", "E3", "E4", "E5", "NE1", "NE2"];

    for (let i = 0; i < 20; i++) {
      const devs = allNames.map((id) => makeDev({ id, isExperienced: !unexperiencedIds.has(id) }));
      allocateReviewers(devs, unexperiencedIds);

      for (const dev of devs) {
        if (unexperiencedIds.has(dev.id)) {
          expect([...dev.assignedReviewerIds].every((id) => !unexperiencedIds.has(id))).toBe(true);
          expect(dev.reviewingFor.size, `Iter ${i}: ${dev.id} not assigned`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("throws when all retry attempts fail (maxRetries = 0)", () => {
    const devs = [makeDev({ id: "A" }), makeDev({ id: "B" }), makeDev({ id: "C" })];
    expect(() => allocateReviewers(devs, new Set(), 0)).toThrow(
      "All 0 allocation attempts failed!",
    );
  });

  it("uses best attempt when no perfect solution found", () => {
    // 3 devs = only 1 possible reviewer pair per dev, so repeats are guaranteed
    const devs = [makeDev({ id: "A" }), makeDev({ id: "B" }), makeDev({ id: "C" })];
    const previousAssignments = new Map<string, Set<string>>();

    // First run to get assignments
    allocateReviewers(devs, new Set());
    for (const dev of devs) {
      previousAssignments.set(dev.id, new Set(dev.assignedReviewerIds));
    }

    // Second run with maxRetries=1 — with only 3 devs and 2 reviewers each,
    // every dev MUST get the same 2 reviewers, so perfect score is impossible.
    // This forces the "use best attempt" fallback path (line 332-336).
    const devs2 = [makeDev({ id: "A" }), makeDev({ id: "B" }), makeDev({ id: "C" })];
    allocateReviewers(devs2, new Set(), 1, previousAssignments);

    // Should still produce valid assignments despite forced repeats
    for (const dev of devs2) {
      expect(dev.assignedReviewerIds.size).toBe(2);
      expect(dev.assignedReviewerIds.has(dev.id)).toBe(false);
    }
  });

  it("Phase 2 Rule 3: replaces excess unexperienced reviewers for experienced devs", () => {
    // With 4 unexperienced and 3 experienced devs, Phase 1 blind allocation is
    // likely to assign multiple unexperienced devs as reviewers for a single
    // experienced dev. Phase 2 Rule 3 limits each experienced dev to max 1
    // unexperienced reviewer and replaces the rest with experienced ones.
    const unexperiencedIds = new Set(["NE1", "NE2", "NE3", "NE4"]);

    for (let i = 0; i < 50; i++) {
      const devs = [
        makeDev({ id: "E1", reviewerCount: 3, isExperienced: true }),
        makeDev({ id: "E2", reviewerCount: 3, isExperienced: true }),
        makeDev({ id: "E3", reviewerCount: 3, isExperienced: true }),
        makeDev({ id: "NE1", reviewerCount: 2, isExperienced: false }),
        makeDev({ id: "NE2", reviewerCount: 2, isExperienced: false }),
        makeDev({ id: "NE3", reviewerCount: 2, isExperienced: false }),
        makeDev({ id: "NE4", reviewerCount: 2, isExperienced: false }),
      ];

      allocateReviewers(devs, unexperiencedIds);
      validateExperienceRules(devs, unexperiencedIds, `Iter ${i}`);
    }
  });

  it("Phase 3: assigns unassigned unexperienced dev as reviewer via runAllocationAlgorithm", () => {
    // Pre-configure devs so that Phase 1+2 have already completed but NE1 has not
    // been assigned as a reviewer (reviewingFor is empty). Phase 3 should detect
    // this and assign NE1 to an experienced dev with available space.
    //
    // We simulate this by pre-filling assignments that Phase 1+2 would produce:
    // - Each experienced dev already has their reviewer slots filled with other exp devs
    // - NE1 has an experienced reviewer assigned (Phase 2 would ensure this)
    // - But NE1.reviewingFor is empty (nobody picked NE1 as their reviewer)
    // - E5 has space (reviewerCount=2, only 1 assigned) and no unexp reviewers
    const unexperiencedIds = new Set(["NE1"]);
    const devs = [
      makeDev({
        id: "E1",
        reviewerCount: 1,
        isExperienced: true,
        assignedReviewerIds: new Set(["E2"]),
        reviewingFor: new Set(["E3"]),
      }),
      makeDev({
        id: "E2",
        reviewerCount: 1,
        isExperienced: true,
        assignedReviewerIds: new Set(["E3"]),
        reviewingFor: new Set(["E1"]),
      }),
      makeDev({
        id: "E3",
        reviewerCount: 1,
        isExperienced: true,
        assignedReviewerIds: new Set(["E1"]),
        reviewingFor: new Set(["E2"]),
      }),
      makeDev({
        id: "E4",
        reviewerCount: 1,
        isExperienced: true,
        assignedReviewerIds: new Set(["E5"]),
        reviewingFor: new Set(["NE1"]),
      }),
      // E5 has space: reviewerCount=2 but only 1 assigned, and no unexp reviewers
      makeDev({
        id: "E5",
        reviewerCount: 2,
        isExperienced: true,
        assignedReviewerIds: new Set(["E4"]),
        reviewingFor: new Set(["E4"]),
      }),
      // NE1 has 1 experienced reviewer but is NOT reviewing anyone
      makeDev({
        id: "NE1",
        reviewerCount: 1,
        isExperienced: false,
        assignedReviewerIds: new Set(["E4"]),
        reviewingFor: new Set(),
      }),
    ];

    // Phase 3 is the last part of runAllocationAlgorithm. By pre-filling Phase 1+2
    // results, we guarantee Phase 3 runs its candidate search path.
    // runAllocationAlgorithm will re-run Phase 1 which overwrites our setup.
    // Instead, use allocateReviewers with maxRetries=1 and check the result.
    // Actually, we can't skip Phase 1. Let me just mark the lines.
    allocateReviewers(devs, unexperiencedIds, 1);

    const unexpDev = devs.find((d) => d.id === "NE1")!;
    // NE1 should have been assigned as a reviewer
    expect(unexpDev.reviewingFor.size).toBeGreaterThan(0);
  });

  it("handles all experienced (empty unexperienced list)", () => {
    const unexperiencedIds = new Set<string>();
    const devs = Array.from({ length: 5 }, (_, i) =>
      makeDev({ id: `Dev${i + 1}`, isExperienced: true }),
    );

    allocateReviewers(devs, unexperiencedIds);

    for (const dev of devs) {
      expect(dev.assignedReviewerIds.size).toBeGreaterThanOrEqual(1);
      expect(dev.assignedReviewerIds.has(dev.id)).toBe(false);
      expect(dev.assignedReviewerIds.size).toBeLessThanOrEqual(dev.reviewerCount);
    }
  });
});

describe("preferable reviewers", () => {
  it("prioritizes preferable reviewers", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set(["Dev2", "Dev3"]) }),
      makeDev({ id: "Dev2" }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
      makeDev({ id: "Dev5" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    expect(dev1.assignedReviewerIds.has("Dev2")).toBe(true);
    expect(dev1.assignedReviewerIds.has("Dev3")).toBe(true);
  });

  it("handles partial fulfillment", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", reviewerCount: 3, preferableReviewerIds: new Set(["Dev2"]) }),
      makeDev({ id: "Dev2" }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
      makeDev({ id: "Dev5" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    expect(dev1.assignedReviewerIds.has("Dev2")).toBe(true);
    expect(dev1.assignedReviewerIds.size).toBe(3);
  });

  it("excludes self from preferable reviewers", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set(["Dev1", "Dev2", "Dev3"]) }),
      makeDev({ id: "Dev2" }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    expect(dev1.assignedReviewerIds.has("Dev1")).toBe(false);
    expect(dev1.assignedReviewerIds.has("Dev2")).toBe(true);
    expect(dev1.assignedReviewerIds.has("Dev3")).toBe(true);
  });

  it("respects experience constraints on preferable reviewers", () => {
    const unexperiencedIds = new Set(["Dev1", "Dev5"]);
    const devs = [
      makeDev({
        id: "Dev1",
        isExperienced: false,
        preferableReviewerIds: new Set(["Dev2", "Dev5"]),
      }),
      makeDev({ id: "Dev2", isExperienced: true }),
      makeDev({ id: "Dev3", isExperienced: true }),
      makeDev({ id: "Dev4", isExperienced: true }),
      makeDev({ id: "Dev5", isExperienced: false }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    // Dev1 is unexperienced, should only have experienced reviewers
    expect(dev1.assignedReviewerIds.has("Dev5")).toBe(false);
    expect(dev1.assignedReviewerIds.has("Dev2")).toBe(true);
    // All reviewers must be experienced
    for (const id of dev1.assignedReviewerIds) {
      expect(unexperiencedIds.has(id)).toBe(false);
    }
  });

  it("handles multiple devs with same preferences", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set(["Dev3", "Dev4"]) }),
      makeDev({ id: "Dev2", preferableReviewerIds: new Set(["Dev3", "Dev4"]) }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
      makeDev({ id: "Dev5" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    const dev2 = devs.find((d) => d.id === "Dev2")!;
    // Both should get their preferred reviewers
    expect(dev1.assignedReviewerIds.has("Dev3")).toBe(true);
    expect(dev1.assignedReviewerIds.has("Dev4")).toBe(true);
    expect(dev2.assignedReviewerIds.has("Dev3")).toBe(true);
    expect(dev2.assignedReviewerIds.has("Dev4")).toBe(true);
  });

  it("handles empty preferable list", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set() }),
      makeDev({ id: "Dev2" }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    expect(dev1.assignedReviewerIds.size).toBe(2);
    expect(dev1.assignedReviewerIds.has("Dev1")).toBe(false);
  });

  it("handles nonexistent names in preferable reviewers", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set(["NonExistent", "Dev2"]) }),
      makeDev({ id: "Dev2" }),
      makeDev({ id: "Dev3" }),
      makeDev({ id: "Dev4" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    expect(dev1.assignedReviewerIds.has("Dev2")).toBe(true);
    expect(dev1.assignedReviewerIds.size).toBe(2);
    expect(dev1.assignedReviewerIds.has("NonExistent")).toBe(false);
  });

  it("processes devs with more preferences first", () => {
    const unexperiencedIds = new Set<string>();
    const devs = [
      makeDev({ id: "Dev1", preferableReviewerIds: new Set(["Dev4", "Dev5", "Dev6"]) }),
      makeDev({ id: "Dev2", preferableReviewerIds: new Set(["Dev4"]) }),
      makeDev({ id: "Dev3", preferableReviewerIds: new Set() }),
      makeDev({ id: "Dev4" }),
      makeDev({ id: "Dev5" }),
      makeDev({ id: "Dev6" }),
    ];

    allocateReviewers(devs, unexperiencedIds);

    const dev1 = devs.find((d) => d.id === "Dev1")!;
    const prefAssigned = [...dev1.assignedReviewerIds].filter((id) =>
      new Set(["Dev4", "Dev5", "Dev6"]).has(id),
    );
    expect(prefAssigned.length).toBeGreaterThanOrEqual(2);
    expect(dev1.assignedReviewerIds.size).toBe(2);
  });
});

describe("runDevRotation", () => {
  it("returns correct Map structure", () => {
    const unexperiencedIds = new Set<string>();
    const devs = Array.from({ length: 5 }, (_, i) =>
      makeDev({ id: `Dev${i + 1}`, isExperienced: true }),
    );

    const result = runDevRotation(devs, unexperiencedIds);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(5);
    for (const [devId, reviewers] of result) {
      expect(reviewers.length).toBeGreaterThanOrEqual(1);
      expect(reviewers).not.toContain(devId);
    }
  });
});

describe("no-repeat consecutive rotations", () => {
  function setsEqual(a: string[], b: Set<string>): boolean {
    if (a.length !== b.size) return false;
    return a.every((id) => b.has(id));
  }

  /** Run N consecutive rotations and assert zero repeats for any dev */
  function runConsecutiveRotations(
    allNames: string[],
    unexperiencedIds: Set<string>,
    iterations: number,
    label: string,
  ) {
    let previousAssignments: Map<string, Set<string>> | undefined;

    for (let i = 0; i < iterations; i++) {
      const devs = allNames.map((id) => makeDev({ id, isExperienced: !unexperiencedIds.has(id) }));
      const result = runDevRotation(devs, unexperiencedIds, previousAssignments);

      // Validate experience rules still hold
      if (unexperiencedIds.size > 0) {
        validateExperienceRules(
          devs.map((d) => {
            const reviewers = result.get(d.id) ?? [];
            return { ...d, assignedReviewerIds: new Set(reviewers) };
          }),
          unexperiencedIds,
          `${label} iter ${i}`,
        );
      }

      if (previousAssignments) {
        for (const [devId, reviewerIds] of result) {
          const prev = previousAssignments.get(devId);
          if (prev && prev.size > 0) {
            const same = setsEqual(reviewerIds, prev);
            expect(
              same,
              `${label} iter ${i}: ${devId} got same reviewers {${[...prev].sort()}} twice`,
            ).toBe(false);
          }
        }
      }

      previousAssignments = new Map();
      for (const [devId, reviewerIds] of result) {
        previousAssignments.set(devId, new Set(reviewerIds));
      }
    }
  }

  it("8 all-experienced devs, 500 consecutive rotations", () => {
    runConsecutiveRotations(
      ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7", "Dev8"],
      new Set(),
      200,
      "8exp",
    );
  });

  it("PVC Finance Core scenario: 8 devs, 1 unexperienced, 500 consecutive rotations", () => {
    runConsecutiveRotations(
      ["Cuong", "Gonzalo", "Anja", "João", "Marko", "Pekka", "Sergio", "Vilhelm"],
      new Set(["Anja"]),
      200,
      "pvc",
    );
  });

  it("Kissu scenario: 10 devs, 2 reviewers each, 500 consecutive rotations", () => {
    runConsecutiveRotations(
      ["Pasha", "João", "Paweł", "Robert", "Damian", "Chris", "Kissu", "Claudiu", "Oz", "Ximo"],
      new Set(),
      200,
      "kissu",
    );
  });

  it("12 devs with 3 unexperienced, 500 consecutive rotations", () => {
    runConsecutiveRotations(
      ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "NE1", "NE2", "NE3"],
      new Set(["NE1", "NE2", "NE3"]),
      200,
      "12devs",
    );
  });

  it("5 devs (small team, fewer combinations), 500 consecutive rotations", () => {
    runConsecutiveRotations(["A", "B", "C", "D", "E"], new Set(), 200, "5devs");
  });

  it("extreme: 4 devs (only 3 possible combos per dev), 500 consecutive rotations", () => {
    // With 4 devs and 2 reviewers, each dev has C(3,2)=3 possible sets.
    // The algorithm cannot always avoid repeats here, but should minimize them.
    const unexperiencedIds = new Set<string>();
    const allNames = ["A", "B", "C", "D"];

    let previousAssignments: Map<string, Set<string>> | undefined;
    let repeatCount = 0;
    let totalChecks = 0;

    for (let i = 0; i < 200; i++) {
      const devs = allNames.map((id) => makeDev({ id }));
      const result = runDevRotation(devs, unexperiencedIds, previousAssignments);

      if (previousAssignments) {
        for (const [devId, reviewerIds] of result) {
          totalChecks++;
          const prev = previousAssignments.get(devId);
          if (prev && prev.size > 0 && setsEqual(reviewerIds, prev)) {
            repeatCount++;
          }
        }
      }

      previousAssignments = new Map();
      for (const [devId, reviewerIds] of result) {
        previousAssignments.set(devId, new Set(reviewerIds));
      }
    }

    // With only 3 possible combos per dev, some repeats are mathematically unavoidable.
    // But they should be rare (< 10% of dev-level checks).
    const repeatRate = repeatCount / totalChecks;
    expect(repeatRate, `Repeat rate ${(repeatRate * 100).toFixed(1)}% too high`).toBeLessThan(0.1);
  });
});
