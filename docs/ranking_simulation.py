"""
Ninja Israel — Ranking Simulation & Verification Script
Pure Python, no external dependencies.

Ranking Rules:
  1. Finishers (completed all obstacles) rank above Fallers (always).
  2. Among Finishers: sort by end_time ASC (fastest finish wins).
  3. Among Fallers:
     a. Sort by obstacles_completed DESC (more = better).
     b. Tiebreaker: sort by start_time_of_fall_obstacle ASC (earlier start = better).
"""

from dataclasses import dataclass
from typing import Optional
import random


@dataclass
class Competitor:
    name: str
    finished: bool
    obstacles_completed: int
    total_obstacles: int
    end_time: Optional[float]          # seconds; only meaningful for finishers
    fall_obstacle_start_time: Optional[float]  # seconds; only meaningful for fallers

    @property
    def is_finisher(self) -> bool:
        return self.finished

    def rank_key(self):
        """
        Returns a tuple used for sorting (ascending).
        Lower tuple = better rank.
        """
        if self.is_finisher:
            # Tier 0 (finishers first), then by end_time ascending
            return (0, self.end_time, 0)
        else:
            # Tier 1 (fallers second), then by obstacles_completed DESCENDING
            # (negate to sort ascending), then by fall_obstacle_start_time ascending
            return (1, -self.obstacles_completed, self.fall_obstacle_start_time)


def rank_competitors(competitors: list[Competitor]) -> list[Competitor]:
    """Sort competitors per Ninja Israel ranking guidelines."""
    return sorted(competitors, key=lambda c: c.rank_key())


def print_ranking(competitors: list[Competitor], title: str = ""):
    ranked = rank_competitors(competitors)
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")
    print(f"{'Rank':<5} {'Name':<14} {'Status':<10} {'Obs Done':<9} {'Ranking Value'}")
    print(f"{'-'*5} {'-'*14} {'-'*10} {'-'*9} {'-'*25}")
    for i, c in enumerate(ranked, 1):
        status = "FINISHED" if c.is_finisher else "FELL"
        if c.is_finisher:
            val = f"end_time = {c.end_time:.2f}s"
        else:
            val = f"start_time = {c.fall_obstacle_start_time:.2f}s"
        print(f"{i:<5} {c.name:<14} {status:<10} {c.obstacles_completed}/{c.total_obstacles}    {val}")
    return ranked


# ============================================================================
# SIMULATION 1: Basic 12-competitor scenario (from our earlier discussion)
# ============================================================================

def simulation_1():
    total = 8
    competitors = [
        Competitor("Amit",  True,  8, total, end_time=165.0, fall_obstacle_start_time=None),
        Competitor("Ben",   True,  8, total, end_time=182.0, fall_obstacle_start_time=None),
        Competitor("Chen",  True,  8, total, end_time=198.0, fall_obstacle_start_time=None),
        Competitor("Dana",  False, 7, total, end_time=None, fall_obstacle_start_time=150.0),
        Competitor("Eyal",  False, 7, total, end_time=None, fall_obstacle_start_time=170.0),
        Competitor("Fadi",  False, 6, total, end_time=None, fall_obstacle_start_time=130.0),
        Competitor("Gil",   False, 6, total, end_time=None, fall_obstacle_start_time=145.0),
        Competitor("Hila",  False, 5, total, end_time=None, fall_obstacle_start_time=115.0),
        Competitor("Ido",   False, 5, total, end_time=None, fall_obstacle_start_time=125.0),
        Competitor("Jade",  False, 4, total, end_time=None, fall_obstacle_start_time=100.0),
        Competitor("Kobi",  False, 3, total, end_time=None, fall_obstacle_start_time=70.0),
        Competitor("Lior",  False, 2, total, end_time=None, fall_obstacle_start_time=50.0),
    ]
    ranked = print_ranking(competitors, "SIMULATION 1: Basic 12 Competitors")

    # Verify expected order
    expected = ["Amit", "Ben", "Chen", "Dana", "Eyal", "Fadi", "Gil", "Hila", "Ido", "Jade", "Kobi", "Lior"]
    actual = [c.name for c in ranked]
    assert actual == expected, f"FAILED: {actual} != {expected}"
    print("\n  ✓ PASSED — Order matches expected ranking.")


# ============================================================================
# SIMULATION 2: Edge case — fall time vs start time distinction
# Two competitors fall on same obstacle. One fell LATER (held on longer)
# but started the obstacle LATER too. The one who started earlier ranks higher.
# ============================================================================

