import { describe, expect, it } from "vitest";
import { getHeadlineExperiment } from "./analytics";

describe("homepage headline experiment", () => {
  it("assigns and persists a valid variant in session storage", () => {
    const assignment = getHeadlineExperiment();

    expect(assignment.experiment).toBe("homepage_headline_v1");
    expect(["control", "momentum"]).toContain(assignment.variant);
    expect(assignment.assignedAt).toEqual(expect.any(String));
  });
});
