// GCSE GP — question bank.
// Every topic has a generator, so questions are fresh each time but test the same skill.
// Fields: id, s (strand), name, tier ('F' = Foundation & Higher, 'H' = Higher only),
// calc (calculator allowed), target (seconds a confident student needs), why (racing relevance).

export const STRANDS = {
  Q: { name: 'Quickfire' },
  N: { name: 'Number' },
  R: { name: 'Ratio & rates' },
  A: { name: 'Algebra' },
  G: { name: 'Geometry' },
  P: { name: 'Probability' },
  S: { name: 'Statistics' },
};

// ---------- helpers ----------
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (x, n = 0) => { const f = 10 ** n; return Math.round((x + Number.EPSILON) * f) / f; };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a * b) / gcd(a, b);
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const gbp = (x) => '£' + x.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(x) ? 0 : 2, maximumFractionDigits: 2 });
const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
const term = (n, v) => (n === 0 ? '' : ` ${n < 0 ? '−' : '+'} ${Math.abs(n) === 1 && v ? '' : Math.abs(n)}${v}`);
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n) => String(n).replace('-', '⁻').replace(/\d/g, (d) => SUP[d]);
// hundredths of a second -> "1:32.45" or "55.23"
const lapH = (h) => { const m = Math.floor(h / 6000); const s = (h % 6000) / 100; return m ? `${m}:${s.toFixed(2).padStart(5, '0')}` : s.toFixed(2); };
// seconds (1 dp) -> "1:24.6"
const lap1 = (t) => { const m = Math.floor(t / 60); const s = rnd(t - m * 60, 1); return `${m}:${s.toFixed(1).padStart(4, '0')}`; };
const mc = (answer, wrongs) => {
  const opts = [...new Set(wrongs.filter((w) => w !== answer))].slice(0, 3);
  return { type: 'mc', answer, options: shuffle([answer, ...opts]) };
};

export const TRACKS = [
  { name: 'Donington Park', layout: 'National circuit', km: 3.15 },
  { name: 'Brands Hatch', layout: 'Indy circuit', km: 1.93 },
  { name: 'Silverstone', layout: 'GP circuit', km: 5.89 },
  { name: 'Oulton Park', layout: 'International circuit', km: 4.31 },
  { name: 'Snetterton', layout: '300 circuit', km: 4.78 },
  { name: 'the Nürburgring', layout: '24 Hours layout', km: 25.38 },
];
const trackName = () => pick(TRACKS.slice(0, 5)).name;

