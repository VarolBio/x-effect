export const CARD_DAYS = 49
export const XP_PER_X = 10
export const XP_FINISHED = 75
export const XP_MILESTONES: Record<number, number> = { 7: 25, 21: 50, 49: 100 }
export const LEVEL_SIZE = 100

export const RANKS: { name: string; hook: string }[] = [
  { name: "Fresh ink", hook: "Mark today. That's the whole game." },
  { name: "First chain", hook: "Don't break it. Don't quit if you do." },
  { name: "Red marker", hook: "The card is starting to look like proof." },
  { name: "Hole walker", hook: "A blank square isn't the end." },
  { name: "Week-keeper", hook: "Seven in a row changes how you see yourself." },
  { name: "Why-reader", hook: "Turn the card over when it gets hard." },
  { name: "Forty-nine", hook: "One card from done." },
  { name: "Framed", hook: "You finished a season. Start another." },
  { name: "Deep ink", hook: "This isn't a streak anymore. It's you." },
  { name: "Chain legend", hook: "People quit. You didn't." },
  { name: "Quiet proof", hook: "No audience. Just the card." },
  { name: "Lifeblood", hook: "Willpower is a muscle. Yours is loud." },
]

export type DayCell = {
  date: string
  mark: "x" | "empty"
  reasonId?: string
  note?: string
}

export type CardLayout = {
  x: number
  y: number
  z: number
  rot: number
  paper?: string
}

export type Card = {
  id: string
  name: string
  why: string
  reward?: string
  startDate: string
  cells: DayCell[]
  layout?: CardLayout
}

export type WallTexture = "desk" | "cork" | "paint" | "brick"

export type WallStroke = {
  id: string
  color: string
  width: number
  points: number[]
}

export type Wall = {
  texture: WallTexture
  tint?: string
  strokes?: WallStroke[]
}

export type Reason = { id: string; label: string; color: string }

export type Profile = {
  version: 1
  xp: number
  badges: string[]
  reasons: Reason[]
  cards: Card[]
  wall?: Wall
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

export const PRESET_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#64748b",
]

export const PAPER_COLORS = [
  { id: "cream", hex: "#f6efe2" },
  { id: "yellow", hex: "#f3e07a" },
  { id: "pink", hex: "#f3c1d2" },
  { id: "blue", hex: "#c8def0" },
  { id: "green", hex: "#cfe6b8" },
] as const

export const WALL_TEXTURES: { id: WallTexture; label: string }[] = [
  { id: "desk", label: "Desk" },
  { id: "cork", label: "Cork" },
  { id: "paint", label: "Paint" },
  { id: "brick", label: "Brick" },
]

export const WALL_TINTS: { id: string; label: string }[] = [
  { id: "", label: "None" },
  { id: "#8b5a2b", label: "Warm" },
  { id: "#3d4f6f", label: "Cool" },
  { id: "#6b2d3c", label: "Rose" },
  { id: "#2f4a32", label: "Moss" },
]

export const INK_COLORS = ["#c41e3a", "#1c1612", "#d4a017", "#f6efe2", "#3b82f6"]

// ponytail: 40 strokes / 200 coords ceiling. Upgrade: IndexedDB if doodles get huge.
export const MAX_STROKES = 40
export const MAX_STROKE_POINTS = 200

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
    wall: defaultWall(),
  }
}

