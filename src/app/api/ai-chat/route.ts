import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface Message {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  name?: string;
}

// Function definitions for OpenAI function calling
const functions = [
  {
    name: "get_upcoming_nights",
    description: "Hämtar kommande Pétanque Crash-event",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Antal kvällar att hämta (max 10)",
        },
      },
    },
  },
  {
    name: "get_player_stats",
    description: "Hämtar statistik för en specifik spelare",
    parameters: {
      type: "object",
      properties: {
        playerName: {
          type: "string",
          description: "Spelarens namn",
        },
      },
      required: ["playerName"],
    },
  },
  {
    name: "get_player_chemistry",
    description: "Hämtar spelkemi - vilka spelare som spelar bra tillsammans",
    parameters: {
      type: "object",
      properties: {
        playerName: {
          type: "string",
          description: "Spelarens namn",
        },
      },
      required: ["playerName"],
    },
  },
  {
    name: "get_all_players",
    description: "Hämtar alla spelare i klubben",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_leaderboard",
    description: "Hämtar topplistan med bästa spelarna",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Antal spelare att visa (max 20)",
        },
      },
    },
  },
];

// Function implementations
async function getUpcomingNights(limit: number = 5) {
  const nights = await prisma.bouleNight.findMany({
    where: {
      date: { gte: new Date() },
    },
    orderBy: { date: "asc" },
    take: Math.min(limit, 10),
    include: {
      attendance: {
        where: { present: true },
        include: { player: true },
      },
    },
  });

  return nights.map((night) => ({
    name: night.name,
    date: night.date.toLocaleString("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    type: night.type === "DAY" ? "Dag" : "Kväll",
    location: night.location,
    attendees: night.attendance.length,
    maxPlayers: night.maxPlayers,
    players: night.attendance.map((a) => a.player.name),
  }));
}

async function getPlayerStats(playerName: string) {
  // Find player by name (case insensitive)
  const player = await prisma.player.findFirst({
    where: {
      name: {
        contains: playerName,
        mode: "insensitive",
      },
    },
  });

  if (!player) {
    return { error: `Hittade ingen spelare som heter "${playerName}"` };
  }

  // Get match stats
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId: player.id },
    include: {
      matchTeam: {
        include: {
          match: true,
        },
      },
    },
  });

  let wins = 0;
  let losses = 0;
  let totalPoints = 0;
  let pointsAgainst = 0;

  for (const mp of matchPlayers) {
    const match = mp.matchTeam.match;
    if (match.status !== "COMPLETED") continue;

    const isHome = mp.matchTeam.side === "HOME";
    const myScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;

    if (myScore !== null && theirScore !== null) {
      totalPoints += myScore;
      pointsAgainst += theirScore;

      if (myScore > theirScore) {
        wins++;
      } else {
        losses++;
      }
    }
  }

  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return {
    name: player.name,
    totalMatches,
    wins,
    losses,
    winRate: `${winRate}%`,
    totalPoints,
    pointsAgainst,
    avgPointsPerMatch: totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : 0,
  };
}

async function getPlayerChemistry(playerName: string) {
  const player = await prisma.player.findFirst({
    where: {
      name: {
        contains: playerName,
        mode: "insensitive",
      },
    },
  });

  if (!player) {
    return { error: `Hittade ingen spelare som heter "${playerName}"` };
  }

  const myMatchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId: player.id },
    include: {
      matchTeam: {
        include: {
          match: true,
          players: {
            include: { player: true },
          },
        },
      },
    },
  });

  const partnerStats = new Map<
    string,
    {
      playerName: string;
      matchesTogether: number;
      winsTogether: number;
    }
  >();

  for (const mp of myMatchPlayers) {
    const match = mp.matchTeam.match;
    if (match.status !== "COMPLETED") continue;

    const teammates = mp.matchTeam.players.filter((p) => p.playerId !== player.id);

    const isHome = mp.matchTeam.side === "HOME";
    const myScore = isHome ? match.homeScore : match.awayScore;
    const theirScore = isHome ? match.awayScore : match.homeScore;
    const won = myScore !== null && theirScore !== null && myScore > theirScore;

    for (const teammate of teammates) {
      const existing = partnerStats.get(teammate.playerId) || {
        playerName: teammate.player.name,
        matchesTogether: 0,
        winsTogether: 0,
      };

      existing.matchesTogether++;
      if (won) existing.winsTogether++;

      partnerStats.set(teammate.playerId, existing);
    }
  }

  const partners = Array.from(partnerStats.values())
    .filter((p) => p.matchesTogether >= 2)
    .map((p) => ({
      ...p,
      winRate: Math.round((p.winsTogether / p.matchesTogether) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  return {
    player: player.name,
    bestPartners: partners,
  };
}

async function getAllPlayers() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
  });

  return players.map((p) => p.name);
}

async function getLeaderboard(limit: number = 10) {
  const players = await prisma.player.findMany({
    include: {
      matchPlayers: {
        include: {
          matchTeam: {
            include: {
              match: true,
            },
          },
        },
      },
    },
  });

  const stats = players.map((player) => {
    let wins = 0;
    let losses = 0;

    for (const mp of player.matchPlayers) {
      const match = mp.matchTeam.match;
      if (match.status !== "COMPLETED") continue;

      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;

      if (myScore !== null && theirScore !== null) {
        if (myScore > theirScore) {
          wins++;
        } else {
          losses++;
        }
      }
    }

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      name: player.name,
      wins,
      losses,
      totalMatches,
      winRate: Math.round(winRate),
    };
  });

  return stats
    .filter((s) => s.totalMatches >= 3)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
    .slice(0, Math.min(limit, 20));
}

// Execute function based on name
async function executeFunction(name: string, args: any) {
  switch (name) {
    case "get_upcoming_nights":
      return await getUpcomingNights(args.limit);
    case "get_player_stats":
      return await getPlayerStats(args.playerName);
    case "get_player_chemistry":
      return await getPlayerChemistry(args.playerName);
    case "get_all_players":
      return await getAllPlayers();
    case "get_leaderboard":
      return await getLeaderboard(args.limit);
    default:
      return { error: "Unknown function" };
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    // System message to set context
    const systemMessage = {
      role: "system",
      content: `Du är en hjälpsam AI-assistent för Pétanque Crash. Du hjälper medlemmar med:
- Information om kommande Pétanque Crash-event
- Statistik och resultat för spelare
- Spelkemi och rekommendationer för lagsammansättning
- Svar på frågor om matcher och turneringar

Var vänlig, hjälpsam och entusiastisk om boule. Svara alltid på svenska.
`,
    };

    const allMessages = [systemMessage, ...messages];

    // Call OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: allMessages,
        functions,
        function_call: "auto",
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error("OpenAI API error");
    }

    const data = await openaiResponse.json();
    const responseMessage = data.choices[0].message;

    // Check if function call is needed
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      // Execute the function
      const functionResult = await executeFunction(functionName, functionArgs);

      // Call OpenAI again with function result
      const secondResponse = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [
            ...allMessages,
            responseMessage,
            {
              role: "function",
              name: functionName,
              content: JSON.stringify(functionResult),
            },
          ],
          temperature: 0.7,
        }),
      });

      const secondData = await secondResponse.json();
      return NextResponse.json({
        message: secondData.choices[0].message.content,
      });
    }

    return NextResponse.json({
      message: responseMessage.content,
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
