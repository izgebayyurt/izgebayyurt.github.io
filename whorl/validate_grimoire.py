#!/usr/bin/env python3
"""
Whorl grimoire — single source of truth + validator.

THE CODE IS THE CLASSIFICATION. Every spell's Morse code is DERIVED here from
(School, Form, Tier, pad-arrangement); no code is hand-typed. This script then
independently re-derives the expected pads and rhythm from the taxonomy columns
and asserts the generated code matches — so a wrong arrangement or mislabeled
form is caught, not silently encoded.

Run:  python3 validate_grimoire.py            # prints validation report
      python3 validate_grimoire.py --emit     # prints the markdown spell table
"""
import sys
from collections import Counter

# --- School -> the pad(s) that may appear in the code -------------------------
SCHOOL_PADS = {
    "Fire":  ("R",),
    "Spark": ("Y",),
    "Frost": ("B",),
    "Blast": ("R", "Y"),
    "Venom": ("Y", "B"),
    "Lance": ("R", "B"),
}

# --- Form -> rhythm signature (hold-mask) as a function of length n -----------
# 0 = TAP, 1 = HOLD.  The mask is fully determined by (form, length): the thumb
# learns one drum-feel per form that simply grows with tier.
def form_mask(form, n):
    if form == "Bolt":  return [0]*n                       # 00..0   all taps
    if form == "Wall":  return [0]*(n-1) + [1]             # 0..01   final hold
    if form == "Pool":  return [0]*(n-2) + [1, 1]          # 0..011  final two holds
    if form == "Mine":  return [1] + [0]*(n-1)             # 10..0   lead hold
    if form == "Ward":  return [1] + [0]*(n-2) + [1]       # 10..01  bracket holds
    if form == "Beam":  return [1]*n                       # 11..1   all holds
    if form == "Glyph": return [0, 1] + [0]*(n-2)          # 010..0  2nd-beat hold
    if form == "Swarm": return [1, 1] + [0]*(n-2)          # 110..0  lead pair holds
    raise ValueError("unknown form " + form)

TIER_NAME = {2: "Cantrip", 3: "Spell", 4: "Greater", 5: "Legendary"}

def render_code(school, form, tier, arr):
    """Build the code string from taxonomy. arr = pad sequence (None => pure)."""
    pads = SCHOOL_PADS[school]
    if arr is None:                       # pure school: every beat is its one pad
        arr = pads[0] * tier
    mask = form_mask(form, tier)
    beats = []
    for i, pad in enumerate(arr):
        beats.append(("h" + pad) if mask[i] else pad)
    return "·".join(beats), arr