def simulation_2():
    total = 6
    competitors = [
        # Yael started obstacle 4 at 80s, fell at 95s (held 15s)
        Competitor("Yael", False, 3, total, end_time=None, fall_obstacle_start_time=80.0),
        # Nir started obstacle 4 at 90s, fell at 92s (held only 2s)
        Competitor("Nir",  False, 3, total, end_time=None, fall_obstacle_start_time=90.0),
    ]
    ranked = print_ranking(competitors, "SIMULATION 2: Start Time vs Fall Time")

    assert ranked[0].name == "Yael", "Yael should rank higher (started obstacle earlier)"
    assert ranked[1].name == "Nir", "Nir should rank lower (started obstacle later)"
    print("\n  ✓ PASSED — Earlier start time ranks higher, regardless of when they actually fell.")


# ============================================================================
# SIMULATION 3: Edge case — more obstacles completed always beats earlier start
# A competitor who completed 5 obstacles ranks above one who completed 4,
# even if the 4-obstacle competitor started their fall obstacle much earlier.
# ============================================================================

def simulation_3():
    total = 8
    competitors = [
        # Omer completed 5 obstacles, started obstacle 6 at 200s
        Competitor("Omer", False, 5, total, end_time=None, fall_obstacle_start_time=200.0),
        # Tal completed 4 obstacles, started obstacle 5 at 50s (much earlier!)
        Competitor("Tal",  False, 4, total, end_time=None, fall_obstacle_start_time=50.0),
    ]
    ranked = print_ranking(competitors, "SIMULATION 3: Obstacles Completed > Start Time")

    assert ranked[0].name == "Omer", "Omer (5 obstacles) should rank above Tal (4 obstacles)"
    assert ranked[1].name == "Tal"
    print("\n  ✓ PASSED — More obstacles completed always outweighs earlier start time.")


# ============================================================================
# SIMULATION 4: Edge case — slowest finisher still beats best faller
# ============================================================================

def simulation_4():
    total = 6
    competitors = [
        # Ran finished all 6 with a very slow time
        Competitor("Ran",  True, 6, total, end_time=500.0, fall_obstacle_start_time=None),
        # Shay completed 5/6, started obstacle 6 at just 60s
        Competitor("Shay", False, 5, total, end_time=None, fall_obstacle_start_time=60.0),
    ]
    ranked = print_ranking(competitors, "SIMULATION 4: Any Finisher > Any Faller")

    assert ranked[0].name == "Ran", "Ran (finished) should ALWAYS rank above Shay (fell)"
    assert ranked[1].name == "Shay"
    print("\n  ✓ PASSED — Even slowest finisher ranks above best faller.")


# ============================================================================
# SIMULATION 5: Edge case — multiple finishers with same time (tie)
# ============================================================================

def simulation_5():
    total = 6
    competitors = [
        Competitor("Ori", True, 6, total, end_time=120.0, fall_obstacle_start_time=None),
        Competitor("Gal", True, 6, total, end_time=120.0, fall_obstacle_start_time=None),
    ]
    ranked = print_ranking(competitors, "SIMULATION 5: Finisher Tie (same end time)")

    # Both have same end time — they should tie (order is stable, but both rank 1 effectively)
    assert all(c.is_finisher for c in ranked)
    assert ranked[0].end_time == ranked[1].end_time
    print("\n  ✓ PASSED — Tie preserved (both identical). No tiebreaker defined beyond end time.")


# ============================================================================
# SIMULATION 6: Edge case — multiple fallers on same obstacle with same start time
# ============================================================================

def simulation_6():
    total = 6
    competitors = [
        Competitor("Roni", False, 3, total, end_time=None, fall_obstacle_start_time=85.0),
        Competitor("Dor",  False, 3, total, end_time=None, fall_obstacle_start_time=85.0),
    ]
    ranked = print_ranking(competitors, "SIMULATION 6: Faller Tie (same obstacles, same start time)")

    assert ranked[0].obstacles_completed == ranked[1].obstacles_completed
    assert ranked[0].fall_obstacle_start_time == ranked[1].fall_obstacle_start_time
    print("\n  ✓ PASSED — Tie preserved (both identical). No further tiebreaker defined.")


# ============================================================================
# SIMULATION 7: Large-scale random simulation (36 competitors)
# Verifies structural invariants of the ranking.
# ============================================================================