export function defaultWall(): Wall {
  return { texture: "desk" }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function layoutForIndex(index: number, z = index + 2): CardLayout {
  const col = index % 2
  const row = Math.floor(index / 2)
  return {
    x: 3 + col * 49,
    y: 6 + row * 24,
    z,
    rot: ((index * 5) % 7) - 3,
    paper: "cream",
  }
}

export function clampLayout(
  layout: CardLayout,
  maxX = 92,
  maxY = 88,
): CardLayout {
  return {
    ...layout,
    x: clamp(layout.x, 0, maxX),
    y: clamp(layout.y, 0, maxY),
    rot: clamp(layout.rot, -8, 8),
    z: Math.max(1, layout.z),
  }
}

export function nextZ(cards: Card[]): number {
  let z = 1
  for (const c of cards) {
    if (c.layout) z = Math.max(z, c.layout.z)
  }
  return z + 1
}

export function nextLayout(cards: Card[]): CardLayout {
  return clampLayout(layoutForIndex(cards.length, nextZ(cards)))
}

export function ensureLayouts(profile: Profile): Profile {
  let changed = false
  const cards = profile.cards.map((c, i) => {
    if (c.layout) return c
    changed = true
    return { ...c, layout: layoutForIndex(i) }
  })
  const wall = profile.wall ?? defaultWall()
  if (!profile.wall) changed = true
  if (!changed) return profile
  return { ...profile, cards, wall }
}

export function cyclePaper(current?: string): string {
  const i = PAPER_COLORS.findIndex((p) => p.id === current)
  const from = i < 0 ? 0 : i
  return PAPER_COLORS[(from + 1) % PAPER_COLORS.length]!.id
}

export function capStrokePoints(points: number[]): number[] {
  const even = points.length % 2 === 0 ? points : points.slice(0, -1)
  if (even.length <= MAX_STROKE_POINTS) return even
  const pairs = even.length / 2
  const maxPairs = Math.floor(MAX_STROKE_POINTS / 2)
  const out: number[] = []
  for (let i = 0; i < maxPairs; i++) {
    const src =
      i === maxPairs - 1
        ? pairs - 1
        : Math.round((i * (pairs - 1)) / (maxPairs - 1))
    out.push(even[src * 2]!, even[src * 2 + 1]!)
  }
  return out
}

export function appendStroke(wall: Wall, stroke: WallStroke): Wall {
  const points = capStrokePoints(stroke.points)
  if (points.length < 4) return wall
  const next = [...(wall.strokes ?? []), { ...stroke, points }]
  const extra = next.length - MAX_STROKES
  return { ...wall, strokes: extra > 0 ? next.slice(extra) : next }
}

export function undoStroke(wall: Wall): Wall {
  const strokes = wall.strokes ?? []
  if (strokes.length === 0) return wall
  return { ...wall, strokes: strokes.slice(0, -1) }
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

function withMark(card: Card, date: string, mark: "x" | "empty"): Card {
  const cell = cellFor(card, date)
  if (!cell) throw new Error("Date is not on this card")
  if (cell.mark === mark) return card
  return replaceCell(card, date, keepNote({ ...cell, mark }))
}

function keepNote(cell: DayCell): DayCell {
  const next: DayCell = { date: cell.date, mark: cell.mark }
  if (cell.reasonId) next.reasonId = cell.reasonId
  if (cell.note) next.note = cell.note
  return next
}

export function markToday(card: Card, today: string): Card {
  if (isCardComplete(card, today)) throw new Error("This card is finished")
  return withMark(card, today, "x")
}

export function unmarkToday(card: Card, today: string): Card {
  return withMark(card, today, "empty")
}

export function annotateDay(
  card: Card,
  date: string,
  today: string,
  annotation: { reasonId?: string; note?: string },
): Card {
  if (date > today) throw new Error("Can't note a future day")
  const cell = cellFor(card, date)
  if (!cell) throw new Error("Date is not on this card")
  const next: DayCell = { date, mark: cell.mark }
  if (annotation.reasonId) next.reasonId = annotation.reasonId
  const note = annotation.note?.trim()
  if (note) next.note = note
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

export function rankFor(level: number): {
  level: number
  name: string
  hook: string
} {
  const safe = Math.max(1, level)
  const i = Math.min(safe, RANKS.length) - 1
  const base = RANKS[i]!
  if (safe <= RANKS.length) return { level: safe, name: base.name, hook: base.hook }
  return { level: safe, name: `${base.name} ${safe}`, hook: base.hook }
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
  prevXp?: number
  nextXp?: number
}): Celebration[] {
  const out: Celebration[] = []
  const { card, prevXs, nextXs, streak, newBadgeIds, prevXp, nextXp } = opts
  if (prevXp !== undefined && nextXp !== undefined) {
    const from = levelFromXp(prevXp).level
    const to = levelFromXp(nextXp).level
    if (to > from) {
      const rank = rankFor(to)
      out.push({
        title: `Level ${to} · ${rank.name}`,
        body: rank.hook,
      })
    }
  }
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
