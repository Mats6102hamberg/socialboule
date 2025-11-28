import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn<
    [callback: (tx: unknown) => Promise<unknown> | unknown],
    Promise<unknown>
  >(),
  bouleNight: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { PATCH as updateMatch } from "@/app/api/matches/[id]/route";
import { POST as drawRound3 } from "@/app/api/boule-nights/[id]/draw-round-3/route";
import { MatchStatus, ResultConfirmationStatus, TeamSide } from "@/generated/client";

function createRequest(pathname: string, method: "PATCH" | "POST", body?: unknown) {
  const headers = new Headers();
  return {
    method,
    headers,
    nextUrl: { pathname },
    json: async () => body,
  } as unknown as NextRequest;
}

function mockTransaction<T>(tx: T) {
  prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));
}

function buildMatch() {
  return {
    id: "match-1",
    status: MatchStatus.SCHEDULED,
    homeScore: null,
    awayScore: null,
    walkoverWinner: null,
    teams: [
      {
        side: TeamSide.HOME,
        players: [
          { id: "hp1", playerId: "p1" },
          { id: "hp2", playerId: "p2" },
        ],
      },
      {
        side: TeamSide.AWAY,
        players: [
          { id: "ap1", playerId: "p3" },
          { id: "ap2", playerId: "p4" },
        ],
      },
    ],
    resultConfirmations: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/matches/[id]", () => {
  it("marks a match as walkover when all confirmations agree", async () => {
    const match = buildMatch();
    const confirmations = ["p1", "p2", "p3", "p4"].map((playerId, idx) => ({
      id: `conf-${idx}`,
      matchId: match.id,
      playerId,
      reportedHomeScore: 13,
      reportedAwayScore: 0,
      reportedWalkoverSide: TeamSide.HOME,
      status: ResultConfirmationStatus.PENDING,
    }));

    const updatedMatch = {
      ...match,
      homeScore: 13,
      awayScore: 0,
      status: MatchStatus.WALKOVER,
      walkoverWinner: TeamSide.HOME,
    };

    const tx = {
      match: {
        findUnique: vi.fn().mockResolvedValue(match),
        update: vi.fn().mockResolvedValue(updatedMatch),
      },
      matchResultConfirmation: {
        upsert: vi.fn().mockResolvedValue(confirmations[0]),
        findMany: vi.fn().mockResolvedValue(confirmations),
        updateMany: vi.fn().mockResolvedValue({ count: confirmations.length }),
      },
      matchPlayer: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockTransaction(tx);

    const response = await updateMatch(
      createRequest(`/api/matches/${match.id}`, "PATCH", {
        playerId: "p1",
        walkoverSide: TeamSide.HOME,
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe(MatchStatus.WALKOVER);
    expect(tx.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MatchStatus.WALKOVER,
          walkoverWinner: TeamSide.HOME,
          homeScore: 13,
          awayScore: 0,
        }),
      }),
    );

    const playerUpdates = tx.matchPlayer.update.mock.calls.map(
      (call) => call[0] as { data: { won: boolean } },
    );
    expect(playerUpdates).toHaveLength(4);
    expect(playerUpdates.filter((call: any) => call.data.won === true)).toHaveLength(2);
    expect(playerUpdates.filter((call: any) => call.data.won === false)).toHaveLength(2);
    expect(tx.matchResultConfirmation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ResultConfirmationStatus.CONFIRMED } }),
    );
  });

  it("flags a dispute when confirmations disagree", async () => {
    const match = buildMatch();
    const confirmations = [
      {
        id: "conf-1",
        matchId: match.id,
        playerId: "p1",
        reportedHomeScore: 13,
        reportedAwayScore: 5,
        reportedWalkoverSide: null,
        status: ResultConfirmationStatus.PENDING,
      },
      {
        id: "conf-2",
        matchId: match.id,
        playerId: "p2",
        reportedHomeScore: 13,
        reportedAwayScore: 5,
        reportedWalkoverSide: null,
        status: ResultConfirmationStatus.PENDING,
      },
      {
        id: "conf-3",
        matchId: match.id,
        playerId: "p3",
        reportedHomeScore: 5,
        reportedAwayScore: 13,
        reportedWalkoverSide: null,
        status: ResultConfirmationStatus.PENDING,
      },
      {
        id: "conf-4",
        matchId: match.id,
        playerId: "p4",
        reportedHomeScore: 7,
        reportedAwayScore: 13,
        reportedWalkoverSide: null,
        status: ResultConfirmationStatus.PENDING,
      },
    ];

    const matchWithConfirmations = { ...match, resultConfirmations: confirmations };

    const tx = {
      match: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(match)
          .mockResolvedValueOnce(matchWithConfirmations),
        update: vi.fn(),
      },
      matchResultConfirmation: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue(confirmations),
        updateMany: vi.fn().mockResolvedValue({ count: confirmations.length }),
      },
      matchPlayer: {
        update: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx as never));

    const response = await updateMatch(
      createRequest(`/api/matches/${match.id}`, "PATCH", {
        playerId: "p1",
        homeScore: 13,
        awayScore: 5,
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe(MatchStatus.SCHEDULED);
    expect(tx.matchResultConfirmation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: ResultConfirmationStatus.DISPUTED } }),
    );
    expect(tx.match.update).not.toHaveBeenCalled();
  });
});

