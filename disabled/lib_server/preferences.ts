export type PreferenceProfile = {
  creatorId: string;
  preferredClipLengths: Record<string, number>;
  hookStyle: Record<string, number>;
  aggressiveness: Record<"low" | "med" | "high", number>;
  toleranceForPauses: number;
  energyThreshold: number;
  lastUpdated: number;
};

export type PreferenceEventType =
  | "kept_clip"
  | "discarded_clip"
  | "regenerate"
  | "hook_override"
  | "adjust_length"
  | "downloaded"
  | "set_aggressiveness"
  | "set_clip_length";

type PreferenceEvent = {
  creatorId: string;
  type: PreferenceEventType;
  payload?: Record<string, unknown>;
};

const store = new Map<string, PreferenceProfile>();

function getDefaultProfile(creatorId: string): PreferenceProfile {
  return {
    creatorId,
    preferredClipLengths: {},
    hookStyle: {},
    aggressiveness: { low: 0, med: 0, high: 0 },
    toleranceForPauses: 0.5,
    energyThreshold: 0.5,
    lastUpdated: Date.now(),
  };
}

export function getPreferenceProfile(creatorId: string) {
  return store.get(creatorId) ?? getDefaultProfile(creatorId);
}

export function updatePreferenceProfile(profile: PreferenceProfile) {
  store.set(profile.creatorId, profile);
  return profile;
}

export function applyPreferenceEvent(event: PreferenceEvent) {
  const profile = getPreferenceProfile(event.creatorId);
  const next = { ...profile, lastUpdated: Date.now() };

  switch (event.type) {
    case "kept_clip":
    case "downloaded": {
      const length = String(event.payload?.length ?? "");
      if (length) {
        next.preferredClipLengths[length] =
          (next.preferredClipLengths[length] ?? 0) + 1;
      }
      next.toleranceForPauses = Math.max(0.1, next.toleranceForPauses - 0.02);
      break;
    }
    case "discarded_clip": {
      const length = String(event.payload?.length ?? "");
      if (length) {
        next.preferredClipLengths[length] =
          (next.preferredClipLengths[length] ?? 0) - 1;
      }
      next.toleranceForPauses = Math.min(0.9, next.toleranceForPauses + 0.03);
      break;
    }
    case "regenerate": {
      next.energyThreshold = Math.min(0.9, next.energyThreshold + 0.05);
      break;
    }
    case "hook_override": {
      const style = String(event.payload?.style ?? "manual");
      next.hookStyle[style] = (next.hookStyle[style] ?? 0) + 1;
      break;
    }
    case "set_aggressiveness": {
      const level = event.payload?.level as "low" | "med" | "high" | undefined;
      if (level) {
        next.aggressiveness[level] = (next.aggressiveness[level] ?? 0) + 1;
      }
      break;
    }
    case "set_clip_length": {
      const length = String(event.payload?.length ?? "");
      if (length) {
        next.preferredClipLengths[length] =
          (next.preferredClipLengths[length] ?? 0) + 1;
      }
      break;
    }
    case "adjust_length": {
      const delta = Number(event.payload?.delta ?? 0);
      next.toleranceForPauses = Math.min(
        0.95,
        Math.max(0.05, next.toleranceForPauses + delta * 0.02)
      );
      break;
    }
    default:
      break;
  }

  updatePreferenceProfile(next);
  return next;
}