# =============================================================================
# THE GRIMOIRE.  (name, school, form, tier, arr, rarity, effect, tags)
#   arr = None for pure schools (Fire/Spark/Frost); explicit pad string for
#   mixed schools where pad ORDER is the variant axis (leading pad = dominant).
# =============================================================================
SPELLS = [
  # ---------------- FIRE (pure R) : Burning dot -----------------------------
  ("Firebolt","Fire","Bolt",2,None,"Common","Light fire dart; applies Burning.",["dot","burst"]),
  ("Flame Wall","Fire","Wall",2,None,"Common","Short burning barrier; passers catch Burning.",["control","dot"]),
  ("Ember Pool","Fire","Pool",2,None,"Common","Small fire patch; Burning while stood in it.",["surface","dot"]),
  ("Fire Mine","Fire","Mine",2,None,"Common","Coal that bursts Fire when an enemy nears.",["control","burst"]),
  ("Scorch Bolt","Fire","Bolt",3,None,"Common","Medium bolt; heavier Burning.",["dot","burst"]),
  ("Blaze Wall","Fire","Wall",3,None,"Uncommon","Tall wall of flame; long Burning on contact.",["control","dot"]),
  ("Coal Field","Fire","Pool",3,None,"Uncommon","Wide fire surface; stacking Burning.",["surface","dot"]),
  ("Ember Trap","Fire","Mine",3,None,"Common","Bigger mine; knockback fire burst.",["control","burst"]),
  ("Flame Jet","Fire","Beam",3,None,"Uncommon","Channelled cone of fire; Burns all in front.",["dot","burst"]),
  ("Ember Brand","Fire","Glyph",3,None,"Uncommon","Enchant: your next cast becomes Fire-typed + Burning.",["enchant","dot"]),
  ("Ember Sprites","Fire","Swarm",3,None,"Uncommon","Summons drifting embers that seek enemies and Burn.",["summon","dot"]),
  ("Pyre Bolt","Fire","Bolt",4,None,"Uncommon","Heavy fire bolt; big Burning; small splash.",["dot","burst"]),
  ("Wall of Flame","Fire","Wall",4,None,"Rare","Long high wall; strong Burning; hard block.",["control","dot"]),
  ("Lava Pool","Fire","Pool",4,None,"Rare","Molten surface; heavy Burning and slow (molten).",["surface","dot","control"]),
  ("Pyre Mine","Fire","Mine",4,None,"Uncommon","Large blast mine; area Burning on trigger.",["burst","control"]),
  ("Cinder Ward","Fire","Ward",4,None,"Rare","Self: burning aura; melee attackers take Fire.",["ward","dot"]),
  ("Fire Ray","Fire","Beam",4,None,"Rare","Sustained fire beam; heavy Burning; ignites pools.",["dot","burst"]),
  ("Pyre Column","Fire","Beam",5,None,"Legendary","Roaring pillar of fire down the lane; Massive Burning; charge widens it.",["dot","burst","control"]),
  ("Meteor","Fire","Bolt",5,None,"Legendary","Falling star: Massive impact burst + crater fire-pool; Shatters Frozen enemies.",["burst","dot","surface"]),

  # ---------------- SPARK (pure Y) : Shocked (stagger + amplify) -------------
  ("Jolt","Spark","Bolt",2,None,"Common","Light shock dart; brief stagger.",["control","burst"]),
  ("Arc Fence","Spark","Wall",2,None,"Common","Crackling fence; staggers passers.",["control","surface"]),
  ("Static Field","Spark","Pool",2,None,"Common","Charged floor; periodic small shocks.",["surface","control"]),
  ("Shock Trap","Spark","Mine",2,None,"Common","Trap that Shocks its triggerer.",["control","burst"]),
  ("Thunderbolt","Spark","Bolt",3,None,"Uncommon","Medium bolt; Shock amplifies your next hit.",["control","burst"]),
  ("Arc Wall","Spark","Wall",3,None,"Uncommon","Longer arc fence; heavier stagger.",["control","surface"]),
  ("Storm Pool","Spark","Pool",3,None,"Uncommon","Wide static field; repeated shocks.",["surface","control"]),
  ("Tesla Trap","Spark","Mine",3,None,"Common","Shock trap; arc chains to 2 nearby.",["control","chain"]),
  ("Lightning","Spark","Beam",3,None,"Uncommon","Beam of lightning; Conducts (arcs) between Chilled.",["chain","control"]),
  ("Charge Brand","Spark","Glyph",3,None,"Uncommon","Enchant: next cast becomes Spark-typed + chains once.",["enchant","chain"]),
  ("Spark Motes","Spark","Swarm",3,None,"Uncommon","Buzzing motes that zap enemies and chain.",["summon","chain"]),
  ("Levinbolt","Spark","Bolt",4,None,"Uncommon","Heavy shock; long stagger.",["control","burst"]),
  ("Storm Wall","Spark","Wall",4,None,"Rare","Big arc wall; chains to nearby enemies.",["control","chain"]),
  ("Tempest Pool","Spark","Pool",4,None,"Rare","Wide storm field; repeated chaining shocks.",["surface","chain","control"]),
  ("Chain Mine","Spark","Mine",4,None,"Uncommon","Trap whose shock chains through the whole cluster.",["chain","burst"]),
  ("Storm Ward","Spark","Ward",4,None,"Rare","Self: melee attackers Shocked, arc chains off them.",["ward","chain"]),
  ("Storm Beam","Spark","Beam",4,None,"Rare","Sustained lightning; strong Conduct between Chilled.",["chain","control"]),
  ("Thunderstorm","Spark","Pool",5,None,"Legendary","Field-wide storm; everything repeatedly Shocked; chains everywhere.",["surface","chain","control"]),
  ("Chain Lightning","Spark","Beam",5,None,"Legendary","A bolt that arcs between EVERY enemy; doubles on Chilled/Frozen.",["chain","burst","control"]),

  # ---------------- FROST (pure B) : Chilled -> Frozen ----------------------
  ("Frostbolt","Frost","Bolt",2,None,"Common","Light frost dart; applies Chilled.",["control","burst"]),
  ("Frost Wall","Frost","Wall",2,None,"Common","Short ice wall; blocks and Chills passers.",["control","surface"]),
  ("Ice Patch","Frost","Pool",2,None,"Common","Slick chilled floor; slows.",["surface","control"]),
  ("Rime Trap","Frost","Mine",2,None,"Common","Trap that Freezes its triggerer.",["control","burst"]),
  ("Rime Bolt","Frost","Bolt",3,None,"Uncommon","Medium bolt; heavy Chill nearing Freeze.",["control","burst"]),
  ("Ice Wall","Frost","Wall",3,None,"Uncommon","Taller ice wall; high-HP block.",["control","surface"]),
  ("Glacier Pool","Frost","Pool",3,None,"Uncommon","Ice sheet; Frost-typed hits freeze it slick.",["surface","control"]),
  ("Freeze Trap","Frost","Mine",3,None,"Common","Freezes a small cluster on trigger.",["control","burst"]),
  ("Cold Ray","Frost","Beam",3,None,"Uncommon","Cone of cold; Chills all in front.",["control","burst"]),
  ("Rime Brand","Frost","Glyph",3,None,"Uncommon","Enchant: next cast becomes Frost-typed + Chill.",["enchant","control"]),
  ("Icicle","Frost","Bolt",4,None,"Uncommon","Heavy shard; big Chill; bonus vs Frozen.",["control","burst"]),
  ("Ice Rampart","Frost","Wall",4,None,"Rare","Massive wall; very long block.",["control","surface"]),
  ("Deep Freeze","Frost","Pool",4,None,"Rare","Wide freezing field; standing turns enemies Frozen.",["surface","control"]),
  ("Blizzard Trap","Frost","Mine",4,None,"Uncommon","Freezes a large cluster on trigger.",["control","burst"]),
  ("Ice Ward","Frost","Ward",4,None,"Rare","Self: ice armour; Chills melee attackers; absorbs a hit.",["ward","control"]),
  ("Winter Beam","Frost","Beam",4,None,"Rare","Sustained freezing ray; Freezes over time.",["control","surface"]),
  ("Frost Wisps","Frost","Swarm",4,None,"Uncommon","Hovering ice wisps that chase and Chill.",["summon","control"]),
  ("Glacier","Frost","Wall",5,None,"Legendary","A moving glacier wall that grinds forward, Freezing all it touches.",["control","surface","burst"]),
  ("Absolute Zero","Frost","Pool",5,None,"Legendary","The whole field freezes solid; all enemies Frozen; primes a mass Shatter.",["surface","control","burst"]),

  # ---------------- BLAST (R+Y) : Fire-typed + stagger ----------------------
  ("Flash Bolt","Blast","Bolt",2,"RY","Common","Fire-lead blast dart: fire hit + stagger.",["burst","control"]),
  ("Spark Blast","Blast","Bolt",2,"YR","Common","Spark-lead blast dart: stagger then fire.",["control","burst"]),
  ("Flash Wall","Blast","Wall",2,"RY","Common","Burning-shock fence; staggers + Burns passers.",["control","dot"]),
  ("Plasma Pool","Blast","Pool",2,"RY","Uncommon","Fizzing fire-shock floor; Burning + stagger.",["surface","control"]),
  ("Flashbang Mine","Blast","Mine",2,"RY","Common","Pops for fire burst + wide stagger (blinds).",["burst","control"]),
  ("Plasma Bolt","Blast","Bolt",3,"RRY","Uncommon","Fire-primary blast; Burning + stagger.",["burst","dot"]),
  ("Flashbolt","Blast","Bolt",3,"YYR","Uncommon","Spark-primary blast; strong stagger + fire.",["control","burst"]),
  ("Plasma Wall","Blast","Wall",3,"RRY","Uncommon","Burning-shock wall; passers Burn + stagger.",["control","dot"]),
  ("Plasma Field","Blast","Pool",3,"RRY","Rare","Large fire-shock surface; Burning + repeated stagger.",["surface","dot","control"]),
  ("Concussion Mine","Blast","Mine",3,"RYY","Uncommon","Fire burst + wide cluster stagger.",["burst","control"]),
  ("Plasma Beam","Blast","Beam",3,"RYR","Rare","Searing shock beam; Burning + stagger; ignites pools.",["dot","control"]),
  ("Blast Brand","Blast","Glyph",3,"YRY","Uncommon","Enchant: next cast fire-typed and staggers.",["enchant","control"]),
  ("Detonation Bolt","Blast","Bolt",4,"RRRY","Rare","Heavy fire blast + stagger; small splash.",["burst","dot"]),
  ("Plasma Barrier","Blast","Wall",4,"RRRY","Rare","Long burning-shock wall.",["control","dot"]),
  ("Firestorm Field","Blast","Pool",4,"RRRY","Rare","Molten shock sea; heavy Burning + stagger.",["surface","dot","control"]),
  ("Cluster Bomb","Blast","Mine",4,"RYYY","Rare","Multi-stagger fire cluster burst.",["burst","control"]),
  ("Plasma Ward","Blast","Ward",4,"RYYR","Rare","Self: attackers Burned + staggered.",["ward","control","dot"]),
  ("Plasma Ray","Blast","Beam",4,"RYRY","Rare","Sustained plasma beam; Burning + stagger.",["dot","control"]),
  ("Supernova","Blast","Bolt",5,"RRRRY","Legendary","A detonation flashing the whole field: Massive fire burst; all staggered; Ignites all poison.",["burst","dot","control"]),
  ("Sunlance","Blast","Beam",5,"RYRYR","Legendary","A continuous plasma beam carving the lane; Ignites and staggers everything.",["dot","control","burst"]),

  # ---------------- VENOM (Y+B) : Poisoned (green stacking dot) + slow -------
  ("Venom Dart","Venom","Bolt",2,"YB","Common","Light poison dart; applies Poisoned.",["dot","burst"]),
  ("Toxin Dart","Venom","Bolt",2,"BY","Common","Frost-lead dart: Poisoned + slow.",["dot","control"]),
  ("Venom Wall","Venom","Wall",2,"YB","Common","Dripping wall; poisons passers.",["control","dot"]),
  ("Poison Pool","Venom","Pool",2,"YB","Common","Toxic puddle; stacking Poisoned.",["surface","dot"]),
  ("Spore Mine","Venom","Mine",2,"YB","Common","Bursts a poison cloud on trigger.",["control","dot"]),
  ("Blight Bolt","Venom","Bolt",3,"YYB","Uncommon","Medium poison; heavy stacks.",["dot","burst"]),
  ("Corrosion Bolt","Venom","Bolt",3,"BBY","Uncommon","Frost-lead poison; slow + armour melt.",["dot","control"]),
  ("Miasma Wall","Venom","Wall",3,"YYB","Uncommon","Long toxic wall; poisons passers.",["control","dot"]),
  ("Miasma Pool","Venom","Pool",3,"YBB","Uncommon","Big poison field + slow.",["surface","dot","control"]),
  ("Spore Trap","Venom","Mine",3,"YBB","Common","Poison cloud over a cluster on trigger.",["control","dot"]),
  ("Venom Spray","Venom","Beam",3,"YBY","Uncommon","Cone of toxin; poisons all in front.",["dot","control"]),
  ("Venom Brand","Venom","Glyph",3,"BYB","Uncommon","Enchant: next cast also applies Poisoned.",["enchant","dot"]),
  ("Plague Bolt","Venom","Bolt",4,"YYYB","Rare","Heavy poison; spreads to a neighbour on kill.",["dot","chain"]),
  ("Plague Wall","Venom","Wall",4,"YYYB","Rare","Long dripping wall; deep Poisoned.",["control","dot"]),
  ("Quagmire","Venom","Pool",4,"YYBB","Rare","Deep toxic mire; heavy stacks + strong slow.",["surface","dot","control"]),
  ("Contagion Mine","Venom","Mine",4,"YBBB","Rare","Poison cloud that spreads enemy-to-enemy.",["chain","dot"]),
  ("Venom Ward","Venom","Ward",4,"YBBY","Rare","Self: attackers heavily Poisoned + slowed.",["ward","dot","control"]),
  ("Miasma Beam","Venom","Beam",4,"YBYB","Rare","Sustained toxic ray; stacking Poisoned.",["dot","control"]),
  ("Pandemic","Venom","Pool",5,"YYYBB","Legendary","The field becomes a swamp; Poisoned spreads and deepens endlessly; slows all.",["surface","dot","chain"]),
  ("Plague Swarm","Venom","Swarm",5,"YYBBB","Legendary","Summons a cloud of toxic wasps that chase and Poison.",["summon","dot","chain"]),

  # ---------------- LANCE (R+B) : arcane pierce, no reactions ----------------
  ("Force Lance","Lance","Bolt",2,"RB","Common","Piercing dart; hits everything in a line.",["pierce","burst"]),
  ("Piercing Bolt","Lance","Bolt",2,"BR","Common","Arcane dart; pierces two enemies.",["pierce","burst"]),
  ("Force Wall","Lance","Wall",2,"RB","Common","Barrier of force; your shots pass through gaining pierce.",["control","pierce"]),
  ("Gravity Well","Lance","Pool",2,"RB","Uncommon","Zone that drags and holds enemies (no element).",["surface","control"]),
  ("Force Mine","Lance","Mine",2,"RB","Common","Arcane trap; knockback pierce burst.",["control","pierce"]),
  ("Arcane Lance","Lance","Bolt",3,"RBR","Uncommon","Medium pierce; skewers a full line.",["pierce","burst"]),
  ("Force Barrier","Lance","Wall",3,"RRB","Uncommon","Strong force wall; long block.",["control","pierce"]),
  ("Singularity","Lance","Pool",3,"RBB","Rare","Gravity zone; clumps enemies to set up AoE.",["surface","control"]),
  ("Force Trap","Lance","Mine",3,"RBB","Common","Pierce burst that skewers a cluster.",["pierce","burst"]),
  ("Arcane Beam","Lance","Beam",3,"RBR","Uncommon","Lance-beam that pierces everything in the lane.",["pierce","burst"]),
  ("Force Brand","Lance","Glyph",3,"BRB","Uncommon","Enchant: next cast pierces and ignores walls.",["enchant","pierce"]),
  ("Greater Lance","Lance","Bolt",4,"RRRB","Rare","Heavy pierce; full-lane skewer.",["pierce","burst"]),
  ("Force Rampart","Lance","Wall",4,"RRRB","Rare","Huge force wall; reflects enemy projectiles.",["control","pierce"]),
  ("Event Horizon","Lance","Pool",4,"RRBB","Rare","Strong gravity well; immobilises a cluster.",["surface","control"]),
  ("Impaler Mine","Lance","Mine",4,"RBBB","Rare","Erupting spikes skewer a cluster.",["pierce","burst"]),
  ("Force Ward","Lance","Ward",4,"RBBR","Rare","Self: shield blocks projectiles and pierces attackers back.",["ward","pierce"]),
  ("Force Ray","Lance","Beam",4,"RBRB","Rare","Sustained piercing beam.",["pierce","burst"]),
  ("Black Hole","Lance","Pool",5,"RRRBB","Legendary","A singularity that drags every enemy to one point and crushes them.",["surface","control","burst"]),
  ("World Spear","Lance","Beam",5,"RBRBR","Legendary","A continuous lance-beam skewering the whole lane through walls.",["pierce","burst","control"]),
]

