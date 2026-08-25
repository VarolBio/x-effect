import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react"
import {
  INK_COLORS,
  LEVEL_SIZE,
  PAPER_COLORS,
  WALL_TEXTURES,
  WALL_TINTS,
  XP_PER_X,
  appendStroke,
  cellKind,
  consecutiveStreak,
  defaultWall,
  isCardComplete,
  isPerfect,
  missedYesterday,
  needsMark,
  newId,
  nextZ,
  totalXs,
  undoStroke,
  type Card,
  type CardLayout,
  type Profile,
  type Reason,
  type Wall,
  type WallStroke,
} from "./domain/xeffect"
import { parseProfile } from "./storage"

type Mode = "arrange" | "draw"

export function Pinboard({
  profile,
  today,
  burst,
  onOpen,
  onCreate,
  onMark,
  onImport,
  onLayout,
  onWall,
  onCyclePaper,
}: {
  profile: Profile
  today: string
  burst: number
  onOpen: (id: string) => void
  onCreate: () => void
  onMark: (card: Card) => void
  onImport: (next: Profile) => void
  onLayout: (id: string, layout: CardLayout) => void
  onWall: (wall: Wall) => void
  onCyclePaper: (id: string) => void
}) {
  const wall = profile.wall ?? defaultWall()
  const [mode, setMode] = useState<Mode>("arrange")
  const [sheet, setSheet] = useState(false)
  const [ink, setInk] = useState(INK_COLORS[0]!)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  )
  const [draft, setDraft] = useState<number[] | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const paperEls = useRef(new Map<string, HTMLElement>())
  const dragRef = useRef(false)
  const drawRef = useRef(false)
  const liveRef = useRef({ x: 0, y: 0 })
  const draftRef = useRef<number[]>([])
  const active = profile.cards.filter((c) => !isCardComplete(c, today))
  const unmarked = active.filter((c) => needsMark(c, today))
  const holeToday = active.some((c) => missedYesterday(c, today))

  function layoutOf(card: Card): CardLayout {
    const base = card.layout ?? { x: 4, y: 8, z: 2, rot: 0, paper: "cream" }
    if (drag?.id === card.id) return { ...base, x: drag.x, y: drag.y }
    return base
  }

  function pointOnBoard(clientX: number, clientY: number): [number, number] | null {
    const el = boardRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return null
    return [(clientX - r.left) / r.width, (clientY - r.top) / r.height]
  }

  function beginDrag(clientX: number, clientY: number, card: Card) {
    if (mode !== "arrange" || dragRef.current) return
    const board = boardRef.current
    if (!board) return
    const layout = layoutOf(card)
    const origin = { x: clientX, y: clientY, lx: layout.x, ly: layout.y }
    const z = nextZ(profile.cards)
    dragRef.current = true
    liveRef.current = { x: layout.x, y: layout.y }
    setDrag({ id: card.id, x: layout.x, y: layout.y })

    function move(ev: globalThis.MouseEvent) {
      const el = boardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const paper = paperEls.current.get(card.id)
      const maxX = paper
        ? Math.max(0, ((r.width - paper.offsetWidth) / r.width) * 100)
        : 70
      const maxY = paper
        ? Math.max(0, ((r.height - paper.offsetHeight) / r.height) * 100)
        : 80
      const x = Math.min(
        maxX,
        Math.max(0, origin.lx + ((ev.clientX - origin.x) / r.width) * 100),
      )
      const y = Math.min(
        maxY,
        Math.max(0, origin.ly + ((ev.clientY - origin.y) / r.height) * 100),
      )
      liveRef.current = { x, y }
      setDrag({ id: card.id, x, y })
    }

    function up() {
      if (!dragRef.current) return
      dragRef.current = false
      window.removeEventListener("pointermove", move)
      window.removeEventListener("mousemove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("mouseup", up)
      setDrag(null)
      onLayout(card.id, {
        ...layout,
        x: liveRef.current.x,
        y: liveRef.current.y,
        z,
      })
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("mousemove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("mouseup", up)
  }

  function beginDraw(clientX: number, clientY: number) {
    if (mode !== "draw" || drawRef.current) return
    const p = pointOnBoard(clientX, clientY)
    if (!p) return
    drawRef.current = true
    draftRef.current = [...p]
    setDraft(draftRef.current)

    function move(ev: globalThis.MouseEvent) {
      if (!drawRef.current) return
      const next = pointOnBoard(ev.clientX, ev.clientY)
      if (!next) return
      const pts = draftRef.current
      const lastX = pts[pts.length - 2]
      const lastY = pts[pts.length - 1]
      if (lastX !== undefined && lastY !== undefined) {
        const dx = next[0] - lastX
        const dy = next[1] - lastY
        if (dx * dx + dy * dy < 0.00002) return
      }
      draftRef.current = [...pts, ...next]
      setDraft(draftRef.current)
    }

    function up() {
      if (!drawRef.current) return
      drawRef.current = false
      window.removeEventListener("pointermove", move)
      window.removeEventListener("mousemove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("mouseup", up)
      const points = draftRef.current
      draftRef.current = []
      setDraft(null)
      if (points.length < 4) return
      onWall(
        appendStroke(wall, {
          id: newId(),
          color: ink,
          width: 3,
          points,
        }),
      )
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("mousemove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("mouseup", up)
  }

  const strokes = wall.strokes ?? []
  const rows = Math.max(3, Math.ceil(profile.cards.length / 2))

  return (
    <div>
      {holeToday && (
        <p className="mb-3 text-center text-sm text-cream drop-shadow">
          Hole on the card. Today still gets an X.
        </p>
      )}
      {profile.cards.length > 0 && unmarked.length === 0 && (
        <p className="mb-3 text-center why-hand text-xl text-cream drop-shadow">
          Chain intact. See you tomorrow.
        </p>
      )}

      <div
        ref={boardRef}
        className="wall-board"
        style={{ minHeight: `${Math.max(160, 40 + rows * 48)}svh` }}
      >
        {profile.cards.length === 0 && (
          <div className="index-card relative mx-auto mt-6 max-w-md px-6 pb-8 pt-10">
            <span className="tape" aria-hidden="true" />
            <HeroCard />
            <h1 className="why-hand mt-5 text-center text-3xl leading-tight">
              49 days. One X a day.
            </h1>
            <p className="mt-4 text-center text-mute">
              Miss a day? Leave a hole. Keep going. The card still finishes.
            </p>
            <p className="mt-2 text-center text-mute">
              Write why you&apos;re doing this — you&apos;ll need it.
            </p>
            <p className="mt-4 text-center text-sm text-mute">
              Each X is {XP_PER_X} XP. Every {LEVEL_SIZE} XP you rank up — a new
              name on the desk. Tap your rank anytime to see the ladder.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="btn-mark mt-8 w-full rounded-md px-4 py-3 text-lg text-white"
            >
              Start a card
            </button>
          </div>
        )}

        {profile.cards.map((card) => {
          const layout = layoutOf(card)
          const framed = isCardComplete(card, today)
          const paper = layout.paper ?? "cream"
          return (
            <article
              key={card.id}
              ref={(el) => {
                if (el) paperEls.current.set(card.id, el)
                else paperEls.current.delete(card.id)
              }}
              className={[
                "index-card wall-paper",
                `paper-${paper}`,
                framed ? "ring-1 ring-today/70" : "",
              ].join(" ")}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                zIndex: drag?.id === card.id ? 999 : layout.z,
                transform: `rotate(${layout.rot}deg)`,
              }}
            >
              <button
                type="button"
                className="tape tape-handle"
                aria-label={`Move ${card.name}`}
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                  beginDrag(e.clientX, e.clientY, card)
                }}
                onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                  if (e.button !== 0) return
                  e.preventDefault()
                  e.stopPropagation()
                  beginDrag(e.clientX, e.clientY, card)
                }}
              />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="why-hand text-xl leading-tight">{card.name}</p>
                  <p className="mt-1 text-xs text-mute">
                    {framed
                      ? isPerfect(card)
                        ? "Perfect"
                        : `${totalXs(card)} X's`
                      : `${consecutiveStreak(card, today)} streak · ${totalXs(card)}/49`}
                  </p>
                </div>
                <MiniGrid
                  card={card}
                  today={today}
                  reasons={profile.reasons}
                />
              </div>
              {needsMark(card, today) && (
                <div className="relative mt-3">
                  {burst > 0 && <InkBurst key={burst} />}
                  <button
                    type="button"
                    onClick={() => onMark(card)}
                    className="btn-mark w-full rounded-md px-3 py-2.5 text-white"
                  >
                    Mark today&apos;s X
                  </button>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(card.id)}
                  className="text-sm text-mute underline-offset-2 hover:underline"
                >
                  Open card
                </button>
                <button
                  type="button"
                  onClick={() => onCyclePaper(card.id)}
                  className="flex items-center gap-1.5 text-xs text-mute"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-ink/35 shadow-sm"
                    style={{
                      backgroundColor:
                        PAPER_COLORS.find((p) => p.id === paper)?.hex ??
                        PAPER_COLORS[0].hex,
                    }}
                  />
                  Paper
                </button>
              </div>
            </article>
          )
        })}

        <svg
          className="wall-strokes"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {strokes.map((s) => (
            <StrokePath key={s.id} stroke={s} />
          ))}
        </svg>

        {mode === "draw" && (
          <svg
            className="wall-draw-layer"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            onPointerDown={(e: PointerEvent<SVGSVGElement>) => {
              e.preventDefault()
              beginDraw(e.clientX, e.clientY)
            }}
            onMouseDown={(e: MouseEvent<SVGSVGElement>) => {
              if (e.button !== 0) return
              e.preventDefault()
              beginDraw(e.clientX, e.clientY)
            }}
          >
            {draft && draft.length >= 4 && (
              <polyline
                points={toPoints(draft)}
                fill="none"
                stroke={ink}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      <div className="wall-dock">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ModeBtn
            active={mode === "arrange"}
            onClick={() => setMode("arrange")}
          >
            Arrange
          </ModeBtn>
          <ModeBtn active={mode === "draw"} onClick={() => setMode("draw")}>
            Draw
          </ModeBtn>
          <ModeBtn active={sheet} onClick={() => setSheet((v) => !v)}>
            Wall
          </ModeBtn>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-md border border-cream/25 px-3 py-1.5 text-sm text-cream/90"
          >
            New card
          </button>
        </div>
        {mode === "draw" && (
          <div className="mt-2 flex items-center justify-center gap-2">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Ink ${c}`}
                aria-pressed={ink === c}
                onClick={() => setInk(c)}
                className={[
                  "h-7 w-7 rounded-full",
                  ink === c ? "ring-2 ring-cream ring-offset-2 ring-offset-desk-deep" : "",
                ].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              className="ml-2 text-sm text-cream/80 underline-offset-2 hover:underline"
              onClick={() => onWall(undoStroke(wall))}
            >
              Undo
            </button>
          </div>
        )}
        <BackupBar profile={profile} onImport={onImport} className="mt-2" />
      </div>

      {sheet && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-desk-deep/55 p-4 sm:items-center"
          onClick={() => setSheet(false)}
        >
          <div
            className="index-card relative w-full max-w-sm overflow-y-auto p-6 max-h-[85svh]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="why-hand text-3xl">Wall</p>
            <p className="mt-1 text-sm text-mute">
              Drag papers by the tape. Draw to connect them.
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-mute">
              Texture
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WALL_TEXTURES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    onWall({
                      ...wall,
                      texture: t.id,
                    })
                  }
                  className={[
                    "rounded-md px-3 py-1.5 text-sm",
                    wall.texture === t.id
                      ? "bg-ink text-paper"
                      : "border border-ink/20",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-mute">
              Tint
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WALL_TINTS.map((t) => (
                <button
                  key={t.id || "none"}
                  type="button"
                  onClick={() =>
                    onWall({
                      ...wall,
                      tint: t.id || undefined,
                    })
                  }
                  className={[
                    "rounded-md px-3 py-1.5 text-sm",
                    (wall.tint ?? "") === t.id
                      ? "bg-ink text-paper"
                      : "border border-ink/20",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <BackupBar profile={profile} onImport={onImport} />
            <button
              type="button"
              className="btn-mark mt-4 w-full rounded-md px-4 py-2 text-white"
              onClick={() => setSheet(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StrokePath({ stroke }: { stroke: WallStroke }) {
  return (
    <polyline
      points={toPoints(stroke.points)}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function toPoints(points: number[]): string {
  const out: string[] = []
  for (let i = 0; i + 1 < points.length; i += 2) {
    out.push(`${points[i]},${points[i + 1]}`)
  }
  return out.join(" ")
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-3 py-1.5 text-sm",
        active
          ? "bg-cream/20 text-cream"
          : "border border-cream/20 text-cream/80",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function MiniGrid({
  card,
  today,
  reasons,
}: {
  card: Card
  today: string
  reasons: Reason[]
}) {
  return (
    <span className="grid shrink-0 grid-cols-7 gap-px" aria-hidden="true">
      {card.cells.map((cell) => {
        const kind = cellKind(cell, today)
        const reason = cell.reasonId
          ? reasons.find((r) => r.id === cell.reasonId)
          : undefined
        return (
          <span
            key={cell.date}
            className={[
              "h-1.5 w-1.5 rounded-[1px]",
              reason
                ? ""
                : kind === "x"
                  ? "bg-x"
                  : kind === "today"
                    ? "bg-today"
                    : kind === "hole"
                      ? "bg-ink/25"
                      : "bg-ink/10",
            ].join(" ")}
            style={reason ? { backgroundColor: reason.color } : undefined}
          />
        )
      })}
    </span>
  )
}

function HeroCard() {
  const filled = new Set([0, 1, 2, 3, 4, 7, 8, 9])
  return (
    <div className="mx-auto grid w-44 grid-cols-7 gap-1" aria-hidden="true">
      {Array.from({ length: 49 }, (_, i) => (
        <span
          key={i}
          className="grid aspect-square place-items-center rounded-[2px] border border-ink/15 bg-white/40"
        >
          {filled.has(i) && <TinyX animate={i === 9} />}
        </span>
      ))}
    </div>
  )
}

function TinyX({ animate }: { animate: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[72%] w-[72%] text-x ${animate ? "x-draw" : ""}`}
      aria-hidden="true"
    >
      <path className="x-stroke" d="M5.2 5.4 L18.6 19.1" />
      <path className="x-stroke x-stroke-b" d="M18.8 5.1 L5.4 18.8" />
    </svg>
  )
}

export function InkBurst() {
  return (
    <span className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="ink-dot"
          style={{ "--a": `${i * 36}deg` } as CSSProperties}
        />
      ))}
    </span>
  )
}

function BackupBar({
  profile,
  onImport,
  className = "mt-4",
}: {
  profile: Profile
  onImport: (next: Profile) => void
  className?: string
}) {
  return (
    <p className={`flex justify-center gap-5 text-sm text-mute ${className}`}>
      <button
        type="button"
        className="underline-offset-2 hover:underline"
        onClick={() => {
          const blob = new Blob([JSON.stringify(profile)], {
            type: "application/json",
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "x-effect-backup.json"
          a.click()
          URL.revokeObjectURL(url)
        }}
      >
        Export cards
      </button>
      <label className="cursor-pointer underline-offset-2 hover:underline">
        Import
        <input
          type="file"
          accept="application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (!file) return
            void file.text().then((raw) => {
              const next = parseProfile(raw)
              if (!next) {
                alert("That file isn't an X Effect backup.")
                return
              }
              if (!confirm("Replace the cards on this device with the backup?")) {
                return
              }
              onImport(next)
            })
          }}
        />
      </label>
    </p>
  )
}