describe("/api/boule-nights/[id]/draw-round-3", () => {
  it("creates matches and round byes when player count is not divisible by four", async () => {
    const nightId = "night-1";

    const matches = [
      {
        id: "m1",
        status: MatchStatus.COMPLETED,
        teams: [
          {
            players: [
              { playerId: "p1", pointsFor: 13, pointsAgainst: 5, won: true },
              { playerId: "p2", pointsFor: 13, pointsAgainst: 5, won: true },
            ],
          },
          {
            players: [
              { playerId: "p3", pointsFor: 5, pointsAgainst: 13, won: false },
              { playerId: "p4", pointsFor: 5, pointsAgainst: 13, won: false },
            ],
          },
        ],
      },
      {
        id: "m2",
        status: MatchStatus.WALKOVER,
        teams: [
          {
            players: [
              { playerId: "p5", pointsFor: 0, pointsAgainst: 13, won: false },
              { playerId: "p6", pointsFor: 0, pointsAgainst: 13, won: false },
            ],
          },
          {
            players: [
              { playerId: "p3", pointsFor: 13, pointsAgainst: 0, won: true },
              { playerId: "p4", pointsFor: 13, pointsAgainst: 0, won: true },
            ],
          },
        ],
      },
    ];

    prismaMock.bouleNight.findUnique.mockResolvedValue({
      id: nightId,
      rounds: [
        { id: "r1", number: 1 },
        { id: "r2", number: 2 },
      ],
      matches,
    });

    const createdRound = { id: "round-3", number: 3 };
    const tx = {
      round: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdRound),
      },
      match: {
        create: vi.fn().mockResolvedValue({ id: "round3-match" }),
      },
      matchTeam: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: "team-home" })
          .mockResolvedValueOnce({ id: "team-away" }),
      },
      matchPlayer: {
        create: vi.fn().mockResolvedValue({ id: "mp" }),
      },
      roundBye: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx as never));

    const response = await drawRound3(
      createRequest(`/api/boule-nights/${nightId}/draw-round-3`, "POST"),
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.matches).toHaveLength(1);
    expect(body.byes).toEqual(["p5", "p6"]);
    expect(tx.roundBye.createMany).toHaveBeenCalledWith({
      data: [
        { roundId: createdRound.id, playerId: "p5" },
        { roundId: createdRound.id, playerId: "p6" },
      ],
    });
    expect(tx.matchPlayer.create).toHaveBeenCalledTimes(4);
  });
});
