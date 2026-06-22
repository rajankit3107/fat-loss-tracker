"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, subDays, addDays, differenceInCalendarDays, startOfWeek } from "date-fns";

interface DailyLog {
  id?: string;
  date: string;
  hitCalorieTarget: boolean;
  hitProteinGoal: boolean;
  trainedToday: boolean;
  hitStepGoal: boolean;
  drankEnoughWater: boolean;
  loggedFood: boolean;
  sleptEnough: boolean;
  tookWeightAverage: boolean;
  caloriesConsumed: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatsGrams: number | null;
  steps: number | null;
  waterLitres: number | null;
  sleepHours: number | null;
  weightKg: number | null;
  trainingType: string | null;
  trainingDuration: number | null;
  cardioType: string | null;
  cardioDuration: number | null;
  energyLevel: number | null;
  hungerLevel: number | null;
  moodRating: number | null;
  notes: string | null;
  currentMonth: number | null;
  targetCalories: number | null;
}

interface Stats {
  totalDaysLogged: number;
  currentStreak: number;
  averageCalories: number;
  averageProtein: number;
  averageSteps: number;
  averageSleep: number;
  startWeight: number;
  currentWeight: number;
  totalWeightLost: number;
  checklistCompletion: number;
}

const MONTH_TARGETS = [
  { month: 1, calories: 2100, protein: 140, carbs: 200, fats: 60 },
  { month: 2, calories: 2000, protein: 140, carbs: 185, fats: 58 },
  { month: 3, calories: 1900, protein: 135, carbs: 175, fats: 55 },
  { month: 4, calories: 1850, protein: 135, carbs: 165, fats: 55 },
  { month: 5, calories: 1800, protein: 130, carbs: 160, fats: 53 },
  { month: 6, calories: 1750, protein: 130, carbs: 150, fats: 52 },
];

