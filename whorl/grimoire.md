# WHORL — The Grimoire

*Content bible. Portrait mobile roguelike-deckbuilder. Enemies march down an open
lane toward the wizard; you cast by drumming Morse-style codes on three coloured
pads — **R (Fire), Y (Spark), B (Frost)** — at the bottom of the screen.*

**House law — information is free.** No hidden mechanics, no lore-jargon. Every
name is plain physical language (Firebolt, Frost Wall, Black Hole). Every
interaction below is a *class rule* you can read once and know forever.

**The one non-negotiable — THE CODE IS THE CLASSIFICATION.** A spell's code is
not decoration; it *is* its taxonomy, read straight off the pads:

| Axis | Reads from | Values |
|------|-----------|--------|
| **School** | *which pads* appear | R=Fire · Y=Spark · B=Frost · R+Y=Blast · Y+B=Venom · R+B=Lance |
| **Form** | the *rhythm* (tap/hold pattern) | Bolt · Wall · Pool · Mine · Ward · Beam · Glyph · Swarm |
| **Tier** | *code length* in beats | 2=Cantrip · 3=Spell · 4=Greater · 5=Legendary |
| **Variant** | pad *order* (mixed schools only) | leading pad = dominant element |

Notation: a beat is a **tap** (bare pad letter) or a **hold** (`h`+letter),
joined by `·`. Example: `R·Y·hR` = tap R, tap Y, hold R.

---

## 1 · THE ELEMENT CARD

Three elements, four statuses, one reaction matrix. Memorize this and you have
read the whole combat model.

### Elements → the status each infuses

| Pad | Element | Status infused | What the status does |
|-----|---------|----------------|----------------------|
| **R** | Fire | **Burning** | damage-over-time (dot); stacks refresh & deepen |
| **Y** | Spark | **Shocked** | brief stagger (halts advance) **+ target takes amplified damage** while shocked |
| **B** | Frost | **Chilled → Frozen** | Chilled slows; a second frost lands **Frozen** (fully stopped) |

*Statuses are applied by **hold-forms only** (Walls, Pools, Mines, Wards, Beams,
Swarms — §2). Bolts (the all-tap form) strike plain: see the raw-hit card below.
**Taps strike, holds infuse.***

### Mixed schools — what they apply / inherit (both parents, legibly)

