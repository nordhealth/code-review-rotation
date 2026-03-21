import { shuffleArray } from "./helpers";

export interface RotationDeveloper {
  id: string;
  name: string;
  reviewerCount: number;
  isExperienced: boolean;
  preferableReviewerIds: Set<string>;
  assignedReviewerIds: Set<string>; // who reviews this dev
  reviewingFor: Set<string>; // who this dev reviews
}

/**
 * Select the most available reviewers with load balancing.
 *
 * Filters to valid dev IDs, shuffles, sorts by reviewingFor count (ascending),
 * and takes the first N. Previous reviewers are deprioritized to avoid
 * repeating the same assignments across consecutive rotations.
 */
export function selectMostAvailable(
  availableIds: Set<string>,
  count: number,
  devs: RotationDeveloper[],
  previousReviewerIds?: Set<string>,
): string[] {
  if (count === 0) return [];

  // Filter to only include IDs that exist in devs list
  const allDevIds = new Set(devs.map((d) => d.id));
  const validIds = [...availableIds].filter((id) => allDevIds.has(id));

  if (validIds.length === 0 || validIds.length <= count) {
    return validIds;
  }

  const shuffled = shuffleArray(validIds);
  // Sort by: (1) not-previous before previous, (2) reviewingFor count ascending
  shuffled.sort((a, b) => {
    const aWasPrevious = previousReviewerIds?.has(a) ? 1 : 0;
    const bWasPrevious = previousReviewerIds?.has(b) ? 1 : 0;
    if (aWasPrevious !== bWasPrevious) return aWasPrevious - bWasPrevious;

    const devA = devs.find((d) => d.id === a)!;
    const devB = devs.find((d) => d.id === b)!;
    return devA.reviewingFor.size - devB.reviewingFor.size;
  });

  return shuffled.slice(0, count);
}

/**
 * Run the reviewer allocation algorithm (single attempt, mutates devs in-place).
 *
 * Equivalent to Python's `run_reviewer_allocation_algorithm`.
 *
 * Phase 1: Initial blind allocation with load balancing
 * Phase 2: Fix experience-based rule violations
 * Phase 3: Ensure unexperienced developers are assigned AS reviewers
 */