const emptyLog: DailyLog = {
  date: format(new Date(), "yyyy-MM-dd"),
  hitCalorieTarget: false,
  hitProteinGoal: false,
  trainedToday: false,
  hitStepGoal: false,
  drankEnoughWater: false,
  loggedFood: false,
  sleptEnough: false,
  tookWeightAverage: false,
  caloriesConsumed: null,
  proteinGrams: null,
  carbsGrams: null,
  fatsGrams: null,
  steps: null,
  waterLitres: null,
  sleepHours: null,
  weightKg: null,
  trainingType: null,
  trainingDuration: null,
  cardioType: null,
  cardioDuration: null,
  energyLevel: null,
  hungerLevel: null,
  moodRating: null,
  notes: null,
  currentMonth: 1,
  targetCalories: 2100,
};

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [log, setLog] = useState<DailyLog>(emptyLog);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [trackerLogs, setTrackerLogs] = useState<Record<string, DailyLog>>({});
  const [journeyStartDate, setJourneyStartDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"log" | "history" | "stats">("log");

  const fetchLog = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      const data = await res.json();
      if (data && data.id) {
        setLog({ ...data, date });
      } else {
        setLog({ ...emptyLog, date });
      }
    } catch {
      setLog({ ...emptyLog, date });
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/logs/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail
    }
  }, []);

  const fetchRecentLogs = useCallback(async () => {
    try {
      const from = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const to = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/logs?from=${from}&to=${to}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecentLogs(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchJourneyLogs = useCallback(async (from: string, to: string) => {
    try {
      const res = await fetch(`/api/logs?from=${from}&to=${to}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, DailyLog> = {};
        data.forEach((entry) => {
          const entryDate = typeof entry.date === "string" ? entry.date.split("T")[0] : format(new Date(entry.date), "yyyy-MM-dd");
          map[entryDate] = entry;
        });
        setTrackerLogs(map);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("journeyStartDate");
    if (stored) {
      setJourneyStartDate(stored);
    }
  }, []);

  useEffect(() => {
    if (!journeyStartDate) return;
    window.localStorage.setItem("journeyStartDate", journeyStartDate);
    const endDate = format(addDays(new Date(journeyStartDate), 182 - 1), "yyyy-MM-dd");
    fetchJourneyLogs(journeyStartDate, endDate);
  }, [journeyStartDate, fetchJourneyLogs]);

  useEffect(() => {
    fetchLog(selectedDate);
    fetchStats();
    fetchRecentLogs();
  }, [selectedDate, fetchLog, fetchStats, fetchRecentLogs]);

  const saveLog = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (res.ok) {
        setSaveMessage("Saved successfully");
        fetchStats();
        fetchRecentLogs();
        if (journeyStartDate) {
          const day = log.date;
          const journeyStart = new Date(journeyStartDate);
          const journeyEnd = addDays(journeyStart, 182 - 1);
          const current = new Date(day);
          if (current >= journeyStart && current <= journeyEnd) {
            const updatedLog = await res.json();
            const entryDate = updatedLog.date.split("T")[0];
            setTrackerLogs((prev) => ({ ...prev, [entryDate]: updatedLog }));
          }
        }
      } else {
        setSaveMessage("Failed to save");
      }
    } catch {
      setSaveMessage("Error saving");
    }
    setSaving(false);
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const updateLog = (field: keyof DailyLog, value: unknown) => {
    setLog((prev) => ({ ...prev, [field]: value }));
  };

  const handleMonthChange = (month: number) => {
    const target = MONTH_TARGETS[month - 1];
    setLog((prev) => ({
      ...prev,
      currentMonth: month,
      targetCalories: target.calories,
    }));
  };

  const getChecklistScore = () => {
    const fields: (keyof DailyLog)[] = [
      "hitCalorieTarget",
      "hitProteinGoal",
      "trainedToday",
      "hitStepGoal",
      "drankEnoughWater",
      "loggedFood",
      "sleptEnough",
    ];
    const completed = fields.filter((f) => log[f] === true).length;
    return { completed, total: fields.length };
  };

  const JOURNEY_LENGTH = 182;

  const getJourneyEndDate = (startDate: string) =>
    format(addDays(new Date(startDate), JOURNEY_LENGTH - 1), "yyyy-MM-dd");

  const getDayStatus = (entry: DailyLog | undefined) => {
    if (!entry) return 0;
    return [
      entry.hitCalorieTarget,
      entry.hitProteinGoal,
      entry.trainedToday,
      entry.hitStepGoal,
      entry.drankEnoughWater,
      entry.loggedFood,
      entry.sleptEnough,
    ].filter(Boolean).length;
  };

  const getStatusColor = (count: number) => {
    if (count >= 6) return "bg-emerald-500";
    if (count >= 4) return "bg-amber-400";
    if (count >= 1) return "bg-blue-400";
    return "bg-gray-200";
  };

  const getTrackerWeeks = () => {
    if (!journeyStartDate) return [];
    const start = new Date(journeyStartDate);
    const gridStart = startOfWeek(start, { weekStartsOn: 1 });
    const totalDays = differenceInCalendarDays(addDays(start, JOURNEY_LENGTH - 1), gridStart) + 1;
    const weeks = Math.ceil(totalDays / 7);
    return Array.from({ length: weeks }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(gridStart, weekIndex * 7 + dayIndex);
        const dateKey = format(date, "yyyy-MM-dd");
        return {
          date,
          dateKey,
          entry: trackerLogs[dateKey],
          inJourney: date >= start && date <= addDays(start, JOURNEY_LENGTH - 1),
        };
      })
    );
  };

  const getTrackerMonthLabels = () => {
    const weeks = getTrackerWeeks();
    let currentMonth = "";
    return weeks.map((week) => {
      const firstDate = week[0].date;
      const monthLabel = format(firstDate, "MMM");
      if (monthLabel === currentMonth) return "";
      currentMonth = monthLabel;
      return monthLabel;
    });
  };

  const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", ""]; 

  const handleStartJourney = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setJourneyStartDate(today);
    setSelectedDate(today);
  };

  const journeyEndDate = journeyStartDate ? getJourneyEndDate(journeyStartDate) : null;
  const journeyStartLabel = journeyStartDate ? format(new Date(journeyStartDate), "MMM d, yyyy") : null;
  const journeyEndLabel = journeyEndDate ? format(new Date(journeyEndDate), "MMM d, yyyy") : null;
  const journeyDaysLogged = journeyStartDate
    ? Object.keys(trackerLogs).filter(
        (dateKey) => dateKey >= journeyStartDate && journeyEndDate && dateKey <= journeyEndDate
      ).length
    : 0;
  const journeyProgress = journeyStartDate
    ? Math.round((journeyDaysLogged / JOURNEY_LENGTH) * 100)
    : 0;
  const score = getChecklistScore();
  const scorePercent = Math.round((score.completed / score.total) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fat Loss Tracker</h1>
            <p className="text-sm text-gray-500 mt-0.5">100 → 85 kg · 6-month plan</p>
          </div>
          {stats && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{stats.currentWeight} kg</div>
              <div className="text-xs text-emerald-600 font-medium">
                {stats.totalWeightLost > 0 ? `↓ ${stats.totalWeightLost} kg` : "Start logging →"}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {stats && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>100 kg</span>
              <span>{Math.round((stats.totalWeightLost / 15) * 100)}%</span>
              <span>85 kg</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.totalWeightLost / 15) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-xl">
        {(["log", "history", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "log" ? "Log" : tab === "history" ? "History" : "Stats"}
          </button>
        ))}
      </nav>

      {/* LOG TAB */}
      {activeTab === "log" && (
        <div className="space-y-6">
          {/* Journey button */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Your 6-Month Journey</p>
                <p className="text-xs text-gray-500 mt-1">
                  {journeyStartDate
                    ? `From ${journeyStartLabel} to ${journeyEndLabel}`
                    : "Start your fat loss journey and track it every day."
                  }
                </p>
              </div>
              <button
                onClick={handleStartJourney}
                className="bg-blue-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-sm"
              >
                {journeyStartDate ? "Restart journey from today" : "Start my fat loss journey"}
              </button>
            </div>

            {journeyStartDate && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Total days</div>
                  <div className="text-2xl font-semibold text-gray-900">{JOURNEY_LENGTH}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Days logged</div>
                  <div className="text-2xl font-semibold text-gray-900">{journeyDaysLogged}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Journey progress</div>
                  <div className="text-2xl font-semibold text-gray-900">{journeyProgress}%</div>
                </div>
              </div>
            )}
          </section>

          {journeyStartDate && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Journey Tracker</h2>
                  <p className="text-xs text-gray-500 mt-1">A GitHub-style view of your 6-month progress window.</p>
                </div>
                <div className="text-xs text-gray-500">{journeyStartLabel} → {journeyEndLabel}</div>
              </div>

              <div className="overflow-x-auto">
                <div className="flex items-center gap-0.5 ml-14 pb-2">
                  {getTrackerMonthLabels().map((label, index) => (
                    <div key={index} className="h-4 w-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 text-center">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5">
                  {weekdayLabels.map((label, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-0.5">
                      <div className="w-14 text-[10px] text-right text-gray-500 pr-2">
                        {label}
                      </div>
                      {getTrackerWeeks().map((week, weekIndex) => {
                        const day = week[rowIndex];
                        const dayStatus = getDayStatus(day.entry);
                        return (
                          <button
                            key={`${weekIndex}-${rowIndex}`}
                            onClick={() => setSelectedDate(day.dateKey)}
                            className={`h-4 w-4 rounded-sm transition-all ${day.inJourney ? getStatusColor(dayStatus) : "bg-gray-100"}`}
                            title={`${format(day.date, "EEE, MMM d")}${day.inJourney ? ` · ${dayStatus}/7` : "`"}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-gray-200 border border-gray-200" /> No activity
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-blue-400 border border-blue-400" /> Some progress
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-amber-400 border border-amber-400" /> Good progress
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500 border border-emerald-500" /> Excellent progress
                </span>
              </div>
            </section>
          )}

          {/* Date & Month Selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Phase</label>
              <select
                value={log.currentMonth || 1}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
              >
                {MONTH_TARGETS.map((t) => (
                  <option key={t.month} value={t.month}>
                    Month {t.month} · {t.calories} kcal
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-28 flex flex-col items-center justify-end">
              <div className="text-3xl font-bold text-gray-900">{scorePercent}%</div>
              <div className="text-xs text-gray-400">{score.completed}/{score.total} done</div>
            </div>
          </div>

          {/* Checklist */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Daily Checklist</h2>
            <div className="space-y-2">
              {[
                { field: "hitCalorieTarget" as const, label: "Hit calorie target", sub: `${log.targetCalories || "—"} kcal` },
                { field: "hitProteinGoal" as const, label: "Hit protein goal", sub: "130–140g" },
                { field: "trainedToday" as const, label: "Trained today", sub: "Or scheduled rest" },
                { field: "hitStepGoal" as const, label: "Hit step goal", sub: "8,000–10,000" },
                { field: "drankEnoughWater" as const, label: "Drank enough water", sub: "3–4 litres" },
                { field: "loggedFood" as const, label: "Logged all food", sub: "HealthifyMe / MFP" },
                { field: "sleptEnough" as const, label: "Slept 7+ hours", sub: "Quality sleep" },
                { field: "tookWeightAverage" as const, label: "Weighed in", sub: "Sunday morning" },
              ].map(({ field, label, sub }) => (
                <label
                  key={field}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                    log[field]
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-transparent hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!log[field]}
                    onChange={(e) => updateLog(field, e.target.checked)}
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${log[field] ? "text-emerald-800" : "text-gray-700"}`}>
                      {label}
                    </div>
                    <div className="text-xs text-gray-400">{sub}</div>
                  </div>
                  {log[field] && (
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
              ))}
            </div>
          </section>

          {/* Nutrition */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Nutrition</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumberInput label="Calories" value={log.caloriesConsumed} onChange={(v) => updateLog("caloriesConsumed", v)} placeholder="1900" unit="kcal" />
              <NumberInput label="Protein" value={log.proteinGrams} onChange={(v) => updateLog("proteinGrams", v)} placeholder="135" unit="g" />
              <NumberInput label="Carbs" value={log.carbsGrams} onChange={(v) => updateLog("carbsGrams", v)} placeholder="180" unit="g" />
              <NumberInput label="Fats" value={log.fatsGrams} onChange={(v) => updateLog("fatsGrams", v)} placeholder="55" unit="g" />
            </div>

            {/* Macro progress indicators */}
            {log.currentMonth && log.caloriesConsumed && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex gap-4 text-xs">
                  <MacroIndicator
                    label="Calories"
                    current={log.caloriesConsumed}
                    target={MONTH_TARGETS[(log.currentMonth || 1) - 1].calories}
                  />
                  <MacroIndicator
                    label="Protein"
                    current={log.proteinGrams || 0}
                    target={MONTH_TARGETS[(log.currentMonth || 1) - 1].protein}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Body & Activity */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Body & Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumberInput label="Steps" value={log.steps} onChange={(v) => updateLog("steps", v)} placeholder="9500" />
              <NumberInput label="Water" value={log.waterLitres} onChange={(v) => updateLog("waterLitres", v)} placeholder="3.5" unit="L" step="0.1" />
              <NumberInput label="Sleep" value={log.sleepHours} onChange={(v) => updateLog("sleepHours", v)} placeholder="7.5" unit="hrs" step="0.5" />
              <NumberInput label="Weight" value={log.weightKg} onChange={(v) => updateLog("weightKg", v)} placeholder="97.5" unit="kg" step="0.1" />
            </div>
          </section>

          {/* Training */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Training</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Workout Type</label>
                <select
                  value={log.trainingType || ""}
                  onChange={(e) => updateLog("trainingType", e.target.value || null)}
                >
                  <option value="">Rest Day</option>
                  <option value="upper">Upper Body</option>
                  <option value="lower">Lower Body</option>
                  <option value="push">Push</option>
                  <option value="pull">Pull</option>
                  <option value="legs">Legs</option>
                  <option value="full-body">Full Body</option>
                  <option value="cardio-only">Cardio Only</option>
                </select>
              </div>
              <NumberInput label="Duration" value={log.trainingDuration} onChange={(v) => updateLog("trainingDuration", v)} placeholder="60" unit="min" />
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Cardio</label>
                <select
                  value={log.cardioType || ""}
                  onChange={(e) => updateLog("cardioType", e.target.value || null)}
                >
                  <option value="">None</option>
                  <option value="LISS">LISS</option>
                  <option value="HIIT">HIIT</option>
                  <option value="MISS">MISS</option>
                  <option value="SIT">Sprints</option>
                </select>
              </div>
              <NumberInput label="Cardio Time" value={log.cardioDuration} onChange={(v) => updateLog("cardioDuration", v)} placeholder="30" unit="min" />
            </div>
          </section>

          {/* Mood & Energy */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">How You Felt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <RatingSelector label="Energy" value={log.energyLevel} onChange={(v) => updateLog("energyLevel", v)} lowLabel="Low" highLabel="High" />
              <RatingSelector label="Hunger" value={log.hungerLevel} onChange={(v) => updateLog("hungerLevel", v)} lowLabel="None" highLabel="Starving" />
              <RatingSelector label="Mood" value={log.moodRating} onChange={(v) => updateLog("moodRating", v)} lowLabel="Bad" highLabel="Great" />
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Notes</h2>
            <textarea
              rows={3}
              placeholder="How was your day? Anything worth noting..."
              value={log.notes || ""}
              onChange={(e) => updateLog("notes", e.target.value || null)}
              className="w-full resize-none"
            />
          </section>

          {/* Save */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={saveLog}
              disabled={saving}
              className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-50 w-full sm:w-auto shadow-sm"
            >
              {saving ? "Saving..." : "Save Log"}
            </button>
            {saveMessage && (
              <span className={`text-sm font-medium ${saveMessage.includes("success") ? "text-emerald-600" : "text-red-500"}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Recent Logs</h2>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-gray-400">No logs yet. Start with today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((entry) => {
                const entryDate = typeof entry.date === "string" ? entry.date.split("T")[0] : format(new Date(entry.date), "yyyy-MM-dd");
                const checkCount = [
                  entry.hitCalorieTarget,
                  entry.hitProteinGoal,
                  entry.trainedToday,
                  entry.hitStepGoal,
                  entry.drankEnoughWater,
                  entry.loggedFood,
                  entry.sleptEnough,
                ].filter(Boolean).length;

                return (
                  <div
                    key={entry.id || entryDate}
                    className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                    onClick={() => {
                      setSelectedDate(entryDate);
                      setActiveTab("log");
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${checkCount >= 6 ? "bg-emerald-500" : checkCount >= 4 ? "bg-amber-400" : "bg-red-400"}`} />
                        <div>
                          <span className="font-medium text-gray-900 text-sm">
                            {format(parseISO(entryDate), "EEEE, MMM d")}
                          </span>
                          <span className="text-gray-400 ml-2 text-xs">M{entry.currentMonth || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 pl-5 sm:pl-0">
                        {entry.caloriesConsumed && <span>{entry.caloriesConsumed} kcal</span>}
                        {entry.proteinGrams && <span>{entry.proteinGrams}g protein</span>}
                        {entry.steps && <span>{entry.steps.toLocaleString()} steps</span>}
                        <span className="font-semibold text-gray-700">{checkCount}/7</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard value={stats.totalDaysLogged} label="Days Logged" />
            <MetricCard value={stats.currentStreak} label="Day Streak" suffix=" 🔥" />
            <MetricCard value={`${stats.checklistCompletion}%`} label="Completion" />
            <MetricCard value={`${stats.totalWeightLost} kg`} label="Lost" />
          </div>

          {/* Weight Progress */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Weight Journey</h3>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.currentWeight} kg</div>
                <div className="text-sm text-gray-400">Current</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-emerald-600">
                  {stats.totalWeightLost > 0 ? `-${stats.totalWeightLost} kg` : "—"}
                </div>
                <div className="text-sm text-gray-400">Progress</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-400">85 kg</div>
                <div className="text-sm text-gray-400">Goal</div>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (stats.totalWeightLost / 15) * 100)}%` }}
              />
            </div>
          </section>

          {/* Averages */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Averages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.averageCalories}</div>
                <div className="text-xs text-gray-400">Avg Calories</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.averageProtein}g</div>
                <div className="text-xs text-gray-400">Avg Protein</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.averageSteps.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Avg Steps</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{stats.averageSleep} hrs</div>
                <div className="text-xs text-gray-400">Avg Sleep</div>
              </div>
            </div>
          </section>

          {/* Monthly Targets */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Monthly Calorie Targets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MONTH_TARGETS.map((t) => (
                <div
                  key={t.month}
                  className={`rounded-xl p-3 text-center border ${
                    log.currentMonth === t.month
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">Month {t.month}</div>
                  <div className="text-lg font-bold text-gray-900">{t.calories}</div>
                  <div className="text-xs text-gray-400">
                    P{t.protein} · C{t.carbs} · F{t.fats}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ─── COMPONENTS ─── */

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  unit,
  step,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  unit?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1.5">
        {label} {unit && <span className="text-gray-300">({unit})</span>}
      </label>
      <input
        type="number"
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      />
    </div>
  );
}

function RatingSelector({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-2">{label}</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all ${
              value === n
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function MacroIndicator({ label, current, target }: { label: string; current: number; target: number }) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  const isOver = current > target;

  return (
    <div className="flex-1">
      <div className="flex justify-between mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={isOver ? "text-red-500 font-medium" : "text-gray-700 font-medium"}>
          {current}/{target}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : "bg-blue-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ value, label, suffix }: { value: string | number; label: string; suffix?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
      <div className="text-xl font-bold text-gray-900">
        {value}{suffix || ""}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