| School | Pads | Damage type | Applies / property | Inherits |
|--------|------|-------------|--------------------|----------|
| **Blast** | R+Y | **Fire-typed** (triggers Fire reactions) | hold-forms infuse Burning; **KNOCKBACK — every Blast hit physically shoves enemies back down the lane** (heavier hits shove further; charge scales it) | Fire's heat + Spark's jolt → concussive force |
| **Venom** | Y+B | neutral (sets up, doesn't self-react) | hold-forms infuse **Poisoned** — its own status: a **green stacking dot** that ramps with stacks | + a mild slow from its Frost parent (clammy) |
| **Lance** | R+B | **Arcane** — reaction-free | nothing; **pierces** a line, ignores cover | opposing Fire/Frost cancel into raw force → penetration |

Design pillars that fall out of this: **Lance is the only reaction-free tool**
(reliable pierce, never fizzles a combo). **Venom is the only setup dot** others
detonate. **Blast is the fire-that-shoves** — plain damage and lane control in one.

### The reaction matrix — element **hit** × target **status**

*Every cell defined. "—" means no special reaction (the status still does its own
job; e.g. hitting a Shocked target still deals amplified damage).*

| Hit ↓ / Status → | **Burning** | **Shocked** | **Chilled** | **Frozen** | **Poisoned** |
|------------------|-------------|-------------|-------------|------------|--------------|
| **Fire** (R, Blast) | **STOKE** — refresh + deepen dot | — | **THAW** — clears Chill (heat cancels cold) | **SHATTER** — consume Frozen for an icy burst (AoE) | **IGNITE** — consume poison stacks for an explosion; bigger per stack |
| **Spark** (Y) | — | **OVERLOAD** — extend stagger + small burst | **CONDUCT** — arc chains between all Chilled | **CONDUCT+** — Frozen bodies conduct best: +1 chain jump | — |
| **Frost** (B) | **QUENCH** — douse the fire; emit **smoke** (attackers miss / blind aura) | — | **DEEPEN** — Chilled → Frozen | **REFREEZE** — extend Frozen duration | **CONGEAL** — freeze the poison in place: stacks locked, persist through cleanse |
| **Arcane** (Lance) | — | — | — | — | — |
| **Poison** (Venom hit) | — | — | — | — | **STACK** — add a green stack (ramps dot) |

Reading aid: **Fire finishes** (Shatter/Ignite/Stoke). **Spark spreads** on cold
(Conduct). **Frost converts & locks** (Deepen/Congeal). **Lance never reacts** —
it just pierces. Venom only ever adds to itself; *others* cash it in.

### Raw hits — what a plain typed hit (a tap/Bolt) does beyond damage

*One rule: a raw hit triggers the reaction **matrix** above but never applies a
**new** status. Deepen counts as a matrix reaction, so a Frost hit CAN tip an
existing Chill into Frozen — it just can't start the Chill.*

| Raw hit | Beyond the damage |
|---------|-------------------|
| **Fire** | triggers its matrix row: Stoke, Shatter, Ignite |
| **Spark** | amplified vs Shocked; Conducts on Chilled/Frozen |
| **Frost** | Deepens an existing Chill → Frozen (never starts one) |
| **Blast** | knockback shove; triggers Fire's matrix row |
| **Venom** | **corrodes** — bonus damage to armoured targets |
| **Lance** | pierces; reaction-free |

---

## 2 · THE FORM TAXONOMY (8 forms)

Each form = a delivery geometry + **one rhythm signature** (a hold-mask that is
the same feel at every tier, just longer) + **class-level interaction rules**.
These class rules are the *only* interaction system — individual spells never get
bespoke interaction text.

**Class law — TAPS STRIKE, HOLDS INFUSE.** Status application is a hold-form
property: every form containing a hold (Wall, Pool, Mine, Ward, Beam, Swarm)
applies its school's status through its geometry below; Glyphs enchant. Bolts —
the one all-tap form — never apply a status; they hit harder instead.

The signature is written over beats as `t`=tap, `h`=hold. The **final hold** (if
the form ends in one) is the charge/release moment (see §3).

| Form | Geometry | Signature (feel) | Masks 2·3·4·5 | Class interaction rules |
|------|----------|------------------|----------------|-------------------------|
| **Bolt** | single-target projectile down the lane | **all taps** | `tt`·`ttt`·`tttt`·`ttttt` | Fast, no charge (fires on commit). **Applies NO status** — the plain-damage strike, one damage class harder than hold-forms of its tier. Still element-typed on impact, so it **triggers** reactions (a Fire bolt still Shatters a Frozen target, Ignites a Poisoned one) — it just never applies one. The only form with zero holds — a single hold means "not a Bolt." |
| **Wall** | placed line across the lane | **taps, final hold** | `th`·`tth`·`ttth`·`tttth` | Blocks enemy movement & their projectiles. **Your** projectiles pass through, gaining the wall's element — an infusion: the shot now applies the wall's status. Charge extends its length. |
| **Pool** | lingering surface zone on the ground | **final two holds** | `hh`·`thh`·`tthh`·`ttthh` | A **surface**: applies its status to anything standing in it. Surfaces take on elements: a **fire-typed** hit *ignites* a pool, a **frost-typed** hit *freezes it into slick ice*, a spark hit *electrifies* it. Charge extends size/duration. |
| **Mine** | planted trigger on the ground | **lead hold** (arm), then taps | `ht`·`htt`·`httt`·`htttt` | **Trigger**: detonates when an enemy enters its radius **or** when its school's element next lands nearby (chain-detonation). Delivers a burst of its school. |
| **Ward** | self-centred aura / shield | **bracket: first & last hold** | —·`hth`·`htth`·`httth` | Self-buff around the wizard. Melee attackers suffer the ward's status; many absorb one hit. Tier ≥3. |
| **Beam** | sustained channel / pierce line | **all holds** | —·`hhh`·`hhhh`·`hhhhh` | Channelled: sweeps everything in front for the hold's duration; naturally **ignites/freezes/electrifies** surfaces it crosses. Charge = length/pierce depth. Tier ≥3. |
| **Glyph** | enchant-next-cast | **2nd-beat hold** | —·`tht`·`thtt`·`thttt` | **Enchant**: does not fire; modifies your **next cast**, adding this glyph's school/status (and its variant twist). Consumed by the next spell. Tier ≥3. |
| **Swarm** | summoned seeking motes | **lead pair holds** | —·`hht`·`hhtt`·`hhttt` | **Summon**: spawns N drifting motes that seek enemies and apply the school's status on contact, then expire. Tier ≥3. |

**Why the masks never collide.** At tier-3 the eight forms are *exactly the eight
possible 3-beat rhythms* (000…111) — a clean bijection, so a Spell's form is
unmistakable from its drum-feel. At tier-2 only the four hold-simple forms exist
(Bolt/Wall/Pool/Mine — the 4 possible 2-beat rhythms); Ward/Beam/Glyph/Swarm are
"advanced" forms unlocked at tier ≥3. The mask is fully determined by
(form, tier), so a code's rhythm alone names its form and tier.

---

## 3 · THE CODE GRAMMAR (the half-page a player internalizes)

**Build a code in four reads:**

1. **School = the pads.** One colour = pure school (all R → Fire). Two colours =
   mixed school (R+Y → Blast, Y+B → Venom, R+B → Lance). *Which* pads, nothing
   else.
2. **Form = the rhythm.** Lay the form's hold-mask over the beats (table §2).
   Bolt = drum it out flat; Wall = end on a held beat; Pool = end on two held
   beats; Mine = start held; Ward = held-ends-only; Beam = hold the whole thing;
   Glyph = one held beat in slot 2; Swarm = hold the first pair.
3. **Tier = length.** 2 beats cantrip, 3 spell, 4 greater, 5 legendary (rare).
4. **Variant = order** (mixed only). The **leading pad is the dominant element**
   and the **majority pad the primary**: `R·R·Y` (Plasma Bolt) is fire-primary;
   `Y·Y·R` (Flashbolt) is spark-primary. Pure schools have no order variants —
   their variety comes from form × tier.

**Taps strike, holds infuse.** A code with no holds (Bolt) is the plain-damage
strike — no status, bigger numbers. Any code containing holds applies its
school's status through its form's geometry. Raw taps still *trigger* the
reaction matrix on whatever statuses are already there — **holds set up, taps
cash in.**

**Charge-on-final-hold.** If a code's last beat is a **hold** (Wall, Pool, Ward,
Beam), keep holding past release to **charge** — magnitude scales up to ~1 s,
released on lift. Forms that end in a tap (Bolt, Mine, Glyph, Swarm) fire at base
power the instant the cast commits — the twitchy, uncharged options.

