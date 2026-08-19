export const CARD_DAYS = 49
export const XP_PER_X = 10
export const XP_FINISHED = 75
export const XP_MILESTONES: Record<number, number> = { 7: 25, 21: 50, 49: 100 }
export const LEVEL_SIZE = 100

export type DayCell = {
  date: string
  mark: "x" | "empty"
  reasonId?: string
}

export type Card = {
  id: string
  name: string
  why: string
  reward?: string
  startDate: string
  cells: DayCell[]
}

export type Reason = { id: string; label: string; color: string }

export type Profile = {
  version: 1
  xp: number
  badges: string[]
  reasons: Reason[]
  cards: Card[]
}

export type Celebration = { title: string; body: string }

export const BADGES: Record<
  string,
  { id: string; name: string; hint: string }
> = {
  first_x: { id: "first_x", name: "First X", hint: "Mark your first day" },
  streak_7: { id: "streak_7", name: "Week chain", hint: "7 X's in a row" },
  comeback: { id: "comeback", name: "Back at it", hint: "X the day after a hole" },
  finished_card: { id: "finished_card", name: "49 days", hint: "Finish a card" },
  perfect_card: {
    id: "perfect_card",
    name: "Perfect card",
    hint: "49 X's, no holes",
  },
}

export const DEFAULT_REASONS: Reason[] = [
  { id: "lazy", label: "Lazy", color: "#3b82f6" },
  { id: "sick", label: "Sick", color: "#ef4444" },
  { id: "busy", label: "Busy", color: "#f59e0b" },
]

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime()
  const b = parseISODate(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function emptyProfile(): Profile {
  return {
    version: 1,
    xp: 0,
    badges: [],
    reasons: DEFAULT_REASONS.map((r) => ({ ...r })),
    cards: [],
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

export function createCard(input: {
  id?: string
  name: string
  why: string
  reward?: string
  startDate: string
}): Card {
  const startDate = input.startDate
  const cells: DayCell[] = []
  for (let i = 0; i < CARD_DAYS; i++) {
    cells.push({ date: addDays(startDate, i), mark: "empty" })
  }
  const reward = input.reward?.trim()
  return {
    id: input.id ?? newId(),
    name: input.name.trim(),
    why: input.why.trim(),
    reward: reward || undefined,
    startDate,
    cells,
  }
}

export function lastDate(card: Card): string {
  return addDays(card.startDate, CARD_DAYS - 1)
}

export function isCardComplete(card: Card, today: string): boolean {
  return today > lastDate(card)
}

export function isPerfect(card: Card): boolean {
  return card.cells.length === CARD_DAYS && card.cells.every((c) => c.mark === "x")
}

export function cellFor(card: Card, date: string): DayCell | undefined {
  return card.cells[daysBetween(card.startDate, date)]
}

export function cellKind(
  cell: DayCell,
  today: string,
): "x" | "hole" | "today" | "future" {
  if (cell.mark === "x") return "x"
  if (cell.date === today) return "today"
  if (cell.date > today) return "future"
  return "hole"
}

export function totalXs(card: Card): number {
  return card.cells.filter((c) => c.mark === "x").length
}

export function consecutiveStreak(card: Card, today: string): number {
  const start = card.startDate
  if (today < start) return 0
  let cursor = today
  const todayCell = cellFor(card, today)
  if (!todayCell || todayCell.mark !== "x") {
    cursor = addDays(today, -1)
  }
  let n = 0
  while (cursor >= start) {
    const cell = cellFor(card, cursor)
    if (!cell || cell.mark !== "x") break
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function hadSevenStreak(card: Card): boolean {
  let run = 0
  for (const cell of card.cells) {
    if (cell.mark === "x") {
      run++
      if (run >= 7) return true
    } else {
      run = 0
    }
  }
  return false
}

export function hadComeback(card: Card): boolean {
  for (let i = 1; i < card.cells.length; i++) {
    if (card.cells[i - 1].mark === "empty" && card.cells[i].mark === "x") {
      return true
    }
  }
  return false
}

export function needsMark(card: Card, today: string): boolean {
  if (isCardComplete(card, today) || today < card.startDate) return false
  const cell = cellFor(card, today)
  return Boolean(cell && cell.mark !== "x")
}

export function missedYesterday(card: Card, today: string): boolean {
  const y = addDays(today, -1)
  if (y < card.startDate) return false
  const cell = cellFor(card, y)
  return Boolean(cell && cell.mark === "empty")
}

function replaceCell(card: Card, date: string, next: DayCell): Card {
  const i = daysBetween(card.startDate, date)
  if (i < 0 || i >= CARD_DAYS) throw new Error("Date is not on this card")
  const cells = card.cells.slice()
  cells[i] = next
  return { ...card, cells }
}

export function markToday(card: Card, today: string): Card {
  if (isCardComplete(card, today)) throw new Error("This card is finished")
  const cell = cellFor(card, today)
  if (!cell) throw new Error("Today is not on this card")
  if (cell.mark === "x") return card
  return replaceCell(card, today, { date: today, mark: "x" })
}

export function unmarkToday(card: Card, today: string): Card {
  const cell = cellFor(card, today)
  if (!cell) throw new Error("Today is not on this card")
  if (cell.mark !== "x") return card
  return replaceCell(card, today, { date: today, mark: "empty" })
}

export function colorHole(
  card: Card,
  date: string,
  today: string,
  reasonId: string | undefined,
): Card {
  if (date >= today) throw new Error("Only past holes can be colored")
  const cell = cellFor(card, date)
  if (!cell) throw new Error("Date is not on this card")
  if (cell.mark === "x") throw new Error("An X is not a hole")
  const next: DayCell = { date, mark: "empty" }
  if (reasonId) next.reasonId = reasonId
  return replaceCell(card, date, next)
}

export function computeXp(profile: Profile, today: string): number {
  let xp = 0
  for (const card of profile.cards) {
    const xs = totalXs(card)
    xp += xs * XP_PER_X
    for (const [n, bonus] of Object.entries(XP_MILESTONES)) {
      if (xs >= Number(n)) xp += bonus
    }
    if (isCardComplete(card, today)) xp += XP_FINISHED
  }
  return xp
}

export function levelFromXp(xp: number): {
  level: number
  into: number
  need: number
} {
  return {
    level: Math.floor(xp / LEVEL_SIZE) + 1,
    into: xp % LEVEL_SIZE,
    need: LEVEL_SIZE,
  }
}

export function computeBadges(profile: Profile, today: string): string[] {
  const ids: string[] = []
  if (profile.cards.some((c) => totalXs(c) > 0)) ids.push("first_x")
  if (profile.cards.some(hadSevenStreak)) ids.push("streak_7")
  if (profile.cards.some(hadComeback)) ids.push("comeback")
  if (profile.cards.some((c) => isCardComplete(c, today))) ids.push("finished_card")
  if (profile.cards.some(isPerfect)) ids.push("perfect_card")
  return ids
}

export function derive(profile: Profile, today: string): Profile {
  return {
    ...profile,
    xp: computeXp(profile, today),
    badges: computeBadges(profile, today),
  }
}

export function replaceCard(profile: Profile, card: Card): Profile {
  return {
    ...profile,
    cards: profile.cards.map((c) => (c.id === card.id ? card : c)),
  }
}

export function celebrationsForMark(opts: {
  card: Card
  prevXs: number
  nextXs: number
  streak: number
  newBadgeIds: string[]
}): Celebration[] {
  const out: Celebration[] = []
  const { card, prevXs, nextXs, streak, newBadgeIds } = opts
  if (prevXs < 7 && nextXs >= 7) {
    out.push({
      title: "7 X's",
      body: card.reward
        ? `You earned it: ${card.reward}`
        : "A week of showing up. The chain is real.",
    })
  }
  if (prevXs < 21 && nextXs >= 21) {
    out.push({
      title: "21 X's",
      body: "Three weeks. This is becoming who you are.",
    })
  }
  if (prevXs < 49 && nextXs >= 49) {
    out.push({
      title: "Perfect card",
      body: "49 X's. No holes. Frame this one.",
    })
  } else if (streak === 7 && nextXs !== 7) {
    out.push({
      title: "7-day streak",
      body: "Don't break the chain.",
    })
  }
  for (const id of newBadgeIds) {
    const b = BADGES[id]
    if (!b) continue
    if (out.some((c) => c.title === b.name || c.title === "Perfect card" && id === "perfect_card")) {
      continue
    }
    if (id === "first_x" && nextXs === 1) {
      out.push({ title: b.name, body: "One down. Forty-eight to go." })
    } else if (id === "comeback") {
      out.push({
        title: b.name,
        body: "Hole on the card. Today got an X anyway.",
      })
    } else if (id === "streak_7" && !out.some((c) => c.title.includes("7"))) {
      out.push({ title: b.name, body: b.hint })
    } else if (id === "finished_card") {
      out.push({ title: b.name, body: "Seven weeks. You did the thing." })
    }
  }
  return out
}