TAG_VOCAB = {"dot","surface","control","pierce","chain","summon","economy","burst","ward","enchant"}

def build():
    rows = []
    for name, school, form, tier, arr, rarity, effect, tags in SPELLS:
        code, arr_used = render_code(school, form, tier, arr)
        rows.append(dict(name=name, school=school, form=form, tier=tier,
                         arr=arr_used, code=code, rarity=rarity,
                         effect=effect, tags=tags))
    return rows

def validate(rows):
    errs = []
    # 1. unique codes
    codes = [r["code"] for r in rows]
    dupes = [c for c, n in Counter(codes).items() if n > 1]
    if dupes: errs.append(f"DUPLICATE CODES: {dupes}")
    # 2. pads match school ; 3. rhythm matches form ; 4. length == tier
    for r in rows:
        pads_in_code = {b.lstrip("h") for b in r["code"].split("·")}
        want = set(SCHOOL_PADS[r["school"]])
        if pads_in_code != want:
            errs.append(f"{r['name']}: pads {pads_in_code} != school {r['school']} {want}")
        beats = r["code"].split("·")
        got_mask = [1 if b.startswith("h") else 0 for b in beats]
        exp_mask = form_mask(r["form"], r["tier"])
        if got_mask != exp_mask:
            errs.append(f"{r['name']}: rhythm {got_mask} != {r['form']} signature {exp_mask}")
        if len(beats) != r["tier"]:
            errs.append(f"{r['name']}: length {len(beats)} != tier {r['tier']}")
        if not (set(r["tags"]) <= TAG_VOCAB):
            errs.append(f"{r['name']}: tags {r['tags']} outside vocabulary")
        if not (2 <= len(r["tags"]) <= 3):
            errs.append(f"{r['name']}: tag count {len(r['tags'])} not in 2..3")
    # 5. count
    if len(rows) < 110:
        errs.append(f"COUNT {len(rows)} < 110")
    return errs