**Cast-commit rule (one clean mechanism).** You drum beats as a continuous
stream. The engine keeps the running beat-list and commits when a **commit
window** (~250 ms) passes with no new pad-contact *and* all pads are released —
i.e. a final hold fires on **release**, a final tap fires on the **pause**. When
several carried spells share a prefix (e.g. `R·R` Firebolt is a prefix of `R·R·R`
Scorch Bolt), the engine uses **longest-match with pause-to-commit**: it keeps
matching while you keep drumming and fires the **longest** code whose beats you
have entered when the commit window elapses; the shorter prefix only fires if you
stop there. This makes every legal loadout unambiguous *by the timing of your own
thumb* — no hidden priority, fully information-free. (The validator in the
appendix counts the prefix pairs so we know exactly what the commit rule is
resolving.)

**Anti-spam ties (established, referenced here).** Casting any spell advances the
cooldowns of all *other* carried spells (**rotation cooling** — spamming one
spell strands the rest), and chaining *distinct* spells builds the **Whorl**
meter toward your ultimate. The grammar supports both: distinct schools/forms are
trivially legible mid-combat, so "cast something new" is always a readable choice.

---

## 4 · THE GRIMOIRE — 116 spells

*Codes are machine-generated from taxonomy (see appendix); damage is a class
(Light / Medium / Heavy / Massive), never a raw number. Tags drawn from the
controlled vocabulary: `dot · surface · control · pierce · chain · summon ·
economy · burst · ward · enchant`.*

