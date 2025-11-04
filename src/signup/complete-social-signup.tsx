import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { customerDetailsVerification } from "@/services/signupService"
import type { SocialUser, OtpStatus } from "@/interfaces/signupInterface"
import SocialOtpVerification from "./social-otp-verification"

const schema = z.object({
  name: z.string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(70, { message: "Name must not exceed 70 characters" })
    .regex(/^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-,])*$/, { 
      message: "Name contains invalid characters" 
    }),
});

type FormFields = z.infer<typeof schema>;

interface CompleteSocialSignupFormProps extends React.ComponentProps<"div"> {
  socialUser: SocialUser;
}

function CompleteSocialSignupForm({
  className,
  socialUser,
  ...props
}: CompleteSocialSignupFormProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormFields>({
    defaultValues: {
      name: socialUser.name || "",
    },
    resolver: zodResolver(schema),
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpStatus, setOtpStatus] = useState<OtpStatus | null>(null);
  const [nameEdited, setNameEdited] = useState(false);
  const [editedName, setEditedName] = useState(socialUser.name || "");
  const [showEmailExistsError, setShowEmailExistsError] = useState(false);

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready. Please refresh the page.");
      return;
    }

    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Check if login already in progress
    if (localStorage.getItem("logininprogress") === "yes") {
      toast.error("Signup already in progress. Please wait.");
      return;
    }

    try {
      // Set login in progress flag
      localStorage.setItem("logininprogress", "yes");

      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("social_signup");

      // Format phone number with +
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

      // Step 1: Customer details verification (sends mobile OTP)
      const verificationResponse = await customerDetailsVerification({
        email: socialUser.email,
        mobile: formattedPhone,
        recaptcha: recaptchaToken,
        version: "v3",
      });

      if (verificationResponse.code !== 200) {
        toast.error(verificationResponse.message || "Verification failed");
        return;
      }

      const responseData = verificationResponse.data;

      // Check for errors
      if (responseData.phone_blocked) {
        toast.error("Phone number is blocked. Please contact sales.");
        return;
      }

      if (responseData.phone_no_restricted) {
        toast.error("Phone number is restricted. Please contact sales.");
        return;
      }

      if (responseData?.email_exists) {
        setShowEmailExistsError(true);
        toast.error("A user is already registered with this e-mail address. Sign in");
        return;
      }

      // Store data for OTP verification step
      setOtpStatus(responseData);
      
      // Check if name was edited
      if (data.name !== socialUser.name) {
        setNameEdited(true);
        setEditedName(data.name);
      }

      // Update social user with phone
      const updatedSocialUser = {
        ...socialUser,
        phone: formattedPhone,
      };
      localStorage.setItem('socialuser', JSON.stringify(updatedSocialUser));

      // Show OTP verification screen (mobile OTP only for social signup)
      setShowOtpVerification(true);
      toast.success("OTP sent to your mobile number");

    } catch (error: any) {
      console.error("Social signup error:", error);
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || "Verification failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      localStorage.removeItem("logininprogress");
    }
  };

  const handleBackFromOtp = () => {
    setShowOtpVerification(false);
  };

  if (showOtpVerification && otpStatus) {
    return (
      <SocialOtpVerification
        onBack={handleBackFromOtp}
        socialUser={{ ...socialUser, phone: phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}` }}
        otpStatus={otpStatus}
        nameEdited={nameEdited}
        editedName={editedName}
      />
    );
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Complete Your Signup
          </CardTitle>
          <CardDescription className="text-gray-400">
            Sign up with {socialUser.provider}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  variant="primary"
                  size="xl"
                  required
                  autoComplete="off"
                  {...register("name")}
                />
              </div>
              
              <div className="space-y-2">
                <PhoneInput
                  country={'in'}
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value)}
                  placeholder="Mobile No."
                  inputProps={{
                    autoComplete: 'off',
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  variant="primary"
                  size="xl"
                  value={socialUser.email}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">Email from {socialUser.provider}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 mt-6 mb-6">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400">
                    By continuing you agree to the{" "}
                    <a href="#" className="text-cyan-400 hover:text-cyan-300">
                      terms
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-cyan-400 hover:text-cyan-300">
                      privacy policy
                    </a>
                    .
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Verifying..." : "Continue"}
                </Button>
              </div>
              
              {showEmailExistsError && (
                <p className="text-center text-gray-400 text-sm mt-8 mb-2">
                  A user is already registered with this e-mail address. {" "}
                  <button
                    type="button"
                    onClick={() => navigate('/accounts/signin')}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ReCaptcha Provider Wrapper
const CompleteSocialSignup = (props: React.ComponentProps<"div">) => {
  const navigate = useNavigate();
  const [socialUser, setSocialUser] = useState<SocialUser | null>(null);
  const siteKey = "6LeJ7_4jAAAAAKqjyjQ2jEC4yJenDE6R8KyTu9Mt";

  useEffect(() => {
    // Get social user from localStorage
    const storedSocialUser = localStorage.getItem('socialuser');
    if (!storedSocialUser) {
      toast.error("No social login data found. Please try again.");
      navigate('/accounts/signup');
      return;
    }

    try {
      const user = JSON.parse(storedSocialUser);
      setSocialUser(user);
    } catch (error) {
      toast.error("Invalid social login data. Please try again.");
      navigate('/accounts/signup');
    }
  }, [navigate]);

  if (!siteKey) {
    console.error("reCAPTCHA site key is not set");
    return (
      <div className="text-red-400 text-center p-4">
        reCAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  if (!socialUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-center p-4">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <CompleteSocialSignupForm socialUser={socialUser} {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default CompleteSocialSignup;

