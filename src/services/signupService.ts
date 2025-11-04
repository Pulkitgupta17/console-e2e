import { PublicAPI } from "@/axios";
import API from "@/axios";
import CryptoJS from "crypto-js";
import type {
  CustomerVerificationPayload,
  SendOtpEmailPayload,
  OtpVerifyPayload,
  SignupFirstPayload,
  UTMCampaignPayload,
  GoogleSignupPayload,
} from "@/interfaces/signupInterface";

// Step 1: Verify customer details and send mobile OTP
export const customerDetailsVerification = async (payload: CustomerVerificationPayload) => {
  const response = await PublicAPI.post(
    "accounts/customer-details-verification/",
    payload
  );
  return response.data;
};

// Step 2: Send OTP to email
export const sendOtpEmail = async (payload: SendOtpEmailPayload) => {
  const response = await PublicAPI.post(
    "accounts/send-otp-email/",
    payload
  );
  return response.data;
};

// Step 3: Verify OTP
export const verifyOtp = async (payload: OtpVerifyPayload) => {
  const response = await PublicAPI.post(
    "accounts/otp-verify/",
    payload
  );
  return response.data;
};

// Step 4: Complete signup
export const signupFirst = async (payload: SignupFirstPayload) => {
  const response = await PublicAPI.post(
    "accounts/signup-first/",
    payload
  );
  return response.data;
};

// Step 5: Set UTM campaign data
export const setUTMCampaign = async (payload: UTMCampaignPayload) => {
  const response = await API.post(
    "accounts/campaign/utm/",
    payload
  );
  return response.data;
};

// Helper: Generate MD5 hash for OTP verification
export const generateMobileOtpHash = (mobile: string, email: string): string => {
  return CryptoJS.MD5(`${mobile}${email}:phone_otp_success`).toString();
};

export const generateEmailOtpHash = (email: string): string => {
  return CryptoJS.MD5(`${email}:email_otp_success`).toString();
};

// Helper: Split full name into first and last name
export const splitFullName = (fullName: string): { first_name: string; last_name: string } => {
  const trimmedName = fullName.trim();
  const nameParts = trimmedName.split(" ");
  
  return {
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(" ").trimEnd() || "",
  };
};

// Google OAuth: Handle callback
export const googleCallback = async (code: string, redirectUri: string = 'signup') => {
  console.log("📤 Sending to backend:");
  console.log("  Endpoint:", `accounts/auth/google-callback/`);
  console.log("  Code:", code.substring(0, 30) + "...");
  console.log("  Redirect URI:", redirectUri);
  
  const response = await PublicAPI.post(
    `accounts/auth/google-callback/?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    {}
  );
  
  console.log("📥 Backend response:", response.data);
  return response.data;
};

// Google OAuth: Complete signup
export const signupGoogle = async (payload: GoogleSignupPayload) => {
  const response = await PublicAPI.post(
    "accounts/auth/signup-google/",
    payload
  );
  return response.data;
};

// GitHub OAuth: Handle callback
export const githubCallback = async (code: string) => {
  const response = await PublicAPI.post(
    "accounts/auth/github-callback/",
    { code }
  );
  return response.data;
};

// GitHub OAuth: Complete signup
export const signupGithub = async (payload: GoogleSignupPayload) => {
  const response = await PublicAPI.post(
    "accounts/auth/signup-github/",
    payload
  );
  return response.data;
};

