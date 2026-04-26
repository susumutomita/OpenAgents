import { clamp } from './math';
import { MOAI_IDS, SLOT_CAPSULES } from './powerups';
import type { AgentProfile, PlayEvent, PlayLog } from './types';

const BASELINE_PROFILE = {
  attack: 18,
  defense: 18,
  intelligence: 18,
  agility: 18,
  cooperation: 12,
} as const;

function countEvents<T extends PlayEvent['kind']>(
  events: PlayEvent[],
  kind: T
): Extract<PlayEvent, { kind: T }>[] {
  return events.filter(
    (event): event is Extract<PlayEvent, { kind: T }> => event.kind === kind
  );
}

function tally<V extends string>(
  events: PlayEvent[],
  values: readonly V[],
  predicate: (event: PlayEvent, value: V) => boolean
): Record<V, number> {
  const counts = Object.fromEntries(
    values.map((value) => [value, 0])
  ) as Record<V, number>;

  for (const event of events) {
    for (const value of values) {
      if (predicate(event, value)) {
        counts[value] += 1;
        break;
      }
    }
  }

  return counts;
}

export function mapPlayLogToProfile(playLog: PlayLog): AgentProfile {
  const shootEvents = countEvents(playLog.events, 'shoot');
  const passEvents = countEvents(playLog.events, 'pass');
  const hitEvents = countEvents(playLog.events, 'hit');
  const capsuleCounts = tally(
    playLog.events,
    SLOT_CAPSULES,
    (event, capsule) => event.kind === 'capsule' && event.capsule === capsule
  );
  const commitCounts = tally(
    playLog.events,
    SLOT_CAPSULES,
    (event, capsule) => event.kind === 'commit' && event.capsule === capsule
  );
  const moaiKills = tally(
    playLog.events,
    MOAI_IDS,
    (event, moaiId) => event.kind === 'moaiKill' && event.moaiId === moaiId
  );
  const uniqueCommitCount = SLOT_CAPSULES.filter(
    (capsule) => commitCounts[capsule] > 0
  ).length;
  const paceBonus = clamp(
    Math.round((90000 - playLog.durationMs) / 6000),
    0,
    10
  );
  const resilienceBonus = clamp(passEvents.length - hitEvents.length, 0, 12);
  const scoreBonus = clamp(Math.round(playLog.finalScore / 350), 0, 18);

  const attack =
    BASELINE_PROFILE.attack +
    capsuleCounts.double * 4 +
    capsuleCounts.laser * 6 +
    commitCounts.double * 10 +
    commitCounts.laser * 12 +
    moaiKills.razor * 10 +
    clamp(shootEvents.length * 2, 0, 20) +
    Math.round(scoreBonus * 0.6);

  const defense =
    BASELINE_PROFILE.defense +
    capsuleCounts.shield * 6 +
    commitCounts.shield * 12 +
    moaiKills.aegis * 10 +
    resilienceBonus +
    Math.round(scoreBonus * 0.3) -
    hitEvents.reduce((total, event) => total + event.damage, 0) * 2;

  const intelligence =
    BASELINE_PROFILE.intelligence +
    capsuleCounts.missile * 6 +
    commitCounts.missile * 12 +
    moaiKills.oracle * 10 +
    uniqueCommitCount * 4 +
    Math.round(scoreBonus * 0.5);

  const agility =
    BASELINE_PROFILE.agility +
    capsuleCounts.speed * 7 +
    commitCounts.speed * 12 +
    moaiKills.comet * 10 +
    paceBonus +
    clamp(shootEvents.length - hitEvents.length * 2, 0, 16);

  const cooperation =
    BASELINE_PROFILE.cooperation +
    capsuleCounts.option * 7 +
    commitCounts.option * 14 +
    moaiKills.hive * 12 +
    Math.round(passEvents.length * 1.5) +
    uniqueCommitCount * 2;

  const profile = {
    attack: clamp(attack, 0, 100),
    defense: clamp(defense, 0, 100),
    intelligence: clamp(intelligence, 0, 100),
    agility: clamp(agility, 0, 100),
    cooperation: clamp(cooperation, 0, 100),
    combatPower: 0,
  };

  const synergyBonus =
    uniqueCommitCount * 24 +
    Object.values(moaiKills).filter((count) => count > 0).length * 16 +
    Math.round(scoreBonus * 18);

  const combatPower = Math.round(
    (profile.attack * 1.28 +
      profile.defense * 1.12 +
      profile.intelligence * 1.2 +
      profile.agility * 1.16 +
      profile.cooperation * 1.24) *
      18 +
      synergyBonus
  );

  return {
    ...profile,
    combatPower: clamp(combatPower, 0, 10000),
  };
}
