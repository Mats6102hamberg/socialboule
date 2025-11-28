export type PlayerLike = {
  playerId: string;
};

export type MatchTeamsSnapshot = {
  teams: {
    players: PlayerLike[];
  }[];
};

type Pair = [number, number];
type Pairing = [Pair, Pair];

function teammateKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function splitIntoGroupsWithByes<T>(
  players: T[],
  groupSize = 4,
): { groups: T[][]; byes: T[] } {
  const ordered = [...players];
  const remainder = ordered.length % groupSize;
  const byes = remainder === 0 ? [] : ordered.splice(-remainder, remainder);

  const groups: T[][] = [];
  for (let i = 0; i < ordered.length; i += groupSize) {
    groups.push(ordered.slice(i, i + groupSize));
  }

  return { groups, byes };
}

export function buildTeammateSet(matches: MatchTeamsSnapshot[]): Set<string> {
  const set = new Set<string>();

  for (const match of matches) {
    for (const team of match.teams) {
      for (let i = 0; i < team.players.length; i++) {
        for (let j = i + 1; j < team.players.length; j++) {
          const key = teammateKey(team.players[i].playerId, team.players[j].playerId);
          set.add(key);
        }
      }
    }
  }

  return set;
}

export function pickBalancedPairs<T extends PlayerLike>(
  group: T[],
  teammateSet: Set<string>,
): Pairing {
  const combos: Pairing[] = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ];

  const scored = combos
    .map((combo) => {
      const score = combo.reduce((acc, [a, b]) => {
        const key = teammateKey(group[a].playerId, group[b].playerId);
        return acc + (teammateSet.has(key) ? 1 : 0);
      }, 0);
      return { combo, score };
    })
    .sort((a, b) => a.score - b.score);

  const best = scored[0].combo;
  for (const [a, b] of best) {
    const key = teammateKey(group[a].playerId, group[b].playerId);
    teammateSet.add(key);
  }

  return best;
}
