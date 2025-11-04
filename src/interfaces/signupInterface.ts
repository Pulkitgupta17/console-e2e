// API Payload Interfaces

export interface CustomerVerificationPayload {
  email: string;
  mobile: string;
  recaptcha: string;
  version: string;
}

export interface SendOtpEmailPayload {
  email: string;
  mobile: string;
  full_name: string;
  type: string;
  otp_msg: string;
  otp_status: any;
}

export interface OtpVerifyPayload {
  email: string;
  mobile: string;
  otp: string;
  otpemail: string;
}

export interface SignupFirstPayload {
  first_name: string;
  last_name: string;
  password1: string;
  password2: string;
  email: string;
  phone: string;
  mobile_otp_verified_code: string;
  email_otp_verified_code: string;
  emailis_verify?: boolean;
}

export interface UTMCampaignPayload {
  csrfmiddlewaretoken: string;
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
}

// Component Data Interfaces

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface OtpStatus {
  phone_blocked: boolean;
  code_sent: boolean;
  otp_expiry_time: string;
  message: string;
}

// Google OAuth Interfaces

export interface GoogleCallbackPayload {
  code: string;
  redirect_uri: string;
}

export interface GoogleSignupPayload {
  access_token: string;
  code: string;
  phone: string;
  email: string;
  mobile_otp_verified_code: string;
  email_otp_verified_code: string;
  emailis_verify: boolean;
  name_details: {
    name_edit_allowed: boolean;
    first_name?: string;
    last_name?: string;
  };
}

export interface SocialUser {
  name: string;
  email: string;
  access_token: string;
  id: string;
  provider: string;
}