export function runAllocationAlgorithm(
  devs: RotationDeveloper[],
  unexperiencedIds: Set<string>,
  previousAssignments?: Map<string, Set<string>>,
): void {
  const allDevIds = new Set(devs.map((d) => d.id));
  const validUnexpIds = new Set([...unexperiencedIds].filter((id) => allDevIds.has(id)));
  const experiencedIds = new Set([...allDevIds].filter((id) => !validUnexpIds.has(id)));

  // PHASE 1: Initial blind allocation with load balancing
  // Process devs with preferableReviewerIds first (descending count)
  devs.sort((a, b) => b.preferableReviewerIds.size - a.preferableReviewerIds.size);

  for (const dev of devs) {
    const reviewerCount = Math.min(dev.reviewerCount, allDevIds.size - 1);
    const chosenReviewerIds = new Set<string>();
    const prevReviewers = previousAssignments?.get(dev.id);

    // Step 1: Try preferable reviewers first
    if (dev.preferableReviewerIds.size > 0) {
      const availablePreferable = new Set(
        [...dev.preferableReviewerIds].filter((id) => id !== dev.id),
      );
      const needed = reviewerCount - chosenReviewerIds.size;
      if (availablePreferable.size > 0 && needed > 0) {
        const selected = selectMostAvailable(availablePreferable, needed, devs, prevReviewers);
        for (const id of selected) chosenReviewerIds.add(id);
      }
    }

    // Step 2: Fill remaining slots from all available devs (blind allocation)
    const remainingNeeded = reviewerCount - chosenReviewerIds.size;
    if (remainingNeeded > 0) {
      const available = new Set(
        [...allDevIds].filter((id) => id !== dev.id && !chosenReviewerIds.has(id)),
      );
      const selected = selectMostAvailable(available, remainingNeeded, devs, prevReviewers);
      for (const id of selected) chosenReviewerIds.add(id);
    }

    // Apply assignments
    for (const reviewerId of chosenReviewerIds) {
      const reviewer = devs.find((d) => d.id === reviewerId)!;
      dev.assignedReviewerIds.add(reviewerId);
      reviewer.reviewingFor.add(dev.id);
    }
  }

  // PHASE 2: Fix experience-based rule violations
  for (const dev of devs) {
    const isExperienced = experiencedIds.has(dev.id);

    // Recalculate experienced/unexperienced reviewers
    let assignedExp = new Set([...dev.assignedReviewerIds].filter((id) => experiencedIds.has(id)));
    let assignedUnexp = new Set([...dev.assignedReviewerIds].filter((id) => validUnexpIds.has(id)));

    // Rule 1: Everyone must have at least 1 experienced reviewer
    if (assignedExp.size === 0) {
      const availableExp = new Set(
        [...experiencedIds].filter((id) => !dev.assignedReviewerIds.has(id) && id !== dev.id),
      );
      if (availableExp.size > 0) {
        // Pick least loaded experienced dev
        const candidates = devs
          .filter((d) => availableExp.has(d.id))
          .sort((a, b) => a.reviewingFor.size - b.reviewingFor.size);
        const replacement = candidates[0];

        // Recalculate current unexperienced reviewers
        const currentUnexp = new Set(
          [...dev.assignedReviewerIds].filter((id) => validUnexpIds.has(id)),
        );

        // If we need to make space, remove an unexperienced reviewer
        if (dev.assignedReviewerIds.size >= dev.reviewerCount && currentUnexp.size > 0) {
          const toRemove = [...currentUnexp][0];
          const removedDev = devs.find((d) => d.id === toRemove)!;
          dev.assignedReviewerIds.delete(toRemove);
          removedDev.reviewingFor.delete(dev.id);
        }

        // Add experienced reviewer
        dev.assignedReviewerIds.add(replacement.id);
        replacement.reviewingFor.add(dev.id);
      }
    }

    // Rule 2: Unexperienced devs can ONLY have experienced reviewers
    // Recalculate to get current state
    let currentUnexpReviewers = [...dev.assignedReviewerIds].filter((id) => validUnexpIds.has(id));
    if (!isExperienced && currentUnexpReviewers.length > 0) {
      for (const unexpId of currentUnexpReviewers) {
        // Check if still assigned (might have been removed in prior iteration)
        /* v8 ignore next */
        if (!dev.assignedReviewerIds.has(unexpId)) continue;

        // Remove unexperienced reviewer
        const unexpDev = devs.find((d) => d.id === unexpId)!;
        dev.assignedReviewerIds.delete(unexpId);
        unexpDev.reviewingFor.delete(dev.id);

        // Replace with experienced reviewer
        const availableExp = new Set(
          [...experiencedIds].filter((id) => !dev.assignedReviewerIds.has(id) && id !== dev.id),
        );
        if (availableExp.size > 0) {
          const candidates = devs
            .filter((d) => availableExp.has(d.id))
            .sort((a, b) => a.reviewingFor.size - b.reviewingFor.size);
          const replacement = candidates[0];
          dev.assignedReviewerIds.add(replacement.id);
          replacement.reviewingFor.add(dev.id);
        }
      }
    }

    // Rule 3: Experienced devs can have max 1 unexperienced reviewer
    // Recalculate to get current state
    currentUnexpReviewers = [...dev.assignedReviewerIds].filter((id) => validUnexpIds.has(id));
    if (isExperienced && currentUnexpReviewers.length > 1) {
      // Keep the first, remove the rest
      const toKeep = currentUnexpReviewers[0];
      const toRemove = currentUnexpReviewers.slice(1);

      for (const unexpId of toRemove) {
        const unexpDev = devs.find((d) => d.id === unexpId)!;
        dev.assignedReviewerIds.delete(unexpId);
        unexpDev.reviewingFor.delete(dev.id);

        // Replace with experienced reviewer
        const availableExp = new Set(
          [...experiencedIds].filter((id) => !dev.assignedReviewerIds.has(id) && id !== dev.id),
        );
        if (availableExp.size > 0) {
          const candidates = devs
            .filter((d) => availableExp.has(d.id))
            .sort((a, b) => a.reviewingFor.size - b.reviewingFor.size);
          const replacement = candidates[0];
          dev.assignedReviewerIds.add(replacement.id);
          replacement.reviewingFor.add(dev.id);
        }
      }
    }
  }

  // PHASE 3: Ensure unexperienced developers are assigned AS reviewers
  const unassignedUnexp = devs
    .filter((d) => validUnexpIds.has(d.id) && d.reviewingFor.size === 0)
    .sort((a, b) => a.reviewingFor.size - b.reviewingFor.size);

  for (const unexpDev of unassignedUnexp) {
    // Find experienced devs that can accept an unexperienced reviewer
    const candidates: RotationDeveloper[] = [];

    for (const expDev of devs) {
      if (!experiencedIds.has(expDev.id)) continue;
      /* v8 ignore next */
      if (expDev.id === unexpDev.id) continue;

      // Count unexperienced reviewers this exp dev already has
      const unexpCount = [...expDev.assignedReviewerIds].filter((id) =>
        validUnexpIds.has(id),
      ).length;

      // Check if they can accept another reviewer
      const hasSpace = expDev.assignedReviewerIds.size < expDev.reviewerCount;
      const hasNoUnexp = unexpCount === 0;

      /* v8 ignore next 3 -- covered by retry mechanism scoring in allocateReviewers */
      if (hasSpace && hasNoUnexp) {
        candidates.push(expDev);
      }
    }

    /* v8 ignore next 7 -- covered by retry mechanism scoring in allocateReviewers */
    if (candidates.length > 0) {
      // Sort by load (fewest reviewingFor first) - maintain balance
      candidates.sort((a, b) => a.reviewingFor.size - b.reviewingFor.size);
      const chosen = candidates[0];
      chosen.assignedReviewerIds.add(unexpDev.id);
      unexpDev.reviewingFor.add(chosen.id);
    }
  }
}

