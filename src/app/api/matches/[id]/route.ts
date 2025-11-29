import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MatchStatus, ResultConfirmationStatus, TeamSide } from "@/generated/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { playerId, homeScore, awayScore, walkoverSide, adminOverride } = body ?? {};

    if (walkoverSide && walkoverSide !== "HOME" && walkoverSide !== "AWAY") {
      return NextResponse.json({ error: "Invalid walkoverSide" }, { status: 400 });
    }

    // Validate scores based on walkover status
    if (walkoverSide) {
      // For walkovers, validate that scores are exactly 13-0 or 0-13
      const expectedHomeScore = walkoverSide === "HOME" ? 13 : 0;
      const expectedAwayScore = walkoverSide === "AWAY" ? 13 : 0;

      if (
        typeof homeScore === "number" &&
        typeof awayScore === "number" &&
        (homeScore !== expectedHomeScore || awayScore !== expectedAwayScore)
      ) {
        return NextResponse.json(
          { error: `Walkover scores must be ${expectedHomeScore}-${expectedAwayScore}` },
          { status: 400 }
        );
      }
    } else {
      // For regular matches, validate that scores are valid numbers
      if (
        typeof homeScore !== "number" ||
        typeof awayScore !== "number" ||
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore) ||
        homeScore < 0 ||
        awayScore < 0
      ) {
        return NextResponse.json(
          { error: "homeScore and awayScore must be non-negative numbers" },
          { status: 400 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
          resultConfirmations: true,
        },
      });

      if (!match) {
        throw new Error("MATCH_NOT_FOUND");
      }

      const homeTeam = match.teams.find((t) => t.side === "HOME");
      const awayTeam = match.teams.find((t) => t.side === "AWAY");

      if (!homeTeam || !awayTeam) {
        throw new Error("TEAMS_NOT_FOUND");
      }

      const participants = [...homeTeam.players, ...awayTeam.players];
      const participantIds = participants.map((p) => p.playerId);

      const derivedHome = typeof homeScore === "number" ? homeScore : walkoverSide === "HOME" ? 13 : 0;
      const derivedAway = typeof awayScore === "number" ? awayScore : walkoverSide === "AWAY" ? 13 : 0;

      // Admin override: update match directly without confirmation process
      if (adminOverride) {
        const updatedMatch = await tx.match.update({
          where: { id },
          data: {
            homeScore: derivedHome,
            awayScore: derivedAway,
            status: walkoverSide ? MatchStatus.WALKOVER : MatchStatus.COMPLETED,
            walkoverWinner: walkoverSide ?? null,
          },
          include: {
            teams: {
              include: {
                players: true,
              },
            },
            resultConfirmations: true,
          },
        });

        const homeWon = walkoverSide
          ? walkoverSide === TeamSide.HOME
          : derivedHome > derivedAway;
        const awayWon = walkoverSide
          ? walkoverSide === TeamSide.AWAY
          : derivedAway > derivedHome;

        const playerUpdates: Promise<unknown>[] = [];

        for (const mp of homeTeam.players) {
          playerUpdates.push(
            tx.matchPlayer.update({
              where: { id: mp.id },
              data: {
                pointsFor: derivedHome,
                pointsAgainst: derivedAway,
                won: homeWon,
              },
            }),
          );
        }

        for (const mp of awayTeam.players) {
          playerUpdates.push(
            tx.matchPlayer.update({
              where: { id: mp.id },
              data: {
                pointsFor: derivedAway,
                pointsAgainst: derivedHome,
                won: awayWon,
              },
            }),
          );
        }

        await Promise.all(playerUpdates);

        return updatedMatch;
      }

      // Regular player confirmation flow
      if (!playerId || typeof playerId !== "string") {
        throw new Error("PLAYER_ID_REQUIRED");
      }

      if (!participantIds.includes(playerId)) {
        throw new Error("PLAYER_NOT_IN_MATCH");
      }

      await tx.matchResultConfirmation.upsert({
        where: { MatchConfirmation_unique: { matchId: id, playerId } },
        create: {
          matchId: id,
          playerId,
          reportedHomeScore: derivedHome,
          reportedAwayScore: derivedAway,
          reportedWalkoverSide: walkoverSide ?? null,
        },
        update: {
          reportedHomeScore: derivedHome,
          reportedAwayScore: derivedAway,
          reportedWalkoverSide: walkoverSide ?? null,
          status: ResultConfirmationStatus.PENDING,
        },
      });

      const confirmations = await tx.matchResultConfirmation.findMany({
        where: { matchId: id, playerId: { in: participantIds } },
      });

      if (confirmations.length < participantIds.length) {
        return tx.match.findUnique({
          where: { id },
          include: {
            teams: { include: { players: { include: { player: true } } } },
            resultConfirmations: true,
          },
        });
      }

      const first = confirmations[0];
      const allMatch = confirmations.every(
        (conf) =>
          conf.reportedHomeScore === first.reportedHomeScore &&
          conf.reportedAwayScore === first.reportedAwayScore &&
          conf.reportedWalkoverSide === first.reportedWalkoverSide,
      );

      if (!allMatch) {
        await tx.matchResultConfirmation.updateMany({
          where: { matchId: id },
          data: { status: ResultConfirmationStatus.DISPUTED },
        });

        return tx.match.findUnique({
          where: { id },
          include: {
            teams: { include: { players: { include: { player: true } } } },
            resultConfirmations: true,
          },
        });
      }

      await tx.matchResultConfirmation.updateMany({
        where: { matchId: id },
        data: { status: ResultConfirmationStatus.CONFIRMED },
      });

      const updatedMatch = await tx.match.update({
        where: { id },
        data: {
          homeScore: first.reportedHomeScore,
          awayScore: first.reportedAwayScore,
          status: first.reportedWalkoverSide ? MatchStatus.WALKOVER : MatchStatus.COMPLETED,
          walkoverWinner: first.reportedWalkoverSide,
        },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
          resultConfirmations: true,
        },
      });

      const homeWon = first.reportedWalkoverSide
        ? first.reportedWalkoverSide === TeamSide.HOME
        : first.reportedHomeScore > first.reportedAwayScore;
      const awayWon = first.reportedWalkoverSide
        ? first.reportedWalkoverSide === TeamSide.AWAY
        : first.reportedAwayScore > first.reportedHomeScore;

      const playerUpdates: Promise<unknown>[] = [];

      for (const mp of homeTeam.players) {
        playerUpdates.push(
          tx.matchPlayer.update({
            where: { id: mp.id },
            data: {
              pointsFor: first.reportedHomeScore,
              pointsAgainst: first.reportedAwayScore,
              won: homeWon,
            },
          }),
        );
      }

      for (const mp of awayTeam.players) {
        playerUpdates.push(
          tx.matchPlayer.update({
            where: { id: mp.id },
            data: {
              pointsFor: first.reportedAwayScore,
              pointsAgainst: first.reportedHomeScore,
              won: awayWon,
            },
          }),
        );
      }

      await Promise.all(playerUpdates);

      return updatedMatch;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "MATCH_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "TEAMS_NOT_FOUND") {
      return NextResponse.json({ error: "Match teams not found" }, { status: 500 });
    }
    if (error instanceof Error && error.message === "PLAYER_NOT_IN_MATCH") {
      return NextResponse.json({ error: "Player not part of this match" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "PLAYER_ID_REQUIRED") {
      return NextResponse.json({ error: "playerId is required for non-admin updates" }, { status: 400 });
    }

    console.error("Error updating match result", error);
    return NextResponse.json(
      { error: "Failed to update match result" },
      { status: 500 },
    );
  }
}
