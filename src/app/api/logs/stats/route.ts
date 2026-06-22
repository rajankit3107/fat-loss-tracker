import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/logs/stats — get summary statistics
export async function GET() {
  try {
    const allLogs = await prisma.dailyLog.findMany({
      orderBy: { date: "asc" },
    });

    if (allLogs.length === 0) {
      return NextResponse.json({
        totalDaysLogged: 0,
        currentStreak: 0,
        averageCalories: 0,
        averageProtein: 0,
        averageSteps: 0,
        averageSleep: 0,
        startWeight: 100,
        currentWeight: 100,
        totalWeightLost: 0,
        checklistCompletion: 0,
      });
    }

    // Calculate stats
    const totalDaysLogged = allLogs.length;

    // Current streak (consecutive days with at least one checkbox true)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = allLogs.length - 1; i >= 0; i--) {
      const logDate = new Date(allLogs[i].date);
      logDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor(
        (today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === allLogs.length - 1 - i) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Averages
    const logsWithCalories = allLogs.filter((l) => l.caloriesConsumed != null);
    const averageCalories = logsWithCalories.length
      ? Math.round(
          logsWithCalories.reduce((sum, l) => sum + (l.caloriesConsumed || 0), 0) /
            logsWithCalories.length
        )
      : 0;

    const logsWithProtein = allLogs.filter((l) => l.proteinGrams != null);
    const averageProtein = logsWithProtein.length
      ? Math.round(
          logsWithProtein.reduce((sum, l) => sum + (l.proteinGrams || 0), 0) /
            logsWithProtein.length
        )
      : 0;

    const logsWithSteps = allLogs.filter((l) => l.steps != null);
    const averageSteps = logsWithSteps.length
      ? Math.round(
          logsWithSteps.reduce((sum, l) => sum + (l.steps || 0), 0) /
            logsWithSteps.length
        )
      : 0;

    const logsWithSleep = allLogs.filter((l) => l.sleepHours != null);
    const averageSleep = logsWithSleep.length
      ? parseFloat(
          (
            logsWithSleep.reduce((sum, l) => sum + (l.sleepHours || 0), 0) /
            logsWithSleep.length
          ).toFixed(1)
        )
      : 0;

    // Weight tracking
    const logsWithWeight = allLogs.filter((l) => l.weightKg != null);
    const startWeight = logsWithWeight.length ? logsWithWeight[0].weightKg! : 100;
    const currentWeight = logsWithWeight.length
      ? logsWithWeight[logsWithWeight.length - 1].weightKg!
      : 100;
    const totalWeightLost = parseFloat((startWeight - currentWeight).toFixed(1));

    // Checklist completion rate
    const checklistFields = [
      "hitCalorieTarget",
      "hitProteinGoal",
      "trainedToday",
      "hitStepGoal",
      "drankEnoughWater",
      "loggedFood",
      "sleptEnough",
    ] as const;

    let totalChecks = 0;
    let completedChecks = 0;
    allLogs.forEach((log) => {
      checklistFields.forEach((field) => {
        totalChecks++;
        if (log[field]) completedChecks++;
      });
    });

    const checklistCompletion = totalChecks
      ? Math.round((completedChecks / totalChecks) * 100)
      : 0;

    return NextResponse.json({
      totalDaysLogged,
      currentStreak,
      averageCalories,
      averageProtein,
      averageSteps,
      averageSleep,
      startWeight,
      currentWeight,
      totalWeightLost,
      checklistCompletion,
    });
  } catch (error) {
    console.error("GET /api/logs/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