| Name | Code | School | Form | Tier | Rarity | Effect | Tags |
|------|------|--------|------|------|--------|--------|------|
| Ember Pool | `hR·hR` | Fire | Pool | 2 | Common | Small fire patch; Burning while stood in it. | surface, dot |
| Fire Mine | `hR·R` | Fire | Mine | 2 | Common | Coal that bursts Fire when an enemy nears. | control, burst |
| Firebolt | `R·R` | Fire | Bolt | 2 | Common | Medium fire dart; quick plain damage. | burst, economy |
| Flame Wall | `R·hR` | Fire | Wall | 2 | Common | Short burning barrier; passers catch Burning. | control, dot |
| Blaze Wall | `R·R·hR` | Fire | Wall | 3 | Uncommon | Tall wall of flame; long Burning on contact. | control, dot |
| Coal Field | `R·hR·hR` | Fire | Pool | 3 | Uncommon | Wide fire surface; stacking Burning. | surface, dot |
| Ember Brand | `R·hR·R` | Fire | Glyph | 3 | Uncommon | Enchant: your next cast becomes Fire-typed + Burning. | enchant, dot |
| Ember Sprites | `hR·hR·R` | Fire | Swarm | 3 | Uncommon | Summons drifting embers that seek enemies and Burn. | summon, dot |
| Ember Trap | `hR·R·R` | Fire | Mine | 3 | Common | Bigger mine; knockback fire burst. | control, burst |
| Flame Jet | `hR·hR·hR` | Fire | Beam | 3 | Uncommon | Channelled cone of fire; Burns all in front. | dot, burst |
| Scorch Bolt | `R·R·R` | Fire | Bolt | 3 | Common | Heavy fire bolt; plain damage, fast recovery. | burst, economy |
| Cinder Ward | `hR·R·R·hR` | Fire | Ward | 4 | Rare | Self: burning aura; melee attackers take Fire. | ward, dot |
| Fire Ray | `hR·hR·hR·hR` | Fire | Beam | 4 | Rare | Sustained fire beam; heavy Burning; ignites pools. | dot, burst |
| Lava Pool | `R·R·hR·hR` | Fire | Pool | 4 | Rare | Molten surface; heavy Burning and slow (molten). | surface, dot, control |
| Pyre Bolt | `R·R·R·R` | Fire | Bolt | 4 | Uncommon | Massive fire bolt; small splash. | burst, economy |
| Pyre Mine | `hR·R·R·R` | Fire | Mine | 4 | Uncommon | Large blast mine; area Burning on trigger. | burst, control |
| Wall of Flame | `R·R·R·hR` | Fire | Wall | 4 | Rare | Long high wall; strong Burning; hard block. | control, dot |
| Meteor | `R·R·R·R·R` | Fire | Bolt | 5 | Legendary | Falling star: Massive impact burst + crater fire-pool; Shatters Frozen enemies. | burst, dot, surface |
| Pyre Column | `hR·hR·hR·hR·hR` | Fire | Beam | 5 | Legendary | Roaring pillar of fire down the lane; Massive Burning; charge widens it. | dot, burst, control |
| Arc Fence | `Y·hY` | Spark | Wall | 2 | Common | Crackling fence; staggers passers. | control, surface |
| Jolt | `Y·Y` | Spark | Bolt | 2 | Common | Medium spark dart; quick plain damage. | burst, economy |
| Shock Trap | `hY·Y` | Spark | Mine | 2 | Common | Trap that Shocks its triggerer. | control, burst |
| Static Field | `hY·hY` | Spark | Pool | 2 | Common | Charged floor; periodic small shocks. | surface, control |
| Arc Wall | `Y·Y·hY` | Spark | Wall | 3 | Uncommon | Longer arc fence; heavier stagger. | control, surface |
| Charge Brand | `Y·hY·Y` | Spark | Glyph | 3 | Uncommon | Enchant: next cast becomes Spark-typed + chains once. | enchant, chain |
| Lightning | `hY·hY·hY` | Spark | Beam | 3 | Uncommon | Beam of lightning; Conducts (arcs) between Chilled. | chain, control |
| Spark Motes | `hY·hY·Y` | Spark | Swarm | 3 | Uncommon | Buzzing motes that zap enemies and chain. | summon, chain |
| Storm Pool | `Y·hY·hY` | Spark | Pool | 3 | Uncommon | Wide static field; repeated shocks. | surface, control |
| Tesla Trap | `hY·Y·Y` | Spark | Mine | 3 | Common | Shock trap; arc chains to 2 nearby. | control, chain |
| Thunderbolt | `Y·Y·Y` | Spark | Bolt | 3 | Uncommon | Heavy spark bolt; Conducts on Chilled (arcs between them). | chain, burst |
| Chain Mine | `hY·Y·Y·Y` | Spark | Mine | 4 | Uncommon | Trap whose shock chains through the whole cluster. | chain, burst |
| Levinbolt | `Y·Y·Y·Y` | Spark | Bolt | 4 | Uncommon | Massive spark bolt; forks to a second target. | burst, chain |
| Storm Beam | `hY·hY·hY·hY` | Spark | Beam | 4 | Rare | Sustained lightning; strong Conduct between Chilled. | chain, control |
| Storm Wall | `Y·Y·Y·hY` | Spark | Wall | 4 | Rare | Big arc wall; chains to nearby enemies. | control, chain |
| Storm Ward | `hY·Y·Y·hY` | Spark | Ward | 4 | Rare | Self: melee attackers Shocked, arc chains off them. | ward, chain |
| Tempest Pool | `Y·Y·hY·hY` | Spark | Pool | 4 | Rare | Wide storm field; repeated chaining shocks. | surface, chain, control |
| Chain Lightning | `hY·hY·hY·hY·hY` | Spark | Beam | 5 | Legendary | A bolt that arcs between EVERY enemy; doubles on Chilled/Frozen. | chain, burst, control |
| Thunderstorm | `Y·Y·Y·hY·hY` | Spark | Pool | 5 | Legendary | Field-wide storm; everything repeatedly Shocked; chains everywhere. | surface, chain, control |
| Frost Wall | `B·hB` | Frost | Wall | 2 | Common | Short ice wall; blocks and Chills passers. | control, surface |
| Frostbolt | `B·B` | Frost | Bolt | 2 | Common | Medium frost dart; Deepens an existing Chill (Chilled to Frozen). | control, burst |
| Ice Patch | `hB·hB` | Frost | Pool | 2 | Common | Slick chilled floor; slows. | surface, control |
| Rime Trap | `hB·B` | Frost | Mine | 2 | Common | Trap that Freezes its triggerer. | control, burst |
| Cold Ray | `hB·hB·hB` | Frost | Beam | 3 | Uncommon | Cone of cold; Chills all in front. | control, burst |
| Freeze Trap | `hB·B·B` | Frost | Mine | 3 | Common | Freezes a small cluster on trigger. | control, burst |
| Glacier Pool | `B·hB·hB` | Frost | Pool | 3 | Uncommon | Ice sheet; Frost-typed hits freeze it slick. | surface, control |
| Ice Wall | `B·B·hB` | Frost | Wall | 3 | Uncommon | Taller ice wall; high-HP block. | control, surface |
| Rime Bolt | `B·B·B` | Frost | Bolt | 3 | Uncommon | Heavy frost bolt; Deepens Chill; bonus vs Frozen. | control, burst |
| Rime Brand | `B·hB·B` | Frost | Glyph | 3 | Uncommon | Enchant: next cast becomes Frost-typed + Chill. | enchant, control |
| Blizzard Trap | `hB·B·B·B` | Frost | Mine | 4 | Uncommon | Freezes a large cluster on trigger. | control, burst |
| Deep Freeze | `B·B·hB·hB` | Frost | Pool | 4 | Rare | Wide freezing field; standing turns enemies Frozen. | surface, control |
| Frost Wisps | `hB·hB·B·B` | Frost | Swarm | 4 | Uncommon | Hovering ice wisps that chase and Chill. | summon, control |
| Ice Rampart | `B·B·B·hB` | Frost | Wall | 4 | Rare | Massive wall; very long block. | control, surface |
| Ice Ward | `hB·B·B·hB` | Frost | Ward | 4 | Rare | Self: ice armour; Chills melee attackers; absorbs a hit. | ward, control |
| Icicle | `B·B·B·B` | Frost | Bolt | 4 | Uncommon | Massive frost shard; heavy bonus vs Frozen. | burst, control |
| Winter Beam | `hB·hB·hB·hB` | Frost | Beam | 4 | Rare | Sustained freezing ray; Freezes over time. | control, surface |
| Absolute Zero | `B·B·B·hB·hB` | Frost | Pool | 5 | Legendary | The whole field freezes solid; all enemies Frozen; primes a mass Shatter. | surface, control, burst |
| Glacier | `B·B·B·B·hB` | Frost | Wall | 5 | Legendary | A moving glacier wall that grinds forward, Freezing all it touches. | control, surface, burst |
| Flash Bolt | `R·Y` | Blast | Bolt | 2 | Common | Medium blast dart; shoves the target back. | burst, control |
| Flash Wall | `R·hY` | Blast | Wall | 2 | Common | Burning fence; passers Burned + shoved back. | control, dot |
| Flashbang Mine | `hR·Y` | Blast | Mine | 2 | Common | Pops for fire burst + wide knockback (blinds). | burst, control |
| Plasma Pool | `hR·hY` | Blast | Pool | 2 | Uncommon | Fizzing plasma floor; Burning + pushes enemies back. | surface, control |
| Spark Blast | `Y·R` | Blast | Bolt | 2 | Common | Medium blast dart; lighter hit, longer shove. | control, burst |
| Blast Brand | `Y·hR·Y` | Blast | Glyph | 3 | Uncommon | Enchant: next cast fire-typed and shoves. | enchant, control |
| Concussion Mine | `hR·Y·Y` | Blast | Mine | 3 | Uncommon | Fire burst + wide cluster knockback. | burst, control |
| Flashbolt | `Y·Y·R` | Blast | Bolt | 3 | Uncommon | Heavy blast bolt; extra-far knockback. | control, burst |
| Plasma Beam | `hR·hY·hR` | Blast | Beam | 3 | Rare | Searing plasma beam; Burning + steady pushback; ignites pools. | dot, control |
| Plasma Bolt | `R·R·Y` | Blast | Bolt | 3 | Uncommon | Heavy blast bolt; hard knockback. | burst, control |
| Plasma Field | `R·hR·hY` | Blast | Pool | 3 | Rare | Large plasma surface; Burning + repeated pushback. | surface, dot, control |
| Plasma Wall | `R·R·hY` | Blast | Wall | 3 | Uncommon | Plasma wall; passers Burned + shoved back. | control, dot |
| Cluster Bomb | `hR·Y·Y·Y` | Blast | Mine | 4 | Rare | Fire cluster burst; scatters the cluster (knockback). | burst, control |
| Detonation Bolt | `R·R·R·Y` | Blast | Bolt | 4 | Rare | Massive blast bolt; splash + area knockback. | burst, control |
| Firestorm Field | `R·R·hR·hY` | Blast | Pool | 4 | Rare | Molten plasma sea; heavy Burning + pushback. | surface, dot, control |
| Plasma Barrier | `R·R·R·hY` | Blast | Wall | 4 | Rare | Long burning plasma wall; shoves passers back. | control, dot |
| Plasma Ray | `hR·hY·hR·hY` | Blast | Beam | 4 | Rare | Sustained plasma beam; Burning + pushback. | dot, control |
| Plasma Ward | `hR·Y·Y·hR` | Blast | Ward | 4 | Rare | Self: attackers Burned + knocked away. | ward, control, dot |
| Sunlance | `hR·hY·hR·hY·hR` | Blast | Beam | 5 | Legendary | A continuous plasma beam carving the lane; Ignites and shoves everything back. | dot, control, burst |
| Supernova | `R·R·R·R·Y` | Blast | Bolt | 5 | Legendary | A detonation flashing the whole field: Massive fire burst; shoves everything back; Ignites all poison. | burst, dot, control |
| Poison Pool | `hY·hB` | Venom | Pool | 2 | Common | Toxic puddle; stacking Poisoned. | surface, dot |
| Spore Mine | `hY·B` | Venom | Mine | 2 | Common | Bursts a poison cloud on trigger. | control, dot |
| Toxin Dart | `B·Y` | Venom | Bolt | 2 | Common | Medium frost-lead dart; corrodes; bonus vs Chilled. | burst, control |
| Venom Dart | `Y·B` | Venom | Bolt | 2 | Common | Medium dart; corrodes: bonus damage to armoured. | burst, economy |
| Venom Wall | `Y·hB` | Venom | Wall | 2 | Common | Dripping wall; poisons passers. | control, dot |
| Blight Bolt | `Y·Y·B` | Venom | Bolt | 3 | Uncommon | Heavy venom bolt; hard corrode. | burst, economy |
| Corrosion Bolt | `B·B·Y` | Venom | Bolt | 3 | Uncommon | Heavy frost-lead bolt; strips armour outright (deep corrode). | burst, control |
| Miasma Pool | `Y·hB·hB` | Venom | Pool | 3 | Uncommon | Big poison field + slow. | surface, dot, control |
| Miasma Wall | `Y·Y·hB` | Venom | Wall | 3 | Uncommon | Long toxic wall; poisons passers. | control, dot |
| Spore Trap | `hY·B·B` | Venom | Mine | 3 | Common | Poison cloud over a cluster on trigger. | control, dot |
| Venom Brand | `B·hY·B` | Venom | Glyph | 3 | Uncommon | Enchant: next cast also applies Poisoned. | enchant, dot |
| Venom Spray | `hY·hB·hY` | Venom | Beam | 3 | Uncommon | Cone of toxin; poisons all in front. | dot, control |
| Contagion Mine | `hY·B·B·B` | Venom | Mine | 4 | Rare | Poison cloud that spreads enemy-to-enemy. | chain, dot |
| Miasma Beam | `hY·hB·hY·hB` | Venom | Beam | 4 | Rare | Sustained toxic ray; stacking Poisoned. | dot, control |
| Plague Bolt | `Y·Y·Y·B` | Venom | Bolt | 4 | Rare | Massive venom bolt; on kill, leaps to a neighbour. | chain, burst |
| Plague Wall | `Y·Y·Y·hB` | Venom | Wall | 4 | Rare | Long dripping wall; deep Poisoned. | control, dot |
| Quagmire | `Y·Y·hB·hB` | Venom | Pool | 4 | Rare | Deep toxic mire; heavy stacks + strong slow. | surface, dot, control |
| Venom Ward | `hY·B·B·hY` | Venom | Ward | 4 | Rare | Self: attackers heavily Poisoned + slowed. | ward, dot, control |
| Pandemic | `Y·Y·Y·hB·hB` | Venom | Pool | 5 | Legendary | The field becomes a swamp; Poisoned spreads and deepens endlessly; slows all. | surface, dot, chain |
| Plague Swarm | `hY·hY·B·B·B` | Venom | Swarm | 5 | Legendary | Summons a cloud of toxic wasps that chase and Poison. | summon, dot, chain |
| Force Lance | `R·B` | Lance | Bolt | 2 | Common | Medium piercing dart; hits everything in a line. | pierce, burst |
| Force Mine | `hR·B` | Lance | Mine | 2 | Common | Arcane trap; knockback pierce burst. | control, pierce |
| Force Wall | `R·hB` | Lance | Wall | 2 | Common | Barrier of force; your shots pass through gaining pierce. | control, pierce |
| Gravity Well | `hR·hB` | Lance | Pool | 2 | Uncommon | Zone that drags and holds enemies (no element). | surface, control |
| Piercing Bolt | `B·R` | Lance | Bolt | 2 | Common | Medium arcane dart; pierces two enemies. | pierce, burst |
| Arcane Beam | `hR·hB·hR` | Lance | Beam | 3 | Uncommon | Lance-beam that pierces everything in the lane. | pierce, burst |
| Arcane Lance | `R·B·R` | Lance | Bolt | 3 | Uncommon | Heavy pierce; skewers a full line. | pierce, burst |
| Force Barrier | `R·R·hB` | Lance | Wall | 3 | Uncommon | Strong force wall; long block. | control, pierce |
| Force Brand | `B·hR·B` | Lance | Glyph | 3 | Uncommon | Enchant: next cast pierces and ignores walls. | enchant, pierce |
| Force Trap | `hR·B·B` | Lance | Mine | 3 | Common | Pierce burst that skewers a cluster. | pierce, burst |
| Singularity | `R·hB·hB` | Lance | Pool | 3 | Rare | Gravity zone; clumps enemies to set up AoE. | surface, control |
| Event Horizon | `R·R·hB·hB` | Lance | Pool | 4 | Rare | Strong gravity well; immobilises a cluster. | surface, control |
| Force Rampart | `R·R·R·hB` | Lance | Wall | 4 | Rare | Huge force wall; reflects enemy projectiles. | control, pierce |
| Force Ray | `hR·hB·hR·hB` | Lance | Beam | 4 | Rare | Sustained piercing beam. | pierce, burst |
| Force Ward | `hR·B·B·hR` | Lance | Ward | 4 | Rare | Self: shield blocks projectiles and pierces attackers back. | ward, pierce |
| Greater Lance | `R·R·R·B` | Lance | Bolt | 4 | Rare | Massive pierce; full-lane skewer. | pierce, burst |
| Impaler Mine | `hR·B·B·B` | Lance | Mine | 4 | Rare | Erupting spikes skewer a cluster. | pierce, burst |
| Black Hole | `R·R·R·hB·hB` | Lance | Pool | 5 | Legendary | A singularity that drags every enemy to one point and crushes them. | surface, control, burst |
| World Spear | `hR·hB·hR·hB·hR` | Lance | Beam | 5 | Legendary | A continuous lance-beam skewering the whole lane through walls. | pierce, burst, control |

