import {
  derive,
  emptyProfile,
  ensureLayouts,
  todayISO,
  type Profile,
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

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false
  const v = value as Profile
  return (
    v.version === 1 &&
    Array.isArray(v.cards) &&
    Array.isArray(v.reasons) &&
    Array.isArray(v.badges) &&
    typeof v.xp === "number"
  )
}
