export type Spec = "klinge" | "flamme" | "licht";
export type Quality = "poor" | "common" | "uncommon";
export type ItemKind = "junk" | "quest" | "potion" | "weapon" | "chest";

export interface ItemDef {
  id: string;
  name: string;
  quality: Quality;
  kind: ItemKind;
  desc: string;
  stack: number;
  sell: number;
  spec?: Spec;
  dmg?: number;
  power?: number;
  armor?: number;
  heal?: number;
  resource?: number;
}

export type SpellShape = "strike" | "aoe" | "nova" | "heal" | "shield" | "buff" | "dot" | "hot";

export interface SpellDef {
  id: string;
  name: string;
  icon: number;
  cost: number;
  cd: number;
  cast: number;
  range: number;
  shape: SpellShape;
  coef: number;
  radius?: number;
  duration?: number;
  blurb: string;
}

export const ITEMS: Record<string, ItemDef> = {
  stumpf: {
    id: "stumpf",
    name: "Stumpfes Kurzschwert",
    quality: "common",
    kind: "weapon",
    spec: "klinge",
    dmg: 3,
    sell: 4,
    stack: 1,
    desc: "Es schneidet noch, wenn man ehrlich schwingt.",
  },
  stecken: {
    id: "stecken",
    name: "Rissiger Stecken",
    quality: "common",
    kind: "weapon",
    spec: "flamme",
    power: 3,
    sell: 4,
    stack: 1,
    desc: "Funken halten sich daran fest.",
  },
  zepter: {
    id: "zepter",
    name: "Abgenutztes Zepter",
    quality: "common",
    kind: "weapon",
    spec: "licht",
    power: 2,
    dmg: 1,
    sell: 4,
    stack: 1,
    desc: "Das Licht kennt den Weg auch ohne Gold.",
  },
  stahl: {
    id: "stahl",
    name: "Geschliffenes Kurzschwert",
    quality: "common",
    kind: "weapon",
    spec: "klinge",
    dmg: 5,
    sell: 40,
    stack: 1,
    desc: "Haldens ehrliche Klinge.",
  },
  kiefer: {
    id: "kiefer",
    name: "Glatter Kiefernstock",
    quality: "common",
    kind: "weapon",
    spec: "flamme",
    power: 5,
    sell: 40,
    stack: 1,
    desc: "Trocken, gerade, willig.",
  },
  blank: {
    id: "blank",
    name: "Blankes Zepter",
    quality: "common",
    kind: "weapon",
    spec: "licht",
    power: 4,
    dmg: 1,
    sell: 40,
    stack: 1,
    desc: "Kein Prunk, nur Gewicht.",
  },
  eichenhauer: {
    id: "eichenhauer",
    name: "Eichenhauer",
    quality: "uncommon",
    kind: "weapon",
    spec: "klinge",
    dmg: 8,
    sell: 90,
    stack: 1,
    desc: "Aus dem Herz einer alten Eiche geschmiedet.",
  },
  funkenzweig: {
    id: "funkenzweig",
    name: "Funkenzweig",
    quality: "uncommon",
    kind: "weapon",
    spec: "flamme",
    power: 8,
    sell: 90,
    stack: 1,
    desc: "Die Rinde glimmt, wenn man zornig wird.",
  },
  morgenzepter: {
    id: "morgenzepter",
    name: "Morgenzepter",
    quality: "uncommon",
    kind: "weapon",
    spec: "licht",
    power: 6,
    dmg: 2,
    sell: 90,
    stack: 1,
    desc: "Wärmt die Hand, bevor es trifft.",
  },
  leinenwams: {
    id: "leinenwams",
    name: "Leinenwams",
    quality: "common",
    kind: "chest",
    armor: 12,
    sell: 25,
    stack: 1,
    desc: "Dicht gewebt. Kein Prunk, aber ehrlich.",
  },
  pelz: {
    id: "pelz",
    name: "Raues Wolfsfell",
    quality: "poor",
    kind: "junk",
    sell: 6,
    stack: 10,
    desc: "Halden kauft es, ohne nach der Geschichte zu fragen.",
  },
  schaerpe: {
    id: "schaerpe",
    name: "Rote Schärpe",
    quality: "poor",
    kind: "junk",
    sell: 12,
    stack: 10,
    desc: "Stoff, der sich für eine Fahne hält.",
  },
  silberblatt: {
    id: "silberblatt",
    name: "Silberblatt",
    quality: "common",
    kind: "quest",
    sell: 0,
    stack: 20,
    desc: "Blätter mit hellem Rand. Lira braucht sie frisch.",
  },
  wegzehrung: {
    id: "wegzehrung",
    name: "Wegzehrung",
    quality: "common",
    kind: "potion",
    heal: 0.36,
    sell: 8,
    stack: 10,
    desc: "Brot und Schmalz. Heilt im Stehen.",
  },
  quellwasser: {
    id: "quellwasser",
    name: "Quellwasser",
    quality: "common",
    kind: "potion",
    resource: 0.4,
    sell: 8,
    stack: 10,
    desc: "Kalt aus dem Brunnen. Füllt Mana, bei der Klinge die Wut.",
  },
};

