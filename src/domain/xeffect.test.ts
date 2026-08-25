import { describe, expect, it } from "vitest"
import {
  addDays,
  appendStroke,
  celebrationsForMark,
  annotateDay,
  clampLayout,
  computeBadges,
  computeXp,
  consecutiveStreak,
  createCard,
  cyclePaper,
  defaultWall,
  derive,
  ensureLayouts,
  isCardComplete,
  isPerfect,
  layoutForIndex,
  levelFromXp,
  markToday,
  MAX_STROKE_POINTS,
  MAX_STROKES,
  nextLayout,
  rankFor,
  totalXs,
  undoStroke,
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

  it("notes and colors any day without turning it into an X", () => {
    const start = addDays(TODAY, -2)
    let card = createCard({
      id: "a",
      name: "Walk",
      why: "y",
      startDate: start,
    })
    card = markToday(card, start)
    card = annotateDay(card, start, TODAY, {
      reasonId: "sick",
      note: "flu",
    })
    const marked = card.cells[0]
    expect(marked?.mark).toBe("x")
    expect(marked?.reasonId).toBe("sick")
    expect(marked?.note).toBe("flu")
    expect(totalXs(card)).toBe(1)

    card = annotateDay(card, addDays(start, 1), TODAY, { reasonId: "lazy" })
    expect(card.cells[1]?.mark).toBe("empty")
    expect(card.cells[1]?.reasonId).toBe("lazy")
    expect(consecutiveStreak(card, TODAY)).toBe(0)

    card = annotateDay(card, TODAY, TODAY, { note: "tried anyway" })
    expect(card.cells[2]?.mark).toBe("empty")
    expect(card.cells[2]?.note).toBe("tried anyway")
    expect(() =>
      annotateDay(card, addDays(TODAY, 1), TODAY, { reasonId: "busy" }),
    ).toThrow()
  })

  it("keeps a day's note when today's X is undone", () => {
    let card = createCard({
      id: "a",
      name: "Walk",
      why: "y",
      startDate: TODAY,
    })
    card = markToday(card, TODAY)
    card = annotateDay(card, TODAY, TODAY, {
      reasonId: "sick",
      note: "sore throat",
    })
    card = unmarkToday(card, TODAY)
    expect(card.cells[0]?.mark).toBe("empty")
    expect(card.cells[0]?.reasonId).toBe("sick")
    expect(card.cells[0]?.note).toBe("sore throat")
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

  it("ranks every 100 XP and names the next one", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100 })
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(rankFor(1).name).toBe("Fresh ink")
    expect(rankFor(8).name).toBe("Framed")
    expect(rankFor(13).name).toContain("Lifeblood")
    const card = cardWithMarks(["x"])
    const notes = celebrationsForMark({
      card,
      prevXs: 9,
      nextXs: 10,
      streak: 10,
      newBadgeIds: [],
      prevXp: 95,
      nextXp: 105,
    })
    expect(notes[0]?.title).toContain("Level 2")
    expect(notes[0]?.body).toBe(rankFor(2).hook)
  })

  it("derive keeps xp and badges in sync", () => {
    const card = cardWithMarks(["x"])
    const next = derive(profileFor([card]), TODAY)
    expect(next.xp).toBe(10)
    expect(next.badges).toEqual(["first_x"])
  })
})

describe("pinboard layout", () => {
  it("staggers cards and clamps them onto the wall", () => {
    const a = layoutForIndex(0)
    const b = layoutForIndex(1)
    expect(a.x).toBeLessThan(b.x)
    expect(a.paper).toBe("cream")
    expect(clampLayout({ ...a, x: -20, y: 200, rot: 40, z: 0 })).toEqual({
      ...a,
      x: 0,
      y: 88,
      rot: 8,
      z: 1,
    })
  })

  it("fills missing layouts and a default wall without wiping old backups", () => {
    const card = createCard({
      id: "a",
      name: "Walk",
      why: "y",
      startDate: TODAY,
    })
    const old: Profile = {
      version: 1,
      xp: 0,
      badges: [],
      reasons: [],
      cards: [card],
    }
    const next = ensureLayouts(old)
    expect(old.wall).toBeUndefined()
    expect(next.wall?.texture).toBe("desk")
    expect(next.cards[0]?.layout).toEqual(layoutForIndex(0))
    expect(ensureLayouts(next)).toBe(next)
  })

  it("cycles paper colors and caps doodles", () => {
    expect(cyclePaper(undefined)).toBe("yellow")
    expect(cyclePaper("green")).toBe("cream")
    const wall = defaultWall()
    const long: number[] = []
    for (let i = 0; i < 300; i++) long.push(i / 300, i / 300)
    const one = appendStroke(wall, {
      id: "s",
      color: "#c41e3a",
      width: 3,
      points: long,
    })
    expect(one.strokes?.[0]?.points.length).toBeLessThanOrEqual(MAX_STROKE_POINTS)
    expect(one.strokes?.[0]?.points.length).toBeGreaterThanOrEqual(4)
    let filled = one
    for (let i = 0; i < MAX_STROKES + 5; i++) {
      filled = appendStroke(filled, {
        id: `s${i}`,
        color: "#1c1612",
        width: 2,
        points: [0, 0, 1, 1],
      })
    }
    expect(filled.strokes).toHaveLength(MAX_STROKES)
    expect(undoStroke(filled).strokes).toHaveLength(MAX_STROKES - 1)
    expect(appendStroke(wall, { id: "x", color: "#000", width: 1, points: [0, 0] })).toBe(wall)
  })

  it("places a new card above existing ones", () => {
    const card = {
      ...createCard({ id: "a", name: "Walk", why: "y", startDate: TODAY }),
      layout: layoutForIndex(0, 4),
    }
    expect(nextLayout([card]).z).toBe(5)
  })
})
