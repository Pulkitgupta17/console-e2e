import Cookies from 'universal-cookie';

const cookie = new Cookies();

export const setCookie = (cookieName: string, cookieValue: any): any => {
  const today_date = new Date();
  today_date.setDate(today_date.getDate() + 400);
  
  const cookieOptions: any = {
    expires: today_date,
    path: '/',
    secure: false,
    httpOnly: false,
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

export const removeAllCookies = (): void => {
  const allCookies = cookie.getAll();
  for (const cookieName in allCookies) {
    if (Object.hasOwnProperty.call(allCookies, cookieName)) {
      cookie.remove(cookieName);
    }
  }
};

export const getCookie = (cookieName: string): any => {
  return cookie.get(cookieName);
};

// Session Cookie Functions
export const setSessionTimeCookie = (): void => {
  const minutes = 15; // session will expire after 15 minutes
  const cookie_name = 'session_expiry';
  const cookie_expiry = new Date();
  cookie_expiry.setDate(cookie_expiry.getDate() + 400);
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + minutes * 60 * 1000);
  const cookie_value = expiryDate.toString();
  
  const cookieOptions: any = {
    expires: cookie_expiry,
    path: '/',
  };
  
  const domain = import.meta.env.VITE_domainForCookie;
  if (domain && !window.location.hostname.includes('localhost')) {
    cookieOptions.domain = domain;
    // cookieOptions.secure = true;
  }
  
  cookie.set(cookie_name, cookie_value, cookieOptions);
};

export const setSessionFor60Days = (): void => {
  const days = 60;
  const cookie_name = 'remember';
  const cookie_expiry_date = new Date();
  cookie_expiry_date.setDate(cookie_expiry_date.getDate() + 400);
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + days * 24 * 60 * 60 * 1000);
  const cookie_value = expiryDate.toString();
  
  const cookieOptions: any = {
    expires: cookie_expiry_date,
    path: '/',
  };
  
  const domain = import.meta.env.VITE_domainForCookie;
  if (domain && !window.location.hostname.includes('localhost')) {
    cookieOptions.domain = domain;
    // cookieOptions.secure = true;
  }
  
  cookie.set(cookie_name, cookie_value, cookieOptions);
};

// Cross-Domain Cookie Functions
export const setCrossDomainCookies = (): void => {
  const today_date = new Date();
  today_date.setDate(today_date.getDate() + 400);
  const domain = import.meta.env.VITE_domainForCookie;
  
  const token = localStorage.getItem('token') || getCookie('token');
  const apikey = localStorage.getItem('apikey') || getCookie('apikey');
  const email = localStorage.getItem('email') || getCookie('email');
  
  if (domain && !window.location.hostname.includes('localhost')) {
    document.cookie = `token=${token}; expires=${today_date.toUTCString()}; domain=${domain}; path=/;`;
    document.cookie = `apikey=${apikey}; expires=${today_date.toUTCString()}; domain=${domain}; path=/;`;
    if (email) {
      document.cookie = `email=${email}; expires=${today_date.toUTCString()}; domain=${domain}; path=/;`;
    }
  } else {
    // For localhost, use regular cookie setting
    if (token) setCookie('token', token);
    if (apikey) setCookie('apikey', apikey);
    if (email) setCookie('email', email);
  }
};

export const postCrossDomainMessage = (link: string, timeout: number = 1500): void => {
  setCrossDomainCookies();
  setTimeout(() => {
    window.location.replace(link) ;
  }, timeout);
};

