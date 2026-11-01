
export type WearableReading = {
  heartRate: number | null;
  spo2: number | null;
  steps: number | null;
  movementDetected: boolean | null;
  activity: "walking" | "active" | "resting" | "unknown";
  timestamp: string;
};

export type WearableStatus = {
  connected: boolean;
  lastUpdated: string | null;
  reading: WearableReading | null;
};

export type WearableWellness = {
  activity: WearableReading["activity"];
  possibleElevatedHeartRate: boolean;
  possibleStressIndicator: boolean;
  message: string;
};

export function createEmptyWearableStatus(): WearableStatus {
  return {
    connected: false,
    lastUpdated: null,
    reading: null,
  };
}

export function validateReading(
  reading: WearableReading
): boolean {
  if (
    reading.heartRate !== null &&
    (!Number.isFinite(reading.heartRate) ||
      reading.heartRate < 25 ||
      reading.heartRate > 240)
  ) {
    return false;
  }

  if (
    reading.spo2 !== null &&
    (!Number.isFinite(reading.spo2) ||
      reading.spo2 < 50 ||
      reading.spo2 > 100)
  ) {
    return false;
  }

  if (
    reading.steps !== null &&
    (!Number.isFinite(reading.steps) ||
      reading.steps < 0)
  ) {
    return false;
  }

  return (
    Number.isFinite(Date.parse(reading.timestamp)) &&
    ["walking", "active", "resting", "unknown"].includes(
      reading.activity
    ) &&
    (reading.movementDetected === null ||
      typeof reading.movementDetected === "boolean")
  );
}

export function interpretWearable(
  reading: WearableReading,
  connected: boolean
): WearableWellness {
  if (!connected) {
    return {
      activity: "unknown",
      possibleElevatedHeartRate: false,
      possibleStressIndicator: false,
      message: "Connect your wearable to receive live readings.",
    };
  }

  const ageMs = Date.now() - Date.parse(reading.timestamp);

  if (
    !validateReading(reading) ||
    ageMs < 0 ||
    ageMs > 30_000
  ) {
    return {
      activity: "unknown",
      possibleElevatedHeartRate: false,
      possibleStressIndicator: false,
      message: "Waiting for a recent, valid sensor reading.",
    };
  }

  const elevatedAtRest =
    reading.heartRate !== null &&
    reading.heartRate > 100 &&
    reading.activity === "resting";

  return {
    activity: reading.activity,
    possibleElevatedHeartRate: elevatedAtRest,
    // Heart rate alone cannot determine stress.
    possibleStressIndicator: false,
    message: elevatedAtRest
      ? "Your heart rate is elevated for a resting reading. Rest comfortably and check again."
      : reading.activity === "walking"
        ? "You are moving. Heart rate can rise naturally during walking."
        : "Take a moment to check how you feel.",
  };
}
