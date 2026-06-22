import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/logs?date=2026-06-22 OR GET /api/logs (returns last 30 days)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  try {
    if (dateParam) {
      // Get single day
      const log = await prisma.dailyLog.findUnique({
        where: { date: new Date(dateParam) },
      });
      return NextResponse.json(log);
    }

    if (fromParam && toParam) {
      // Get range
      const logs = await prisma.dailyLog.findMany({
        where: {
          date: {
            gte: new Date(fromParam),
            lte: new Date(toParam),
          },
        },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(logs);
    }

    // Default: last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.dailyLog.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

// POST /api/logs — create or update a daily log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, ...data } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const logDate = new Date(date);

    const log = await prisma.dailyLog.upsert({
      where: { date: logDate },
      update: data,
      create: { date: logDate, ...data },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("POST /api/logs error:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
