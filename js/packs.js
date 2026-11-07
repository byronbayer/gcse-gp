// Race rounds. Each round = a "test" you send him. Add a new round here every few weeks
// (Claude will write it, weighted towards his weak topics) and change CURRENT.
// Topic ids come from js/questions.js. Repeat an id to ask that topic more than once.
// Sessions run easiest to hardest, and questions inside each session are ordered
// easiest to hardest too (Foundation before Higher, then by target time).

export const PACKS = [
  {
    id: 'r1',
    round: 1,
    track: 'Donington Park',
    title: 'Round 1: Donington Park',
    intro: 'Full diagnostic covering every GCSE topic. Each session is harder than the one before, so start with Free Practice.',
    sessions: [
      { id: 'fp', name: 'Free Practice', kind: 'quickfire', count: 15,
        blurb: 'Warm-up. Quickfire mental maths, TTRS-style. Aim for under 6 seconds per answer.' },
      { id: 'q1', name: 'Quali 1', blurb: 'Short Foundation questions. Get a banker lap in.',
        topics: ['n-negative', 'n-round', 'p-not', 'n-laptime', 'n-fraction', 'p-basic', 'p-expected', 'p-relfreq',
          'n-fuel-cost', 'r-units', 'r-gearing', 'r-prop', 'a-rearrange', 'p-indep'] },
      { id: 'q2', name: 'Quali 2', blurb: 'Longer Foundation questions. Time to push.',
        topics: ['n-pct-of', 'r-fuel-laps', 'r-share', 'a-nth', 'a-expand', 'g-angles',
          'r-bestbuy', 'a-subst', 'a-linear', 'a-both', 'a-gradient', 'g-circle', 'g-trapezium', 'g-volume', 'g-scale'] },
      { id: 'race', name: 'Race', blurb: 'The big one: multi-step problems, then the Higher-only topics.',
        topics: ['n-pct-change', 'g-pyth', 's-avg', 'r-speed', 's-missing', 'n-lcm',
          'r-density', 'n-rev-pct', 'n-stdform', 'r-compound', 'a-quad', 'g-trig', 'a-simul'] },
    ],
  },
];

export const CURRENT = 'r1';
