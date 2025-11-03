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