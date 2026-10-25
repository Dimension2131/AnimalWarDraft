// modes/football/words.js: the commentator's vocabulary. Every line is original wording in the style of a TV match commentary: clipped play-by-play ("X finds Y"), judgement ("he should have hit the target there"),
// colour (possession and shot counts, the state of the game) and drama that follows the score and the clock (the deadlock is broken, level again, a late winner).
// Pure functions: (picker, rnd, context) -> text. The picker avoids repeating any of the last few lines, and everything is driven by the choreography's own seeded random stream, so every device says the same thing.
const ord = (n) => (n === 1 ? "first" : n === 2 ? "second" : n === 3 ? "third" : `${n}th`);

export function makePicker() {   // never repeats a phrase it used recently: remembers which template (by call site and index, so a different player name does not hide a repeat) it used last
  const recent = [];
  const P = (rnd, arr) => { let i = Math.floor(rnd() * arr.length) % arr.length; for (let k = 0; k < 6 && recent.includes(`${P.key}#${i}`); k++) i = Math.floor(rnd() * arr.length) % arr.length; recent.push(`${P.key}#${i}`); if (recent.length > 14) recent.shift(); return arr[i]; };
  P.key = "";
  return P;
}
const joinNames = (a) => (a.length <= 1 ? a.join("") : a.length === 2 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
export const ROLE = { GK: "goalkeeper", LB: "left-back", RB: "right-back", CB: "centre-half", CM: "midfielder", LM: "left midfielder", RM: "right midfielder", LW: "left winger", RW: "right winger", ST: "striker" };
// what a player is known for, from his stats: used for the odd colour remark
export function traitOf(e) {
  if (!e) return null;
  const v = { pace: e.pac || e.spd || 0, power: e.phy || 0, skill: e.dri || 0, finishing: e.sho || 0, passing: e.pas || 0, defending: e.def || 0 };
  const top = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 84 ? top[0] : null;
}
const scoreText = (x) => `${x.nameA} ${x.score[0]}, ${x.nameB} ${x.score[1]}`;
const clock = (x) => (x.m >= 90 ? "in stoppage time" : x.m >= 85 ? "in the final minutes" : x.m >= 75 ? "with the clock running down" : "");

export const W = {
  // ---- winning the ball ----
  tackle: (P, r, x) => P(r, [`${x.a} gets across and wins it back.`, `Good anticipation from ${x.a}, he steps in and takes it.`, `${x.a} wins the ball cleanly. Strong defending.`, `${x.a} snaps into the challenge and comes away with it.`, `${x.a} muscles him off the ball. ${x.team} are in possession again.`, `Excellent tackle from ${x.a}!`, `${x.a} was waiting for that. Takes it off his toes.`]),
  intercept: (P, r, x) => P(r, [`${x.a} cuts out the pass.`, `${x.a} has read that all the way, and steps in.`, `Intercepted by ${x.a}. ${x.team} can break.`, `${x.a} gets a foot in the way. Loose pass, and ${x.team} will take that.`, `${x.a} sniffs it out, a poor ball from ${x.opp}.`]),
  // ---- passing ----
  pass: (P, r, x) => {
    const k = x.kind, T = x.team;
    const pools = {
      short: [`${x.a} finds ${x.b}.`, `${x.a} slips it to ${x.b}.`, `${x.a} to ${x.b}, nice and simple.`, `${x.b} takes it in his stride. ${T} knocking it around.`, `Quick one-two between ${x.a} and ${x.b}.`],
      back: [`${x.a} takes it back to ${x.b}. Nothing on.`, `Back to ${x.b}, ${T} going round the houses.`, `${x.a} plays it safe, back to ${x.b}.`, `${T} recycle it, ${x.b} on the ball.`],
      wide: [`${x.a} spreads it out to ${x.b} on the ${x.side}.`, `Switch of play from ${x.a}. ${x.b} has space out wide.`, `${x.b} pops up on the ${x.side}, found by ${x.a}.`, `Out to the ${x.side} goes the ball, ${x.b} receives.`],
      long: [`Long ball from ${x.a} towards ${x.b}.`, `${x.a} tries to find ${x.b} over the top.`, `Big diagonal from ${x.a}. ${x.b} brings it down well.`, `${x.a} goes long. ${x.b} controls it.`],
      forward: [`${x.a} looks for ${x.b} between the lines.`, `${x.a} threads one forward to ${x.b}.`, `${T} moving up the pitch, ${x.a} feeds ${x.b}.`, `Progress from ${T}: ${x.a} to ${x.b}, they're into the final third.`, `${x.b} drops in to take it from ${x.a}, looking to turn.`],
      through: [`Lovely weight on that pass from ${x.a}, ${x.b} is in!`, `${x.a} splits the defence! ${x.b} is through!`, `A clever ball from ${x.a} and ${x.b} is away!`]
    };
    return P(r, pools[k] || pools.short);
  },
  carry: (P, r, x) => {
    const base = [`${x.a} drives forward with the ball.`, `${x.a} takes it on, looking for a way through.`, `${x.a} runs at them, ${x.team} pushing up.`, `${x.a} carries it into the space.`];
    if (x.trait === "pace") base.push(`${x.a} puts his foot down, and he has serious pace.`, `Nobody is catching ${x.a} when he gets going.`);
    if (x.trait === "skill") base.push(`Lovely close control from ${x.a}.`, `${x.a} glides past one, there's real quality on the ball.`);
    if (x.trait === "power") base.push(`${x.a} just shrugs off the challenge. Strong as an ox.`, `${x.a} uses his strength, he's very hard to move off the ball.`);
    return P(r, base);
  },
  dribble: (P, r, x) => P(r, [`${x.a} dribbles past a challenge.`, `${x.a} beats his man with a shimmy!`, `Neat footwork from ${x.a}, he's past one.`, `${x.a} drops the shoulder and he's gone by.`]),
  counter: (P, r, x) => P(r, [`${x.team} break at speed! ${x.a} is away!`, `Quick transition, and ${x.a} leads the counter.`, `${x.a} spots the space and bursts forward.`, `${x.opp} caught upfield, and ${x.a} is running at the back line.`]),
  press: (P, r, x) => P(r, [`${x.a} hunts him down and wins it.`, `${x.a} presses high and gets the ball.`, `${x.a} steps in, ${x.opp} gave that away cheaply.`]),
  // ---- set pieces and stoppages ----
  throwin: (P, r, x) => P(r, [`Out for a throw-in. ${x.team} to take it.`, `Throw to ${x.team}, ${x.a} will take it down the line.`, `The ball goes out, ${x.team} throw-in.`]),
  foul: (P, r, x) => P(r, [`${x.b} goes in late on ${x.a}. Free kick.`, `That's a foul. ${x.b} caught him, and the referee blows.`, `${x.a} is brought down by ${x.b}. Free kick to ${x.team}.`, `The whistle goes: ${x.b} was a fraction late there.`, `${x.b} clips ${x.a}. Referee gives the free kick.`]),
  corner: (P, r, x) => P(r, [`Corner to ${x.team}. ${x.a} goes over to take it.`, `${x.team} have a corner. Bodies in the box.`, `It's a corner, and ${x.team} will send men forward.`]),
  cornerClear: (P, r, x) => P(r, [`${x.a} heads it clear.`, `${x.a} gets there first and clears the danger.`, `${x.a} rises highest and nods it away.`, `Cleared by ${x.a}, ${x.opp} breathe again.`]),
  gk: (P, r, x) => P(r, [`${x.a} plays it long.`, `${x.a} takes his time, and sends it downfield.`, `${x.a} launches it up the pitch.`, `Goal kick, and ${x.a} goes long.`]),
  heldSafely: (P, r, x) => P(r, [`Held safely.`, `${x.a} gathers it comfortably.`, `Claimed by ${x.a}, no problem.`]),
  // ---- chances ----
  shot: (P, r, x) => P(r, [`${x.a} shoots!`, `${x.a} lets fly!`, `${x.a} pulls the trigger!`, `${x.a} has a go from distance!`, `Here's the chance for ${x.a}!`, `${x.a} gets it out of his feet, and shoots!`]),
  cross: (P, r, x) => P(r, [`${x.a} whips in the cross!`, `Here's the delivery from ${x.a}!`, `${x.a} swings it into the box!`, `${x.a} floats one in, ${x.b} attacking it!`]),
  wing: (P, r, x) => P(r, [`${x.a} gets to the byline…`, `${x.a} races down the ${x.side}, he's in behind!`, `${x.a} has the whole flank to himself.`]),
  breakthrough: (P, r, x) => P(r, [`${x.a} slides it through, ${x.b} is in on goal!`, `${x.a} sees the run and plays it, ${x.b} one on one!`, `Perfectly weighted from ${x.a}, ${x.b} has a sight of goal!`]),
  solo: (P, r, x) => P(r, [`${x.a} takes on the defence!`, `${x.a} goes on his own, he's past one and into the box!`, `${x.a} drifts inside, he's going to have a go!`]),
  block: (P, r, x) => P(r, [`${x.a} throws himself in front of it. Brave defending!`, `${x.a} gets in the way and blocks it!`, `Last-ditch stuff from ${x.a}, ${x.opp} survive!`, `${x.a} slides in and the danger is gone.`, `Great block from ${x.a}! ${x.team} were certain they'd score.`]),
  save: (P, r, x) => {
    const late = x.m >= 80 && x.diff !== 0;
    return P(r, [`Saved! ${x.gk} gets down to it.`, `What a stop from ${x.gk}!`, `${x.gk} stands tall and keeps it out!`, `${x.gk} gets a strong hand to ${x.a}'s effort!`, `${x.gk} denies ${x.a}, great reflexes!`, `${x.a} thought he had scored, but ${x.gk} had other ideas.`, ...(late ? [`${x.gk} keeps ${x.opp} in it with a huge save!`] : [])]);
  },
  miss: (P, r, x) => (x.high
    ? P(r, [`${x.a} sends it over the bar. Should have done better.`, `Skied it! ${x.a} will be furious with that.`, `Over the crossbar from ${x.a}. He'll want that back.`])
    : P(r, [`${x.a} drags it wide. That should have been on target.`, `Wide of the post from ${x.a}. A real chance gone.`, `${x.a} pulls it past the far post. Missed opportunity.`, `Off target. ${x.a} couldn't keep it down.`])),
  goal: (P, r, x) => {
    const lead = x.diffBefore, how = {
      header: [`A towering header from ${x.a}!`, `${x.a} meets it perfectly and nods it in!`, `Powerful header from ${x.a}, unstoppable!`],
      through: [`${x.a} keeps his composure and slots it home!`, `Cool as you like from ${x.a}, round the keeper and in!`, `${x.a} finishes it off clinically.`],
      solo: [`${x.a} goes past two and finishes beautifully!`, `What a solo effort from ${x.a}! He's done it all himself!`, `${x.a} makes it look easy, a lovely finish!`],
      shot: [`${x.a} rifles it into the corner!`, `${x.a} hits it first time and it flies in!`, `${x.a} strikes it sweetly. The keeper had no chance.`]
    }[x.flavour] || [`${x.a} scores!`];
    const head = lead < -1 ? `A goal back for ${x.team}, and they're in this!` : lead === -1 ? `That's ${x.team} level!` : x.first ? `The deadlock is broken!` : lead === 0 ? `${x.team} take the lead!` : `${x.team} extend their lead!`;
    const tail = x.m >= 85 ? ` ${clock(x)}!` : "";
    const as = x.b ? P(r, [` ${x.b} with the assist.`, ` Created by ${x.b}.`, ` ${x.b} the architect.`]) : "";
    return `GOAL! ${x.a}! ${P(r, how)} ${head}${as}${tail} ${scoreText(x)}.`;
  },
  // ---- cards, changes ----
  yellow: (P, r, x) => P(r, [`Yellow card for ${x.a}. He has to be careful now.`, `${x.a} goes into the book for that challenge.`, `The referee reaches for his pocket: ${x.a} is booked.`, `${x.a} can have no complaints. Yellow card.`]),
  red: (P, r, x) => (x.second ? `Second yellow! ${x.a} is sent off, and ${x.team} are down to ten men.` : P(r, [`RED CARD! ${x.a} is sent off! ${x.team} are down to ten!`, `That's a straight red for ${x.a}. ${x.team} have it all to do now.`])),
  injury: (P, r, x) => P(r, [`${x.a} is down, and the physios are on.`, `Worrying signs: ${x.a} stays down.`, `${x.a} is holding his leg. The game is stopped.`]),
  sub: (P, r, x) => (x.forced ? `Injury forces a change: ${x.on} replaces ${x.off} for ${x.team}.` : P(r, [`Change for ${x.team}: ${x.on} on, ${x.off} off.`, `${x.team} make a substitution. ${x.on} replaces ${x.off}.`, `Fresh legs for ${x.team}: ${x.on} comes on for ${x.off}.`])),
  // ---- the match as a story ----
  kickoff: (P, r, x) => P(r, [`And we're underway! ${x.nameA} against ${x.nameB}. ${x.nameA} get us going.`, `The referee blows, and ${x.nameA} kick off against ${x.nameB}.`, `Here we go! ${x.nameA} versus ${x.nameB}, and ${x.nameA} start with the ball.`]),
  halftime: (P, r, x) => {
    const [a, b] = x.score, who = a === b ? "all square" : `${a > b ? x.nameA : x.nameB} lead`;
    const sc = x.scorers.length ? ` Goals from ${joinNames(x.scorers)}.` : " No goals in it.";
    return `That's the half-time whistle. ${a === b ? `It's ${a}-${b} and ${who}.` : `${who} ${Math.max(a, b)}-${Math.min(a, b)}.`}${sc} ${P(r, a === b ? ["Everything to play for after the break.", "Plenty to talk about in the dressing rooms."] : ["The other side have work to do after the break.", "A good half for the leaders, but there's a long way to go."])}`;
  },
  fulltime: (P, r, x) => {
    const [a, b] = x.score, res = a === b ? `It finishes level, ${a}-${b}.` : `${a > b ? x.nameA : x.nameB} win it, ${Math.max(a, b)}-${Math.min(a, b)}.`;
    return `It's all over! Full time: ${x.nameA} ${a}, ${x.nameB} ${b}. ${res}${x.scorers.length ? ` The goals came from ${joinNames(x.scorers)}.` : ""}`;
  },
  // ---- colour: what a co-commentator would add ----
  possession: (P, r, x) => {
    const lead = x.poss[0] >= x.poss[1] ? 0 : 1, pc = Math.round(x.poss[lead]), n = [x.nameA, x.nameB][lead];
    return pc >= 55 ? P(r, [`${n} have had ${pc} percent of the ball so far.`, `${n} are keeping the ball well, around ${pc} percent possession.`, `${n} dominating possession here, ${pc} percent.`]) : P(r, [`Very even in terms of possession, neither side is in control.`, `It's a real tussle in midfield. Possession is shared evenly.`]);
  },
  shots: (P, r, x) => {
    const [a, b] = x.shots;
    return a + b < 2 ? P(r, [`Not much between the sides yet, chances have been scarce.`, `Both defences on top so far.`]) : P(r, [`${a > b ? x.nameA : x.nameB} lead the shot count, ${Math.max(a, b)} to ${Math.min(a, b)}.`, `${x.nameA} have had ${a} ${a === 1 ? "shot" : "shots"}, ${x.nameB} ${b}.`]);
  },
  state: (P, r, x) => {
    const [a, b] = x.score, m = x.m;
    if (m >= 85 && a !== b) return P(r, [`${a > b ? x.nameB : x.nameA} are running out of time. They need something here.`, `The clock is not on the side of ${a > b ? x.nameB : x.nameA}.`]);
    if (m >= 85) return P(r, [`Level at the death. Who wants it more?`, `Tense now, one goal could settle this.`]);
    if (m >= 60 && a === b) return P(r, [`Still level, and the nerves are showing.`, `Both teams looking for the winner now.`]);
    if (a !== b && Math.abs(a - b) >= 2) return P(r, [`${a > b ? x.nameB : x.nameA} have a mountain to climb.`, `That's a comfortable cushion for ${a > b ? x.nameA : x.nameB}, though football can be a cruel game.`]);
    return P(r, [`${m} minutes played, ${x.nameA} ${a}, ${x.nameB} ${b}.`, `We're ${m} minutes in, and it's ${x.nameA} ${a}, ${x.nameB} ${b}.`, `Good, competitive football out there.`, `The tempo is high, and both sides are going at it.`, `A lot of effort from both teams, the crowd is enjoying this.`]);
  },
  trait: (P, r, x) => ({
    pace: P(r, [`${x.a} has the pace to hurt anyone.`, `With his pace, ${x.a} is always a threat on the break.`]),
    power: P(r, [`${x.a} is a real physical presence.`, `Very hard to knock ${x.a} off the ball.`]),
    skill: P(r, [`${x.a} is a joy to watch on the ball.`, `There's so much technique in ${x.a}.`]),
    finishing: P(r, [`${x.a} is a natural finisher.`, `Give ${x.a} a sniff and he'll take it.`]),
    passing: P(r, [`${x.a} sets the tempo for ${x.team}.`, `${x.a} sees things other players don't.`]),
    defending: P(r, [`${x.a} is a rock at the back.`, `${x.a} reads the game so well.`])
  }[x.t] || `${x.a} is having a decent game.`)
};
for (const k of Object.keys(W)) { const f = W[k]; W[k] = (P, r, x) => { P.key = k; return f(P, r, x); }; }   // the picker knows which phrase pool is asking
void ord;
