import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  BADGES,
  LEVEL_SIZE,
  PRESET_COLORS,
  RANKS,
  XP_FINISHED,
  XP_PER_X,
  annotateDay,
  cellKind,
  celebrationsForMark,
  consecutiveStreak,
  createCard,
  derive,
  isCardComplete,
  isPerfect,
  levelFromXp,
  markToday,
  missedYesterday,
  needsMark,
  newId,
  rankFor,
  replaceCard,
  todayISO,
  totalXs,
  unmarkToday,
  type Card,
  type Celebration,
  type DayCell,
  type Profile,
  type Reason,
} from "./domain/xeffect"
import { loadProfile, parseProfile, saveProfile } from "./storage"

type Screen = { t: "home" } | { t: "create" } | { t: "card"; id: string }

export default function App() {
  const today = todayISO()
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [screen, setScreen] = useState<Screen>({ t: "home" })
  const [notes, setNotes] = useState<Celebration[]>([])
  const [burst, setBurst] = useState(0)
  const [ranksOpen, setRanksOpen] = useState(false)
  const [noteDay, setNoteDay] = useState<{
    cardId: string
    date: string
  } | null>(null)

  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  const card =
    screen.t === "card"
      ? profile.cards.find((c) => c.id === screen.id)
      : undefined

  function commit(next: Profile) {
    setProfile(derive(next, today))
  }

  function onMark(target: Card) {
    const prevXs = totalXs(target)
    const oldXp = profile.xp
    const oldBadges = new Set(profile.badges)
    const marked = markToday(target, today)
    const next = derive(replaceCard(profile, marked), today)
    setProfile(next)
    setBurst((n) => n + 1)
    setNotes(
      celebrationsForMark({
        card: marked,
        prevXs,
        nextXs: totalXs(marked),
        streak: consecutiveStreak(marked, today),
        newBadgeIds: next.badges.filter((id) => !oldBadges.has(id)),
        prevXp: oldXp,
        nextXp: next.xp,
      }),
    )
  }

  function onCreate(input: { name: string; why: string; reward: string }) {
    const made = createCard({
      name: input.name,
      why: input.why,
      reward: input.reward,
      startDate: today,
    })
    commit({ ...profile, cards: [...profile.cards, made] })
    setScreen({ t: "card", id: made.id })
  }

  const noteCard = noteDay
    ? profile.cards.find((c) => c.id === noteDay.cardId)
    : undefined

  return (
    <div className="desk">
      <div className="grain" aria-hidden="true" />
      <Dust />
      <div className="relative z-[1] mx-auto min-h-svh max-w-lg px-4 py-8">
        <Header
          profile={profile}
          onHome={() => setScreen({ t: "home" })}
          onRanks={() => setRanksOpen(true)}
        />
        {screen.t === "home" && (
          <Home
            profile={profile}
            today={today}
            burst={burst}
            onOpen={(id) => setScreen({ t: "card", id })}
            onCreate={() => setScreen({ t: "create" })}
            onMark={onMark}
            onImport={(next) => commit(next)}
          />
        )}
        {screen.t === "create" && (
          <CreateForm
            onCancel={() => setScreen({ t: "home" })}
            onCreate={onCreate}
          />
        )}
        {screen.t === "card" && card && (
          <CardScreen
            card={card}
            profile={profile}
            today={today}
            burst={burst}
            onBack={() => setScreen({ t: "home" })}
            onMark={() => onMark(card)}
            onNote={(date) => setNoteDay({ cardId: card.id, date })}
            onDelete={() => {
              if (!confirm(`Delete “${card.name}”?`)) return
              commit({
                ...profile,
                cards: profile.cards.filter((c) => c.id !== card.id),
              })
              setScreen({ t: "home" })
            }}
          />
        )}
        {screen.t === "card" && !card && (
          <p className="mt-8 text-mute">That card is gone.</p>
        )}
      </div>
      {ranksOpen && (
        <RanksSheet
          xp={profile.xp}
          onClose={() => setRanksOpen(false)}
        />
      )}
      {notes[0] && (
        <Modal onClose={() => setNotes((n) => n.slice(1))}>
          <Confetti />
          <p className="why-hand text-center text-4xl text-ink">
            {notes[0].title}
          </p>
          <p className="mt-3 text-center text-mute">{notes[0].body}</p>
          <button
            type="button"
            className="btn-mark mt-6 w-full rounded-md px-4 py-3 text-white"
            onClick={() => setNotes((n) => n.slice(1))}
          >
            {notes.length > 1 ? "Next" : "Keep going"}
          </button>
        </Modal>
      )}
      {noteDay && noteCard && (
        <DayNoteSheet
          reasons={profile.reasons}
          cell={noteCard.cells.find((c) => c.date === noteDay.date)}
          canUndoToday={
            noteDay.date === today &&
            noteCard.cells.find((c) => c.date === noteDay.date)?.mark === "x"
          }
          onClose={() => setNoteDay(null)}
          onSave={(annotation) => {
            commit(
              replaceCard(
                profile,
                annotateDay(noteCard, noteDay.date, today, annotation),
              ),
            )
            setNoteDay(null)
          }}
          onUndoToday={() => {
            commit(replaceCard(profile, unmarkToday(noteCard, today)))
            setNoteDay(null)
          }}
          onAdd={(reason) => {
            commit({ ...profile, reasons: [...profile.reasons, reason] })
          }}
          onRemove={(id) => {
            commit({
              ...profile,
              reasons: profile.reasons.filter((r) => r.id !== id),
            })
          }}
        />
      )}
    </div>
  )
}

