// modes/basketball/words.js: the commentators' vocabulary. Original wording in the style of a TV game: clipped play-by-play ("X to Y, swing it") and a second voice for colour
// (runs, foul trouble, tired legs, what a player is known for, the state of the game).
// Pure functions: (picker, rnd, context) -> text. The picker never repeats a recent template of the same pool, and everything is driven by the choreography's own seeded stream,
// so every device says the same thing. Play-by-play lines stay under about 90 characters, colour lines under about 140.
const bigName = (s) => String(s || "");
const lead = (x) => x.diff;   // points ahead of the team the line is about (negative = behind)
const closeLate = (x) => !!x.late;
const secs = (c) => Math.max(0, Math.round(c));

export function makePicker() {   // remembers, per pool, which templates (by index, so another player name does not hide a repeat) it used last
  const recent = new Map();
  const P = (rnd, arr) => {
    const mem = recent.get(P.key) || [], avoid = mem.slice(-Math.min(3, arr.length - 1)); let i = Math.floor(rnd() * arr.length) % arr.length;
    for (let k = 0; k < 8 && avoid.includes(i); k++) i = Math.floor(rnd() * arr.length) % arr.length;
    if (avoid.includes(i)) i = [...arr.keys()].find((j) => !avoid.includes(j)) ?? i;
    mem.push(i); if (mem.length > 6) mem.shift(); recent.set(P.key, mem); return arr[i];
  };
  P.key = "";
  return P;
}

// what a player is known for, from his own sub ratings (see basketball/ratings.js); used for the odd colour remark
export function traitOf(e) {
  if (!e) return null;
  const v = { speed: e.spd || 0, handle: e.han || 0, shooting: e.thr || 0, passing: e.pas || 0, power: e.dunk || e.ath || 0, post: e.post || 0, boards: e.reb || 0, defence: e.def || e.lat || 0 };
  const top = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 84 ? top[0] : null;
}

const kindWord = { dunk: "throws it down", ins: "finishes at the rim", mid: "hits the jumper", thr: "buries the three", fb: "finishes on the break" };