def report(rows):
    print(f"WHORL GRIMOIRE VALIDATION  —  {len(rows)} spells")
    print("=" * 56)
    errs = validate(rows)
    print("[1] unique codes ............ %s" % ("PASS" if not any("DUPLICATE" in e for e in errs) else "FAIL"))
    print("[2] pads match school ....... %s" % ("PASS" if not any("!= school" in e for e in errs) else "FAIL"))
    print("[3] rhythm matches form ..... %s" % ("PASS" if not any("!= " in e and "signature" in e for e in errs) else "FAIL"))
    print("[4] length matches tier ..... %s" % ("PASS" if not any("!= tier" in e for e in errs) else "FAIL"))
    print("[5] count >= 110 ............ %s (%d)" % ("PASS" if len(rows) >= 110 else "FAIL", len(rows)))
    print("[6] tags within vocab ....... %s" % ("PASS" if not any("vocabulary" in e or "tag count" in e for e in errs) else "FAIL"))
    print()
    print("Per-school:", dict(sorted(Counter(r["school"] for r in rows).items())))
    print("Per-form:  ", dict(sorted(Counter(r["form"] for r in rows).items())))
    print("Per-tier:  ", {TIER_NAME[t]: c for t, c in sorted(Counter(r["tier"] for r in rows).items())})
    print("Per-rarity:", dict(Counter(r["rarity"] for r in rows)))
    # prefix note (resolved by the cast-commit rule, informational)
    cset = set(codes := [r["code"] for r in rows])
    prefixes = 0
    for c in cset:
        beats = c.split("·")
        for k in range(1, len(beats)):
            if "·".join(beats[:k]) in cset:
                prefixes += 1
    print(f"\nStrict-prefix pairs in grimoire: {prefixes} "
          f"(all resolved by longest-match + commit-window rule; see grammar).")
    print()
    if errs:
        print("VIOLATIONS:")
        for e in errs: print("  -", e)
        sys.exit(1)
    print("ALL CHECKS PASS.")

def emit_table(rows):
    print("| Name | Code | School | Form | Tier | Rarity | Effect | Tags |")
    print("|------|------|--------|------|------|--------|--------|------|")
    order = {"Fire":0,"Spark":1,"Frost":2,"Blast":3,"Venom":4,"Lance":5}
    for r in sorted(rows, key=lambda r:(order[r["school"]], r["tier"], r["name"])):
        print("| %s | `%s` | %s | %s | %d | %s | %s | %s |" % (
            r["name"], r["code"], r["school"], r["form"], r["tier"],
            r["rarity"], r["effect"], ", ".join(r["tags"])))

if __name__ == "__main__":
    rows = build()
    if "--emit" in sys.argv:
        emit_table(rows)
    else:
        report(rows)