export const STARTER_WEAPON: Record<Spec, string> = {
  klinge: "stumpf",
  flamme: "stecken",
  licht: "zepter",
};

export const WHITE_WEAPON: Record<Spec, string> = {
  klinge: "stahl",
  flamme: "kiefer",
  licht: "blank",
};

export const GREEN_WEAPON: Record<Spec, string> = {
  klinge: "eichenhauer",
  flamme: "funkenzweig",
  licht: "morgenzepter",
};

export const SPEC_META: Record<Spec, { name: string; resource: "Wut" | "Mana"; line: string }> = {
  klinge: {
    name: "Klinge",
    resource: "Wut",
    line: "Nahkampf. Schläge füllen die Wut, Wut zahlt die Hiebe.",
  },
  flamme: {
    name: "Flamme",
    resource: "Mana",
    line: "Feuer aus der Distanz. Stehen bleiben, dann brennt es.",
  },
  licht: {
    name: "Licht",
    resource: "Mana",
    line: "Heilen und Urteil. Du hältst dich selbst am Leben.",
  },
};

const KLINGE: SpellDef[] = [
  {
    id: "hieb",
    name: "Hieb",
    icon: 0,
    cost: 30,
    cd: 0,
    cast: 0,
    range: 58,
    shape: "strike",
    coef: 1.65,
    blurb: "Ein schwerer Schlag.",
  },
  {
    id: "schildwall",
    name: "Schildwall",
    icon: 1,
    cost: 0,
    cd: 18,
    cast: 0,
    range: 0,
    shape: "buff",
    coef: 0.45,
    duration: 8,
    blurb: "Weniger Schaden für kurze Zeit.",
  },
  {
    id: "kampfschrei",
    name: "Kampfschrei",
    icon: 2,
    cost: 0,
    cd: 24,
    cast: 0,
    range: 0,
    shape: "buff",
    coef: 1.25,
    duration: 10,
    blurb: "Dein Schaden steigt.",
  },
  {
    id: "spalten",
    name: "Spalten",
    icon: 3,
    cost: 20,
    cd: 8,
    cast: 0,
    range: 58,
    shape: "aoe",
    coef: 1.05,
    radius: 78,
    blurb: "Trifft das Ziel und wer daneben steht.",
  },
];

const FLAMME: SpellDef[] = [
  {
    id: "feuerball",
    name: "Feuerball",
    icon: 4,
    cost: 24,
    cd: 0,
    cast: 1.45,
    range: 250,
    shape: "strike",
    coef: 1.5,
    blurb: "Zeit zum Zielen. Tut weh.",
  },
  {
    id: "versengen",
    name: "Versengen",
    icon: 5,
    cost: 16,
    cd: 6,
    cast: 0,
    range: 230,
    shape: "dot",
    coef: 1.15,
    duration: 8,
    blurb: "Das Ziel brennt weiter.",
  },
  {
    id: "barriere",
    name: "Glutbarriere",
    icon: 6,
    cost: 22,
    cd: 16,
    cast: 0,
    range: 0,
    shape: "shield",
    coef: 1.35,
    blurb: "Ein Schild aus Hitze.",
  },
  {
    id: "welle",
    name: "Flammenwelle",
    icon: 7,
    cost: 34,
    cd: 12,
    cast: 1.15,
    range: 0,
    shape: "nova",
    coef: 1.2,
    radius: 124,
    blurb: "Feuer um dich herum.",
  },
];