export const W = {
  // ---- the start ----
  tipoff: (P, r, x) => P(r, [
    `Jump ball: ${x.a} against ${x.b}. ${x.team} win the tip.`,
    `Up it goes. ${x.team} get the tip, ${x.a} taps it back.`,
    `Tip-off. ${x.team} control it, ${x.a} nods the ball away.`,
    `And we are under way. ${x.team} win the tip and have the first look.`
  ]),
  // ---- bringing it up ----
  inbound: (P, r, x) => P(r, [
    `${x.a} inbounds to ${x.b}.`, `${x.b} takes the inbound from ${x.a}.`, `${x.a} throws it in. ${x.b} has it.`, `In bounds to ${x.b}. ${x.team} set up.`
  ]),
  outlet: (P, r, x) => P(r, [
    `${x.a} gets it out to ${x.b}.`, `Outlet from ${x.a} to ${x.b}, off they go.`, `${x.b} takes the outlet and looks up the floor.`, `${x.a} finds ${x.b}, ${x.team} on the move.`
  ]),
  bring: (P, r, x) => P(r, [
    `${x.a} walks it up for ${x.team}.`, `${x.a} brings it over half court.`, `${x.a} picks his dribble up high. ${x.team} set.`, `${x.a} calls the set, ${x.team} spread out.`, `Steady from ${x.a}, bringing it up.`
  ]),
  push: (P, r, x) => P(r, [
    `${x.a} pushes the pace!`, `${x.a} is off to the races.`, `${x.team} run. ${x.a} leads it.`, `${x.a} sprints it up the floor, nobody back yet.`, `Here they come, ${x.a} with the ball and a head of steam.`
  ]),
  // ---- half-court play ----
  swing: (P, r, x) => P(r, [
    `${x.a} swings it to ${x.b}.`, `${x.a} to ${x.b}, around the horn.`, `Ball moves from ${x.a} to ${x.b}.`, `${x.b} catches from ${x.a}, ${x.team} patient.`, `${x.a} reverses it to ${x.b}.`
  ]),
  entry: (P, r, x) => P(r, [
    `${x.a} feeds ${x.b} in the post.`, `Entry pass from ${x.a} to ${x.b} down low.`, `${x.b} seals his man, ${x.a} lobs it in.`, `${x.a} finds ${x.b} on the block.`
  ]),
  kick: (P, r, x) => P(r, [
    `${x.a} drives and kicks it out to ${x.b}.`, `${x.a} collapses the defence and spots up ${x.b}.`, `Kick-out from ${x.a}. ${x.b} is open!`, `${x.a} draws two and sprays it to ${x.b}.`
  ]),
  screen: (P, r, x) => P(r, [
    `${x.b} sets the screen for ${x.a}.`, `Pick-and-roll: ${x.a} comes off ${x.b}'s screen.`, `${x.b} walks his man into the screen, ${x.a} turns the corner.`, `${x.a} uses ${x.b}'s pick.`, `Screen from ${x.b}. ${x.a} has a lane.`
  ]),
  drive: (P, r, x) => P(r, [
    `${x.a} attacks the rim.`, `${x.a} puts his head down and drives.`, `${x.a} blows by his man.`, `${x.a} takes it to the basket.`, `Drive from ${x.a}, the lane opens.`
  ]),
  postup: (P, r, x) => P(r, [
    `${x.a} backs his man down.`, `${x.a} posts up, working on the block.`, `${x.a} leans in and goes to work down low.`, `${x.a} gets deep position.`
  ]),
  stepback: (P, r, x) => P(r, [
    `${x.a} creates space and rises.`, `${x.a} steps back, he is going to let it go.`, `${x.a} lines it up from deep.`, `${x.a} spots up behind the arc.`
  ]),
  pullup: (P, r, x) => P(r, [
    `${x.a} stops on a dime and pulls up.`, `${x.a} rises from the elbow.`, `${x.a} has room and takes the jumper.`, `${x.a} pulls up in the middle.`
  ]),
  assistPass: (P, r, x) => {
    const k = x.kind;
    const pools = {
      thr: [`${x.a} finds ${x.b} on the wing.`, `${x.a} to ${x.b} behind the arc.`, `${x.b} is open, ${x.a} delivers.`],
      mid: [`${x.a} hits ${x.b} at the elbow.`, `${x.a} to ${x.b} in the mid-range.`, `${x.a} drops it off to ${x.b}.`],
      fb: [`${x.a} hits ${x.b} ahead of the defence.`, `${x.a} throws it ahead to ${x.b}.`, `${x.a} leads ${x.b} with a long pass.`],
      ins: [`${x.a} threads it to ${x.b} inside.`, `${x.a} drops it to ${x.b} at the rim.`, `${x.a} finds ${x.b} cutting.`, `${x.a} looks off the defence and passes to ${x.b}.`],
      dunk: [`${x.a} lobs it up for ${x.b}!`, `${x.a} floats one toward the rim for ${x.b}.`, `${x.a} finds ${x.b} cutting to the rim.`]
    };
    return P(r, pools[k] || pools.ins);
  },
  // ---- the shot ----
  made: (P, r, x) => {
    const a = bigName(x.a), as = x.b ? ` ${x.b} with the assist.` : "";
    if (x.buzzer) return P(r, [`${a} at the buzzer, and it's good!`, `Good! ${a} beats the horn!`, `${a} lets it go as time expires... and it drops!`]);
    const pools = {
      thr: [`${a} hits the three!${as}`, `Three! ${a} from deep, nothing but net.${as}`, `${a} from downtown, and it's good!${as}`, `${a} drains it from the corner.${as}`, `${a} fires from three. Money!${as}`],
      mid: [`${a} hits the jumper.${as}`, `${a} knocks down the mid-range.${as}`, `${a} with the pull-up, good.${as}`, `Smooth jumper from ${a}.${as}`],
      ins: [`${a} finishes inside.${as}`, `${a} scores at the rim.${as}`, `${a} lays it in.${as}`, `${a} bangs it home inside.${as}`, `Easy bucket for ${a}.${as}`],
      dunk: [`${a} throws it down!${as}`, `${a} with the dunk!${as}`, `Slam from ${a}!${as}`, `${a} rises and hammers it home!${as}`],
      fb: [`${a} finishes the break.${as}`, `${a} runs it out and scores.${as}`, `${a} gets the fast-break bucket.${as}`, `Easy two for ${a} in transition.${as}`]
    };
    let t = P(r, pools[x.kind] || pools.ins);
    if (x.andOne) t += " And the foul!";
    return t;
  },
  missed: (P, r, x) => {
    const a = bigName(x.a);
    const pools = {
      thr: [`${a} misses the three.`, `${a} from deep, no good.`, `${a} lets it fly... off the rim.`, `Three is short from ${a}.`],
      mid: [`${a} misses the jumper.`, `${a} pulls up, no good.`, `Mid-range from ${a} rattles out.`],
      ins: [`${a} can't finish inside.`, `${a} misses at the rim.`, `${a} goes up strong, it rolls out.`, `${a} is off on the layup.`],
      dunk: [`${a} can't get it to go.`, `${a} goes up and it rattles out.`],
      fb: [`${a} misses the fast-break chance.`, `${a} can't finish the break.`, `The break comes to nothing, ${a} misses.`]
    };
    return P(r, pools[x.kind] || pools.ins);
  },
  block: (P, r, x) => P(r, [
    `${x.b} swats it away! ${x.a} is rejected!`, `Blocked! ${x.b} sends ${x.a}'s shot into the stands.`, `${x.b} says no! Huge block on ${x.a}.`, `${x.a} goes up and ${x.b} is waiting. Rejected!`, `What a block from ${x.b}!`
  ]),
  reb: (P, r, x) => x.off
    ? P(r, [`${x.a} grabs the offensive board.`, `${x.a} crashes the glass, second chance for ${x.team}.`, `Offensive rebound, ${x.a}.`, `${x.a} keeps it alive.`])
    : P(r, [`${x.a} pulls down the board.`, `${x.a} cleans the glass.`, `Rebound, ${x.a}.`, `${x.a} boxes out and gets it.`, `${x.a} secures it for ${x.team}.`]),
  // ---- turnovers and fouls ----
  steal: (P, r, x) => x.how === "strip"
    ? P(r, [`${x.a} strips ${x.b}! ${x.team} are going the other way.`, `${x.a} rips it away from ${x.b}.`, `Pocket picked! ${x.a} has it.`, `${x.a} takes it right off ${x.b}'s dribble.`])
    : P(r, [`${x.a} steps into the lane and steals it from ${x.b}!`, `${x.a} reads the pass and picks it off!`, `Steal! ${x.a} gets a hand on ${x.b}'s pass.`, `${x.a} jumps the pass. ${x.team} will run.`]),
  tov: (P, r, x) => x.how === "loose"
    ? P(r, [`${x.a} loses the ball out of bounds.`, `${x.a} dribbles it off his foot.`, `${x.a} coughs it up.`, `${x.a} loses control. Turnover.`])
    : P(r, [`${x.a} throws it away.`, `Bad pass from ${x.a}, out of bounds.`, `${x.a} is called for a travel.`, `${x.a} turns it over. ${x.opp} ball.`]),
  foul: (P, r, x) => {
    const n = x.n, third = n === 3 ? " That is his third." : n === 4 ? " Four fouls on him now." : n >= 5 ? " Five! He is in trouble." : "";
    if (x.kind === "intentional") return P(r, [`${x.a} fouls on purpose to stop the clock.`, `Intentional foul by ${x.a}.`, `${x.a} grabs ${x.b || "him"} to send him to the line.`]);
    if (x.kind === "shooting") return P(r, [`Whistle! ${x.a} fouls ${x.b} on the shot.${third}`, `Foul on ${x.a}, ${x.b} goes to the line.${third}`, `${x.a} hacks ${x.b} on the way up.${third}`, `${x.b} is fouled by ${x.a}.${third}`]);
    return P(r, [`Foul on ${x.a}.${third}`, `Whistle. ${x.a} reaches in.${third}`, `${x.a} is called for the foul.${third}`, `${x.a} with the contact, and the whistle blows.${third}`]);
  },
  ftUp: (P, r, x) => x.n === 1
    ? P(r, [`${x.a} steps to the line.`, `One shot for ${x.a}.`, `${x.a} at the stripe.`])
    : P(r, [`${x.a} to the line for ${x.n}.`, `${x.a} steps up, ${x.n} shots.`, `${x.a} at the line, two to take.`].slice(0, x.n === 2 ? 3 : 2).concat(x.n === 3 ? [`Three shots for ${x.a}.`] : [])),
  ft: (P, r, x) => x.made
    ? P(r, [`${x.a} makes it${x.n > 1 ? ` (${x.i} of ${x.n})` : ""}.`, `Good. ${x.a}${x.n > 1 ? `, ${x.i} of ${x.n}` : ""}.`, `${x.a} sinks the free throw.`, `Nothing but net from the line, ${x.a}.`])
    : P(r, [`${x.a} misses${x.n > 1 ? ` (${x.i} of ${x.n})` : ""}.`, `Off the rim. ${x.a} misses.`, `No good from ${x.a}.`, `${x.a} rims out the free throw.`]),
  // ---- the break in play ----
  sub: (P, r, x) => {
    if (!x.b) return P(r, [`${x.a} checks in for ${x.team}.`, `${x.a} enters the game.`]);
    if (x.why === "fouls") return P(r, [`${x.b} is out with too many fouls. ${x.a} comes in.`, `${x.b} fouls out, ${x.a} steps in.`]);
    if (x.why === "injury") return P(r, [`${x.a} replaces the injured ${x.b}.`, `${x.a} in for ${x.b}, who is hurt.`]);
    return P(r, [`${x.a} in for ${x.b}.`, `${x.team} make a change: ${x.a} for ${x.b}.`, `${x.b} heads to the bench, ${x.a} checks in.`, `Fresh legs. ${x.a} replaces ${x.b}.`]);
  },
  timeout: (P, r, x) => {
    const run = x.run && Math.max(x.run[0], x.run[1]) >= 8 ? ` After that run, the coach has seen enough.` : "";
    return P(r, [
      `Timeout, ${x.team}.${run}`, `${x.team} call time. ${x.left} left.${run}`, `The coach calls a timeout. ${x.left} left.${run}`, `${x.team} stop the clock and huddle up.${run}`
    ]);
  },
  injury: (P, r, x) => P(r, [
    `${x.a} is down and he is hurt. He will not return.`, `Trouble for ${x.team}: ${x.a} has to leave the game.`, `${x.a} goes down holding his leg. He is done for the night.`, `${x.a} is helped off. That hurts ${x.team}.`
  ]),
  qend: (P, r, x) => {
    const s = `${x.nameA} ${x.score[0]}, ${x.nameB} ${x.score[1]}`;
    if (x.half) return P(r, [`Halftime. ${s}.`, `That's the half. ${s}.`, `The horn sounds for halftime: ${s}.`]);
    return P(r, [`End of the quarter. ${s}.`, `That's the quarter: ${s}.`, `Horn. ${s} after ${x.n}.`]);
  },
  overtime: (P, r, x) => P(r, [
    `We are tied. Overtime${x.n > 1 ? ` number ${x.n}` : ""}!`, `Nobody wins it in regulation, so it's overtime${x.n > 1 ? ` ${x.n}` : ""}.`, `Five more minutes. Overtime${x.n > 1 ? ` ${x.n}` : ""}!`
  ]),
  final: (P, r, x) => {
    const margin = Math.abs(x.score[0] - x.score[1]), w = x.win, ot = x.ot ? " in overtime" : "";
    const hi = Math.max(x.score[0], x.score[1]), lo = Math.min(x.score[0], x.score[1]);
    if (margin <= 3) return P(r, [`Final: ${w} edge ${x.lose}${ot}, ${hi}-${lo}. That went down to the wire.`, `${w} survive${ot}, ${hi}-${lo}.`]);
    if (margin >= 20) return P(r, [`Final. ${w} dominate${ot}, ${hi}-${lo}.`, `A blowout. ${w} win ${hi}-${lo}.`]);
    return P(r, [`Final: ${w} beat ${x.lose}${ot}, ${hi}-${lo}.`, `That's the game. ${w} win it${ot}, ${hi}-${lo}.`, `${w} take it ${hi}-${lo}${ot}.`]);
  },
  coin: (P, r, x) => P(r, [
    `The coin flip goes to ${x.team}: they get the ball first.`, `${x.team} win the toss and take the tip.`, `The coin lands for ${x.team}.`
  ]),

  // ---- colour (second voice) ----
  run: (P, r, x) => {
    const n = x.n, t = x.team;
    return P(r, [
      `That is ${n} straight points for ${t}. The other bench needs an answer.`, `${t} are on a ${n}-0 run and the building is loud.`, `${n} unanswered for ${t}. Momentum is all theirs.`, `${t} have opened a run of ${n}, nothing is going for the other side.`
    ]);
  },
  clutch: (P, r, x) => {
    const c = secs(x.clk), t = c >= 60 ? `${Math.floor(c / 60)}:${String(c % 60).padStart(2, "0")}` : `${c} seconds`;
    const d = Math.abs(x.score[0] - x.score[1]);
    return P(r, [
      `${t} left and it's a ${d}-point game. Every possession counts now.`, `${d}-point game with ${t} to go. Nobody can relax.`, `Crunch time. ${t} on the clock, ${d} apart.`
    ]);
  },
  foulTrouble: (P, r, x) => P(r, [
    `${x.a} has ${x.n} fouls. His coach has to think about the bench.`, `${x.a} is on ${x.n} fouls and playing with care now.`, `Foul trouble for ${x.a}: ${x.n}. He can't afford another.`
  ]),
  fatigue: (P, r, x) => P(r, [
    `${x.a} has been out there a long time. His legs are starting to go.`, `${x.a} looks tired, he is a step slow getting back.`, `${x.a} needs a breather, you can see it.`
  ]),
  trait: (P, r, x) => {
    const pools = {
      speed: [`${x.a} is one of the quickest players on the floor.`, `Nobody gets down the floor like ${x.a}.`],
      handle: [`${x.a} has the ball on a string.`, `Very hard to take it off ${x.a}, he is that tight with the handle.`],
      shooting: [`${x.a} is dangerous the second he crosses half court, a pure shooter.`, `Leave ${x.a} open and he will make you pay.`],
      passing: [`${x.a} sees the floor like few others.`, `${x.a} is always looking for the open man.`],
      power: [`${x.a} plays above the rim.`, `${x.a} has real power around the basket.`],
      post: [`${x.a} is a load down low. Hard to move off the block.`, `${x.a} can score with his back to the basket.`],
      boards: [`${x.a} lives on the glass.`, `${x.a} hates to give up a rebound.`],
      defence: [`${x.a} is a real stopper on this end.`, `${x.a} makes every touch hard for the man he guards.`]
    };
    return pools[x.t] ? P(r, pools[x.t]) : `${x.a} is having a solid game.`;
  },
  state: (P, r, x) => {
    const d = lead(x), t = x.team;
    if (d === 0) return P(r, [`All square at ${x.score[0]}-${x.score[1]}.`, `Nothing between them: ${x.score[0]}-${x.score[1]}.`]);
    const hi = Math.max(x.score[0], x.score[1]), lo = Math.min(x.score[0], x.score[1]);
    if (d > 0 && d >= 15) return P(r, [`${t} are running away with this. ${hi}-${lo}.`, `${t} lead by ${d}. The other side needs something fast.`]);
    if (d > 0) return P(r, [`${t} up ${d}, ${hi}-${lo}.`, `${t} hold a ${d}-point lead.`, `${t} have the edge, ${d} clear.`]);
    return P(r, [`${t} trail by ${-d}.`, `${t} are down ${-d} and chasing.`, `${t} need to close a ${-d}-point gap.`]);
  },
  remark: (P, r, x) => P(r, [
    `Good game so far.`, `Plenty of basketball left.`, `Both benches are on their feet.`, `Strong defence on both ends this quarter.`, `The crowd is into this one.`
  ])
};
for (const k of Object.keys(W)) { const f = W[k]; W[k] = (P, r, x) => { P.key = k; return f(P, r, x); }; }   // the picker knows which pool is asking
void closeLate; void kindWord;
