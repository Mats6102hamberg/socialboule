import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePlayerBadges, getPlayerBadges } from "@/services/badges";
import { getPlayerRivals, getToughestRival } from "@/services/rivals";

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface Message {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  name?: string;
}

// Tool definitions for OpenAI tool calling
const tools = [
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "get_all_players",
      description: "Hämtar alla spelare i klubben",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "get_player_form",
      description: "Analyserar en spelares nuvarande form och trend baserat på senaste matcherna",
      parameters: {
        type: "object",
        properties: {
          playerName: {
            type: "string",
            description: "Spelarens namn",
          },
          matchLimit: {
            type: "number",
            description: "Antal senaste matcher att analysera (standard 10)",
          },
        },
        required: ["playerName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_player_badges",
      description: "Hämtar en spelares badges och achievements (t.ex. Comeback King, Sniper, Järngansen)",
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
  },
  {
    type: "function",
    function: {
      name: "get_player_rivals",
      description: "Visar en spelares största rivaler - de motståndare spelaren mött mest",
      parameters: {
        type: "object",
        properties: {
          playerName: {
            type: "string",
            description: "Spelarens namn",
          },
          limit: {
            type: "number",
            description: "Antal rivaler att visa (standard 5)",
          },
        },
        required: ["playerName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_toughest_rival",
      description: "Hittar en spelares tuffaste rival - motståndaren med lägst vinstprocent mot",
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

async function getPlayerForm(playerName: string, matchLimit: number = 10) {
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

  // Get recent matches
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { playerId: player.id },
    include: {
      matchTeam: {
        include: {
          match: {
            include: {
              night: true,
            },
          },
        },
      },
    },
    take: matchLimit * 2, // Get more to ensure we have enough completed matches
  });

  const recentMatches = matchPlayers
    .filter((mp) => mp.matchTeam.match.status === "COMPLETED")
    .map((mp) => {
      const match = mp.matchTeam.match;
      const isHome = mp.matchTeam.side === "HOME";
      const myScore = isHome ? match.homeScore : match.awayScore;
      const theirScore = isHome ? match.awayScore : match.homeScore;
      const won = myScore !== null && theirScore !== null && myScore > theirScore;

      return {
        date: match.night.date.toLocaleDateString("sv-SE"),
        nightDate: match.night.date,
        won,
        myScore,
        theirScore,
        pointDiff: myScore !== null && theirScore !== null ? myScore - theirScore : 0,
      };
    })
    .sort((a, b) => b.nightDate.getTime() - a.nightDate.getTime())
    .slice(0, matchLimit);

  if (recentMatches.length === 0) {
    return {
      player: player.name,
      message: "Spelaren har inga slutförda matcher ännu.",
    };
  }

  const recentWins = recentMatches.filter((m) => m.won).length;
  const recentWinRate = Math.round((recentWins / recentMatches.length) * 100);
  const avgPointDiff =
    recentMatches.reduce((sum, m) => sum + m.pointDiff, 0) / recentMatches.length;

  // Calculate form trend (last 5 vs previous 5)
  const last5 = recentMatches.slice(0, 5);
  const prev5 = recentMatches.slice(5, 10);

  let formTrend = "stabil";
  if (last5.length >= 3 && prev5.length >= 3) {
    const last5WinRate = last5.filter((m) => m.won).length / last5.length;
    const prev5WinRate = prev5.filter((m) => m.won).length / prev5.length;

    if (last5WinRate - prev5WinRate > 0.2) {
      formTrend = "på uppgång 📈";
    } else if (prev5WinRate - last5WinRate > 0.2) {
      formTrend = "på nedgång 📉";
    }
  }

  return {
    player: player.name,
    recentMatches: recentMatches.length,
    winRate: `${recentWinRate}%`,
    wins: recentWins,
    losses: recentMatches.length - recentWins,
    avgPointDiff: avgPointDiff.toFixed(1),
    formTrend,
    lastFiveResults: last5.map((m) => (m.won ? "V" : "F")).join("-"),
    matches: recentMatches,
  };
}

async function getPlayerBadgesWrapper(playerName: string) {
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

  // Uppdatera badges först
  await updatePlayerBadges(player.id);

  // Hämta badges
  const badges = await getPlayerBadges(player.id);

  if (badges.length === 0) {
    return {
      player: player.name,
      message: "Spelaren har inga badges ännu. Spela fler matcher för att låsa upp achievements!",
    };
  }

  return {
    player: player.name,
    badges: badges.map((b) => ({
      name: b.name,
      description: b.description,
      icon: b.icon,
      earnedAt: b.earnedAt.toLocaleDateString("sv-SE"),
    })),
  };
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
    case "get_player_form":
      return await getPlayerForm(args.playerName, args.matchLimit);
    case "get_player_badges":
      return await getPlayerBadgesWrapper(args.playerName);
    case "get_player_rivals":
      return await getPlayerRivals(args.playerName, args.limit);
    case "get_toughest_rival":
      return await getToughestRival(args.playerName);
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
- Form-analys och trender för spelare
- Badges och achievements (som "Comeback King", "Sniper", "Järngansen")
- Rival-tracking - visa vem en spelare mött mest och statistik mot dem
- Spelkemi och rekommendationer för lagsammansättning
- Topplistan och rankningar
- Svar på frågor om matcher och turneringar

Var vänlig, hjälpsam och entusiastisk om boule. Svara alltid på svenska.
När du visar badges, inkludera alltid emojin och förklara vad badgen betyder.
När du visar rivaler, presentera statistiken på ett engagerande sätt och kommentera om spelaren har en tuff rival eller dominerar mot vissa motståndare.
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
        model: "gpt-4o-mini",
        messages: allMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error("OpenAI API error");
    }

    const data = await openaiResponse.json();
    const responseMessage = data.choices[0].message;

    // Check if tool call is needed
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

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
          model: "gpt-4o-mini",
          messages: [
            ...allMessages,
            responseMessage,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult),
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!secondResponse.ok) {
        const errorText = await secondResponse.text();
        console.error("OpenAI API error (second call):", errorText);
        throw new Error("OpenAI API error");
      }

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
