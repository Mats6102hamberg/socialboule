import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Logga ett besök
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = body.path || "/";
    
    // Hämta user agent och IP (anonymiserad)
    const userAgent = req.headers.get("user-agent") || undefined;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : undefined;
    
    // Anonymisera IP (ta bort sista oktetten)
    const anonymizedIp = ip ? ip.replace(/\.\d+$/, ".xxx") : undefined;

    await prisma.pageView.create({
      data: {
        path,
        userAgent,
        ip: anonymizedIp,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error logging page view", error);
    return NextResponse.json({ error: "Failed to log view" }, { status: 500 });
  }
}

// GET - Hämta statistik (endast för admin)
export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Totalt antal besök
    const totalViews = await prisma.pageView.count();

    // Besök idag
    const todayViews = await prisma.pageView.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Besök senaste 7 dagarna
    const weekViews = await prisma.pageView.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    });

    // Besök senaste 30 dagarna
    const monthViews = await prisma.pageView.count({
      where: {
        createdAt: { gte: monthAgo },
      },
    });

    // Unika besökare (baserat på anonymiserad IP) senaste 7 dagarna
    const uniqueVisitors = await prisma.pageView.groupBy({
      by: ["ip"],
      where: {
        createdAt: { gte: weekAgo },
        ip: { not: null },
      },
    });

    // Populäraste sidorna
    const popularPages = await prisma.pageView.groupBy({
      by: ["path"],
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }) as { path: string; _count: { path: number } }[];

    // Besök per dag (senaste 7 dagarna)
    const dailyViews: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.pageView.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      dailyViews.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return NextResponse.json({
      totalViews,
      todayViews,
      weekViews,
      monthViews,
      uniqueVisitorsWeek: uniqueVisitors.length,
      popularPages: popularPages.map((p) => ({
        path: p.path,
        views: p._count.path,
      })),
      dailyViews,
    });
  } catch (error) {
    console.error("Error fetching analytics", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
