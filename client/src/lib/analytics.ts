export type EventProperties = Record<string, string | number | boolean | undefined>;
export type HeadlineVariant = "control" | "momentum";

export interface ExperimentAssignment {
  experiment: "homepage_headline_v1";
  variant: HeadlineVariant;
  assignedAt: string;
}

type UmamiTracker = {
  track: (eventName: string, properties?: EventProperties) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

const HEADLINE_EXPERIMENT_KEY = "creatoros:experiment:homepage-headline:v1";
const ANALYTICS_CONFIGURED = Boolean(import.meta.env.VITE_ANALYTICS_ENDPOINT && import.meta.env.VITE_ANALYTICS_WEBSITE_ID);

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return Math.abs(result);
}

function anonymousSessionSeed(): string {
  const storage = getSessionStorage();
  const key = "creatoros:anonymous-session";
  const existing = storage?.getItem(key);
  if (existing) return existing;

  const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage?.setItem(key, generated);
  return generated;
}

export function getHeadlineExperiment(): ExperimentAssignment {
  const storage = getSessionStorage();
  const persisted = storage?.getItem(HEADLINE_EXPERIMENT_KEY);
  if (persisted) {
    try {
      return JSON.parse(persisted) as ExperimentAssignment;
    } catch {
      storage?.removeItem(HEADLINE_EXPERIMENT_KEY);
    }
  }

  const assignment: ExperimentAssignment = {
    experiment: "homepage_headline_v1",
    variant: hash(anonymousSessionSeed()) % 2 === 0 ? "control" : "momentum",
    assignedAt: new Date().toISOString(),
  };
  storage?.setItem(HEADLINE_EXPERIMENT_KEY, JSON.stringify(assignment));
  return assignment;
}

export function isAnalyticsConfigured(): boolean {
  return ANALYTICS_CONFIGURED;
}

export function trackEvent(event: string, properties: EventProperties = {}): void {
  if (typeof window === "undefined" || !window.umami) return;
  window.umami.track(event, {
    ...properties,
    page_path: window.location.pathname,
  });
}

export function trackPageView(experiment: ExperimentAssignment): void {
  trackEvent("landing_page_viewed", {
    experiment: experiment.experiment,
    variant: experiment.variant,
  });
}

export function trackExperimentExposure(experiment: ExperimentAssignment): void {
  trackEvent("experiment_exposure", {
    experiment: experiment.experiment,
    variant: experiment.variant,
  });
}