function Dust() {
  const motes = [
    { left: "12%", delay: "0s", duration: "16s" },
    { left: "28%", delay: "4s", duration: "18s" },
    { left: "47%", delay: "1.5s", duration: "13s" },
    { left: "63%", delay: "7s", duration: "20s" },
    { left: "81%", delay: "3s", duration: "15s" },
  ]
  return (
    <div className="motes" aria-hidden="true">
      {motes.map((m) => (
        <span
          key={m.left}
          className="mote"
          style={{
            left: m.left,
            animationDelay: m.delay,
            animationDuration: m.duration,
          }}
        />
      ))}
    </div>
  )
}

function Header({
  profile,
  onHome,
  onRanks,
}: {
  profile: Profile
  onHome: () => void
  onRanks: () => void
}) {
  const { level, into, need } = levelFromXp(profile.xp)
  const rank = rankFor(level)
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2.5"
        >
          <LogoMark />
          <span className="why-hand text-3xl tracking-tight text-cream">
            X Effect
          </span>
        </button>
        <button type="button" onClick={onRanks} className="text-right">
          <span className="block why-hand text-lg leading-tight text-cream">
            {rank.name}
          </span>
          <span className="text-xs text-mute">
            {into}/{need} XP
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={onRanks}
        className="mt-3 block w-full"
        aria-label={`${need - into} XP to the next rank`}
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
          <div
            className="xp-fill h-full"
            style={{ width: `${(into / need) * 100}%` }}
          />
        </div>
      </button>
      {profile.badges.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {profile.badges.map((id) => (
            <li
              key={id}
              title={BADGES[id]?.hint}
              className="badge-chip rounded-full px-2.5 py-0.5 text-xs"
            >
              {BADGES[id]?.name ?? id}
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

function LogoMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-sm bg-paper text-x shadow-md">
      <XInk animate={false} />
    </span>
  )
}

function Home({
  profile,
  today,
  burst,
  onOpen,
  onCreate,
  onMark,
  onImport,
}: {
  profile: Profile
  today: string
  burst: number
  onOpen: (id: string) => void
  onCreate: () => void
  onMark: (card: Card) => void
  onImport: (next: Profile) => void
}) {
  const active = profile.cards.filter((c) => !isCardComplete(c, today))
  const framed = profile.cards.filter((c) => isCardComplete(c, today))
  const unmarked = active.filter((c) => needsMark(c, today))
  const holeToday = active.some((c) => missedYesterday(c, today))

  if (profile.cards.length === 0) {
    return (
      <div className="index-card relative px-6 pb-8 pt-10">
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
        <BackupBar profile={profile} onImport={onImport} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {unmarked.length > 0 ? (
        <section className="space-y-4">
          {holeToday && (
            <p className="text-center text-sm text-mute">
              Hole on the card. Today still gets an X.
            </p>
          )}
          {unmarked.map((card) => (
            <div key={card.id} className="index-card relative p-5 pt-7">
              <span className="tape" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="why-hand text-2xl">{card.name}</p>
                  <p className="mt-1 text-sm text-mute">
                    {consecutiveStreak(card, today)} streak · {totalXs(card)}{" "}
                    X&apos;s
                  </p>
                </div>
                <MiniGrid
                  card={card}
                  today={today}
                  reasons={profile.reasons}
                />
              </div>
              <div className="relative mt-4">
                {burst > 0 && <InkBurst key={burst} />}
                <button
                  type="button"
                  onClick={() => onMark(card)}
                  className="btn-mark w-full rounded-md px-4 py-3.5 text-lg text-white"
                >
                  Mark today&apos;s X
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpen(card.id)}
                className="mt-3 w-full text-center text-sm text-mute underline-offset-2 hover:underline"
              >
                Open card
              </button>
            </div>
          ))}
        </section>
      ) : (
        <div className="index-card px-4 py-5 text-center">
          <p className="why-hand text-xl">Chain intact.</p>
          <p className="mt-1 text-sm text-mute">See you tomorrow.</p>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-mute">
          Cards
        </h2>
        <ul className="space-y-2">
          {active.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onOpen(card.id)}
                className="index-card flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="why-hand text-lg">{card.name}</span>
                <span className="flex items-center gap-3">
                  <MiniGrid
                    card={card}
                    today={today}
                    reasons={profile.reasons}
                  />
                  <span className="text-sm text-mute">{totalXs(card)}/49</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onCreate}
          className="mt-3 w-full rounded-md border border-cream/20 px-4 py-2 text-sm text-cream/80"
        >
          New card
        </button>
      </section>

      {framed.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-mute">
            Framed
          </h2>
          <ul className="space-y-2">
            {framed.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => onOpen(card.id)}
                  className="index-card flex w-full items-center justify-between px-4 py-3 text-left ring-1 ring-today/70"
                >
                  <span className="why-hand text-lg">{card.name}</span>
                  <span className="text-sm text-mute">
                    {isPerfect(card) ? "Perfect" : `${totalXs(card)} X's`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BackupBar profile={profile} onImport={onImport} />
    </div>
  )
}

function BackupBar({
  profile,
  onImport,
}: {
  profile: Profile
  onImport: (next: Profile) => void
}) {
  return (
    <p className="mt-4 flex justify-center gap-5 text-sm text-mute">
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
              if (
                !confirm("Replace the cards on this device with the backup?")
              ) {
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

function CreateForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void
  onCreate: (input: { name: string; why: string; reward: string }) => void
}) {
  const [name, setName] = useState("")
  const [why, setWhy] = useState("")
  const [reward, setReward] = useState("")

  return (
    <form
      className="index-card relative p-6 pt-8"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !why.trim()) return
        onCreate({ name, why, reward })
      }}
    >
      <span className="tape" aria-hidden="true" />
      <h1 className="why-hand text-3xl">New card</h1>
      <label className="mt-5 block text-sm text-mute">
        Habit
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Meditate 5 minutes"
          className="mt-1 w-full rounded-md border border-ink/15 bg-white/70 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-today/60"
        />
      </label>
      <label className="mt-4 block text-sm text-mute">
        Why (back of the card)
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          required
          rows={3}
          placeholder="Because I want to feel like myself in the morning."
          className="mt-1 w-full rounded-md border border-ink/15 bg-white/70 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-today/60"
        />
      </label>
      <label className="mt-4 block text-sm text-mute">
        After 7 X&apos;s I get… (optional)
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="A long bath"
          className="mt-1 w-full rounded-md border border-ink/15 bg-white/70 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-today/60"
        />
      </label>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-ink/20 px-4 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-mark flex-1 rounded-md px-4 py-2 text-white"
        >
          Start
        </button>
      </div>
    </form>
  )
}

function CardScreen({
  card,
  profile,
  today,
  burst,
  onBack,
  onMark,
  onNote,
  onDelete,
}: {
  card: Card
  profile: Profile
  today: string
  burst: number
  onBack: () => void
  onMark: () => void
  onNote: (date: string) => void
  onDelete: () => void
}) {
  const [back, setBack] = useState(false)
  const complete = isCardComplete(card, today)
  const streak = consecutiveStreak(card, today)
  const xs = totalXs(card)
  const todayMarked =
    !needsMark(card, today) && !complete && today >= card.startDate
  const reasonsById = useMemo(() => {
    const map = new Map<string, Reason>()
    for (const r of profile.reasons) map.set(r.id, r)
    return map
  }, [profile.reasons])

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-mute hover:text-cream"
      >
        ← Cards
      </button>
      <div className="card-sheet index-card index-card-lined relative mt-4 p-5 pt-8 pl-12">
        <span className="tape" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="why-hand text-2xl leading-tight">{card.name}</h1>
            <p className="mt-1 text-sm text-mute">
              {streak} streak · {xs} X&apos;s
              {complete ? (isPerfect(card) ? " · Perfect" : " · Done") : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBack((v) => !v)}
            className="shrink-0 rounded-md border border-ink/15 bg-white/50 px-3 py-1.5 text-sm"
          >
            {back ? "Grid" : "Why"}
          </button>
        </div>
        {back ? (
          <p className="why-hand mt-10 text-2xl leading-relaxed">{card.why}</p>
        ) : (
          <>
            <div className="habit-grid relative mt-5 grid grid-cols-7 gap-1.5">
              {burst > 0 && <InkBurst key={burst} />}
              {card.cells.map((cell) => {
                const kind = cellKind(cell, today)
                const reason = cell.reasonId
                  ? reasonsById.get(cell.reasonId)
                  : undefined
                const extra = [reason?.label, cell.note]
                  .filter(Boolean)
                  .join(" · ")
                const label =
                  kind === "x"
                    ? `${cell.date} marked${extra ? `: ${extra}` : ""}`
                    : kind === "hole"
                      ? `${cell.date} hole${extra ? `: ${extra}` : ""}`
                      : kind === "today"
                        ? `${cell.date} today${extra ? `: ${extra}` : ""}`
                        : `${cell.date} upcoming`
                return (
                  <button
                    key={cell.date}
                    type="button"
                    title={label}
                    aria-label={label}
                    disabled={kind === "future"}
                    onClick={() => {
                      if (kind === "today" && cell.mark !== "x") {
                        onMark()
                        return
                      }
                      onNote(cell.date)
                    }}
                    className={[
                      "relative flex aspect-square items-center justify-center rounded-[2px] border bg-white/70 disabled:opacity-100",
                      kind === "future"
                        ? "cursor-default border-ink/10 opacity-40"
                        : "cursor-pointer border-ink/20",
                      kind === "today" ? "cell-today" : "",
                    ].join(" ")}
                    style={
                      reason ? { backgroundColor: reason.color } : undefined
                    }
                  >
                    {kind === "x" && (
                      <XInk
                        animate={cell.date === today}
                        color={reason ? contrastInk(reason.color) : undefined}
                      />
                    )}
                    {cell.note && (
                      <span
                        className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-ink/55"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-mute">
              Tap a day to add a note and colour it
            </p>
            {!complete && needsMark(card, today) && (
              <button
                type="button"
                onClick={onMark}
                className="btn-mark mt-5 w-full rounded-md px-4 py-3 text-white"
              >
                Mark today&apos;s X
              </button>
            )}
            {!complete && todayMarked && (
              <p className="mt-5 text-center text-sm text-mute">
                Today&apos;s X is in. Tap it to add a note.
              </p>
            )}
            {card.reward && xs < 7 && (
              <p className="mt-4 text-sm text-mute">
                After 7 X&apos;s: {card.reward}
              </p>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="mt-4 text-sm text-mute/70 underline"
      >
        Delete card
      </button>
    </div>
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
    <span
      className="grid shrink-0 grid-cols-7 gap-px"
      aria-hidden="true"
    >
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
          {filled.has(i) && <XInk animate={i === 9} />}
        </span>
      ))}
    </div>
  )
}

function XInk({
  animate = true,
  color,
}: {
  animate?: boolean
  color?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-[72%] w-[72%] ${color ? "" : "text-x"} ${animate ? "x-draw" : ""}`}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <path className="x-stroke" d="M5.2 5.4 L18.6 19.1" />
      <path className="x-stroke x-stroke-b" d="M18.8 5.1 L5.4 18.8" />
    </svg>
  )
}

function InkBurst() {
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

function Confetti() {
  const bits = [
    { dx: "-70px", dy: "-80px", color: "#c41e3a" },
    { dx: "60px", dy: "-90px", color: "#d4a017" },
    { dx: "-40px", dy: "50px", color: "#c41e3a" },
    { dx: "80px", dy: "30px", color: "#f6efe2" },
    { dx: "10px", dy: "-100px", color: "#d4a017" },
    { dx: "-90px", dy: "10px", color: "#1c1612" },
    { dx: "95px", dy: "-40px", color: "#c41e3a" },
    { dx: "-20px", dy: "80px", color: "#d4a017" },
  ]
  return (
    <div className="modal-burst" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.dx + b.dy}
          className="confetti"
          style={
            {
              "--dx": b.dx,
              "--dy": b.dy,
              background: b.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function RanksSheet({ xp, onClose }: { xp: number; onClose: () => void }) {
  const { level, into, need } = levelFromXp(xp)
  const current = rankFor(level)
  return (
    <Modal onClose={onClose}>
      <p className="why-hand text-3xl">Ranks</p>
      <p className="mt-2 text-sm text-mute">
        Each X is {XP_PER_X} XP. Bonuses at 7, 21, and 49 X&apos;s on a card,
        plus {XP_FINISHED} when a card is framed. Every {LEVEL_SIZE} XP you
        take a new name. Higher ranks don&apos;t unlock a freeze — they prove
        you kept going.
      </p>
      <p className="mt-3 text-sm">
        You: {current.name} · {into}/{need} XP to the next.
      </p>
      <ol className="mt-4 max-h-64 space-y-1 overflow-y-auto pr-1">
        {RANKS.map((r, i) => {
          const n = i + 1
          const here = n === Math.min(level, RANKS.length)
          return (
            <li
              key={r.name}
              className={
                here ? "rounded-md bg-today/20 px-2 py-1.5" : "px-2 py-1"
              }
            >
              <p className="why-hand text-lg leading-tight">
                {n}. {r.name}
              </p>
              <p className="text-xs text-mute">{r.hook}</p>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        className="btn-mark mt-5 w-full rounded-md px-4 py-2 text-white"
        onClick={onClose}
      >
        Back to the card
      </button>
    </Modal>
  )
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-desk-deep/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="index-card relative w-full max-w-sm overflow-y-auto p-7 max-h-[85svh]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function DayNoteSheet({
  reasons,
  cell,
  canUndoToday,
  onClose,
  onSave,
  onUndoToday,
  onAdd,
  onRemove,
}: {
  reasons: Reason[]
  cell?: DayCell
  canUndoToday: boolean
  onClose: () => void
  onSave: (annotation: { reasonId?: string; note?: string }) => void
  onUndoToday: () => void
  onAdd: (reason: Reason) => void
  onRemove: (id: string) => void
}) {
  const [note, setNote] = useState(cell?.note ?? "")
  const [reasonId, setReasonId] = useState(cell?.reasonId)
  const [label, setLabel] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0]!)

  return (
    <Modal onClose={onClose}>
      <p className="why-hand text-3xl">Note this day</p>
      <p className="mt-1 text-sm text-mute">
        Color is a reminder. An X stays an X.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="What happened?"
        className="mt-4 w-full rounded-md border border-ink/15 bg-white/70 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-today/60"
      />
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-mute">
        Color
      </p>
      <ul className="mt-2 space-y-1">
        {reasons.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setReasonId((id) => (id === r.id ? undefined : r.id))
              }
              className={[
                "flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-left",
                reasonId === r.id ? "ring-2 ring-ink" : "bg-desk/10",
              ].join(" ")}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              {r.label}
            </button>
            <button
              type="button"
              className="text-xs text-mute"
              onClick={() => {
                if (reasonId === r.id) setReasonId(undefined)
                onRemove(r.id)
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!label.trim()) return
          const id = newId()
          onAdd({ id, label: label.trim(), color })
          setReasonId(id)
          setLabel("")
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name a color, e.g. Sick"
          className="w-full rounded-md border border-ink/15 px-2 py-1"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Pick ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={[
                "h-7 w-7 rounded-full",
                color === c ? "ring-2 ring-ink ring-offset-2" : "",
              ].join(" ")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          className="mt-2 rounded-md bg-ink px-3 py-1 text-sm text-paper"
        >
          Add
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-2">
        {canUndoToday && (
          <button
            type="button"
            className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm"
            onClick={onUndoToday}
          >
            Undo today&apos;s X
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-ink/20 px-3 py-2 text-sm"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn-mark flex-1 rounded-md px-3 py-2 text-sm text-white"
            onClick={() => onSave({ reasonId, note })}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}

function contrastInk(hex: string): string {
  const h = hex.replace("#", "")
  if (h.length !== 6) return "#1c1612"
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 160 ? "#1c1612" : "#f6efe2"
}