// Navigation helper to preserve query parameters
export const navigateWithQueryParams = (path: string): string => {
  const currentParams = new URLSearchParams(window.location.search);
  return path + (currentParams.toString() ? '?' + currentParams.toString() : '');
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

// OTP Paste Handling Utilities

export interface ProcessOtpPasteOptions {
  pastedData: string;
  otpLength: number;
  setOtpValues: (values: string[]) => void;
  inputIdPrefix: string;
}

/**
 * Processes pasted OTP data and fills the OTP input fields
 * Only accepts exactly the specified OTP length
 */
export const processOtpPaste = ({
  pastedData,
  otpLength,
  setOtpValues,
  inputIdPrefix,
}: ProcessOtpPasteOptions): void => {
  // Extract only numeric characters
  const numericData = pastedData.replace(/\D/g, '');
  
  // Only process if exactly the required length
  if (numericData.length === otpLength) {
    const newValues: string[] = [];
    // Fill starting from the first input box (index 0)
    for (let i = 0; i < otpLength; i++) {
      newValues[i] = numericData[i];
    }
    setOtpValues(newValues);
    
    // Focus the last input since all are filled
    setTimeout(() => {
      const lastInput = document.getElementById(`${inputIdPrefix}-${otpLength - 1}`);
      lastInput?.focus();
    }, 0);
  }
};

/**
 * Creates a paste event handler for OTP inputs
 */
export const createOtpPasteHandler = (
  processPaste: (pastedData: string) => void
): ((e: React.ClipboardEvent<HTMLInputElement>) => void) => {
  return (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const pastedData = e.clipboardData.getData('text');
    processPaste(pastedData);
  };
};

/**
 * Creates an input validation handler that allows clipboard shortcuts
 */
export const createOtpInputValidation = (): ((e: React.KeyboardEvent<HTMLInputElement>) => void) => {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow paste shortcuts (Command/Ctrl + V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      return;
    }
    // Allow copy shortcuts (Command/Ctrl + C)
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      return;
    }
    // Allow cut shortcuts (Command/Ctrl + X)
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
      return;
    }
    // Allow select all shortcuts (Command/Ctrl + A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      return;
    }
    
    if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Delete") {
      e.preventDefault();
    }
  };
};

export interface CreateOtpKeyDownHandlerOptions {
  otpValues: string[];
  setOtpValues: (values: string[]) => void;
  inputIdPrefix: string;
  onBackspace?: (index: number, currentValues: string[]) => void;
}

/**
 * Creates a keydown event handler for OTP inputs with paste support
 */
export const createOtpKeyDownHandler = ({
  otpValues,
  setOtpValues,
  inputIdPrefix,
  onBackspace,
}: CreateOtpKeyDownHandlerOptions): ((e: React.KeyboardEvent<HTMLInputElement>, index: number) => void) => {
  const inputValidation = createOtpInputValidation();
  
  return (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Allow paste shortcuts to work
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      return; // Let the paste event handle it
    }
    
    if (e.key === "Backspace") {
      if (onBackspace) {
        onBackspace(index, otpValues);
      } else {
        // Default backspace behavior
        if (!otpValues[index] && index > 0) {
          const prevInput = document.getElementById(`${inputIdPrefix}-${index - 1}`);
          prevInput?.focus();
        } else {
          const newValues = [...otpValues];
          newValues[index] = '';
          setOtpValues(newValues);
        }
      }
      return;
    }
    inputValidation(e);
  };
};

export const captureUTMParameters = (): void => {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_term', 'utm_content'];
  
  utmParams.forEach(param => {
    const value = urlParams.get(param);
    if (value) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      document.cookie = `${param}=${encodeURIComponent(value)}; expires=${expiryDate.toUTCString()}; path=/;`;
    }
  });
};

export const setUTMResource = async (): Promise<void> => {
  try {
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      return;
    }

    const utmCampaign = getCookie('utm_campaign') || '';
    const utmSource = getCookie('utm_source') || '';
    const utmMedium = getCookie('utm_medium') || '';
    const utmTerm = getCookie('utm_term') || '';
    const utmContent = getCookie('utm_content') || '';

    const { setUTMCampaign } = await import('@/services/signupService');
    
    const payload = {
      csrfmiddlewaretoken: csrfToken,
      utm_campaign: utmCampaign,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_term: utmTerm,
      utm_content: utmContent,
    };

    const response = await setUTMCampaign(payload);
    
    if (response.code === 200) {
      removeCookie('utm_campaign');
      removeCookie('utm_source');
      removeCookie('utm_medium');
      removeCookie('utm_term');
      removeCookie('utm_content');
    }
  } catch (error) {
    console.debug('Error updating UTM campaign:', error);
  }
};