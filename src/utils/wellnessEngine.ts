import {
  Activity,
  getTodayActivities,
} from "./activityLogger";

export type WellnessState =
  | "doing_well"
  | "needs_rest"
  | "high_caregiving_load"
  | "needs_self_care"
  | "needs_support";

export type WellnessResult = {
  state: WellnessState;
  score: number;
  caregivingLoad: number;
  selfCareScore: number;
  breakScore: number;
  reasons: string[];
};

/**
 * Get today's wellness result.
 */
export async function estimateWellness(): Promise<WellnessResult> {
  const activities = await getTodayActivities();

  return calculateWellness(activities);
}

/**
 * Calculate wellness from today's activities.
 */
export function calculateWellness(
  activities: Activity[]
): WellnessResult {
  // --------------------------------
  // 1. Count activities
  // --------------------------------

  const babyCare = activities.filter(
    (activity) => activity.type === "baby_care"
  ).length;

  const meditation = activities.filter(
    (activity) => activity.type === "meditation"
  ).length;

  const selfCare = activities.filter(
    (activity) => activity.type === "self_care"
  ).length;

  const breaks = activities.filter(
    (activity) => activity.type === "break"
  ).length;

  const moodActivities = activities.filter(
    (activity) => activity.type === "mood"
  );

  // --------------------------------
  // 2. Start with a neutral score
  // --------------------------------

  let score = 70;

  const reasons: string[] = [];

  // --------------------------------
  // 3. Caregiving load
  // --------------------------------

  const caregivingLoad = Math.min(
    100,
    babyCare * 10
  );

  if (babyCare >= 6) {
    score -= 15;

    reasons.push(
      "You have had a busy caregiving day."
    );
  }

  // --------------------------------
  // 4. Self-care
  // --------------------------------

  const selfCareScore = Math.min(
    100,
    selfCare * 25 + meditation * 25
  );

  if (selfCare === 0 && meditation === 0) {
    score -= 15;

    reasons.push(
      "You haven't logged much self-care today."
    );
  }

  // --------------------------------
  // 5. Breaks
  // --------------------------------

  const breakScore = Math.min(
    100,
    breaks * 50
  );

  if (breaks === 0 && babyCare >= 4) {
    score -= 10;

    reasons.push(
      "You haven't taken a recorded break despite a busy day."
    );
  }

  // --------------------------------
  // 6. Mood signals
  // --------------------------------

  for (const activity of moodActivities) {
    const mood = String(
      activity.metadata?.value || ""
    ).toLowerCase();

    if (
      mood === "tired" ||
      mood === "stressed" ||
      mood === "overwhelmed"
    ) {
      score -= 15;

      reasons.push(
        `Your recent mood was recorded as ${mood}.`
      );
    }

    if (mood === "sad") {
      score -= 20;

      reasons.push(
        "Your recent mood was recorded as sad."
      );
    }

    if (
      mood === "happy" ||
      mood === "calm"
    ) {
      score += 5;
    }
  }

  // --------------------------------
  // 7. Keep score between 0 and 100
  // --------------------------------

  score = Math.max(
    0,
    Math.min(100, score)
  );

  // --------------------------------
  // 8. Decide wellness state
  // --------------------------------

  let state: WellnessState;

  if (score < 40) {
    state = "needs_support";
  } else if (
    babyCare >= 6 &&
    breaks === 0
  ) {
    state = "high_caregiving_load";
  } else if (
    selfCare === 0 &&
    babyCare >= 3
  ) {
    state = "needs_self_care";
  } else if (
    breaks === 0 &&
    babyCare >= 4
  ) {
    state = "needs_rest";
  } else {
    state = "doing_well";
  }

  return {
    state,
    score,
    caregivingLoad,
    selfCareScore,
    breakScore,
    reasons,
  };
}