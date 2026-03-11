"""Tests for Teams rotation with load balancing"""

from unittest.mock import patch

from lib.data_types import Developer
from scripts.rotate_team_reviewers import assign_team_reviewers, parse_team_developers

# INVERTED LOGIC: List unexperienced devs, everyone else is experienced
UNEXPERIENCED_DEVS = {"Dev1", "Dev7", "Dev8", "Dev9", "Dev10", "Dev11", "Dev12"}


class TestParseTeamDevelopers:
    """Test parsing team developers from comma-separated string"""

    def test_empty_string(self):
        result = parse_team_developers("")
        assert result == set()

    def test_single_developer(self):
        result = parse_team_developers("Dev2")
        assert result == {"Dev2"}

    def test_multiple_developers(self):
        result = parse_team_developers("Dev2, Dev3, Dev4")
        assert result == {"Dev2", "Dev3", "Dev4"}

    def test_with_extra_spaces(self):
        result = parse_team_developers("  Dev2  ,  Dev3  ,  Dev4  ")
        assert result == {"Dev2", "Dev3", "Dev4"}


class TestAssignTeamReviewers:
    """Test team reviewer assignment with load balancing"""

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", UNEXPERIENCED_DEVS)
    def test_team_with_no_members(self):
        """Team with 0 members should get N random experienced devs"""
        teams = [
            Developer(
                name="Team8",
                reviewer_number=2,
                preferable_reviewer_names=set(),
            )
        ]

        # Provide all developers so experienced devs can be determined
        all_devs = ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7"]
        assign_team_reviewers(teams, all_developers=all_devs)

        assert len(teams[0].reviewer_names) == 2
        # All reviewers should be experienced devs (not in UNEXPERIENCED_DEVS)
        assert all(
            name in {"Dev2", "Dev3", "Dev4", "Dev5", "Dev6"} for name in teams[0].reviewer_names
        )

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", UNEXPERIENCED_DEVS)
    def test_team_with_fewer_members_than_needed(self):
        """Team with 1 member needing 2 reviewers"""
        teams = [
            Developer(
                name="Team2",
                reviewer_number=2,
                preferable_reviewer_names={"Dev7"},
            )
        ]

        # Provide all developers so experienced devs can be determined
        all_devs = ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7"]
        assign_team_reviewers(teams, all_developers=all_devs)

        # Should have 2 reviewers
        assert len(teams[0].reviewer_names) == 2
        # Dev7 should be included (team member)
        assert "Dev7" in teams[0].reviewer_names
        # Other reviewer should be experienced dev not in team
        other_reviewers = teams[0].reviewer_names - {"Dev7"}
        assert len(other_reviewers) == 1
        assert all(name in {"Dev2", "Dev3", "Dev4", "Dev5", "Dev6"} for name in other_reviewers)

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", UNEXPERIENCED_DEVS)
    def test_team_with_enough_members(self):
        """Team with 3 members needing 2 reviewers"""
        teams = [
            Developer(
                name="Team1",
                reviewer_number=2,
                preferable_reviewer_names={"Dev5", "Dev2", "Dev10"},
            )
        ]

        assign_team_reviewers(teams)

        # Should have exactly 2 reviewers
        assert len(teams[0].reviewer_names) == 2
        # All reviewers should be from team members
        assert all(name in {"Dev5", "Dev2", "Dev10"} for name in teams[0].reviewer_names)

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", UNEXPERIENCED_DEVS)
    def test_load_balancing_across_multiple_teams(self):
        """Load balancing should distribute assignments fairly"""
        teams = [
            Developer(
                name="Team3",
                reviewer_number=2,
                preferable_reviewer_names=set(),
            ),
            Developer(
                name="Team4",
                reviewer_number=2,
                preferable_reviewer_names=set(),
            ),
            Developer(
                name="Team5",
                reviewer_number=2,
                preferable_reviewer_names=set(),
            ),
        ]

        assign_team_reviewers(teams)

        # Count assignments per developer
        assignment_count = {}
        for team in teams:
            for reviewer in team.reviewer_names:
                assignment_count[reviewer] = assignment_count.get(reviewer, 0) + 1

        # With 3 teams × 2 reviewers = 6 total slots
        # and 5 experienced devs, distribution should be relatively balanced
        # No dev should have more than 2 assignments (6/5 = 1.2, round up)
        assert all(count <= 2 for count in assignment_count.values())

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", UNEXPERIENCED_DEVS)
    def test_different_reviewer_numbers_per_team(self):
        """Each team can have different reviewer requirements"""
        teams = [
            Developer(
                name="Team6",
                reviewer_number=1,
                preferable_reviewer_names=set(),
            ),
            Developer(
                name="Team7",
                reviewer_number=3,
                preferable_reviewer_names=set(),
            ),
        ]

        # Provide all developers so experienced devs can be determined
        all_devs = ["Dev2", "Dev3", "Dev4", "Dev5", "Dev6"]
        assign_team_reviewers(teams, all_developers=all_devs)

        assert len(teams[0].reviewer_names) == 1
        assert len(teams[1].reviewer_names) == 3


# ============================================================================
# NO-REPEAT STRESS TESTS (consecutive rotations must not repeat reviewer sets)
# ============================================================================


