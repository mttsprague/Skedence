jest.mock("firebase-admin", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {firestoreFn} = require("../mocks/firebase-admin");
  return {
    firestore: firestoreFn,
  };
});

import {PLAN_QUOTAS, getOrgQuotas, checkQuota, checkRateLimit} from "../../src/quotas";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {mockFirestore} = require("../mocks/firebase-admin");

describe("quotas", () => {
  beforeEach(() => {
    mockFirestore._store().clear();
  });

  test("getOrgQuotas returns plan quotas when subscriptionPlan is set", async () => {
    const orgId = "org_test";
    await mockFirestore.collection("organizations").doc(orgId).set({
      subscriptionPlan: "starter",
    });

    const quotas = await getOrgQuotas(orgId);
    expect(quotas).toEqual(PLAN_QUOTAS.starter);
  });

  test("getOrgQuotas falls back to free when plan missing", async () => {
    const orgId = "org_free";
    await mockFirestore.collection("organizations").doc(orgId).set({});

    const quotas = await getOrgQuotas(orgId);
    expect(quotas).toEqual(PLAN_QUOTAS.free);
  });

  test("checkQuota allows when usage below limit", async () => {
    const orgId = "org_quota";
    const todayStr = new Date().toISOString().split("T")[0];

    await mockFirestore.collection("organizations").doc(orgId).set({
      subscriptionPlan: "free",
    });

    await mockFirestore
      .collection("organizations")
      .doc(orgId)
      .collection("usage")
      .doc(todayStr)
      .set({bookings: 3});

    const result = await checkQuota(orgId, "bookings");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(PLAN_QUOTAS.free.maxBookingsPerDay);
  });

  test("checkQuota blocks when usage exceeds limit", async () => {
    const orgId = "org_over";
    const todayStr = new Date().toISOString().split("T")[0];

    await mockFirestore.collection("organizations").doc(orgId).set({
      subscriptionPlan: "free",
    });

    await mockFirestore
      .collection("organizations")
      .doc(orgId)
      .collection("usage")
      .doc(todayStr)
      .set({bookings: PLAN_QUOTAS.free.maxBookingsPerDay});

    const result = await checkQuota(orgId, "bookings");
    expect(result.allowed).toBe(false);
  });

  test("checkRateLimit allows within window", async () => {
    const result = await checkRateLimit("key_1", 3, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(2);
  });
});
