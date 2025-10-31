import Cookies from 'universal-cookie';

const cookie = new Cookies();

export const setCookie = (cookieName: string, cookieValue: any): any => {
  const today_date = new Date();
  today_date.setDate(today_date.getDate() + 400);
  cookie.set(cookieName, cookieValue, {
    expires: today_date,
    domain: import.meta.env.VITE_domainForCookie,
    path: '/',
  });
};

export const removeCookie = (cookieName: string): any => {
  getCookie(cookieName);
  const expiry_date = new Date();
  expiry_date.setDate(expiry_date.getDate() - 1);
  cookie.set(cookieName, getCookie(cookieName), {
    expires: expiry_date,
    domain: import.meta.env.VITE_domainForCookie,
    path: '/',
  });
};

export const getCookie = (cookieName: string): any => {
  return cookie.get(cookieName);
};