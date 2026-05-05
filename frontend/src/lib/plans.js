export const PLAN_LIMITS = {
  FREE: {
    name: 'Free (Trial)',
    users: 10,
    projects: 3,
    features: ["10 Users", "3 Projects", "Kanban Board", "Basic Tasks"],
  },
  TRIAL: {
    name: 'Trial',
    users: 10,
    projects: 3,
    features: ["10 Users", "3 Projects", "Kanban Board", "Basic Tasks"],
  },
  STARTER: {
    name: 'Starter',
    users: 30,
    projects: 5,
    price: '₹10',
    features: ["30 Users", "5 Projects", "Tasks & Tickets", "Team & Chat", "Email Support"],
  },
  PRO: {
    name: 'Pro',
    users: 100,
    projects: 50,
    price: '₹10',
    features: ["100 Users", "50 Projects", "Performance Analytics", "Timesheets", "GitHub Integration"],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    users: 1000,
    projects: 500,
    price: 'Custom',
    features: ["Unlimited Users", "Unlimited Projects", "SSO & SAML", "Dedicated Manager", "SLA Guarantee"],
  }
};

export const getPlanLimits = (planType) => {
  const type = planType?.toUpperCase() || 'FREE';
  return PLAN_LIMITS[type] || PLAN_LIMITS.FREE;
};
