"use client";

import React from "react";
import  { ActivityCalendar,ThemeInput } from "react-activity-calendar";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";

import { getContributionStats } from "@/module/dashboard/actions";

const ContibutionGraph = () => {
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["contribution-graph"],
    queryFn: async () => await getContributionStats(),
    staleTime: 1000 * 60 * 5,
  });

  const colorScheme = theme === "dark" ? "dark" : "light";

  const calendarTheme: ThemeInput = {
    light: [
      "hsl(0, 0%, 92%)",
      "hsl(142, 76%, 85%)",
      "hsl(142, 76%, 70%)",
      "hsl(142, 71%, 55%)",
      "hsl(142, 71%, 45%)",
    ],
    dark: [
      "#1f1f1f",
      "hsl(142, 71%, 35%)",
      "hsl(142, 71%, 45%)",
      "hsl(142, 71%, 55%)",
      "hsl(142, 76%, 65%)",
    ],
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">
          Loading contribution data...
        </div>
      </div>
    );
  }

  if (!data || !data.contributions.length) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <div className="text-muted-foreground">
          No contribution data available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 p-4">
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {data.totalContributions}
        </span>{" "}
        contributions in the last year
      </div>

      <div className="w-full overflow-x-auto">
        <div className="flex justify-center min-w-max px-4">
          <ActivityCalendar
            data={data.contributions}
            colorScheme={colorScheme}
            blockSize={12}
            blockMargin={4}
            fontSize={14}
            showWeekdayLabels
            showMonthLabels
            theme={calendarTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default ContibutionGraph;
