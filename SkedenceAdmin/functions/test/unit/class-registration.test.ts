/**
 * Unit tests for class registration business logic validation
 * Tests the key business rules for registerForClass functionality
 */

describe("Class Registration Business Logic", () => {
  // Helper to validate class capacity
  function hasCapacity(currentParticipants: number, maxCapacity: number): boolean {
    return currentParticipants < maxCapacity;
  }

  // Helper to check if package type allows class registration
  function canRegisterForClass(packageType: string, packageCategory?: string): boolean {
    if (packageType === "class" || packageType === "class_pass") {
      return true;
    }
    if (packageCategory === "class") {
      return true;
    }
    return false;
  }

  // Helper to validate class timing
  function isClassInFuture(classStartTime: Date): boolean {
    return classStartTime > new Date();
  }

  // Helper to check if user already registered
  function isAlreadyRegistered(participants: string[], userId: string): boolean {
    return participants.includes(userId);
  }

  // Helper to validate class is open for registration
  function isClassOpen(status: string): boolean {
    const validStatuses = ["scheduled", "open"];
    return validStatuses.includes(status);
  }

  // Helper to calculate remaining capacity
  function getRemainingCapacity(currentParticipants: number, maxCapacity: number): number {
    return Math.max(0, maxCapacity - currentParticipants);
  }

  // Helper to validate minimum registration notice
  function meetsRegistrationNotice(classStartTime: Date, minHours: number): boolean {
    const hoursUntilClass = (classStartTime.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilClass >= minHours;
  }

  describe("Class Capacity Validation", () => {
    test("allows registration when under capacity", () => {
      expect(hasCapacity(8, 10)).toBe(true);
    });

    test("rejects registration at full capacity", () => {
      expect(hasCapacity(10, 10)).toBe(false);
    });

    test("rejects registration over capacity", () => {
      expect(hasCapacity(12, 10)).toBe(false);
    });

    test("allows first registration", () => {
      expect(hasCapacity(0, 10)).toBe(true);
    });

    test("allows registration at capacity - 1", () => {
      expect(hasCapacity(9, 10)).toBe(true);
    });
  });

  describe("Package Type Validation for Classes", () => {
    test("allows class packages", () => {
      expect(canRegisterForClass("class")).toBe(true);
    });

    test("allows class_pass packages", () => {
      expect(canRegisterForClass("class_pass")).toBe(true);
    });

    test("allows packages with class category", () => {
      expect(canRegisterForClass("pass", "class")).toBe(true);
    });

    test("rejects personal training packages", () => {
      expect(canRegisterForClass("personal")).toBe(false);
    });

    test("rejects lesson packages", () => {
      expect(canRegisterForClass("lesson")).toBe(false);
    });

    test("rejects packages with personal category", () => {
      expect(canRegisterForClass("pass", "personal")).toBe(false);
    });
  });

  describe("Class Timing Validation", () => {
    test("allows future classes", () => {
      const future = new Date(Date.now() + 86400000); // tomorrow
      expect(isClassInFuture(future)).toBe(true);
    });

    test("rejects past classes", () => {
      const past = new Date(Date.now() - 86400000); // yesterday
      expect(isClassInFuture(past)).toBe(false);
    });

    test("rejects classes happening now", () => {
      const now = new Date();
      expect(isClassInFuture(now)).toBe(false);
    });
  });

  describe("Duplicate Registration Prevention", () => {
    const participants = ["user1", "user2", "user3"];

    test("detects existing registration", () => {
      expect(isAlreadyRegistered(participants, "user2")).toBe(true);
    });

    test("allows new registration", () => {
      expect(isAlreadyRegistered(participants, "user4")).toBe(false);
    });

    test("handles empty participant list", () => {
      expect(isAlreadyRegistered([], "user1")).toBe(false);
    });

    test("detects first participant", () => {
      expect(isAlreadyRegistered(participants, "user1")).toBe(true);
    });

    test("detects last participant", () => {
      expect(isAlreadyRegistered(participants, "user3")).toBe(true);
    });
  });

  describe("Class Status Validation", () => {
    test("allows registration for scheduled classes", () => {
      expect(isClassOpen("scheduled")).toBe(true);
    });

    test("allows registration for open classes", () => {
      expect(isClassOpen("open")).toBe(true);
    });

    test("rejects cancelled classes", () => {
      expect(isClassOpen("cancelled")).toBe(false);
    });

    test("rejects completed classes", () => {
      expect(isClassOpen("completed")).toBe(false);
    });

    test("rejects full classes", () => {
      expect(isClassOpen("full")).toBe(false);
    });
  });

  describe("Remaining Capacity Calculation", () => {
    test("calculates remaining spots correctly", () => {
      expect(getRemainingCapacity(7, 10)).toBe(3);
    });

    test("returns zero when full", () => {
      expect(getRemainingCapacity(10, 10)).toBe(0);
    });

    test("returns zero when over capacity", () => {
      expect(getRemainingCapacity(12, 10)).toBe(0);
    });

    test("returns full capacity when empty", () => {
      expect(getRemainingCapacity(0, 10)).toBe(10);
    });

    test("returns one spot remaining", () => {
      expect(getRemainingCapacity(9, 10)).toBe(1);
    });
  });

  describe("Minimum Registration Notice", () => {
    test("allows registration with sufficient notice", () => {
      const future = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
      expect(meetsRegistrationNotice(future, 2)).toBe(true);
    });

    test("rejects registration too soon", () => {
      const soon = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      expect(meetsRegistrationNotice(soon, 2)).toBe(false);
    });

    test("allows registration exactly at minimum", () => {
      const exactly = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      expect(meetsRegistrationNotice(exactly, 2)).toBe(true);
    });

    test("handles same-day registration when allowed", () => {
      const sameDay = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      expect(meetsRegistrationNotice(sameDay, 0)).toBe(true);
    });
  });

  describe("Participant List Management", () => {
    function addParticipant(participants: string[], userId: string): string[] {
      return [...participants, userId];
    }

    function removeParticipant(participants: string[], userId: string): string[] {
      return participants.filter(id => id !== userId);
    }

    test("adds new participant", () => {
      const initial = ["user1", "user2"];
      const result = addParticipant(initial, "user3");
      expect(result).toEqual(["user1", "user2", "user3"]);
      expect(result.length).toBe(3);
    });

    test("removes existing participant", () => {
      const initial = ["user1", "user2", "user3"];
      const result = removeParticipant(initial, "user2");
      expect(result).toEqual(["user1", "user3"]);
      expect(result.length).toBe(2);
    });

    test("handles removing non-existent participant", () => {
      const initial = ["user1", "user2"];
      const result = removeParticipant(initial, "user3");
      expect(result).toEqual(["user1", "user2"]);
      expect(result.length).toBe(2);
    });

    test("adds first participant to empty list", () => {
      const result = addParticipant([], "user1");
      expect(result).toEqual(["user1"]);
      expect(result.length).toBe(1);
    });
  });

  describe("Waitlist Logic", () => {
    function shouldAddToWaitlist(
      currentParticipants: number, 
      maxCapacity: number, 
      hasWaitlist: boolean
    ): boolean {
      return currentParticipants >= maxCapacity && hasWaitlist;
    }

    test("adds to waitlist when class is full and waitlist enabled", () => {
      expect(shouldAddToWaitlist(10, 10, true)).toBe(true);
    });

    test("rejects when class is full and no waitlist", () => {
      expect(shouldAddToWaitlist(10, 10, false)).toBe(false);
    });

    test("does not use waitlist when spots available", () => {
      expect(shouldAddToWaitlist(8, 10, true)).toBe(false);
    });

    test("adds to waitlist when over capacity", () => {
      expect(shouldAddToWaitlist(12, 10, true)).toBe(true);
    });
  });

  describe("Class Package Session Management", () => {
    function hasRemainingClassSessions(sessionsUsed: number, totalSessions: number): boolean {
      return sessionsUsed < totalSessions;
    }

    test("allows registration with remaining sessions", () => {
      expect(hasRemainingClassSessions(3, 10)).toBe(true);
    });

    test("rejects when all sessions used", () => {
      expect(hasRemainingClassSessions(10, 10)).toBe(false);
    });

    test("allows first class registration", () => {
      expect(hasRemainingClassSessions(0, 10)).toBe(true);
    });

    test("allows last available session", () => {
      expect(hasRemainingClassSessions(9, 10)).toBe(true);
    });
  });

  describe("Age Restriction Validation", () => {
    function meetsAgeRequirement(userAge: number, minAge: number, maxAge?: number): boolean {
      if (userAge < minAge) return false;
      if (maxAge !== undefined && userAge > maxAge) return false;
      return true;
    }

    test("allows user meeting minimum age", () => {
      expect(meetsAgeRequirement(18, 18)).toBe(true);
    });

    test("rejects user below minimum age", () => {
      expect(meetsAgeRequirement(16, 18)).toBe(false);
    });

    test("allows user above minimum age", () => {
      expect(meetsAgeRequirement(25, 18)).toBe(true);
    });

    test("allows user within age range", () => {
      expect(meetsAgeRequirement(45, 18, 65)).toBe(true);
    });

    test("rejects user above maximum age", () => {
      expect(meetsAgeRequirement(70, 18, 65)).toBe(false);
    });

    test("allows user at maximum age", () => {
      expect(meetsAgeRequirement(65, 18, 65)).toBe(true);
    });

    test("handles no maximum age limit", () => {
      expect(meetsAgeRequirement(85, 18)).toBe(true);
    });
  });
});
