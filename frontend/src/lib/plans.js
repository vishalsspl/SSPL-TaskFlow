export const PLAN_LIMITS = {
  FREE: {
    name: 'Free (Trial)',
    users: 10,
    projects: 3,
    features: ["10 Users", "3 Projects", "Basic Tools"],
  },
  TRIAL: {
    name: 'Trial',
    users: 10,
    projects: 3,
    features: ["10 Users", "3 Projects", "Basic Tools"],
  },
  STARTER: {
    name: 'Starter',
    users: 30,
    projects: 5,
    price: '$19',
    features: ["30 Users", "5 Projects", "Basic Analytics", "Email Support"],
  },
  PRO: {
    name: 'Pro',
    users: 100,
    projects: 50,
    price: '$49',
    features: ["100 Users", "50 Projects", "Advanced Reports", "Priority Support"],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    users: 1000,
    projects: 500,
    price: 'Custom',
    features: ["1000 Users", "500 Projects", "SSO & SAML", "Dedicated Manager"],
  }
};

export const getPlanLimits = (planType) => {
  const type = planType?.toUpperCase() || 'FREE';
  return PLAN_LIMITS[type] || PLAN_LIMITS.FREE;
};
