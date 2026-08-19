import { derive, emptyProfile, todayISO, type Profile } from "./domain/xeffect"

const KEY = "xeffect.v1"

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProfile()
    const parsed: unknown = JSON.parse(raw)
    if (!isProfile(parsed)) return emptyProfile()
    return derive(parsed, todayISO())
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile))
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
