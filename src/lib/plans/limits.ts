export type Plan =
  | "FREE"
  | "GOLD"
  | "PLATINUM"
  | "ORG_STARTER"
  | "ORG_GROWTH"
  | "ORG_ENTERPRISE";

export interface PlanLimits {
  classrooms: number;         // max classrooms per teacher
  quizzesPerClassroom: number;
  aiEnabled: boolean;
  teacherSubAccounts: number; // max teachers an org can add (0 = N/A)
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    classrooms:          3,
    quizzesPerClassroom: 2,
    aiEnabled:           false,
    teacherSubAccounts:  0,
  },
  GOLD: {
    classrooms:          20,
    quizzesPerClassroom: 10,
    aiEnabled:           true,
    teacherSubAccounts:  0,
  },
  PLATINUM: {
    classrooms:          50,
    quizzesPerClassroom: 15,
    aiEnabled:           true,
    teacherSubAccounts:  0,
  },
  ORG_STARTER: {
    classrooms:          999999,
    quizzesPerClassroom: 10,
    aiEnabled:           true,
    teacherSubAccounts:  8,
  },
  ORG_GROWTH: {
    classrooms:          999999,
    quizzesPerClassroom: 20,
    aiEnabled:           true,
    teacherSubAccounts:  30,
  },
  ORG_ENTERPRISE: {
    classrooms:          999999,
    quizzesPerClassroom: 999999,
    aiEnabled:           true,
    teacherSubAccounts:  999999,
  },
};

// Prices in whole PKR
export const PLAN_PRICES: Partial<Record<Plan, { monthly: number; yearly: number }>> = {
  GOLD:           { monthly: 249,   yearly: 2499   },
  PLATINUM:       { monthly: 499,   yearly: 4999   },
  ORG_STARTER:    { monthly: 2499,  yearly: 24990  },
  ORG_GROWTH:     { monthly: 5999,  yearly: 59990  },
  ORG_ENTERPRISE: { monthly: 13999, yearly: 139990 },
};

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getPlanPrice(plan: Plan, period: "MONTHLY" | "YEARLY"): number {
  const prices = PLAN_PRICES[plan];
  if (!prices) throw new Error(`Plan ${plan} has no price (free plan)`);
  return period === "MONTHLY" ? prices.monthly : prices.yearly;
}
