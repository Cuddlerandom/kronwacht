import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as PointerEvt } from "react";
import { Backpack, ScrollText, User, Volume2, VolumeX, X } from "lucide-react";
import { loadAssets } from "@/game/assets";
import { unlock } from "@/game/audio";
import { SPEC_META, coins, type Spec } from "@/game/content";
import {
  boot,
  buy,
  clickWorld,
  closePanel,
  continueGame,
  dialogClick,
  drawModel,
  getHud,
  getSpeed,
  getX,
  getY,
  getYaw,
  interactNearest,
  learnSpell,
  leave,
  newGame,
  noteArt,
  playerPoint,
  portraitSprite,
  pressSlot,
  pressSpell,
  pickTalent,
  release,
  rez,
  sellSlot,
  setHeld,
  setQAKeys,
  setStick,
  setView,
  subscribe,
  tabTarget,
  takeLoot,
  tick,
  togglePanel,
  toggleSound,
  useSlot,
  abandon,
} from "@/game/engine";
import { drawMinimap, drawPortrait, drawWorld } from "@/game/render";
import { SpellIcon } from "@/game/spell-icon";
import { ItemIcon } from "@/game/item-icon";

if (typeof document !== "undefined") {
  document.documentElement.style.setProperty(
    "--kw-icons",
    `url("${import.meta.env.BASE_URL}game/icons.png?v=2")`,
  );
}

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Tab",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
]);

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}

function Coins({ value, ink = false }: { value: number; ink?: boolean }) {
  const c = coins(Math.max(0, value));
  return (
    <span className="kw-coins">
      {c.g > 0 && (
        <>
          <b className={ink ? "g-gold" : "kw-g"}>{c.g}</b>{" "}
        </>
      )}
      {(c.g > 0 || c.s > 0) && (
        <>
          <b className={ink ? "g-silver" : "kw-s"}>{c.s}</b>{" "}
        </>
      )}
      <b className={ink ? "g-copper" : "kw-c"}>{c.c}</b>
    </span>
  );
}

function tone(player: number, other: number) {
  const d = other - player;
  if (d >= 3) return "tone-hard";
  if (d >= 1) return "tone-mid";
  if (d >= -2) return "tone-ok";
  return "tone-dull";
}

