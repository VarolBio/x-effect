import { describe, expect, it } from "vitest"
import { createCard, emptyProfile } from "./domain/xeffect"
import { parseProfile } from "./storage"

describe("parseProfile", () => {
  it("accepts a real backup including an empty card stack", () => {
    const empty = parseProfile(JSON.stringify(emptyProfile()))
    expect(empty?.cards).toEqual([])
    expect(empty?.wall?.texture).toBe("desk")

    const withCard = emptyProfile()
    withCard.cards.push(
      createCard({ name: "Walk", why: "Health", startDate: "2026-08-19" }),
    )
    const parsed = parseProfile(JSON.stringify(withCard))
    expect(parsed?.cards).toHaveLength(1)
    expect(parsed?.cards[0]?.name).toBe("Walk")
    expect(parsed?.cards[0]?.cells).toHaveLength(49)
  })

  it("rejects junk that would crash the pinboard", () => {
    expect(parseProfile("not json")).toBeNull()
    expect(
      parseProfile(
        `{"version":1,"xp":0,"badges":[],"reasons":[],"cards":[null]}`,
      ),
    ).toBeNull()
    expect(
      parseProfile(
        `{"version":1,"xp":0,"badges":[],"reasons":[null],"cards":[]}`,
      ),
    ).toBeNull()
    expect(
      parseProfile(
        `{"version":1,"xp":0,"badges":[1],"reasons":[],"cards":[]}`,
      ),
    ).toBeNull()
    expect(
      parseProfile(
        `{"version":1,"xp":0,"badges":[],"reasons":[],"cards":[{"id":"a","name":"Walk","why":"y","startDate":"2026-08-19","cells":[{}]}]}`,
      ),
    ).toBeNull()
  })
})
