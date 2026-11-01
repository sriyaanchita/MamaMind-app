import { WellnessResult } from "./wellnessEngine";

export type SelfCareRecommendation = {
  title: string;
  message: string;
  action: string;
  type:
    | "break"
    | "meditation"
    | "journal"
    | "hydration"
    | "support";
};

export function getSelfCareRecommendation(
  wellness: WellnessResult
): SelfCareRecommendation {
  switch (wellness.state) {
    case "high_caregiving_load":
      return {
        title: "You've been doing a lot today",
        message:
          "You've spent a lot of time caring for your little one. You deserve a small pause too.",
        action: "Take a 10-minute break",
        type: "break",
      };

    case "needs_self_care":
      return {
        title: "A little time for you",
        message:
          "You've been taking care of things around you. Let's make a little space for yourself.",
        action: "Start a 5-minute meditation",
        type: "meditation",
      };

    case "needs_rest":
      return {
        title: "You deserve a pause",
        message:
          "Your day looks busy. Even a short break can help you reset.",
        action: "Take a break",
        type: "break",
      };

    case "needs_support":
      return {
        title: "You don't have to handle everything alone",
        message:
          "It looks like today has been difficult. Would you like some support?",
        action: "Ask Dad for help",
        type: "support",
      };

    case "doing_well":
    default:
      return {
        title: "You're doing beautifully",
        message:
          "You've been balancing baby care and your own wellbeing today.",
        action: "Continue your routine",
        type: "journal",
      };
  }
}