// ---------- topics ----------
export const TOPICS = [
  // ===== Quickfire (TTRS-style speed) =====
  { id: 'q-times', s: 'Q', name: 'Times tables', tier: 'F', calc: false, target: 5,
    gen() { const a = ri(3, 12), b = ri(3, 12); return { text: `${a} × ${b}`, answer: a * b, explain: `${a} × ${b} = ${a * b}` }; } },
  { id: 'q-divide', s: 'Q', name: 'Division facts', tier: 'F', calc: false, target: 6,
    gen() { const a = ri(3, 12), b = ri(3, 12); return { text: `${a * b} ÷ ${a}`, answer: b, explain: `${a} × ${b} = ${a * b}, so ${a * b} ÷ ${a} = ${b}` }; } },
  { id: 'q-squares', s: 'Q', name: 'Squares & roots', tier: 'F', calc: false, target: 6,
    gen() { const n = ri(2, 15); return Math.random() < 0.5
      ? { text: `${n}²`, answer: n * n, explain: `${n} × ${n} = ${n * n}` }
      : { text: `√${n * n}`, answer: n, explain: `${n} × ${n} = ${n * n}` }; } },
  { id: 'q-addsub', s: 'Q', name: 'Mental add & subtract', tier: 'F', calc: false, target: 8,
    gen() { const a = ri(24, 99), b = ri(12, 89); return Math.random() < 0.5
      ? { text: `${a} + ${b}`, answer: a + b, explain: `${a} + ${b} = ${a + b}` }
      : { text: `${Math.max(a, b)} − ${Math.min(a, b)}`, answer: Math.abs(a - b), explain: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}` }; } },
  { id: 'q-percent', s: 'Q', name: 'Quick percentages', tier: 'F', calc: false, target: 8,
    gen() { const p = pick([10, 25, 50, 20, 5, 75]); const base = pick([40, 60, 80, 120, 160, 200, 240, 360, 400]); const ans = (base * p) / 100;
      return { text: `${p}% of ${base}`, answer: ans, explain: `${p}% of ${base} = ${base} × ${p / 100} = ${ans}` }; } },

  // ===== Number =====
  { id: 'n-laptime', s: 'N', name: 'Lap time differences (decimals)', tier: 'F', calc: false, target: 35,
    why: 'Timing screens show gaps to the hundredth. Knowing where 0.3 s comes from is how drivers find pace.',
    gen() { const t1 = ri(5000, 12500), d = ri(8, 240), t2 = t1 + d;
      return { text: `At ${trackName()} your best lap is ${lapH(t1)}. Your rival's best is ${lapH(t2)}. How many seconds faster were you?`,
        answer: d / 100, unit: 's', show: (d / 100).toFixed(2) + ' s',
        explain: `${lapH(t2)} − ${lapH(t1)} = ${(d / 100).toFixed(2)} s. Line up the decimal points, and remember 1 minute = 60 seconds.` }; } },
  { id: 'n-fuel-cost', s: 'N', name: 'Money & decimals (fuel cost)', tier: 'F', calc: true, target: 40,
    why: 'Running a race season means counting every litre and every pound.',
    gen() { const l = ri(50, 90) / 2, p = ri(139, 169) / 100, c = rnd(l * p, 2);
      return { text: `Petrol costs £${p.toFixed(2)} per litre. You put ${l} litres in the car. How much does it cost?`,
        answer: c, unit: '£', tol: 0.011, show: '£' + c.toFixed(2),
        explain: `${l} × £${p.toFixed(2)} = £${c.toFixed(2)}` }; } },
  { id: 'n-pct-of', s: 'N', name: 'Percentage of an amount', tier: 'F', calc: false, target: 45,
    why: 'Tyre wear, discounts and fuel left are all percentages.',
    gen() {
      if (Math.random() < 0.5) {
        const fee = pick([120, 160, 180, 240, 300, 360, 400]), p = pick([10, 15, 20, 25, 30]), pay = rnd(fee * (1 - p / 100), 2);
        return { text: `A track day costs £${fee}. You book early and get ${p}% off. How much do you pay?`, answer: pay, unit: '£', tol: 0.011, show: gbp(pay),
          explain: `${p}% of £${fee} = £${rnd((fee * p) / 100, 2)}. £${fee} − £${rnd((fee * p) / 100, 2)} = ${gbp(pay)}. (Or: ${100 - p}% of £${fee}.)` };
      }
      const t = pick([8, 6, 10]), p = pick([20, 25, 40, 50, 75]), left = rnd(t * (1 - p / 100), 2);
      return { text: `A new tyre has ${t} mm of tread. After a session it has worn by ${p}%. How much tread is left, in mm?`, answer: left, unit: 'mm', show: left + ' mm',
        explain: `${p}% of ${t} = ${rnd((t * p) / 100, 2)} mm worn. ${t} − ${rnd((t * p) / 100, 2)} = ${left} mm left.` };
    } },
  { id: 'n-pct-change', s: 'N', name: 'Percentage change', tier: 'F', calc: true, target: 60,
    why: 'Engineers talk about gains in percentages: a 2% faster lap is huge.',
    gen() { const o = ri(850, 1050) / 10, d = ri(5, 60) / 10, n = rnd(o - d, 1), pc = rnd(((o - n) / o) * 100, 1);
      return { text: `Your lap time drops from ${o.toFixed(1)} s to ${n.toFixed(1)} s. What is the percentage decrease? (1 d.p.)`, answer: pc, unit: '%', tol: 0.051, show: pc.toFixed(1) + '%',
        explain: `Change = ${o.toFixed(1)} − ${n.toFixed(1)} = ${d.toFixed(1)} s. Percentage change = change ÷ original × 100 = ${d.toFixed(1)} ÷ ${o.toFixed(1)} × 100 = ${pc.toFixed(1)}%` }; } },
  { id: 'n-rev-pct', s: 'N', name: 'Reverse percentages', tier: 'H', calc: true, target: 60,
    why: 'Working back to an original price is how you spot a good deal on a race car.',
    gen() { const orig = ri(40, 150) * 100, p = pick([10, 15, 20, 25, 30, 35]), sale = (orig * (100 - p)) / 100;
      return { text: `After a season, a race car sells for ${gbp(sale)}. That is ${p}% less than it cost new. How much did it cost new?`, answer: orig, unit: '£', tol: 0.5, show: gbp(orig),
        explain: `${gbp(sale)} is ${100 - p}% of the original. Original = ${gbp(sale)} ÷ ${(100 - p) / 100} = ${gbp(orig)}. (Adding ${p}% back on is the classic trap.)` }; } },
  { id: 'n-fraction', s: 'N', name: 'Fractions of amounts', tier: 'F', calc: false, target: 35,
    why: 'Race strategy: how much of the race is left decides when to push.',
    gen() { const den = pick([3, 4, 5, 6, 8, 9, 10, 12]); let num; do { num = ri(1, den - 1); } while (gcd(num, den) !== 1);
      const k = ri(2, 5), laps = den * k, done = num * k;
      return { text: `A race is ${laps} laps long. You have completed ${num}/${den} of it. How many laps are left?`, answer: laps - done, unit: 'laps', show: `${laps - done} laps`,
        explain: `${num}/${den} of ${laps} = ${laps} ÷ ${den} × ${num} = ${done} laps done. ${laps} − ${done} = ${laps - done} left.` }; } },
  { id: 'n-negative', s: 'N', name: 'Negative numbers', tier: 'F', calc: false, target: 25,
    why: 'Cold tyres on a −2°C morning grip very differently from hot ones.',
    gen() {
      if (Math.random() < 0.5) { const a = -ri(1, 7), r = ri(6, 18);
        return { text: `At 7am the track temperature is ${neg(a)}°C. By noon it has risen by ${r}°C. What is the temperature at noon?`, answer: a + r, unit: '°C', show: `${neg(a + r)}°C`,
          explain: `${neg(a)} + ${r} = ${neg(a + r)}°C` }; }
      const a = -ri(2, 8), b = ri(3, 15);
      return { text: `The paddock is ${neg(a)}°C, but the track surface is ${b}°C. How many degrees warmer is the track?`, answer: b - a, unit: '°C', show: `${b - a}°C`,
        explain: `${b} − (${neg(a)}) = ${b} + ${-a} = ${b - a}°C` };
    } },
  { id: 'n-lcm', s: 'N', name: 'LCM (when cars meet again)', tier: 'F', calc: false, target: 90,
    why: 'Strategists use exactly this to predict when cars will be side by side.',
    gen() { const [a, b] = pick([[60, 75], [72, 80], [75, 90], [80, 100], [84, 96], [90, 96], [64, 80], [70, 84]]); const L = lcm(a, b);
      return { text: `Two cars cross the line together. Car A laps in exactly ${a} s and Car B in exactly ${b} s. After how many seconds will they next cross the line together?`, answer: L, unit: 's', show: `${L} s`,
        explain: `You need the lowest common multiple of ${a} and ${b}. Write each as a product of primes, then take the highest power of each prime: LCM = ${L} s (${Math.floor(L / 60)} min ${L % 60} s).` }; } },
  { id: 'n-stdform', s: 'N', name: 'Standard form', tier: 'H', calc: true, target: 60,
    why: 'Engine revs over a 24-hour race run into the millions. Standard form keeps big numbers readable.',
    gen() { const rpm = pick([6000, 6500, 7000, 7200, 7500]), h = pick([2, 3, 4, 6, 24]), N = rpm * 60 * h;
      const k = Math.floor(Math.log10(N)), a = parseFloat((N / 10 ** k).toPrecision(6));
      const f = (x, p) => `${x} × 10${sup(p)}`;
      return { ...mc(f(a, k), [f(a, k - 1), f(rnd(a * 10, 4), k - 1), f(a, k + 1)]),
        text: `An engine averages ${rpm.toLocaleString('en-GB')} rpm (revs per minute) for ${h} hours. How many revolutions is that, written in standard form?`,
        explain: `${rpm.toLocaleString('en-GB')} × 60 × ${h} = ${N.toLocaleString('en-GB')} = ${f(a, k)}. In standard form the first number must be between 1 and 10.` }; } },
  { id: 'n-round', s: 'N', name: 'Rounding (d.p. & s.f.)', tier: 'F', calc: false, target: 25,
    why: 'Timing to 3 decimal places decides grid positions.',
    gen() { const v4 = ri(500000, 1299999), v = v4 / 10000; const intDigits = Math.floor(Math.log10(v)) + 1;
      let dpEq, label;
      if (Math.random() < 0.5) { const n = pick([1, 2]); dpEq = n; label = `${n} decimal place${n > 1 ? 's' : ''}`; }
      else { const n = pick([2, 3, 4]); dpEq = n - intDigits; label = `${n} significant figures`; }
      const factor = 10 ** (4 - dpEq), r = (Math.round(v4 / factor) * factor) / 10000, shown = r.toFixed(Math.max(dpEq, 0));
      return { text: `The timing screen shows your lap as ${v.toFixed(4)} s. Round it to ${label}.`, answer: Number(shown), tol: 1e-6, unit: 's', show: shown + ' s',
        explain: `${v.toFixed(4)} to ${label} is ${shown}. Look at the next digit: 5 or more rounds up.` }; } },

  // ===== Ratio, proportion & rates =====
  { id: 'r-speed', s: 'R', name: 'Speed = distance ÷ time', tier: 'F', calc: true, target: 75,
    why: 'Average speed tells you if you are carrying enough speed through the corners.',
    gen() { const tr = pick(TRACKS), sp = tr.km > 20 ? ri(140, 160) : ri(115, 150), t = rnd((tr.km / sp) * 3600, 1), ans = rnd(tr.km / (t / 3600), 0);
      return { text: `${tr.name[0].toUpperCase() + tr.name.slice(1)} (${tr.layout}) is ${tr.km} km long. You lap it in ${lap1(t)}. What is your average speed in km/h? (nearest whole number)`, answer: ans, unit: 'km/h', tol: 0.51, show: `${ans} km/h`,
        explain: `${lap1(t)} = ${t} s = ${t} ÷ 3600 hours. Speed = distance ÷ time = ${tr.km} ÷ (${t} ÷ 3600) = ${ans} km/h.` }; } },
  { id: 'r-units', s: 'R', name: 'Converting mph ↔ km/h', tier: 'F', calc: false, target: 40,
    why: 'UK tracks talk in mph, the Nürburgring talks in km/h. You need both.',
    gen() {
      if (Math.random() < 0.5) { const k = 8 * ri(8, 25), m = (k * 5) / 8;
        return { text: `The speed trap shows ${k} km/h. Using 5 miles ≈ 8 km, what is that in mph?`, answer: m, unit: 'mph', show: `${m} mph`, explain: `${k} ÷ 8 = ${k / 8}, × 5 = ${m} mph` }; }
      const m = 5 * ri(6, 28), k = (m * 8) / 5;
      return { text: `Your top speed was ${m} mph. Using 5 miles ≈ 8 km, what is that in km/h?`, answer: k, unit: 'km/h', show: `${k} km/h`, explain: `${m} ÷ 5 = ${m / 5}, × 8 = ${k} km/h` };
    } },
  { id: 'r-fuel-laps', s: 'R', name: 'Division in context (fuel per lap)', tier: 'F', calc: true, target: 45,
    why: 'Run out of fuel on the last lap and it is a DNF. Engineers always round down.',
    gen() { const tank = pick([40, 45, 50, 60]), per = ri(18, 35) / 10, laps = Math.floor(tank / per + 1e-9);
      return { text: `The fuel tank holds ${tank} litres. The car uses ${per} litres per lap. How many complete laps can you do on a full tank?`, answer: laps, unit: 'laps', show: `${laps} laps`,
        explain: `${tank} ÷ ${per} = ${rnd(tank / per, 2)}. You can't finish a part-lap, so round DOWN to ${laps}.` }; } },
  { id: 'r-share', s: 'R', name: 'Sharing in a ratio', tier: 'F', calc: false, target: 45,
    why: 'Endurance teams split costs and prize money between co-drivers.',
    gen() { let a, b; do { a = ri(2, 7); b = ri(1, a - 1); } while (gcd(a, b) !== 1);
      const k = pick([20, 25, 30, 40, 50, 60, 100]), T = (a + b) * k;
      return { text: `You and your co-driver share £${T} prize money in the ratio ${a}:${b}. You get the bigger share. How much do you get?`, answer: a * k, unit: '£', tol: 0.5, show: gbp(a * k),
        explain: `${a} + ${b} = ${a + b} parts. One part = £${T} ÷ ${a + b} = £${k}. Your share = ${a} × £${k} = ${gbp(a * k)}.` }; } },
  { id: 'r-gearing', s: 'R', name: 'Simplifying ratios (gearing)', tier: 'F', calc: false, target: 40,
    why: 'Kart gearing is a ratio: change one sprocket and the whole lap changes.',
    gen() { let f, r, g; do { f = pick([10, 12, 14, 15]); r = ri(70, 90); g = gcd(f, r); } while (g === 1);
      let p = 1; for (let i = 2; i < g; i++) if (g % i === 0) { p = i; break; }
      const ans = `${f / g}:${r / g}`;
      return { ...mc(ans, [p > 1 ? `${f / p}:${r / p}` : `${f}:${r - f}`, `${r / g}:${f / g}`, `1:${rnd(r / f + 1, 1)}`, `${f / g + 1}:${r / g + 1}`]),
        text: `Your kart has ${f} teeth on the front sprocket and ${r} on the rear. Write the ratio front : rear in its simplest form.`,
        explain: `The highest common factor of ${f} and ${r} is ${g}. ${f} ÷ ${g} = ${f / g} and ${r} ÷ ${g} = ${r / g}, so ${ans}.` }; } },
  { id: 'r-prop', s: 'R', name: 'Direct proportion', tier: 'F', calc: false, target: 40,
    why: 'Fuel for a stint is worked out exactly like this.',
    gen() { const a = pick([4, 5, 6, 8]), p = pick([2, 2.5, 3]), b = pick([10, 12, 14, 20]);
      return { text: `In practice, ${a} laps used ${a * p} litres of fuel. How much fuel will ${b} laps use?`, answer: b * p, unit: 'litres', show: `${b * p} litres`,
        explain: `1 lap uses ${a * p} ÷ ${a} = ${p} litres. ${b} laps use ${b} × ${p} = ${b * p} litres.` }; } },
  { id: 'r-compound', s: 'R', name: 'Compound change (depreciation)', tier: 'H', calc: true, target: 75,
    why: 'Race cars lose value every season. Compound percentages tell you how much.',
    gen() { const v0 = ri(12, 30) * 1000, r = pick([8, 10, 12, 15, 20]), n = ri(2, 5), v = rnd(v0 * (1 - r / 100) ** n, 0);
      return { text: `An MX-5 race car is worth ${gbp(v0)}. It loses ${r}% of its value each year. What is it worth after ${n} years? (nearest £)`, answer: v, unit: '£', tol: 1.01, show: gbp(v),
        explain: `Multiply by ${1 - r / 100} once per year: ${gbp(v0)} × ${1 - r / 100}${sup(n)} = ${gbp(v)}. (Taking ${r * n}% off in one go is wrong.)` }; } },
  { id: 'r-bestbuy', s: 'R', name: 'Best buy / unit price', tier: 'F', calc: true, target: 50,
    why: 'Tyres are the biggest running cost after fuel.',
    gen() { let a, b; do { a = ri(70, 110); b = ri(70, 110); } while (Math.abs(a - b) < 3);
      const A = a * 4, B = b * 2 + pick([0, 0.5]) * 2, perB = B / 2, ans = a < perB ? 'Deal A' : 'Deal B';
      return { ...mc(ans, ['Deal A', 'Deal B', 'They cost the same']),
        text: `Deal A: 4 tyres for ${gbp(A)}. Deal B: 2 tyres for ${gbp(B)}. Which is better value per tyre?`,
        explain: `Deal A: ${gbp(A)} ÷ 4 = ${gbp(a)} per tyre. Deal B: ${gbp(B)} ÷ 2 = ${gbp(perB)} per tyre. ${ans} is cheaper.` }; } },
  { id: 'r-density', s: 'R', name: 'Compound units (density)', tier: 'H', calc: true, target: 50,
    why: 'Fuel is weight, and weight is lap time. Teams fuel to the kilo.',
    gen() { const v = pick([20, 25, 30, 35, 40, 45, 50, 55, 60]), m = rnd(v * 0.74, 1);
      return { text: `Petrol has a density of about 0.74 kg per litre. How much do ${v} litres of petrol weigh, in kg?`, answer: m, unit: 'kg', tol: 0.051, show: `${m} kg`,
        explain: `Mass = density × volume = 0.74 × ${v} = ${m} kg` }; } },

  // ===== Algebra =====
  { id: 'a-subst', s: 'A', name: 'Substituting into formulae', tier: 'F', calc: false, target: 50,
    why: 'Data engineers use v = u + at to work out speed out of a corner.',
    gen() {
      if (Math.random() < 0.5) { const u = ri(0, 15), a = ri(2, 6), t = ri(2, 8), v = u + a * t;
        return { text: `Use v = u + at. Coming out of a hairpin at u = ${u} m/s, you accelerate at a = ${a} m/s² for t = ${t} s. What is your speed v in m/s?`, answer: v, unit: 'm/s', show: `${v} m/s`,
          explain: `v = ${u} + ${a} × ${t} = ${u} + ${a * t} = ${v} m/s` }; }
      const u = ri(0, 10), a = pick([2, 4, 6]), t = ri(2, 6), s = u * t + (a * t * t) / 2;
      return { text: `Use s = ut + ½at². With u = ${u} m/s, a = ${a} m/s² and t = ${t} s, how far do you travel (s, in metres)?`, answer: s, unit: 'm', show: `${s} m`,
        explain: `s = ${u} × ${t} + ½ × ${a} × ${t}² = ${u * t} + ${(a * t * t) / 2} = ${s} m` };
    } },
  { id: 'a-linear', s: 'A', name: 'Forming & solving equations', tier: 'F', calc: false, target: 50,
    why: 'Budgeting a track day is just an equation.',
    gen() { const c = pick([50, 60, 75, 80, 100]), p = pick([25, 30, 35, 40, 45]), x = ri(3, 9), T = c + p * x;
      return { text: `A track day costs £${c} to book plus £${p} per session. Your bill is £${T}. How many sessions did you do?`, answer: x, unit: 'sessions', show: `${x} sessions`,
        explain: `${c} + ${p}x = ${T} → ${p}x = ${T - c} → x = ${T - c} ÷ ${p} = ${x}` }; } },
  { id: 'a-both', s: 'A', name: 'Equations with x on both sides', tier: 'F', calc: false, target: 50,
    why: 'Same skill as balancing a car: what you do to one side, you do to the other.',
    gen() { const x = ri(2, 12), a = ri(4, 9), c = ri(2, a - 1), b = ri(1, 20), d = (a - c) * x + b;
      return { text: `Solve: ${a}x + ${b} = ${c}x + ${d}`, answer: x, show: `x = ${x}`,
        explain: `Take ${c}x from both sides: ${a - c}x + ${b} = ${d}. Take ${b}: ${a - c}x = ${d - b}. Divide by ${a - c}: x = ${x}.` }; } },
  { id: 'a-rearrange', s: 'A', name: 'Rearranging formulae', tier: 'F', calc: false, target: 40,
    why: 'One formula, three questions: speed, distance or time.',
    gen() { const f = pick([
      ['s = d/t', 'd', 'd = st', ['d = s/t', 'd = t/s', 'd = s + t']],
      ['s = d/t', 't', 't = d/s', ['t = ds', 't = s/d', 't = d − s']],
      ['v = u + at', 'a', 'a = (v − u)/t', ['a = v − u − t', 'a = (v + u)/t', 'a = t(v − u)']],
      ['v = u + at', 'u', 'u = v − at', ['u = v + at', 'u = (v − a)/t', 'u = at − v']],
      ['F = ma', 'a', 'a = F/m', ['a = Fm', 'a = m/F', 'a = F − m']],
      ['P = 2(l + w)', 'w', 'w = P/2 − l', ['w = P − 2l', 'w = 2P − l', 'w = (P − l)/2']],
    ]);
      return { ...mc(f[2], f[3]), text: `Make ${f[1]} the subject of ${f[0]}`, explain: `${f[0]} rearranges to ${f[2]}. Undo each operation in reverse order, doing the same to both sides.` }; } },
  { id: 'a-nth', s: 'A', name: 'nth term of a sequence', tier: 'F', calc: false, target: 45,
    why: 'Spotting a pattern in lap times is how you predict your pace.',
    gen() { const d = ri(2, 9), a1 = ri(-3, 15), c = a1 - d, seq = [0, 1, 2, 3].map((i) => neg(a1 + i * d)).join(', ');
      const ans = `${d}n${term(c, '')}`;
      return { ...mc(ans, [`${d}n${term(a1, '')}`, a1 > 1 ? `${a1}n${term(d, '')}` : `${d + 1}n${term(c - 1, '')}`, `n${term(d, '')}`, `${d}n${term(-c, '')}`]),
        text: `Here is a sequence: ${seq}, … Which expression gives the nth term?`,
        explain: `It goes up by ${d} each time, so it starts with ${d}n. When n = 1, ${d}n = ${d}, and the first term is ${neg(a1)}, so adjust by ${neg(c)}: ${ans}.` }; } },
  { id: 'a-simul', s: 'A', name: 'Simultaneous equations', tier: 'H', calc: false, target: 120,
    why: 'Working out two unknown costs from two receipts. Team managers do this all the time.',
    gen() { const x = ri(15, 30) * 10, y = ri(4, 12) * 10; let a1, b1, a2, b2;
      do { a1 = ri(2, 4); b1 = ri(1, 3); a2 = ri(1, 3); b2 = ri(2, 5); } while (a1 * b2 - a2 * b1 === 0 || a1 * b2 === a2 * b1);
      const T1 = a1 * x + b1 * y, T2 = a2 * x + b2 * y, pl = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
      return { text: `${pl(a1, 'set')} of tyres and ${pl(b1, 'track session')} cost £${T1}. ${pl(a2, 'set')} of tyres and ${pl(b2, 'track session')} cost £${T2}. How much is one set of tyres?`, answer: x, unit: '£', tol: 0.5, show: gbp(x),
        explain: `Let t = tyres, s = session: ${a1}t + ${b1}s = ${T1} and ${a2}t + ${b2}s = ${T2}. Multiply so one letter matches, subtract, solve: t = £${x}, s = £${y}. Check: ${a1}×${x} + ${b1}×${y} = ${T1} ✓` }; } },
  { id: 'a-expand', s: 'A', name: 'Expanding double brackets', tier: 'F', calc: false, target: 45,
    why: 'Quadratics appear in braking distances. Expanding brackets is step one.',
    gen() { const a = ri(1, 9); let b; do { b = ri(-9, 9); } while (b === 0);
      const br = (n) => `(x ${n < 0 ? '−' : '+'} ${Math.abs(n)})`, ex = (m, c) => `x²${term(m, 'x')}${term(c, '')}`;
      return { ...mc(ex(a + b, a * b), [ex(0, a * b), ex(a * b, a + b), ex(a - b, a * b), ex(a + b, a + b)]),
        text: `Expand and simplify ${br(a)}${br(b)}`,
        explain: `x × x = x², x × ${neg(b)} + ${a} × x = ${neg(a + b)}x, ${a} × ${neg(b)} = ${neg(a * b)}. So ${ex(a + b, a * b)}.` }; } },
  { id: 'a-quad', s: 'A', name: 'Solving quadratics by factorising', tier: 'H', calc: false, target: 75,
    why: 'Braking distance grows with the square of speed. Quadratics model it.',
    gen() { let s1, s2; do { s1 = ri(-9, 9); s2 = ri(-9, 9); } while (s1 === 0 || s2 === 0 || s1 === s2);
      const [p, q] = [s1, s2].sort((m, n) => m - n), opt = (m, n) => { const [u, v] = [m, n].sort((i, j) => i - j); return `x = ${neg(u)} or x = ${neg(v)}`; };
      return { ...mc(opt(p, q), [opt(-p, -q), opt(p, -q), opt(-p, q), opt(p * q, p + q)]),
        text: `Solve x²${term(-(p + q), 'x')}${term(p * q, '')} = 0`,
        explain: `Find two numbers that multiply to ${neg(p * q)} and add to ${neg(-(p + q))}: they are ${neg(-p)} and ${neg(-q)}. So (x ${-p < 0 ? '−' : '+'} ${Math.abs(p)})(x ${-q < 0 ? '−' : '+'} ${Math.abs(q)}) = 0, giving ${opt(p, q)}.` }; } },
  { id: 'a-gradient', s: 'A', name: 'Gradient (speed–time graphs)', tier: 'F', calc: false, target: 50,
    why: 'Telemetry traces are graphs. The gradient of the speed line is your acceleration or braking.',
    gen() { const a = ri(2, 6), t = ri(2, 6);
      if (Math.random() < 0.6) { const v1 = ri(0, 10), v2 = v1 + a * t;
        return { text: `On a speed–time graph, your launch is a straight line from ${v1} m/s at 0 s to ${v2} m/s at ${t} s. What is the gradient (your acceleration in m/s²)?`, answer: a, unit: 'm/s²', show: `${a} m/s²`,
          explain: `Gradient = change in y ÷ change in x = (${v2} − ${v1}) ÷ ${t} = ${a} m/s²` }; }
      const v2 = ri(5, 15), v1 = v2 + a * t;
      return { text: `Braking for a corner, the speed–time graph is a straight line from ${v1} m/s at 0 s to ${v2} m/s at ${t} s. What is the gradient?`, answer: -a, unit: 'm/s²', show: `${neg(-a)} m/s²`,
        explain: `Gradient = (${v2} − ${v1}) ÷ ${t} = ${neg(-a)}. It's negative because you are slowing down.` };
    } },

  // ===== Geometry & measures =====
  { id: 'g-circle', s: 'G', name: 'Circles (circumference & area)', tier: 'F', calc: true, target: 50,
    why: 'Wheel size changes your speedometer reading and your gearing.',
    gen() {
      if (Math.random() < 0.55) { const d = ri(25, 32), c = rnd(Math.PI * d, 1);
        return { text: `A kart wheel has a diameter of ${d} cm. How far does it travel in one full turn? (cm, 1 d.p.)`, answer: c, unit: 'cm', tol: 0.11, show: `${c} cm`,
          explain: `Circumference = π × diameter = π × ${d} = ${c} cm` }; }
      const r = ri(12, 18), A = rnd(Math.PI * r * r, 1);
      return { text: `A brake disc has a radius of ${r} cm. What is its area? (cm², 1 d.p.)`, answer: A, unit: 'cm²', tol: 0.11, show: `${A} cm²`,
        explain: `Area = π × r² = π × ${r}² = π × ${r * r} = ${A} cm². (Use the π button for accuracy.)` };
    } },
  { id: 'g-trapezium', s: 'G', name: 'Area of a trapezium', tier: 'F', calc: false, target: 50,
    why: 'Paddock space is paid for by the square metre.',
    gen() { const a = ri(10, 40), b = a + ri(6, 30), h = 2 * ri(5, 20), A = ((a + b) / 2) * h;
      return { text: `Your paddock space is a trapezium. Its parallel sides are ${a} m and ${b} m, and they are ${h} m apart. What is its area in m²?`, answer: A, unit: 'm²', show: `${A} m²`,
        explain: `Area = ½(a + b)h = ½ × (${a} + ${b}) × ${h} = ${A} m²` }; } },
  { id: 'g-angles', s: 'G', name: 'Angles & polygons', tier: 'F', calc: false, target: 45,
    why: 'Turn-in angle and apex: the geometry of a corner.',
    gen() { const r = Math.random();
      if (r < 0.4) { const n = pick([5, 6, 8, 9, 10, 12]);
        return { text: `A karting practice track is a regular ${n}-sided polygon. At each corner you turn through the exterior angle. How many degrees is that?`, answer: 360 / n, unit: '°', show: `${360 / n}°`,
          explain: `Exterior angles of any polygon add up to 360°. 360 ÷ ${n} = ${360 / n}°` }; }
      if (r < 0.7) { const n = pick([5, 6, 8, 9, 10, 12]), I = ((n - 2) * 180) / n;
        return { text: `A regular ${n}-sided polygon is marked out with cones. What is each interior angle?`, answer: I, unit: '°', show: `${I}°`,
          explain: `Exterior angle = 360 ÷ ${n} = ${360 / n}°. Interior = 180 − ${360 / n} = ${I}°` }; }
      const a = ri(25, 80), b = ri(25, 80);
      return { text: `Three straights form a triangle. Two of the corners are ${a}° and ${b}°. What is the third corner?`, answer: 180 - a - b, unit: '°', show: `${180 - a - b}°`,
        explain: `Angles in a triangle add up to 180°. 180 − ${a} − ${b} = ${180 - a - b}°` };
    } },
  { id: 'g-pyth', s: 'G', name: "Pythagoras' theorem", tier: 'F', calc: true, target: 60,
    why: 'The shortest line through a corner is a hypotenuse. That is what a racing line is.',
    gen() {
      if (Math.random() < 0.6) { const a = ri(30, 150), b = ri(20, 120), c = rnd(Math.hypot(a, b), 1);
        return { text: `In the paddock you walk ${a} m east then ${b} m north. How far is the straight-line distance back to the start? (1 d.p.)`, answer: c, unit: 'm', tol: 0.051, show: `${c} m`,
          explain: `c² = ${a}² + ${b}² = ${a * a + b * b}. c = √${a * a + b * b} = ${c} m` }; }
      const b = ri(20, 80), c = b + ri(10, 60), a = rnd(Math.sqrt(c * c - b * b), 1);
      return { text: `A straight-line cut across a car park is ${c} m. It goes ${b} m along one edge. How far does it go along the other edge? (1 d.p.)`, answer: a, unit: 'm', tol: 0.051, show: `${a} m`,
        explain: `Shorter side² = ${c}² − ${b}² = ${c * c - b * b}. Side = √${c * c - b * b} = ${a} m` };
    } },
  { id: 'g-trig', s: 'G', name: 'Trigonometry (SOH CAH TOA)', tier: 'H', calc: true, target: 75,
    why: 'Banked corners let you carry more speed. Trig gives the banking angle.',
    gen() {
      if (Math.random() < 0.5) { const w = ri(8, 15), h = ri(10, 35) / 10, ang = rnd((Math.asin(h / w) * 180) / Math.PI, 1);
        return { text: `A banked corner's track surface is ${w} m wide (measured along the slope) and its outside edge is ${h} m higher than the inside. What is the banking angle? (1 d.p.)`, answer: ang, unit: '°', tol: 0.06, show: `${ang}°`,
          explain: `sin θ = opposite ÷ hypotenuse = ${h} ÷ ${w}. θ = sin⁻¹(${rnd(h / w, 4)}) = ${ang}°` }; }
      const d = ri(20, 60) / 10, h = ri(3, 12) / 10, ang = rnd((Math.atan(h / d) * 180) / Math.PI, 1);
      return { text: `A trailer ramp rises ${h} m over a horizontal distance of ${d} m. What angle does it make with the ground? (1 d.p.)`, answer: ang, unit: '°', tol: 0.06, show: `${ang}°`,
        explain: `tan θ = opposite ÷ adjacent = ${h} ÷ ${d}. θ = tan⁻¹(${rnd(h / d, 4)}) = ${ang}°` };
    } },
  { id: 'g-volume', s: 'G', name: 'Volume & capacity', tier: 'F', calc: false, target: 50,
    why: 'Race fuel cells are measured in litres. 1000 cm³ = 1 litre.',
    gen() { const l = pick([40, 50, 60]), w = pick([20, 25, 30, 40]), h = pick([20, 25, 30]), V = l * w * h, L = V / 1000;
      return { text: `A fuel cell is a cuboid ${l} cm × ${w} cm × ${h} cm. How many litres does it hold? (1000 cm³ = 1 litre)`, answer: L, unit: 'litres', show: `${L} litres`,
        explain: `Volume = ${l} × ${w} × ${h} = ${V.toLocaleString('en-GB')} cm³. ÷ 1000 = ${L} litres` }; } },
  { id: 'g-scale', s: 'G', name: 'Scale drawings & maps', tier: 'F', calc: false, target: 50,
    why: 'Track maps are scale drawings. Use them to work out braking points.',
    gen() { const sc = pick([10000, 20000, 25000, 50000]), cm = ri(12, 90) / 10, m = rnd((cm * sc) / 100, 2);
      return { text: `A track map has a scale of 1 : ${sc.toLocaleString('en-GB')}. The main straight measures ${cm} cm on the map. How long is it in real life, in metres?`, answer: m, unit: 'm', show: `${m} m`,
        explain: `${cm} × ${sc.toLocaleString('en-GB')} = ${rnd(cm * sc, 1).toLocaleString('en-GB')} cm. ÷ 100 = ${m} m` }; } },

  // ===== Probability =====
  { id: 'p-basic', s: 'P', name: 'Basic probability', tier: 'F', calc: false, target: 35,
    why: 'Grid draws, reverse grids, lottery for pit boxes: it is all probability.',
    gen() { const n = ri(12, 30), k = ri(2, n - 3), g = gcd(k, n);
      return { text: `Grid positions are drawn from a hat. There are ${n} drivers and ${k} of them are rookies. What is the probability the first name drawn is a rookie? (fraction or decimal)`, answer: k / n, tol: 0.005, show: `${k / g}/${n / g}`,
        explain: `P = rookies ÷ total = ${k}/${n}${g > 1 ? ` = ${k / g}/${n / g}` : ''}` }; } },
  { id: 'p-not', s: 'P', name: 'Probability of NOT happening', tier: 'F', calc: false, target: 25,
    why: 'Tyre choice depends on the chance it stays dry.',
    gen() { const p = ri(5, 95) / 100, ev = pick(['it rains during the race', 'there is a safety car', 'you get a top-5 start']);
      return { text: `The probability that ${ev} is ${p}. What is the probability that it does NOT happen?`, answer: rnd(1 - p, 2), tol: 0.001, show: String(rnd(1 - p, 2)),
        explain: `Probabilities add up to 1. 1 − ${p} = ${rnd(1 - p, 2)}` }; } },
  { id: 'p-indep', s: 'P', name: 'Independent events (AND rule)', tier: 'F', calc: false, target: 40,
    why: 'Endurance strategy: what are the odds of two things going wrong?',
    gen() { const a = ri(1, 9) / 10, b = ri(1, 9) / 10;
      return { text: `The probability of rain on Saturday is ${a} and on Sunday is ${b}. The days are independent. What is the probability it rains on BOTH days?`, answer: rnd(a * b, 2), tol: 0.001, show: String(rnd(a * b, 2)),
        explain: `AND means multiply: ${a} × ${b} = ${rnd(a * b, 2)}` }; } },
  { id: 'p-expected', s: 'P', name: 'Expected outcomes', tier: 'F', calc: false, target: 35,
    why: 'Teams plan spare parts by expected number of incidents.',
    gen() { const p = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4]), n = pick([20, 40, 60, 80, 100]), e = rnd(p * n, 2);
      return { text: `The probability of a safety car in any race is ${p}. Over ${n} races, how many races would you expect to have a safety car?`, answer: e, show: String(e),
        explain: `Expected = probability × number of trials = ${p} × ${n} = ${e}` }; } },
  { id: 'p-relfreq', s: 'P', name: 'Relative frequency', tier: 'F', calc: false, target: 35,
    why: 'Your data from practice estimates what will happen in the race.',
    gen() { const n = pick([20, 25, 40, 50]), k = ri(Math.ceil(n * 0.3), n - 2), g = gcd(k, n);
      return { text: `In ${n} practice laps you hit the apex of Turn 1 perfectly ${k} times. Estimate the probability you hit it perfectly next lap. (fraction or decimal)`, answer: k / n, tol: 0.001, show: `${k / g}/${n / g} = ${rnd(k / n, 3)}`,
        explain: `Relative frequency = ${k} ÷ ${n} = ${rnd(k / n, 3)}` }; } },

  // ===== Statistics =====
  { id: 's-avg', s: 'S', name: 'Mean, median & range', tier: 'F', calc: true, target: 60,
    why: 'Consistency wins endurance races. Range and median show how consistent you are.',
    gen() { const base = ri(800, 950), L = Array.from({ length: 5 }, () => base + ri(0, 40)), txt = L.map((x) => (x / 10).toFixed(1)).join(', '), srt = [...L].sort((a, b) => a - b), kind = pick(['mean', 'median', 'range']);
      if (kind === 'mean') { const m = rnd(L.reduce((a, b) => a + b, 0) / 50, 2);
        return { text: `Your five lap times (s) were: ${txt}. What was your mean lap time? (2 d.p.)`, answer: m, unit: 's', tol: 0.006, show: `${m.toFixed(2)} s`,
          explain: `Add them: ${(L.reduce((a, b) => a + b, 0) / 10).toFixed(1)}. Divide by 5: ${m.toFixed(2)} s` }; }
      if (kind === 'median') return { text: `Your five lap times (s) were: ${txt}. What was your median lap time?`, answer: srt[2] / 10, unit: 's', show: `${(srt[2] / 10).toFixed(1)} s`,
        explain: `Put them in order: ${srt.map((x) => (x / 10).toFixed(1)).join(', ')}. The middle one is ${(srt[2] / 10).toFixed(1)} s` };
      return { text: `Your five lap times (s) were: ${txt}. What is the range?`, answer: (srt[4] - srt[0]) / 10, unit: 's', tol: 0.001, show: `${((srt[4] - srt[0]) / 10).toFixed(1)} s`,
        explain: `Range = slowest − fastest = ${(srt[4] / 10).toFixed(1)} − ${(srt[0] / 10).toFixed(1)} = ${((srt[4] - srt[0]) / 10).toFixed(1)} s` };
    } },
  { id: 's-missing', s: 'S', name: 'Mean: finding a missing value', tier: 'F', calc: false, target: 75,
    why: 'What lap time do you need to beat your rival on average? This is how you work it out.',
    gen() { const M4 = ri(850, 950), M5 = M4 - ri(1, 6), need = 5 * M5 - 4 * M4;
      return { text: `The mean of your first 4 laps is ${(M4 / 10).toFixed(1)} s. What time do you need on lap 5 to make the mean of all 5 laps ${(M5 / 10).toFixed(1)} s?`, answer: need / 10, unit: 's', tol: 0.001, show: `${(need / 10).toFixed(1)} s`,
        explain: `Total for 5 laps = 5 × ${(M5 / 10).toFixed(1)} = ${((5 * M5) / 10).toFixed(1)}. First 4 total = 4 × ${(M4 / 10).toFixed(1)} = ${((4 * M4) / 10).toFixed(1)}. Lap 5 = ${((5 * M5) / 10).toFixed(1)} − ${((4 * M4) / 10).toFixed(1)} = ${(need / 10).toFixed(1)} s` }; } },
];

export const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
export const QUICKFIRE_IDS = TOPICS.filter((t) => t.s === 'Q').map((t) => t.id);

export function makeQuestion(id) {
  const t = TOPIC[id];
  const q = t.gen();
  const type = q.type || 'num';
  let show = q.show;
  if (show === undefined) show = type === 'mc' ? q.answer : String(q.answer);
  return { tol: 0.001, ...q, type, show, id, strand: t.s, name: t.name, calc: t.calc, tier: t.tier, target: t.target, why: t.why };
}

// Parses what he typed: "£57.20", "-3", "3/8", "0.65" -> number (or null)
export function parseAnswer(raw) {
  const s = String(raw)
    .replace(/[a-z]+\/[a-z]+[²³]?/gi, '') // strip units like km/h, m/s, m/s²
    .replace(/[−–]/g, '-')
    .replace(/[^0-9.\-/]/g, '')
    .replace(/^\/+|\/+$/g, '');
  if (!s) return null;
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function checkAnswer(q, raw) {
  if (q.type === 'mc') return raw === q.answer;
  const v = parseAnswer(raw);
  return v !== null && Math.abs(v - q.answer) <= q.tol + 1e-9;
}
