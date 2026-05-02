// Blessing of the Demon — stat distribution table
// Structure: { rate: appearance probability, dist: [[value, conditional_rate], ...] }
// All stats have 5% appearance rate. Conditional rates sum to 1.0.

const BLESSING_DATA = {

  // ── STR / DEX / INT / STA (+)
  // values 0–5, rates 80/11/5/2/1.5/0.5
  'STR': { rate:0.05, dist:[[0,0.800],[1,0.110],[2,0.050],[3,0.020],[4,0.015],[5,0.005]] },
  'DEX': { rate:0.05, dist:[[0,0.800],[1,0.110],[2,0.050],[3,0.020],[4,0.015],[5,0.005]] },
  'INT': { rate:0.05, dist:[[0,0.800],[1,0.110],[2,0.050],[3,0.020],[4,0.015],[5,0.005]] },
  'STA': { rate:0.05, dist:[[0,0.800],[1,0.110],[2,0.050],[3,0.020],[4,0.015],[5,0.005]] },

  // ── Critical Chance / Critical Damage (%)
  // values 0–2.5%, rates 80/11/5/2/1.5/0.5
  'Critical Chance': { rate:0.05, dist:[[0,0.800],[0.5,0.110],[1.0,0.050],[1.5,0.020],[2.0,0.015],[2.5,0.005]] },
  'Critical Damage': { rate:0.05, dist:[[0,0.800],[0.5,0.110],[1.0,0.050],[1.5,0.020],[2.0,0.015],[2.5,0.005]] },

  // ── Speed / Attack Speed / Casting Speed / Parry / Melee Block / Ranged Block
  // values 0–3%, rates 80/17.5/2.4/0.1
  'Speed':         { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },
  'Attack Speed':  { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },
  'Casting Speed': { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },
  'Parry':         { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },
  'Melee Block':   { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },
  'Ranged Block':  { rate:0.05, dist:[[0,0.800],[1,0.175],[2,0.024],[3,0.001]] },

  // ── Defense / Magic Defense (+)
  // values 0/2/6/10/14/18, rates 80/11/5/2/1.5/0.5
  'Defense':       { rate:0.05, dist:[[0,0.800],[2,0.110],[6,0.050],[10,0.020],[14,0.015],[18,0.005]] },
  'Magic Defense': { rate:0.05, dist:[[0,0.800],[2,0.110],[6,0.050],[10,0.020],[14,0.015],[18,0.005]] },

  // ── Attack (+)
  // values 0/5/9/13/17/21, rates 80/11/5/2/1.5/0.5
  'Attack': { rate:0.05, dist:[[0,0.800],[5,0.110],[9,0.050],[13,0.020],[17,0.015],[21,0.005]] },

  // ── HP / MP / FP (+)
  // values 0/12/20/28/37/46, rates 80/11/5/2/1.5/0.5
  'Max. HP': { rate:0.05, dist:[[0,0.800],[12,0.110],[20,0.050],[28,0.020],[37,0.015],[46,0.005]] },
  'Max. MP': { rate:0.05, dist:[[0,0.800],[12,0.110],[20,0.050],[28,0.020],[37,0.015],[46,0.005]] },
  'Max. FP': { rate:0.05, dist:[[0,0.800],[12,0.110],[20,0.050],[28,0.020],[37,0.015],[46,0.005]] },

  // ── PvE Damage / PvE Dmg Resist (+)
  // values 0/10/15/20/25/30, rates 80/11/5/2/1.5/0.5
  'PvE Damage':     { rate:0.05, dist:[[0,0.800],[10,0.110],[15,0.050],[20,0.020],[25,0.015],[30,0.005]] },
  'PvE Dmg Resist': { rate:0.05, dist:[[0,0.800],[10,0.110],[15,0.050],[20,0.020],[25,0.015],[30,0.005]] },
};

// ── Probability functions ─────────────────────────────────────────────────────

// P(zone shows statName with value >= minValue)
function pZoneStat(statName, minValue) {
  const data = BLESSING_DATA[statName];
  if (!data) return 0;
  const pVal = data.dist
    .filter(([v]) => v >= minValue)
    .reduce((s, [, r]) => s + r, 0);
  return data.rate * pVal;
}

// P(sum of selected stats across both zones >= threshold)
function pCombineMulti(statNames, threshold) {
  function zoneDist() {
    let prob0 = 1;
    const out = [];
    for (const name of statNames) {
      const data = BLESSING_DATA[name];
      if (!data) continue;
      for (const [v, r] of data.dist) {
        if (v === 0) continue;
        const p = data.rate * r;
        prob0 -= p;
        out.push({ value: v, prob: p });
      }
    }
    out.unshift({ value: 0, prob: Math.max(0, prob0) });
    return out;
  }

  const dist = zoneDist();
  let p = 0;
  for (const { value: v1, prob: p1 } of dist)
    for (const { value: v2, prob: p2 } of dist)
      if (v1 + v2 >= threshold) p += p1 * p2;
  return p;
}