---

## 5 · DECKBUILDER SCAFFOLDING

**Loadout.** A run carries **6–8 spells** (default 7). Small enough to keep
codes muscle-memorised; large enough to run one setup + one payoff + walls/utility.

**Drafting between waves.** After each wave you're offered a **choice of 3 spells**
(rarity-weighted, see below) plus a shop option to **remove** one carried spell
(keeps the loadout prefix-clean and lets you cut a code you keep fumbling).
Occasional **upgrade** offers bump a carried spell one tier along the same
school+form line (Firebolt → Scorch Bolt → Pyre Bolt), re-drumming its code longer.
The draft enforces one hard rule from the grammar: **no two carried codes may be
identical** (they can't be — codes are unique) and the UI flags any prefix pair so
you know a pause commits the shorter one.

**Rarity weights** (per draft slot, scaling with wave depth `w`):

| Rarity | Early (w≤3) | Mid (w 4–8) | Late (w≥9) |
|--------|-------------|-------------|------------|
| Common | 60% | 35% | 15% |
| Uncommon | 30% | 40% | 35% |
| Rare | 9% | 22% | 38% |
| Legendary | 1% | 3% | 12% |

Commons are the workhorse tier-2/3 spells; Legendaries are the 12 five-beat
spectacles — you'll usually land one or two per deep run.

**10 example synergy packages** (each a 6-spell spine; add utility to taste):

1. **The Conduct build** (freeze → chain lightning). *Ice Patch, Cold Ray,
   Lightning, Storm Beam, Chain Lightning, Frost Wisps.* Chill a cluster with
   pool, ray and wisps, then every Spark hit arcs between the chilled bodies;
   Chain Lightning doubles on Frozen. Tags: chain, control.
2. **The Shatter build** (freeze → detonate). *Winter Beam, Deep Freeze, Icicle,
   Meteor, Absolute Zero, Rime Brand.* Freeze the field with beam + pool, then
   Fire = mass Shatter burst; Icicle cashes in on Frozen. Absolute Zero + Meteor
   is the wombo. Tags: control, burst.
3. **The Ignite build** (poison → explode). *Venom Spray, Poison Pool, Quagmire,
   Plasma Bolt, Supernova, Venom Brand.* Stack Poisoned with spray + pools, then
   any Fire-typed tap Ignites it — Plasma Bolt is the cheap detonator; Supernova
   detonates the whole board. Tags: dot, burst.
4. **The Surface build** (pools + activators). *Ember Pool, Static Field, Ice
   Patch, Firestorm Field, Fire Ray, Coal Field.* Lay overlapping surfaces; beams
   sweep across to ignite/freeze/electrify them in sequence. Tags: surface, dot.
5. **The Wall turtle** (block + pass-through). *Frost Wall, Ice Rampart, Glacier,
   Force Rampart, Blaze Wall, Scorch Bolt.* Stack walls; your Bolts pass through
   gaining elements while enemies pile up. Glacier closes it out. Tags: control, pierce.
6. **The Pierce line** (Lance mono). *Force Lance, Arcane Lance, Greater Lance,
   Arcane Beam, World Spear, Force Brand.* Reaction-free skewers that ignore cover
   and walls; Force Brand makes any cast pierce. Tags: pierce, burst.
7. **The Gravity build** (clump → nuke). *Gravity Well, Singularity, Event
   Horizon, Black Hole, Meteor, Cluster Bomb.* Drag enemies into one point, then
   drop AoE on the clump. Tags: control, burst.
8. **The Plague spread** (dot contagion). *Miasma Beam, Plague Bolt, Contagion
   Mine, Pandemic, Miasma Pool, Plague Swarm.* Hold-forms poison the crowd and
   contagion jumps enemy-to-enemy; Plague Bolt's kill-leap cleans up; Pandemic
   makes it self-perpetuating. Tags: dot, chain.
9. **The Ward bruiser** (let them come). *Cinder Ward, Storm Ward, Ice Ward,
   Force Ward, Static Field, Flashbang Mine.* Auras punish melee; you tank the lane
   and let attackers cook themselves. Tags: ward, control.
10. **The Summon swarm** (set-and-forget). *Ember Sprites, Spark Motes, Frost
    Wisps, Plague Swarm, Poison Pool, Charge Brand.* Motes seek and apply statuses
    while you cast payoffs; Charge Brand chains the swarm's zaps. Tags: summon, chain.

*(Rotation cooling rewards these spines: every package mixes schools/forms so
casting "the next thing" is always live, and distinct casts fill the Whorl meter.)*

---

## 6 · VALIDATION APPENDIX

The spell table above is **not authored by hand** — it is emitted by
`validate_grimoire.py`, which is the single source of truth. Each spell is stored
as `(name, School, Form, Tier, pad-arrangement, rarity, effect, tags)`; the script
**derives** the code from the taxonomy and then **independently re-derives** the
expected pads and rhythm from the taxonomy columns to assert the code matches — so
a mislabeled form or an arrangement using the wrong pad is caught, never silently
shipped. Regenerate the table with `python3 validate_grimoire.py --emit`.

Checks: (1) all codes unique; (2) every code's pads match its school; (3) every
code's rhythm matches its form signature; (4) length matches tier; (5) count ≥ 110;
(6) tags within the controlled vocabulary; (7) *taps strike, holds infuse* — no
Bolt's effect text applies a status, and no Blast effect still says "stagger"
(knockback school property instead). It also counts strict-prefix pairs — the
exact set the cast-commit rule (§3) resolves — to prove nothing is left ambiguous
by accident.

```
WHORL GRIMOIRE VALIDATION  —  116 spells
========================================================
[1] unique codes ............ PASS
[2] pads match school ....... PASS
[3] rhythm matches form ..... PASS
[4] length matches tier ..... PASS
[5] count >= 110 ............ PASS (116)
[6] tags within vocab ....... PASS
[7] taps strike, holds infuse PASS

Per-school: {'Blast': 20, 'Fire': 19, 'Frost': 19, 'Lance': 19, 'Spark': 19, 'Venom': 20}
Per-form:   {'Beam': 16, 'Bolt': 25, 'Glyph': 6, 'Mine': 18, 'Pool': 22, 'Swarm': 4, 'Wall': 19, 'Ward': 6}
Per-tier:   {'Cantrip': 27, 'Spell': 40, 'Greater': 37, 'Legendary': 12}
Per-rarity: {'Common': 31, 'Uncommon': 40, 'Rare': 33, 'Legendary': 12}

Strict-prefix pairs in grimoire: 144 (all resolved by longest-match + commit-window rule; see grammar).

ALL CHECKS PASS.
```

**On the 144 prefix pairs:** these are expected and safe — e.g. `R·R` (Firebolt)
is a prefix of `R·R·R` (Scorch Bolt). The grammar never relies on prefix-freedom;
it relies on the **longest-match + commit-window** rule (§3), under which your own
thumb's pause disambiguates. The count is reported so the number is *known*, not
hidden — information is free.
