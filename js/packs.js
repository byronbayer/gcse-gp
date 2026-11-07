// Race rounds. Each round = a "test" you send him. Add a new round here every few weeks
// (Claude will write it, weighted towards his weak topics) and change CURRENT.
// Topic ids come from js/questions.js. Repeat an id to ask that topic more than once.

export const PACKS = [
  {
    id: 'r1',
    round: 1,
    track: 'Donington Park',
    title: 'Round 1: Donington Park',
    intro: 'Full diagnostic. Covers every GCSE strand so we can see where the time is being lost.',
    sessions: [
      { id: 'quali', name: 'Qualifying', kind: 'quickfire', count: 15,
        blurb: 'Quickfire mental maths, TTRS-style. Aim for under 6 seconds per answer.' },
      { id: 'race1', name: 'Race 1', blurb: 'Number, ratio, algebra, geometry, probability, stats: a bit of everything.',
        topics: ['n-laptime', 'n-fuel-cost', 'n-pct-of', 'n-fraction', 'n-lcm', 'r-speed', 'r-units', 'r-fuel-laps', 'r-share', 'r-compound',
          'a-subst', 'a-linear', 'a-nth', 'a-simul', 'g-circle', 'g-angles', 'g-scale', 'p-not', 'p-expected', 's-avg'] },
      { id: 'race2', name: 'Race 2', blurb: 'The rest of the GCSE topics, including the Higher ones.',
        topics: ['n-pct-change', 'n-rev-pct', 'n-negative', 'n-stdform', 'n-round', 'r-gearing', 'r-prop', 'r-bestbuy', 'r-density',
          'a-both', 'a-rearrange', 'a-expand', 'a-quad', 'a-gradient', 'g-trapezium', 'g-pyth', 'g-trig', 'g-volume', 'p-basic', 'p-indep', 'p-relfreq', 's-missing'] },
    ],
  },
];

export const CURRENT = 'r1';