def simulation_7():
    random.seed(42)
    total = 10
    competitors = []

    for i in range(36):
        finished = random.random() < 0.3  # ~30% finish rate
        if finished:
            end_time = random.uniform(90, 400)
            competitors.append(Competitor(
                name=f"Player_{i+1:02d}",
                finished=True,
                obstacles_completed=total,
                total_obstacles=total,
                end_time=round(end_time, 2),
                fall_obstacle_start_time=None,
            ))
        else:
            obs_done = random.randint(0, total - 1)
            start_time = random.uniform(10, 300)
            competitors.append(Competitor(
                name=f"Player_{i+1:02d}",
                finished=False,
                obstacles_completed=obs_done,
                total_obstacles=total,
                end_time=None,
                fall_obstacle_start_time=round(start_time, 2),
            ))

    ranked = print_ranking(competitors, "SIMULATION 7: 36 Random Competitors")

    # Structural verification
    finisher_section_done = False
    prev_finisher_time = -1
    prev_faller_obs = float('inf')
    prev_faller_start = -1

    for i, c in enumerate(ranked):
        if c.is_finisher:
            assert not finisher_section_done, f"Rank {i+1}: Finisher after faller!"
            assert c.end_time >= prev_finisher_time, f"Rank {i+1}: Finisher end_time not ascending!"
            prev_finisher_time = c.end_time
        else:
            finisher_section_done = True
            if c.obstacles_completed < prev_faller_obs:
                # New group with fewer obstacles — reset start time tracking
                prev_faller_start = -1
            elif c.obstacles_completed == prev_faller_obs:
                assert c.fall_obstacle_start_time >= prev_faller_start, \
                    f"Rank {i+1}: Same obstacle count but start_time not ascending!"
            else:
                assert False, f"Rank {i+1}: Faller with MORE obstacles after one with fewer!"
            prev_faller_obs = c.obstacles_completed
            prev_faller_start = c.fall_obstacle_start_time

    print("\n  ✓ PASSED — All structural invariants hold:")
    print("    • All finishers ranked above all fallers")
    print("    • Finishers sorted by end_time ascending")
    print("    • Fallers sorted by obstacles_completed descending")
    print("    • Fallers with same obstacles sorted by start_time ascending")


# ============================================================================
# SIMULATION 8: Edge case — competitor fell on first obstacle (0 completed)
# ============================================================================

def simulation_8():
    total = 8
    competitors = [
        Competitor("Matan", False, 0, total, end_time=None, fall_obstacle_start_time=0.0),
        Competitor("Shai",  False, 1, total, end_time=None, fall_obstacle_start_time=45.0),
        Competitor("Liam",  False, 0, total, end_time=None, fall_obstacle_start_time=0.5),
    ]
    ranked = print_ranking(competitors, "SIMULATION 8: Fell on First Obstacle (0 completed)")

    assert ranked[0].name == "Shai", "Shai (1 completed) ranks above both 0-completed"
    assert ranked[1].name == "Matan", "Matan (start 0.0s) ranks above Liam (start 0.5s)"
    assert ranked[2].name == "Liam"
    print("\n  ✓ PASSED — Zero-completion competitors ranked correctly.")


# ============================================================================
# SIMULATION 9: Mixed scenario with all edge cases combined (24 competitors)
# ============================================================================