class TestTeamRotationNoRepeat:
    """Stress tests ensuring consecutive rotations never repeat reviewer sets."""

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", set())
    def test_no_repeat_single_squad_100_iterations(self):
        """100 consecutive rotations for 1 squad — no repeats."""
        members = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7"]
        previous_assignments: dict[str, set[str]] | None = None

        for i in range(100):
            teams = [
                Developer(
                    name="BugSheriff",
                    reviewer_number=3,
                    preferable_reviewer_names=set(members),
                )
            ]
            all_devs = list(members)
            assign_team_reviewers(
                teams,
                all_developers=all_devs,
                previous_assignments=previous_assignments,
            )

            reviewers = teams[0].reviewer_names

            if previous_assignments:
                prev = previous_assignments.get("BugSheriff")
                if prev and len(prev) > 0:
                    assert reviewers != prev, (
                        f"Iter {i}: BugSheriff got same reviewers {sorted(prev)} twice in a row"
                    )

            previous_assignments = {"BugSheriff": set(reviewers)}

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", set())
    def test_no_repeat_multiple_squads_100_iterations(self):
        """100 consecutive rotations for 2 squads — no repeats."""
        all_devs = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5", "Dev6", "Dev7", "Dev8"]
        squad1_members: set[str] = set()  # 0 members, picks from experienced pool
        squad2_members = set(all_devs[:5])

        previous_assignments: dict[str, set[str]] | None = None

        for i in range(100):
            teams = [
                Developer(
                    name="Squad1",
                    reviewer_number=2,
                    preferable_reviewer_names=squad1_members,
                ),
                Developer(
                    name="Squad2",
                    reviewer_number=3,
                    preferable_reviewer_names=squad2_members,
                ),
            ]
            assign_team_reviewers(
                teams,
                all_developers=all_devs,
                previous_assignments=previous_assignments,
            )

            if previous_assignments:
                for team in teams:
                    prev = previous_assignments.get(team.name)
                    if prev and len(prev) > 0:
                        assert team.reviewer_names != prev, (
                            f"Iter {i}: {team.name} got same reviewers "
                            f"{sorted(prev)} twice in a row"
                        )

            previous_assignments = {}
            for team in teams:
                previous_assignments[team.name] = set(team.reviewer_names)


class TestTeamRotationCooldown:
    """Tests for cooldown rule: when members >= 2 * reviewerCount,
    previous reviewers are excluded from the candidate pool."""

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", set())
    def test_cooldown_zero_overlap_200_iterations(self):
        """Bug Sheriff scenario: 7 members, 3 reviewers → cooldown applies.
        Previous reviewers must have ZERO overlap with current reviewers."""
        members = ["Cuong", "Marko", "Anja", "Pekka", "Sergio", "Vilhelm", "Gonzalo"]
        previous_assignments: dict[str, set[str]] | None = None

        for i in range(200):
            teams = [
                Developer(
                    name="BugSheriff",
                    reviewer_number=3,
                    preferable_reviewer_names=set(members),
                )
            ]
            assign_team_reviewers(
                teams,
                all_developers=members,
                previous_assignments=previous_assignments,
            )

            reviewers = teams[0].reviewer_names
            assert len(reviewers) == 3, f"Iter {i}: expected 3 reviewers, got {len(reviewers)}"

            if previous_assignments:
                prev = previous_assignments.get("BugSheriff")
                if prev and len(prev) > 0:
                    overlap = reviewers & prev
                    assert len(overlap) == 0, (
                        f"Iter {i}: overlap {sorted(overlap)} between "
                        f"prev {sorted(prev)} and current {sorted(reviewers)}"
                    )

            previous_assignments = {"BugSheriff": set(reviewers)}

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", set())
    def test_cooldown_does_not_apply_when_too_few_members(self):
        """5 members, 3 reviewers → 5 < 6, cooldown does NOT apply."""
        members = ["Dev1", "Dev2", "Dev3", "Dev4", "Dev5"]
        previous_assignments = {"TestTeam": {"Dev1", "Dev2", "Dev3"}}

        teams = [
            Developer(
                name="TestTeam",
                reviewer_number=3,
                preferable_reviewer_names=set(members),
            )
        ]
        assign_team_reviewers(
            teams,
            all_developers=members,
            previous_assignments=previous_assignments,
        )

        # Should still select 3 reviewers
        assert len(teams[0].reviewer_names) == 3

    @patch("lib.env_constants.UNEXPERIENCED_DEV_NAMES", set())
    def test_cooldown_fair_distribution_200_iterations(self):
        """With 7 members, 3 reviewers, and cooldown, each member should appear roughly equally."""
        members = ["Cuong", "Marko", "Anja", "Pekka", "Sergio", "Vilhelm", "Gonzalo"]
        frequency: dict[str, int] = {m: 0 for m in members}
        previous_assignments: dict[str, set[str]] | None = None

        for i in range(200):
            teams = [
                Developer(
                    name="BugSheriff",
                    reviewer_number=3,
                    preferable_reviewer_names=set(members),
                )
            ]
            assign_team_reviewers(
                teams,
                all_developers=members,
                previous_assignments=previous_assignments,
            )

            for name in teams[0].reviewer_names:
                frequency[name] += 1

            previous_assignments = {"BugSheriff": set(teams[0].reviewer_names)}

        # 200 rotations × 3 slots = 600 total / 7 members ≈ 85.7 each
        avg = 600 / 7
        for name, count in frequency.items():
            assert count < avg * 1.5, f"{name} appeared {count} times (avg {avg:.1f}), too skewed"
            assert count > avg * 0.5, f"{name} appeared {count} times (avg {avg:.1f}), too low"