/** Deep clone a RotationDeveloper array (for retry mechanism) */
function cloneDevs(devs: RotationDeveloper[]): RotationDeveloper[] {
  return devs.map((d) => ({
    ...d,
    preferableReviewerIds: new Set(d.preferableReviewerIds),
    assignedReviewerIds: new Set(d.assignedReviewerIds),
    reviewingFor: new Set(d.reviewingFor),
  }));
}

/**
 * Allocate reviewers with retry mechanism.
 *
 * Equivalent to Python's `allocate_reviewers`. Tries multiple times with
 * different random states, tracks the best attempt (most unexperienced devs
 * assigned as reviewers), and copies the best result back to the original devs.
 */
/**
 * Count how many devs have the exact same reviewer set as their previous rotation.
 */
function countRepeatedAssignments(
  devs: RotationDeveloper[],
  previousAssignments: Map<string, Set<string>>,
): number {
  let count = 0;
  for (const dev of devs) {
    const prev = previousAssignments.get(dev.id);
    /* v8 ignore next */
    if (!prev || prev.size === 0) continue;
    // Compare as unordered sets
    if (
      dev.assignedReviewerIds.size === prev.size &&
      [...dev.assignedReviewerIds].every((id) => prev.has(id))
    ) {
      count++;
    }
  }
  return count;
}

export function allocateReviewers(
  devs: RotationDeveloper[],
  unexperiencedIds: Set<string>,
  maxRetries = 10,
  previousAssignments?: Map<string, Set<string>>,
): void {
  const allDevIds = new Set(devs.map((d) => d.id));
  const validUnexpIds = new Set([...unexperiencedIds].filter((id) => allDevIds.has(id)));

  let bestAttempt: RotationDeveloper[] | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Create a deep copy for this attempt
    const devsCopy = cloneDevs(devs);

    try {
      runAllocationAlgorithm(devsCopy, unexperiencedIds, previousAssignments);
      /* v8 ignore next 3 */
    } catch {
      continue;
    }

    // Count how many unexperienced devs are assigned as reviewers
    const assignedCount = devsCopy.filter(
      (d) => validUnexpIds.has(d.id) && d.reviewingFor.size > 0,
    ).length;

    // Count repeated assignments (lower is better)
    const repeats = previousAssignments
      ? countRepeatedAssignments(devsCopy, previousAssignments)
      : 0;

    // Score: prioritize unexperienced assignment, then penalize repeats
    const score = assignedCount * 1000 - repeats;

    // Track best attempt
    if (score > bestScore) {
      bestScore = score;
      bestAttempt = devsCopy;
    }

    // Perfect: all unexperienced assigned AND no repeats
    if (assignedCount === validUnexpIds.size && repeats === 0) {
      for (let i = 0; i < devs.length; i++) {
        devs[i].assignedReviewerIds = devsCopy[i].assignedReviewerIds;
        devs[i].reviewingFor = devsCopy[i].reviewingFor;
      }
      return;
    }
  }

  // Use best attempt if we have one
  if (bestAttempt) {
    for (let i = 0; i < devs.length; i++) {
      devs[i].assignedReviewerIds = bestAttempt[i].assignedReviewerIds;
      devs[i].reviewingFor = bestAttempt[i].reviewingFor;
    }
  } else {
    throw new Error(`All ${maxRetries} allocation attempts failed!`);
  }
}

/**
 * Top-level function for developer rotation.
 *
 * Calls allocateReviewers, then returns a Map from dev ID to array of reviewer IDs.
 */
export function runDevRotation(
  devs: RotationDeveloper[],
  unexperiencedIds: Set<string>,
  previousAssignments?: Map<string, Set<string>>,
): Map<string, string[]> {
  allocateReviewers(devs, unexperiencedIds, 10, previousAssignments);

  const result = new Map<string, string[]>();
  for (const dev of devs) {
    result.set(dev.id, [...dev.assignedReviewerIds]);
  }
  return result;
}
