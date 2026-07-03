"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded-2xl border bg-muted/20" />;
}

export const ExpenseActivityChart = dynamic(
  () => import("./activity-dashboard").then((mod) => mod.ExpenseActivityChart),
  { ssr: false, loading: ChartSkeleton }
);

export const ActivityDashboard = dynamic(
  () => import("./activity-dashboard").then((mod) => mod.ActivityDashboard),
  { ssr: false, loading: ChartSkeleton }
);