const LICHT: SpellDef[] = [
  {
    id: "heil",
    name: "Heiliges Licht",
    icon: 8,
    cost: 28,
    cd: 0,
    cast: 1.55,
    range: 0,
    shape: "heal",
    coef: 1.7,
    blurb: "Heilt dich.",
  },
  {
    id: "richtspruch",
    name: "Richtspruch",
    icon: 9,
    cost: 18,
    cd: 6,
    cast: 0,
    range: 220,
    shape: "strike",
    coef: 1.28,
    blurb: "Ein schnelles Urteil.",
  },
  {
    id: "segen",
    name: "Schutzsegen",
    icon: 10,
    cost: 24,
    cd: 18,
    cast: 0,
    range: 0,
    shape: "shield",
    coef: 1.25,
    blurb: "Licht fängt den nächsten Treffer.",
  },
  {
    id: "erquickung",
    name: "Erquickung",
    icon: 11,
    cost: 20,
    cd: 8,
    cast: 0,
    range: 0,
    shape: "hot",
    coef: 1.35,
    duration: 8,
    blurb: "Heilung über kurze Zeit.",
  },
];

export const SPEC_SPELLS: Record<Spec, SpellDef[]> = {
  klinge: KLINGE,
  flamme: FLAMME,
  licht: LICHT,
};

export interface QuestDef {
  id: "wolves" | "herbs" | "bandits";
  title: string;
  giver: string;
  offer: string;
  progress: string;
  done: string;
  objective: string;
  count: number;
  xp: number;
  gold: number;
  requires?: "wolves";
}

export const QUESTS: QuestDef[] = [
  {
    id: "wolves",
    title: "Dornen am Zaun",
    giver: "mara",
    offer:
      "Die Dornenwölfe haben vergessen, den Zaun zu fürchten. Sechs, nördlich im Dornwald. Bring mir Gewissheit, nicht ihre Köpfe.",
    progress: "Der Wald ist noch laut. Sechs Wölfe.",
    done: "Der Zaun atmet auf. Nimm das. Im Osten flattern rote Schärpen, das sind keine Nachbarn.",
    objective: "Dornenwölfe",
    count: 6,
    xp: 90,
    gold: 80,
  },
  {
    id: "herbs",
    title: "Silberblatt für Lira",
    giver: "lira",
    offer:
      "Die Salbe für die Holzfäller braucht Silberblatt. Vier Büschel, unzerdrückt. Heller Blattrand, westlich am Teich.",
    progress: "Vier Büschel. Nicht mehr welk als du.",
    done: "Frisch genug. Das Wams ist ehrlich gewebt, kein Prunk.",
    objective: "Silberblatt",
    count: 4,
    xp: 70,
    gold: 45,
  },
  {
    id: "bandits",
    title: "Rote Schärpen",
    giver: "mara",
    requires: "wolves",
    offer:
      "Sie nennen sich eine Kompanie. Sind aber Messer mit Stoff drum. Fünf am Ostrand, dann ist der Weg wieder ein Weg.",
    progress: "Fünf Schärpen. Der Weg wartet.",
    done: "Gut. Die Wacht zahlt nicht in Liedern.",
    objective: "Rotschärpen",
    count: 5,
    xp: 150,
    gold: 140,
  },
];

export function xpToNext(level: number) {
  return 55 + (level - 1) * 42 + (level - 1) * (level - 1) * 12;
}

export function maxHp(level: number, spec: Spec) {
  const base = 52 + (level - 1) * 18;
  return spec === "klinge" ? Math.round(base * 1.28) : base;
}

export function maxResource(level: number, spec: Spec) {
  if (spec === "klinge") return 100;
  return 80 + (level - 1) * 14;
}

export function weaponDamage(level: number, weapon: ItemDef | null) {
  return 4 + level * 1.35 + (weapon?.dmg ?? 0);
}

export function spellPower(level: number, weapon: ItemDef | null) {
  return 7 + level * 1.75 + (weapon?.power ?? 0);
}

export function armorOf(level: number, chest: ItemDef | null, spec: Spec) {
  return 4 + level * 2 + (chest?.armor ?? 0) + (spec === "klinge" ? 6 : 0);
}

export function coins(copper: number) {
  const sign = copper < 0 ? -1 : 1;
  const v = Math.abs(copper);
  return {
    g: Math.floor(v / 10000) * sign,
    s: Math.floor((v % 10000) / 100) * sign,
    c: (v % 100) * sign,
  };
}

export const GOSSIP: Record<string, string> = {
  mara: "Ich halte diese Straße, seit das alte Tor schwieg. Kronwacht ist kein Reich mehr. Nur ein Versprechen zwischen den Eichen.",
  halden: "Brot, Wasser, Stahl. Was die Wacht braucht, liegt in der Kiste. Was sie nicht braucht, kaufe ich trotzdem.",
  lira: "Die Wunden hier sind klein, bis sie es nicht mehr sind. Komm, bevor das Blut die Entscheidung trifft.",
};
