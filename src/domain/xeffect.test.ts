import { describe, expect, it } from "vitest"
import {
  addDays,
  celebrationsForMark,
  colorHole,
  computeBadges,
  computeXp,
  consecutiveStreak,
  createCard,
  derive,
  isCardComplete,
  isPerfect,
  markToday,
  totalXs,
  unmarkToday,
  type Card,
  type Profile,
} from "./xeffect"

const TODAY = "2026-08-19"

function cardWithMarks(
  marks: Array<"x" | "empty" | { empty: string }>,
  start = TODAY,
): Card {
  const card = createCard({
    id: "c1",
    name: "Meditate",
    why: "Calm",
    startDate: start,
  })
  return {
    ...card,
    cells: card.cells.map((cell, i) => {
      const m = marks[i]
      if (m === undefined) return cell
      if (m === "x") return { ...cell, mark: "x" as const }
      if (m === "empty") return { ...cell, mark: "empty" as const }
      return { ...cell, mark: "empty" as const, reasonId: m.empty }
    }),
  }
}

function profileFor(cards: Card[]): Profile {
  return { version: 1, xp: 0, badges: [], reasons: [], cards }
}

describe("X Effect cards", () => {
  it("creates 49 consecutive calendar days", () => {
    const card = createCard({
      id: "a",
      name: "Walk",
      why: "Health",
      startDate: "2026-01-30",
    })
    expect(card.cells).toHaveLength(49)
    expect(card.cells[0]?.date).toBe("2026-01-30")
    expect(card.cells[1]?.date).toBe("2026-01-31")
    expect(card.cells[2]?.date).toBe("2026-02-01")
    expect(card.cells[48]?.date).toBe("2026-03-19")
  })

  it("only today can become an X", () => {
    const card = createCard({
      id: "a",
      name: "Walk",
      why: "Health",
      startDate: TODAY,
    })
    const marked = markToday(card, TODAY)
    expect(totalXs(marked)).toBe(1)
    expect(marked.cells[0]?.mark).toBe("x")
    expect(marked.cells[1]?.mark).toBe("empty")
  })

  it("allows undoing today's X", () => {
    const marked = markToday(
      createCard({ id: "a", name: "Walk", why: "y", startDate: TODAY }),
      TODAY,
    )
    expect(unmarkToday(marked, TODAY).cells[0]?.mark).toBe("empty")
  })

  it("treats a colored miss as a hole, not an X", () => {
    const start = addDays(TODAY, -2)
    let card = createCard({
      id: "a",
      name: "Walk",
      why: "y",
      startDate: start,
    })
    card = markToday(card, start)
    card = colorHole(card, addDays(start, 1), TODAY, "lazy")
    const hole = card.cells[1]
    expect(hole?.mark).toBe("empty")
    expect(hole?.reasonId).toBe("lazy")
    expect(totalXs(card)).toBe(1)
    expect(consecutiveStreak(card, TODAY)).toBe(0)
    expect(() => colorHole(card, start, TODAY, "lazy")).toThrow()
    expect(() => colorHole(card, TODAY, TODAY, "lazy")).toThrow()
  })

  it("counts streak back through X's and breaks on a hole", () => {
    const start = addDays(TODAY, -4)
    const card = cardWithMarks(["x", "x", "empty", "x", "x"], start)
    expect(consecutiveStreak(card, TODAY)).toBe(2)
    const unmarkedToday = cardWithMarks(["x", "x", "x", "x", "empty"], start)
    expect(consecutiveStreak(unmarkedToday, TODAY)).toBe(4)
    const coloredBreak = cardWithMarks(
      ["x", "x", { empty: "sick" }, "x", "x"],
      start,
    )
    expect(consecutiveStreak(coloredBreak, TODAY)).toBe(2)
  })

  it("adds milestone XP and finished-card XP; colored holes do not", () => {
    const start = addDays(TODAY, -48)
    const seven = cardWithMarks(Array(7).fill("x"), start)
    expect(computeXp(profileFor([seven]), TODAY)).toBe(7 * 10 + 25)

    const fortyNine = cardWithMarks(Array(49).fill("x"), start)
    expect(isCardComplete(fortyNine, TODAY)).toBe(false)
    expect(isPerfect(fortyNine)).toBe(true)
    expect(computeXp(profileFor([fortyNine]), TODAY)).toBe(
      49 * 10 + 25 + 50 + 100,
    )

    const finished = cardWithMarks(
      [...Array(40).fill("x"), ...Array(9).fill("empty")],
      addDays(TODAY, -49),
    )
    expect(isCardComplete(finished, TODAY)).toBe(true)
    expect(isPerfect(finished)).toBe(false)
    expect(computeXp(profileFor([finished]), TODAY)).toBe(40 * 10 + 25 + 50 + 75)
  })

  it("awards comeback badge after an X that follows a hole", () => {
    const start = addDays(TODAY, -2)
    const card = cardWithMarks(["x", "empty", "x"], start)
    const badges = computeBadges(profileFor([card]), TODAY)
    expect(badges).toContain("first_x")
    expect(badges).toContain("comeback")
    expect(badges).not.toContain("perfect_card")
  })

  it("celebrates the 7th X and the self-chosen reward", () => {
    const card = {
      ...cardWithMarks(Array(7).fill("x")),
      reward: "A long bath",
    }
    const notes = celebrationsForMark({
      card,
      prevXs: 6,
      nextXs: 7,
      streak: 7,
      newBadgeIds: ["streak_7"],
    })
    expect(notes.some((n) => n.title === "7 X's")).toBe(true)
    expect(notes.some((n) => n.body.includes("A long bath"))).toBe(true)
  })

  it("derive keeps xp and badges in sync", () => {
    const card = cardWithMarks(["x"])
    const next = derive(profileFor([card]), TODAY)
    expect(next.xp).toBe(10)
    expect(next.badges).toEqual(["first_x"])
  })
})
