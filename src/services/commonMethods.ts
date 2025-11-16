import Cookies from 'universal-cookie';

const cookie = new Cookies();

export const setCookie = (cookieName: string, cookieValue: any): any => {
  const today_date = new Date();
  today_date.setDate(today_date.getDate() + 400);
  
  const cookieOptions: any = {
    expires: today_date,
    path: '/',
  };
  
  // Only set domain in production. In development (localhost), omit domain so cookies work
  const domain = import.meta.env.VITE_domainForCookie;
  if (domain && !window.location.hostname.includes('localhost')) {
    cookieOptions.domain = domain;
  }
  
  cookie.set(cookieName, cookieValue, cookieOptions);
};

export const removeCookie = (cookieName: string): any => {
  const expiry_date = new Date();
  expiry_date.setDate(expiry_date.getDate() - 1);
  
  const cookieOptions: any = {
    expires: expiry_date,
    path: '/',
  };
  
  const domain = import.meta.env.VITE_domainForCookie;
  if (domain && !window.location.hostname.includes('localhost')) {
    cookieOptions.domain = domain;
  }
  
  cookie.set(cookieName, getCookie(cookieName), cookieOptions);
};

export const getCookie = (cookieName: string): any => {
  return cookie.get(cookieName);
};

// Password Strength Calculation Utility

export interface PasswordStrengthOptions {
  minLength?: number;
  maxLength?: number;
  requireSpecialChars?: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  bgColor?: string;
  textColor: string;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    numbers: boolean;
    special?: boolean;
  };
}

export const calculatePasswordStrength = (
  password: string,
  options: PasswordStrengthOptions = {}
): PasswordStrengthResult | null => {
  if (!password) {
    return {
      score: 0,
      strength: 'weak',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      checks: {
        length: false,
        lowercase: false,
        uppercase: false,
        numbers: false,
        ...(options.requireSpecialChars && { special: false }),
      },
    };
  }

  const {
    minLength = 8,
    maxLength,
    requireSpecialChars = false,
  } = options;

  // Determine length check
  const lengthCheck = maxLength
    ? password.length >= minLength && password.length <= maxLength
    : password.length >= minLength;

  const checks = {
    length: lengthCheck,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    ...(requireSpecialChars && {
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }),
  };

  // Calculate score based on number of checks
  const totalChecks = requireSpecialChars ? 5 : 4;
  const pointsPerCheck = 100 / totalChecks;
  let score = 0;

  if (checks.length) score += pointsPerCheck;
  if (checks.lowercase) score += pointsPerCheck;
  if (checks.uppercase) score += pointsPerCheck;
  if (checks.numbers) score += pointsPerCheck;
  if (requireSpecialChars && checks.special) score += pointsPerCheck;

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  let color = 'from-red-500 to-red-600';
  let bgColor = 'bg-red-500/20';
  let textColor = 'text-red-400';

  if (score >= 75) {
    strength = 'strong';
    color = 'from-emerald-500 to-emerald-600';
    bgColor = 'bg-emerald-500/20';
    textColor = 'text-emerald-400';
  } else if (score >= 50) {
    strength = 'good';
    color = 'from-cyan-500 to-cyan-600';
    bgColor = 'bg-cyan-500/20';
    textColor = 'text-cyan-400';
  } else if (score >= 25) {
    strength = 'fair';
    color = 'from-yellow-500 to-yellow-600';
    bgColor = 'bg-yellow-500/20';
    textColor = 'text-yellow-400';
  }

  return {
    score,
    strength,
    color,
    bgColor,
    textColor,
    checks: checks as any,
  };
};