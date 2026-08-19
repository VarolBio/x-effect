import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  BADGES,
  cellKind,
  celebrationsForMark,
  colorHole,
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
  replaceCard,
  todayISO,
  totalXs,
  unmarkToday,
  type Card,
  type Celebration,
  type Profile,
  type Reason,
} from "./domain/xeffect"
import { loadProfile, saveProfile } from "./storage"

type Screen = { t: "home" } | { t: "create" } | { t: "card"; id: string }

export default function App() {
  const today = todayISO()
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [screen, setScreen] = useState<Screen>({ t: "home" })
  const [notes, setNotes] = useState<Celebration[]>([])
  const [burst, setBurst] = useState(0)
  const [hole, setHole] = useState<{ cardId: string; date: string } | null>(
    null,
  )

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
      }),
    )
  }

  function onUnmark(target: Card) {
    commit(replaceCard(profile, unmarkToday(target, today)))
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

  const holeCard = hole
    ? profile.cards.find((c) => c.id === hole.cardId)
    : undefined

  return (
    <div className="desk">
      <div className="grain" aria-hidden="true" />
      <Dust />
      <div className="relative z-[1] mx-auto min-h-svh max-w-lg px-4 py-8">
        <Header profile={profile} onHome={() => setScreen({ t: "home" })} />
        {screen.t === "home" && (
          <Home
            profile={profile}
            today={today}
            burst={burst}
            onOpen={(id) => setScreen({ t: "card", id })}
            onCreate={() => setScreen({ t: "create" })}
            onMark={onMark}
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
            onUnmark={() => onUnmark(card)}
            onHole={(date) => setHole({ cardId: card.id, date })}
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
      {hole && holeCard && (
        <ReasonPicker
          reasons={profile.reasons}
          currentId={
            holeCard.cells.find((c) => c.date === hole.date)?.reasonId
          }
          onClose={() => setHole(null)}
          onPick={(reasonId) => {
            commit(
              replaceCard(
                profile,
                colorHole(holeCard, hole.date, today, reasonId),
              ),
            )
            setHole(null)
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
}: {
  profile: Profile
  onHome: () => void
}) {
  const { level, into, need } = levelFromXp(profile.xp)
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
        <p className="text-sm text-mute">
          Lv {level} · {profile.xp} XP
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div
          className="xp-fill h-full"
          style={{ width: `${(into / need) * 100}%` }}
        />
      </div>
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
}: {
  profile: Profile
  today: string
  burst: number
  onOpen: (id: string) => void
  onCreate: () => void
  onMark: (card: Card) => void
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
        <button
          type="button"
          onClick={onCreate}
          className="btn-mark mt-8 w-full rounded-md px-4 py-3 text-lg text-white"
        >
          Start a card
        </button>
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
                <MiniGrid card={card} today={today} />
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
                  <MiniGrid card={card} today={today} />
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
    </div>
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
  onUnmark,
  onHole,
  onDelete,
}: {
  card: Card
  profile: Profile
  today: string
  burst: number
  onBack: () => void
  onMark: () => void
  onUnmark: () => void
  onHole: (date: string) => void
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
      <div className="flip-scene mt-4">
        <div className={`flip-card ${back ? "is-flipped" : ""}`}>
          <div className="flip-face">
            <div className="index-card index-card-lined relative h-full p-5 pt-8 pl-12">
              <span className="tape" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="why-hand text-2xl leading-tight">{card.name}</h1>
                  <p className="mt-1 text-sm text-mute">
                    {streak} streak · {xs} X&apos;s
                    {complete
                      ? isPerfect(card)
                        ? " · Perfect"
                        : " · Done"
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBack(true)}
                  className="shrink-0 rounded-md border border-ink/15 bg-white/50 px-3 py-1.5 text-sm"
                >
                  Why
                </button>
              </div>
              <div className="relative mt-5 grid grid-cols-7 gap-1.5">
                {burst > 0 && <InkBurst key={burst} />}
                {card.cells.map((cell) => {
                  const kind = cellKind(cell, today)
                  const reason = cell.reasonId
                    ? reasonsById.get(cell.reasonId)
                    : undefined
                  const label =
                    kind === "x"
                      ? `${cell.date} marked`
                      : kind === "hole"
                        ? `${cell.date} hole${reason ? `: ${reason.label}` : ""}`
                        : kind === "today"
                          ? `${cell.date} today`
                          : `${cell.date} upcoming`
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      title={label}
                      aria-label={label}
                      disabled={
                        kind === "future" ||
                        (kind === "x" && cell.date !== today)
                      }
                      onClick={() => {
                        if (kind === "today") {
                          if (cell.mark === "x") onUnmark()
                          else onMark()
                          return
                        }
                        if (kind === "hole") onHole(cell.date)
                      }}
                      className={[
                        "flex aspect-square items-center justify-center rounded-[2px] border bg-white/35 disabled:opacity-100",
                        kind === "future"
                          ? "cursor-default border-ink/10 opacity-40"
                          : "border-ink/20",
                        kind === "today" || kind === "hole"
                          ? "cursor-pointer"
                          : "",
                        kind === "today" ? "cell-today" : "",
                      ].join(" ")}
                      style={
                        kind === "hole" && reason
                          ? { backgroundColor: reason.color }
                          : undefined
                      }
                    >
                      {kind === "x" && (
                        <XInk animate={cell.date === today} />
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-mute">
                Tap a hole to name why it happened. Color is not an X.
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
                  Today&apos;s X is in. Tap it to undo until midnight.
                </p>
              )}
              {card.reward && xs < 7 && (
                <p className="mt-4 text-sm text-mute">
                  After 7 X&apos;s: {card.reward}
                </p>
              )}
            </div>
          </div>
          <div className="flip-face flip-face-back">
            <div className="index-card relative h-full p-6 pt-8">
              <span className="tape" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-mute">
                  Back of the card
                </p>
                <button
                  type="button"
                  onClick={() => setBack(false)}
                  className="rounded-md border border-ink/15 bg-white/50 px-3 py-1.5 text-sm"
                >
                  Grid
                </button>
              </div>
              <p className="why-hand mt-10 text-2xl leading-relaxed">
                {card.why}
              </p>
            </div>
          </div>
        </div>
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

function MiniGrid({ card, today }: { card: Card; today: string }) {
  return (
    <span
      className="grid shrink-0 grid-cols-7 gap-px"
      aria-hidden="true"
    >
      {card.cells.map((cell) => {
        const kind = cellKind(cell, today)
        return (
          <span
            key={cell.date}
            className={[
              "h-1.5 w-1.5 rounded-[1px]",
              kind === "x"
                ? "bg-x"
                : kind === "today"
                  ? "bg-today"
                  : kind === "hole"
                    ? "bg-ink/25"
                    : "bg-ink/10",
            ].join(" ")}
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

function XInk({ animate = true }: { animate?: boolean }) {
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
        className="index-card relative w-full max-w-sm overflow-hidden p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ReasonPicker({
  reasons,
  currentId,
  onClose,
  onPick,
  onAdd,
  onRemove,
}: {
  reasons: Reason[]
  currentId?: string
  onClose: () => void
  onPick: (reasonId: string | undefined) => void
  onAdd: (reason: Reason) => void
  onRemove: (id: string) => void
}) {
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("#6366f1")

  return (
    <Modal onClose={onClose}>
      <p className="why-hand text-3xl">Why the hole?</p>
      <p className="mt-1 text-sm text-mute">
        This stays a miss. The color is just a note.
      </p>
      <ul className="mt-4 space-y-1">
        {reasons.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPick(r.id)}
              className={[
                "flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-left",
                currentId === r.id ? "ring-2 ring-ink" : "bg-desk/10",
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
              onClick={() => onRemove(r.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!label.trim()) return
          onAdd({ id: newId(), label: label.trim(), color })
          setLabel("")
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="New reason"
          className="min-w-0 flex-1 rounded-md border border-ink/15 px-2 py-1"
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Color"
          className="h-9 w-9 cursor-pointer bg-transparent"
        />
        <button
          type="submit"
          className="rounded-md bg-ink px-3 py-1 text-paper"
        >
          Add
        </button>
      </form>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-md border border-ink/20 px-3 py-2 text-sm"
          onClick={() => onPick(undefined)}
        >
          Clear color
        </button>
        <button
          type="button"
          className="flex-1 rounded-md bg-ink px-3 py-2 text-sm text-paper"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
