const averagePoints = (player) => {
  const value = Number(player.average_points);
  return Number.isFinite(value) ? value : 0;
};

const shuffle = (items, random) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const teamSizes = (playerCount, numberOfTeams, random) => {
  const baseSize = Math.floor(playerCount / numberOfTeams);
  const extraPlayers = playerCount % numberOfTeams;
  return shuffle(
    Array.from(
      { length: numberOfTeams },
      (_, index) => baseSize + (index < extraPlayers ? 1 : 0),
    ),
    random,
  );
};

export const getTeamAverage = (team) => {
  if (!team.length) return 0;
  return team.reduce((sum, player) => sum + averagePoints(player), 0) / team.length;
};

const balanceScore = (teams) => {
  const averages = teams.map(getTeamAverage);
  return Math.max(...averages) - Math.min(...averages);
};

const addThreePlayerGroup = (teams, group, numberOfTeams, extraTeam, random) => {
  const randomizedGroup = shuffle(group, random);

  if (numberOfTeams === 3) {
    randomizedGroup.forEach((player, index) => teams[index].push(player));
    return;
  }

  // With two teams, three players cannot all be separated. A 2–1 split is
  // therefore the closest possible equivalent of the rule.
  randomizedGroup.forEach((player, index) => {
    if (index < 2) teams[index].push(player);
    else teams[extraTeam].push(player);
  });
};

const playerId = (player) => String(player.id);

const buildCandidate = (
  rankedPlayers,
  numberOfTeams,
  random,
  protectedTop,
  protectedBottom,
) => {
  const teams = Array.from({ length: numberOfTeams }, () => []);
  const sizes = teamSizes(rankedPlayers.length, numberOfTeams, random);
  const protectedIds = new Set(
    [...protectedTop, ...protectedBottom].map(playerId),
  );
  const remaining = rankedPlayers.filter(
    (player) => !protectedIds.has(playerId(player)),
  );

  if (numberOfTeams === 3) {
    addThreePlayerGroup(teams, protectedTop, numberOfTeams, 0, random);
    addThreePlayerGroup(teams, protectedBottom, numberOfTeams, 0, random);
  } else {
    const topExtraTeam = random() < 0.5 ? 0 : 1;
    addThreePlayerGroup(teams, protectedTop, numberOfTeams, topExtraTeam, random);
    addThreePlayerGroup(teams, protectedBottom, numberOfTeams, 1 - topExtraTeam, random);
  }

  const availableSlots = [];
  teams.forEach((team, teamIndex) => {
    for (let count = team.length; count < sizes[teamIndex]; count += 1) {
      availableSlots.push(teamIndex);
    }
  });

  const randomizedRemaining = shuffle(remaining, random);
  shuffle(availableSlots, random).forEach((teamIndex, index) => {
    teams[teamIndex].push(randomizedRemaining[index]);
  });

  return teams;
};

export function createBalancedTeams(
  players,
  numberOfTeams,
  {
    random = Math.random,
    attempts = 2000,
    protectedTopIds,
    protectedBottomIds,
  } = {},
) {
  if (![2, 3].includes(numberOfTeams)) {
    throw new Error("Only two or three teams are supported.");
  }
  if (players.length < 6) {
    throw new Error("At least six players are required.");
  }

  // Shuffling first makes players with the same average change position
  // between generations while the subsequent stable sort still ranks them.
  const rankedPlayers = shuffle(players, random).sort(
    (a, b) => averagePoints(b) - averagePoints(a),
  );
  const byId = new Map(rankedPlayers.map((player) => [playerId(player), player]));
  const requestedTop = protectedTopIds?.map(String);
  const requestedBottom = protectedBottomIds?.map(String);
  const protectedTop = requestedTop
    ? requestedTop.map((id) => byId.get(id)).filter(Boolean)
    : rankedPlayers.slice(0, 3);
  const topIds = new Set(protectedTop.map(playerId));
  const protectedBottom = requestedBottom
    ? requestedBottom
        .map((id) => byId.get(id))
        .filter((player) => player && !topIds.has(playerId(player)))
    : rankedPlayers.slice(-3);
  let bestScore = Number.POSITIVE_INFINITY;
  let bestCandidates = [];
  const tolerance = 0.05;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = buildCandidate(
      rankedPlayers,
      numberOfTeams,
      random,
      protectedTop,
      protectedBottom,
    );
    const score = balanceScore(candidate);

    if (score < bestScore - tolerance) {
      bestScore = score;
      bestCandidates = [candidate];
    } else if (score <= bestScore + tolerance) {
      bestCandidates.push(candidate);
    }
  }

  return bestCandidates[Math.floor(random() * bestCandidates.length)];
}