export function GameScreen() {
  const hud = useSyncExternalStore(subscribe, getHud, getHud);
  const worldRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HTMLCanvasElement>(null);
  const foeRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const [heroName, setHeroName] = useState("Aren");
  const [spec, setSpec] = useState<Spec>("klinge");
  const [creating, setCreating] = useState(false);
  const [bagFocus, setBagFocus] = useState<number | null>(null);
  const [tip, setTip] = useState<{ name: string; desc: string } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickId = useRef<number | null>(null);
  const hold = useRef(0);
  const suppressClick = useRef(false);
  const lastTap = useRef(0);

  const once = (run: () => void) => {
    const now = performance.now();
    if (now - lastTap.current < 350) return;
    lastTap.current = now;
    unlock();
    run();
  };

  useEffect(() => {
    boot();
    const canvas = worldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      setView(rect.width, rect.height, ratio);
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;
      keys.current.add(e.code);
      setHeld(keys.current);
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.code === "Digit1") pressSlot(0);
      if (e.code === "Digit2") pressSlot(1);
      if (e.code === "Digit3") pressSlot(2);
      if (e.code === "Digit4") pressSlot(3);
      if (e.code === "Tab") tabTarget();
      if (e.code === "KeyB") togglePanel("bag");
      if (e.code === "KeyC") togglePanel("char");
      if (e.code === "KeyL") togglePanel("quest");
      if (e.code === "Escape") closePanel();
      if (e.code === "KeyF") interactNearest();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      setHeld(keys.current);
    };
    const clearKeys = () => {
      keys.current.clear();
      setHeld(keys.current);
      setStick(0, 0);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        clearKeys();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", onHide);
    window.__controlsTest = {
      getYaw,
      getSpeed,
      getX,
      getY,
      setKeys: setQAKeys,
    };
    void loadAssets().then(() => {
      noteArt();
      paint();
    });
    const paint = () => {
      const model = drawModel();
      drawWorld(ctx, model);
      return model;
    };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      let steps = 0;
      while (acc >= 1 / 60 && steps < 5) {
        tick(1 / 60);
        acc -= 1 / 60;
        steps += 1;
      }
      const model = paint();
      const map = mapRef.current;
      if (map) {
        const mctx = map.getContext("2d");
        if (mctx) {
          if (map.width !== 168) {
            map.width = 168;
            map.height = 168;
          }
          drawMinimap(mctx, 168, 168, model, playerPoint());
        }
      }
      if (faceRef.current) drawPortrait(faceRef.current, "hero");
      const foe = portraitSprite();
      if (foeRef.current && foe) drawPortrait(foeRef.current, foe);
      raf = requestAnimationFrame(loop);
    };
    paint();
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  const start = () => {
    unlock();
    const clean = heroName.trim().slice(0, 16);
    if (clean.length < 2) return;
    newGame(clean, spec);
    setCreating(false);
  };

  const onStick = (e: PointerEvt<HTMLDivElement>, end = false) => {
    if (end || stickId.current !== e.pointerId) {
      if (end && stickId.current === e.pointerId) {
        stickId.current = null;
        setKnob({ x: 0, y: 0 });
        setStick(0, 0);
      }
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (rect.left + rect.width / 2)) / 36;
    let y = (e.clientY - (rect.top + rect.height / 2)) / 36;
    const mag = Math.hypot(x, y);
    if (mag < 0.18) {
      x = 0;
      y = 0;
    } else {
      const clipped = Math.min(1, mag);
      x = (x / mag) * clipped;
      y = (y / mag) * clipped;
      const scale = mag < 0.18 ? 0 : (Math.min(1, mag) - 0.18) / 0.82;
      setStick((x / clipped) * scale, (y / clipped) * scale);
    }
    if (mag < 0.18) setStick(0, 0);
    setKnob({ x: x * 22, y: y * 22 });
  };

  return (
    <main className="kw">
      <canvas
        ref={worldRef}
        className="kw-world"
        onPointerDown={(e) => {
          if (hud.phase !== "play" || hud.dead) return;
          unlock();
          const rect = e.currentTarget.getBoundingClientRect();
          const model = drawModel();
          const x = ((e.clientX - rect.left) / rect.width) * model.viewW + model.camX;
          const y = ((e.clientY - rect.top) / rect.height) * model.viewH + model.camY;
          clickWorld(x, y);
          setTip(null);
        }}
      />
      {hud.phase === "title" ? (
        <section className="kw-title">
          <div className="kw-card">
            <p className="kw-kicker">Ein Reich, nur für dich</p>
            <h1>Kronwacht</h1>
            <p className="kw-lead">Lindenhain hält die Straße. Drei Wege, ein Name, kein Konto.</p>
            {hud.hasSave && !creating ? (
              <>
                <p>Willkommen zurück, {hud.savedName}.</p>
                <button className="kw-play" onClick={() => { unlock(); continueGame(); }}>
                  Fortsetzen
                </button>
                <button className="kw-play kw-quiet" onClick={() => setCreating(true)}>
                  Neuer Held
                </button>
              </>
            ) : (
              <>
                <label className="kw-label">
                  Name
                  <input
                    value={heroName}
                    maxLength={16}
                    autoComplete="off"
                    suppressHydrationWarning
                    onChange={(e) => setHeroName(e.target.value)}
                  />
                </label>
                <div className="kw-specs">
                  {(Object.keys(SPEC_META) as Spec[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={spec === id ? "kw-spec is-on" : "kw-spec"}
                      onClick={() => setSpec(id)}
                      aria-pressed={spec === id}
                    >
                      <strong>{SPEC_META[id].name}</strong>
                      <span>{SPEC_META[id].line}</span>
                    </button>
                  ))}
                </div>
                <button className="kw-play" disabled={heroName.trim().length < 2} onClick={start}>
                  Die Wacht betreten
                </button>
                {hud.hasSave && (
                  <button className="kw-play kw-quiet" onClick={() => setCreating(false)}>
                    Zurück
                  </button>
                )}
              </>
            )}
            {hud.hasSave && (
              <button className="kw-play kw-quiet" onClick={() => abandon()}>
                Held löschen
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="kw-top">
            <div className="kw-frames">
              <div className={hud.inCombat ? "kw-frame is-combat" : "kw-frame"}>
                <canvas ref={faceRef} className="kw-portrait" width={96} height={96} />
                <div>
                  <div className="kw-name">
                    <b>{hud.name}</b>
                    <span className="kw-lv">{hud.level}</span>
                  </div>
                  <div className={hud.lowHp ? "kw-barline kw-hp is-low" : "kw-barline kw-hp"}>
                    <span style={{ width: `${(hud.hp / hud.hpMax) * 100}%` }} />
                  </div>
                  <div className={hud.spec === "klinge" ? "kw-barline kw-rage" : "kw-barline kw-mana"}>
                    <span style={{ width: `${(hud.rp / hud.rpMax) * 100}%` }} />
                  </div>
                </div>
              </div>
              {hud.target && (
                <div className="kw-frame">
                  <canvas ref={foeRef} className="kw-portrait" width={96} height={96} />
                  <div>
                    <div className="kw-name">
                      <b className={hud.target.hostile ? tone(hud.level, hud.target.level) : undefined}>{hud.target.name}</b>
                      {hud.target.level > 0 && <span className="kw-lv">{hud.target.level}</span>}
                    </div>
                    {hud.target.hostile && (
                      <div className="kw-barline kw-hp">
                        <span style={{ width: `${(hud.target.hp / hud.target.hpMax) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button type="button" className="kw-track" onClick={() => togglePanel("quest")}>
                {hud.tracker.map((q) => (
                  <span key={q.title}>
                    <strong>{q.title}</strong>
                    {q.lines.map((line) => (
                      <span key={line} className={q.ready ? "is-ready" : undefined}>
                        {line}
                      </span>
                    ))}
                  </span>
                ))}
              </button>
            </div>
            <div className="kw-map">
              <canvas ref={mapRef} width={168} height={168} />
              <small>{hud.zone}</small>
            </div>
          </div>
          {hud.banner && <div className="kw-banner">{hud.banner}</div>}
          {hud.hint && (
            <p className="kw-hint">Eine Fähigkeit am Start. Bronn lehrt den Rest. Gelbes ! auf der Karte. Der Stein im Süden schenkt Ruhe.</p>
          )}
          <div
            className="kw-stick"
            onPointerDown={(e) => {
              unlock();
              stickId.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              onStick(e);
            }}
            onPointerMove={(e) => {
              if (stickId.current === e.pointerId) onStick(e);
            }}
            onPointerUp={(e) => onStick(e, true)}
            onPointerCancel={(e) => onStick(e, true)}
          >
            <div className="kw-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
          </div>
          <div className="kw-bottom">
            {hud.casting && (
              <div className="kw-cast">
                <span style={{ width: `${hud.casting.pct * 100}%` }} />
                <em>{hud.casting.name}</em>
              </div>
            )}
            <div className="kw-chat" aria-live="polite">
              {hud.log.map((line, i) => (
                <div key={`${line.text}-${i}`} className={line.kind}>
                  {line.text}
                </div>
              ))}
            </div>
            {hud.swingOn && (
              <div className="kw-swing" aria-label="Schlag">
                <span style={{ width: `${hud.swing * 100}%` }} />
              </div>
            )}
            <div className="kw-actions">
              {hud.spells.map((spell, index) => (
                <button
                  key={spell.name}
                  type="button"
                  className={spell.oom ? "kw-spell is-oom" : "kw-spell"}
                  disabled={hud.dead || hud.ghost}
                  onPointerDown={() => {
                    suppressClick.current = false;
                    window.clearTimeout(hold.current);
                    hold.current = window.setTimeout(() => {
                      suppressClick.current = true;
                      setTip({ name: spell.name, desc: spell.desc });
                    }, 480);
                  }}
                  onPointerUp={() => {
                    window.clearTimeout(hold.current);
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    setTip(null);
                    once(() => pressSpell(spell.index));
                  }}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    setTip(null);
                    once(() => pressSpell(spell.index));
                  }}
                >
                  <SpellIcon icon={spell.icon} />
                  {(spell.cd > 0 || spell.gcd > 0) && <span className="kw-sweep" />}
                  {spell.cd > 0.2 && <span className="kw-cd">{Math.ceil(spell.cd)}</span>}
                  <span className="kw-key">{index + 1}</span>
                </button>
              ))}
              <button type="button" className="kw-mini" aria-label="Beutel" onPointerUp={() => once(() => togglePanel("bag"))} onClick={() => once(() => togglePanel("bag"))}>
                <Backpack size={18} />
              </button>
              <button type="button" className="kw-mini" aria-label="Held" onPointerUp={() => once(() => togglePanel("char"))} onClick={() => once(() => togglePanel("char"))}>
                <User size={18} />
              </button>
              <button type="button" className="kw-mini" aria-label="Aufträge" onPointerUp={() => once(() => togglePanel("quest"))} onClick={() => once(() => togglePanel("quest"))}>
                <ScrollText size={18} />
              </button>
            </div>
            <div className="kw-xp" aria-label="Erfahrung">
              <span className="is-xp" style={{ width: `${Math.min(100, (hud.xp / hud.xpMax) * 100)}%` }} />
              {hud.rested > 0 && (
                <span
                  className="is-rest"
                  style={{
                    left: `${Math.min(100, (hud.xp / hud.xpMax) * 100)}%`,
                    width: `${Math.min(100 - (hud.xp / hud.xpMax) * 100, (hud.rested / hud.xpMax) * 100)}%`,
                  }}
                />
              )}
            </div>
          </div>
          {tip && (
            <button type="button" className="kw-tip" onClick={() => setTip(null)}>
              <strong>{tip.name}</strong>
              <div>{tip.desc}</div>
            </button>
          )}
          {hud.dead && (
            <div className="kw-death">
              <h2>Du bist gefallen</h2>
              <p>Der Friedhof im Süden hält einen Stein für dich frei.</p>
              <button type="button" onClick={() => release()}>
                Geist freilassen
              </button>
            </div>
          )}
          {hud.ghost && (
            <div className="kw-ghost">
              <p>Du bist ein Geist. Der Stein nimmt dich zurück.</p>
              <button type="button" onClick={() => rez()}>
                Wiederbeleben
              </button>
            </div>
          )}
          {hud.panel === "bag" && (
            <section className="kw-sheet">
              <div className="kw-row">
                <h2>Beutel</h2>
                <button type="button" aria-label="Schließen" onClick={() => closePanel()}>
                  <X size={18} />
                </button>
              </div>
              <div className="kw-grid">
                {hud.bag.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className={slot ? `kw-slot q-${slot.quality}` : "kw-slot"}
                    aria-label={slot?.name ?? "Leer"}
                    onClick={() => {
                      setBagFocus(i);
                      if (slot) useSlot(i);
                    }}
                  >
                    {slot ? (
                      <>
                        <ItemIcon id={slot.id} />
                        {slot.qty > 1 ? <em className="kw-qty">{slot.qty}</em> : null}
                      </>
                    ) : (
                      ""
                    )}
                  </button>
                ))}
              </div>
              <p>
                {bagFocus !== null && hud.bag[bagFocus]
                  ? `${hud.bag[bagFocus]!.name}. ${hud.bag[bagFocus]!.desc}`
                  : "Tippe Ausrüstung zum Anlegen, Tränke zum Trinken."}
              </p>
            </section>
          )}
          {hud.panel === "char" && (
            <section className="kw-sheet">
              <div className="kw-row">
                <h2>
                  {hud.name} · {hud.specName}
                </h2>
                <button type="button" aria-label="Schließen" onClick={() => closePanel()}>
                  <X size={18} />
                </button>
              </div>
              <p>
                Stufe {hud.level} · Erfahrung {hud.xp}/{hud.xpMax}
              </p>
              <div className="kw-row">
                <span>Schaden</span>
                <span>{hud.stats.dmg}</span>
              </div>
              <div className="kw-row">
                <span>Zauber</span>
                <span>{hud.stats.power}</span>
              </div>
              <div className="kw-row">
                <span>Rüstung</span>
                <span>{hud.stats.armor}</span>
              </div>
              <div className="kw-row">
                <span>Tempo</span>
                <span>{hud.stats.speed}</span>
              </div>
              <div className="kw-row">
                <span>Waffe</span>
                <span>{hud.weapon ?? "—"}</span>
              </div>
              <div className="kw-row">
                <span>Brust</span>
                <span>{hud.chest ?? "—"}</span>
              </div>
              <div className="kw-row">
                <span>Kupfer</span>
                <Coins value={hud.gold} ink />
              </div>
              <div className="kw-row">
                <span>Kräuterkunde</span>
                <span>
                  {hud.herb}/{hud.herbMax}
                </span>
              </div>
              <div className="kw-row">
                <span>Ruhe</span>
                <span>{hud.rested > 0 ? `${hud.rested} am Stein` : "—"}</span>
              </div>
              <h3>Talente</h3>
              {hud.level < 10 && <p>Ab Stufe 10 wählst du eines. Die Wahl bleibt.</p>}
              <div className="stack">
                {hud.talents.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={hud.level < 10 || (hud.talent !== null && hud.talent !== t.id)}
                    onClick={() => pickTalent(t.id)}
                  >
                    {t.name}
                    {hud.talent === t.id ? " · gewählt" : ""}
                    <span className="kw-talent-line">{t.blurb}</span>
                  </button>
                ))}
              </div>
              <div className="stack">
                <button type="button" onClick={() => toggleSound()}>
                  {hud.sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Ton
                </button>
                <button type="button" onClick={() => leave()}>
                  Welt verlassen
                </button>
              </div>
            </section>
          )}
          {hud.panel === "quest" && (
            <section className="kw-sheet">
              <div className="kw-row">
                <h2>Aufträge</h2>
                <button type="button" aria-label="Schließen" onClick={() => closePanel()}>
                  <X size={18} />
                </button>
              </div>
              {hud.tracker.map((q) => (
                <p key={q.title}>
                  <strong>{q.title}</strong>
                  <br />
                  {q.lines.join(" · ")}
                </p>
              ))}
            </section>
          )}
          {hud.panel === "dialog" && hud.dialog && (
            <section className="kw-sheet">
              <h2>{hud.dialog.name}</h2>
              <p>{hud.dialog.text}</p>
              <div className="stack">
                {hud.dialog.buttons.map((b) => (
                  <button key={b.id} type="button" onClick={() => dialogClick(b.id)}>
                    {b.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {hud.panel === "train" && (
            <section className="kw-sheet">
              <div className="kw-row">
                <h2>Klassenlehrer Bronn</h2>
                <button type="button" aria-label="Schließen" onClick={() => closePanel()}>
                  <X size={18} />
                </button>
              </div>
              <p>
                Dein Beutel: <Coins value={hud.gold} ink />
              </p>
              <div className="kw-lessons">
                {hud.lessons.map((lesson) => (
                  <div key={lesson.id} className="kw-lesson">
                    <SpellIcon icon={lesson.icon} />
                    <div>
                      <strong>{lesson.name}</strong>
                      <p>{lesson.blurb}</p>
                      {lesson.state === "known" && <span>Gelernt</span>}
                      {lesson.state === "level" && <span>Ab Stufe {lesson.level}</span>}
                      {lesson.state === "gold" && (
                        <button type="button" onClick={() => learnSpell(lesson.id)}>
                          Zu wenig · <Coins value={lesson.cost} ink />
                        </button>
                      )}
                      {lesson.state === "ready" && (
                        <button type="button" onClick={() => learnSpell(lesson.id)}>
                          Lernen · <Coins value={lesson.cost} ink />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {hud.panel === "vendor" && (
            <section className="kw-sheet">
              <div className="kw-row">
                <h2>Halden</h2>
                <button type="button" aria-label="Schließen" onClick={() => closePanel()}>
                  <X size={18} />
                </button>
              </div>
              <p>
                Dein Beutel: <Coins value={hud.gold} ink />
              </p>
              <div className="stack">
                {hud.wares.map((w) => (
                  <button key={w.id} type="button" className="kw-ware" onClick={() => buy(w.id)}>
                    <ItemIcon id={w.id} />
                    <span>{w.name}</span>
                    <Coins value={w.price} ink />
                  </button>
                ))}
              </div>
              <div className="kw-grid">
                {hud.bag.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className={slot ? `kw-slot q-${slot.quality}` : "kw-slot"}
                    onClick={() => slot && sellSlot(i)}
                  >
                    {slot ? (
                      <>
                        <ItemIcon id={slot.id} />
                        <em className="kw-qty">Verkauf</em>
                      </>
                    ) : (
                      ""
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
          {hud.panel === "loot" && hud.loot && (
            <section className="kw-sheet">
              <h2>{hud.loot.name}</h2>
              {hud.loot.gold > 0 && (
                <p>
                  <Coins value={hud.loot.gold} ink />
                </p>
              )}
              <div className="kw-loot">
                {hud.loot.items.map((it, i) => (
                  <div key={`${it.id}-${i}`} className="kw-lootline">
                    <ItemIcon id={it.id} />
                    <span className={`qtext-${it.quality}`}>
                      {it.name}
                      {it.qty > 1 ? ` ×${it.qty}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <div className="stack">
                <button type="button" onClick={() => takeLoot()}>
                  Alles nehmen
                </button>
                <button type="button" onClick={() => closePanel()}>
                  Schließen
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
