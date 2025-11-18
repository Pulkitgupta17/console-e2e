import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { verifyContactPersonToken, sendOtpPhone } from "@/services/signupService";
import { toast } from "sonner";
import { getCookie, calculatePasswordStrength } from "@/services/commonMethods";
import MobileOtpActivation from "@/signup/mobile-otp-activation";
import type { VerifyContactPersonResponse, SendOtpPhonePayload } from "@/interfaces/signupInterface";
import { MYACCOUNT_URL } from "@/constants/global.constants"

const schema = z.object({
  firstName: z.string()
    .min(3, { message: "First name must be at least 3 characters" })
    .max(100, { message: "First name must be at most 100 characters" })
    .regex(/^[a-zA-Z\s-]+(\s{0,1}[a-zA-Z\s-])$/, { message: "Invalid first name format" }),
  lastName: z.string()
    .min(3, { message: "Last name must be at least 3 characters" })
    .max(100, { message: "Last name must be at most 100 characters" })
    .regex(/^[a-zA-Z\s-]+(\s{0,1}[a-zA-Z\s-])$/, { message: "Invalid last name format" }),
  password: z.string()
    .min(16, { message: "Password must be at least 16 characters" })
    .max(30, { message: "Password must be at most 30 characters" })
    .regex(/^(?=\D*\d)(?=[^a-z]*[a-z])(?=[^A-Z]*[A-Z]).{16,30}$/, {
      message: "Password must contain uppercase, lowercase, and numbers"
    }),
  confirmPassword: z.string(),
  phone: z.string()
    .min(10, { message: "Please enter a valid phone number" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormFields = z.infer<typeof schema>;

interface AccountActivationFormProps {
  token: string;
  customerData: VerifyContactPersonResponse;
  onOtpSent: (payload: any) => void;
}

function AccountActivationForm({ token, customerData, onOtpSent }: AccountActivationFormProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting, isValid } } = useForm<FormFields>({
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      phone: "",
    },
    resolver: zodResolver(schema),
    mode: "onChange",
    criteriaMode: "all",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [passwordCheck, setPasswordCheck] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const passwordStrength = password ? calculatePasswordStrength(password, {
    minLength: 16,
    maxLength: 30,
    requireSpecialChars: false,
  }) : null;

  useEffect(() => {
    if (password && confirmPassword) {
      setPasswordCheck(password === confirmPassword);
    } else {
      setPasswordCheck(false);
    }
  }, [password, confirmPassword]);

  const onSubmit = async (data: FormFields) => {
    setShowErrors(true);
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready. Please refresh the page.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordCheck(true);
      return;
    }

    setBtnDisabled(true);

    try {
      const recaptchaToken = await executeRecaptcha("otp");
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

      const payload: SendOtpPhonePayload = {
        mobile: formattedPhone,
        action: "user_management_invitation",
        primary_customer_name: customerData.primary_customer_name,
        contact_type: customerData.role,
        recaptcha: recaptchaToken,
        version: "v3",
      };

      const response = await sendOtpPhone(payload);

      if (response.code !== 200) {
        toast.error(response.message || "Failed to send OTP");
        setBtnDisabled(false);
        return;
      }

      if (response.data?.phone_blocked) {
        toast.error("Phone number is blocked. Please contact support.");
        setBtnDisabled(false);
        return;
      }

      onOtpSent({
        first_name: data.firstName,
        last_name: data.lastName,
        password: data.password,
        confirm_password: data.confirmPassword,
        email: customerData.email,
        phone: formattedPhone,
        token: `?token=${token}`,
        iam_type: customerData.iam_type,
        mobile: formattedPhone,
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.error || 
                      error?.response?.data?.errors ||
                      "Failed to send OTP. Please try again.";
      toast.error(errorMsg);
      setBtnDisabled(false);
    }
  };

  return (
    <form className="space-y-6 mt-8" onSubmit={handleSubmit(onSubmit, () => setShowErrors(true))}>
      {/* Hidden field to bind phone to RHF */}
      <input type="hidden" {...register("phone")} />
      {/* First Name and Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            {...register("firstName")}
            type="text"
            placeholder="First Name"
            variant="primary"
            size="xl"
            className={errors.firstName ? "border-red-500" : ""}
          />
          {showErrors && errors.firstName && (
            <p className="text-xs text-red-400">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            {...register("lastName")}
            type="text"
            placeholder="Last Name"
            variant="primary"
            size="xl"
            className={errors.lastName ? "border-red-500" : ""}
          />
          {showErrors && errors.lastName && (
            <p className="text-xs text-red-400">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Input
          type="email"
          value={customerData.email}
          readOnly
          variant="primary"
          size="xl"
          className="bg-gray-800/50 cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <PhoneInput
          country={'in'}
          value={phoneNumber}
          onChange={(val) => {
            setPhoneNumber(val);
            const formatted = val ? (val.startsWith("+") ? val : `+${val}`) : "";
            setValue("phone", formatted, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            trigger("phone");
          }}
          placeholder="Mobile Number"
          inputClass={`!w-full !h-12 !bg-gray-800/50 ${errors.phone ? '!border-red-500 focus:!border-red-500' : '!border-gray-700'} !text-white !rounded-md !px-4 !py-3`}
          containerClass="phone-input-container"
          buttonClass={`!bg-gray-800/50 ${errors.phone ? '!border-red-500' : '!border-gray-700'}`}
        />
        {showErrors && errors.phone && (
          <p className="text-xs text-red-400">{errors.phone.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            variant="primary"
            size="xl"
            className={errors.password ? "border-red-500 pr-10" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {showErrors && errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}

        {/* Password Strength Indicator */}
        {password && (
          <div className="space-y-2 mt-3">
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${passwordStrength?.color} transition-all duration-300`}
                style={{ width: `${passwordStrength?.score || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${passwordStrength?.textColor}`}>
                {passwordStrength?.strength}
              </span>
            </div>
            {(() => {
              const lengthMin = password.length >= 16;
              const lengthMax = password.length <= 30;
              const hasLower = /[a-z]/.test(password);
              const hasUpper = /[A-Z]/.test(password);
              const hasNumber = /\d/.test(password);
              const items: Array<{label: string; passed: boolean}> = [
                { label: 'Min 16 chars', passed: lengthMin },
                { label: 'Max 30 chars', passed: lengthMax },
                { label: 'Lowercase', passed: hasLower },
                { label: 'Uppercase', passed: hasUpper },
                { label: 'Numbers', passed: hasNumber },
              ];
              return (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {items.map(({ label, passed }) => (
                    <div key={label} className={`flex items-center gap-1 ${passed ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {passed ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            {...register("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            variant="primary"
            size="xl"
            className={errors.confirmPassword || (passwordCheck && password !== confirmPassword) ? "border-red-500 pr-10" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {showErrors && errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
        )}
        {showErrors && passwordCheck && password !== confirmPassword && (
          <p className="text-xs text-red-400">Passwords do not match</p>
        )}
      </div>

      <Button
        type="submit"
        variant="signup"
        size="xl"
        disabled={isSubmitting || btnDisabled || !isValid}
        className="w-full"
      >
        {isSubmitting || btnDisabled ? "Sending OTP..." : "Create Account"}
      </Button>
    </form>
  );
}

function AccountActivation({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [customerData, setCustomerData] = useState<VerifyContactPersonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiredToken, setExpiredToken] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpPayload, setOtpPayload] = useState<any>(null);

  useEffect(() => {
    // Redirect if already logged in
    const token = getCookie('token');
    if (token) {
      // navigate('/');
      window.location.href = MYACCOUNT_URL;
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid activation link");
      navigate('/accounts/signin');
      return;
    }

    const fetchCustomerData = async () => {
      try {
        const data = await verifyContactPersonToken(`?token=${token}`);
        setCustomerData(data);
      } catch (error: any) {
        if (error?.response?.status === 412) {
          setExpiredToken(true);
          setInvalidMessage(error?.response?.data?.errors || "This activation link has expired.");
        } else {
          toast.error(error?.response?.data?.errors || "Failed to load activation data");
          navigate('/accounts/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [token, navigate]);

  const handleOtpSent = (payload: any) => {
    setOtpPayload(payload);
    setShowOtp(true);
  };

  const handleOtpCancel = () => {
    setShowOtp(false);
    setOtpPayload(null);
  };

  const handleOtpSuccess = () => {
    toast.success("Account Created Successfully");
    setTimeout(() => {
      navigate('/accounts/signin');
    }, 1000);
  };

  if (loading) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
        <Card className="border-gray-800/50 backdrop-blur-sm" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardContent className="pt-6">
            <div className="text-center text-gray-400">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expiredToken) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
        <Card className="border-gray-800/50 backdrop-blur-sm" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardHeader className="text-left">
            <CardTitle className="text-2xl font-bold text-white">
              Activation Link Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-7">{invalidMessage}</p>
            <Button
              onClick={() => navigate('/accounts/signin')}
              variant="signup"
              size="xl"
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showOtp && otpPayload && customerData) {
    return (
      <MobileOtpActivation
        payload={otpPayload}
        customerData={customerData}
        onCancel={handleOtpCancel}
        onSuccess={handleOtpSuccess}
      />
    );
  }

  if (!customerData) {
    return null;
  }

  const recaptchaSiteKey = "6LeJ7_4jAAAAAKqjyjQ2jEC4yJenDE6R8KyTu9Mt";

  if (!recaptchaSiteKey) {
    console.error("reCAPTCHA site key is not set");
    return (
      <div className="text-red-400 text-center p-4">
        reCAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
        <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardHeader className="text-left space-y-2">
            <CardTitle className="text-2xl font-bold text-white">
              Join as IAM User
            </CardTitle>
            <CardDescription className="text-gray-400">
              You've been invited to join a CRN. Complete your registration below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountActivationForm
              token={token}
              customerData={customerData}
              onOtpSent={handleOtpSent}
            />
          </CardContent>
        </Card>
      </div>
    </GoogleReCaptchaProvider>
  );
}

export default AccountActivation;

