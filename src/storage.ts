import {
  derive,
  emptyProfile,
  ensureLayouts,
  todayISO,
  type Card,
  type DayCell,
  type Profile,
  type Reason,
} from "./domain/xeffect"

const KEY = "xeffect.v1"

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProfile()
    const parsed: unknown = JSON.parse(raw)
    if (!isProfile(parsed)) return emptyProfile()
    return ensureLayouts(derive(parsed, todayISO()))
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile))
}

export function parseProfile(raw: string): Profile | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isProfile(parsed)) return null
    return ensureLayouts(derive(parsed, todayISO()))
  } catch {
    return null
  }
}

function isCell(value: unknown): value is DayCell {
  if (!value || typeof value !== "object") return false
  const c = value as DayCell
  return (
    typeof c.date === "string" &&
    (c.mark === "x" || c.mark === "empty")
  )
}

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") return false
  const c = value as Card
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.why === "string" &&
    typeof c.startDate === "string" &&
    Array.isArray(c.cells) &&
    c.cells.every(isCell)
  )
}

function isReason(value: unknown): value is Reason {
  if (!value || typeof value !== "object") return false
  const r = value as Reason
  return (
    typeof r.id === "string" &&
    typeof r.label === "string" &&
    typeof r.color === "string"
  )
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false
  const v = value as Profile
  return (
    v.version === 1 &&
    typeof v.xp === "number" &&
    Number.isFinite(v.xp) &&
    Array.isArray(v.cards) &&
    v.cards.every(isCard) &&
    Array.isArray(v.reasons) &&
    v.reasons.every(isReason) &&
    Array.isArray(v.badges) &&
    v.badges.every((b) => typeof b === "string")
  )
}