def simulation_9():
    total = 7
    competitors = [
        # Finishers (various end times)
        Competitor("F1_Fast",    True,  7, total, end_time=95.0,  fall_obstacle_start_time=None),
        Competitor("F2_Medium",  True,  7, total, end_time=140.0, fall_obstacle_start_time=None),
        Competitor("F3_Slow",    True,  7, total, end_time=280.0, fall_obstacle_start_time=None),
        Competitor("F4_Slowest", True,  7, total, end_time=350.0, fall_obstacle_start_time=None),

        # Fallers on obstacle 7 (6 completed)
        Competitor("D1_Obs7_Early", False, 6, total, end_time=None, fall_obstacle_start_time=85.0),
        Competitor("D2_Obs7_Mid",   False, 6, total, end_time=None, fall_obstacle_start_time=120.0),
        Competitor("D3_Obs7_Late",  False, 6, total, end_time=None, fall_obstacle_start_time=200.0),

        # Fallers on obstacle 6 (5 completed)
        Competitor("D4_Obs6_Early", False, 5, total, end_time=None, fall_obstacle_start_time=70.0),
        Competitor("D5_Obs6_Late",  False, 5, total, end_time=None, fall_obstacle_start_time=150.0),

        # Fallers on obstacle 5 (4 completed)
        Competitor("D6_Obs5_Early", False, 4, total, end_time=None, fall_obstacle_start_time=55.0),
        Competitor("D7_Obs5_Mid",   False, 4, total, end_time=None, fall_obstacle_start_time=60.0),
        Competitor("D8_Obs5_Late",  False, 4, total, end_time=None, fall_obstacle_start_time=90.0),

        # Fallers on obstacle 4 (3 completed)
        Competitor("D9_Obs4",  False, 3, total, end_time=None, fall_obstacle_start_time=40.0),
        Competitor("D10_Obs4", False, 3, total, end_time=None, fall_obstacle_start_time=42.0),

        # Fallers on obstacle 3 (2 completed)
        Competitor("D11_Obs3", False, 2, total, end_time=None, fall_obstacle_start_time=30.0),
        Competitor("D12_Obs3", False, 2, total, end_time=None, fall_obstacle_start_time=35.0),
        Competitor("D13_Obs3", False, 2, total, end_time=None, fall_obstacle_start_time=38.0),

        # Fallers on obstacle 2 (1 completed)
        Competitor("D14_Obs2", False, 1, total, end_time=None, fall_obstacle_start_time=20.0),
        Competitor("D15_Obs2", False, 1, total, end_time=None, fall_obstacle_start_time=25.0),

        # Fallers on obstacle 1 (0 completed)
        Competitor("D16_Obs1_A", False, 0, total, end_time=None, fall_obstacle_start_time=0.0),
        Competitor("D16_Obs1_B", False, 0, total, end_time=None, fall_obstacle_start_time=0.0),
        Competitor("D17_Obs1",   False, 0, total, end_time=None, fall_obstacle_start_time=0.3),

        # Extra finishers with tied time
        Competitor("F5_Tied",  True, 7, total, end_time=140.0, fall_obstacle_start_time=None),
        Competitor("F6_Tied",  True, 7, total, end_time=140.0, fall_obstacle_start_time=None),
    ]
    ranked = print_ranking(competitors, "SIMULATION 9: Full Mixed Scenario (24 competitors)")

    # Verify all finishers come first
    finisher_names = {c.name for c in competitors if c.is_finisher}
    faller_names = {c.name for c in competitors if not c.is_finisher}

    first_faller_idx = None
    for i, c in enumerate(ranked):
        if not c.is_finisher:
            first_faller_idx = i
            break

    # All before first_faller_idx should be finishers
    for i in range(first_faller_idx):
        assert ranked[i].is_finisher, f"Rank {i+1} should be finisher!"

    # All from first_faller_idx onward should be fallers
    for i in range(first_faller_idx, len(ranked)):
        assert not ranked[i].is_finisher, f"Rank {i+1} should be faller!"

    # Finishers sorted by end_time
    finisher_times = [c.end_time for c in ranked[:first_faller_idx]]
    assert finisher_times == sorted(finisher_times), "Finishers not sorted by end_time!"

    # Fallers: verify obstacles descending, then start_time ascending within groups
    fallers = ranked[first_faller_idx:]
    for i in range(1, len(fallers)):
        prev = fallers[i-1]
        curr = fallers[i]
        if curr.obstacles_completed > prev.obstacles_completed:
            assert False, f"Faller rank {first_faller_idx+i+1}: more obstacles than previous!"
        if curr.obstacles_completed == prev.obstacles_completed:
            assert curr.fall_obstacle_start_time >= prev.fall_obstacle_start_time, \
                f"Faller rank {first_faller_idx+i+1}: start_time should be >= previous!"

    print("\n  ✓ PASSED — All 24 competitors ranked correctly.")
    print("    • 6 finishers ranked first (sorted by end_time, ties preserved)")
    print("    • 18 fallers ranked after (sorted by obstacles DESC, start_time ASC)")


# ============================================================================
# RUN ALL SIMULATIONS
# ============================================================================

if __name__ == "__main__":
    print("\n" + "█" * 70)
    print("  NINJA ISRAEL — RANKING GUIDELINE SIMULATION & VERIFICATION")
    print("█" * 70)

    simulation_1()
    simulation_2()
    simulation_3()
    simulation_4()
    simulation_5()
    simulation_6()
    simulation_7()
    simulation_8()
    simulation_9()

    print("\n" + "=" * 70)
    print("  ALL 9 SIMULATIONS PASSED ✓")
    print("  Total competitors simulated: 12 + 2 + 2 + 2 + 2 + 2 + 36 + 3 + 24 = 85")
    print("=" * 70)
    print("\n  Edge cases covered:")
    print("    1. Basic multi-tier ranking (finishers + fallers)")
    print("    2. Start time vs fall time distinction")
    print("    3. Obstacles completed always beats earlier start time")
    print("    4. Slowest finisher always beats best faller")
    print("    5. Finisher ties (same end time)")
    print("    6. Faller ties (same obstacles, same start time)")
    print("    7. Large-scale random (36 competitors, structural invariants)")
    print("    8. Zero-completion edge case (fell on first obstacle)")
    print("    9. Full mixed scenario with all cases combined (24 competitors)")
    print()
