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
import { parsePhoneNumber } from 'libphonenumber-js'
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { verifyContactPersonToken, sendOtpPhone } from "@/services/signupService";
import { toast } from "sonner";
import { getCookie, calculatePasswordStrength, removeAllCookies } from "@/services/commonMethods";
import MobileOtpActivation from "@/signup/mobile-otp-activation";
import type { VerifyContactPersonResponse, SendOtpPhonePayload } from "@/interfaces/signupInterface";
import { MYACCOUNT_URL } from "@/constants/global.constants"
import { useAppSelector } from "@/store/store"

const schema = z.object({
  firstName: z.string()
    .min(1, { message: "First name must be at least 1 characters" })
    .max(100, { message: "First name must be at most 100 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "Name should contain only alphabets." }),
  lastName: z.string()
    .min(1, { message: "Last name must be at least 1 characters" })
    .max(100, { message: "Last name must be at most 100 characters" })
    .regex(/^[a-zA-Z\s]+$/, { message: "Name should contain only alphabets." }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(30, { message: "Password must be at most 30 characters" })
    .regex(/^(?=\D*\d)(?=[^a-z]*[a-z])(?=[^A-Z]*[A-Z]).{8,30}$/, {
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
  const { countriesList, restrictedCountriesList, loading: countriesLoading } = useAppSelector((state) => state.countries);
  
  // Prepare countries props for PhoneInput - ensure ISO 3166-1 alpha-2 format (lowercase)
  const onlyCountriesProp = !countriesLoading && countriesList.length > 0 
    ? countriesList.filter((c: string) => c && c.length === 2).map((c: string) => c.toLowerCase())
    : undefined;
  const excludeCountriesProp = !countriesLoading && restrictedCountriesList.length > 0 
    ? restrictedCountriesList.filter((c: string) => c && c.length === 2).map((c: string) => c.toLowerCase())
    : undefined;
  
  // Key to force remount when countries data changes
  const phoneInputKey = `phone-${countriesList.length}-${countriesLoading}-${onlyCountriesProp?.join(',') || 'empty'}`;
  
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting, isValid, touchedFields } } = useForm<FormFields>({
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('in');
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const passwordStrength = password ? calculatePasswordStrength(password, {
    minLength: 8,
    requireSpecialChars: true,
  }) : null;

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const onSubmit = async (data: FormFields) => {
    setShowErrors(true);
    if (!executeRecaptcha) {
      toast.error("reCAPTCHA not ready. Please refresh the page.");
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    // Validate phone number using libphonenumber-js
    if (!phoneNumber) {
      setPhoneError("Phone number is required");
      toast.error("Please enter a valid phone number");
      setBtnDisabled(false);
      return;
    }

    try {
      // Parse and validate phone number based on selected country
      const phoneNumberWithCountry = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const parsedNumber = parsePhoneNumber(phoneNumberWithCountry, selectedCountry.toUpperCase() as any);
      
      if (!parsedNumber || !parsedNumber.isValid()) {
        setPhoneError("Please enter a valid phone number");
        toast.error("Please enter a valid phone number");
        setBtnDisabled(false);
        return;
      }
      
      // Clear error if valid
      setPhoneError(null);
    } catch (error) {
      setPhoneError("Please enter a valid phone number");
      toast.error("Please enter a valid phone number");
      setBtnDisabled(false);
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
        first_name: data?.firstName,
        last_name: data?.lastName,
        password: data.password,
        confirm_password: data.confirmPassword,
        email: customerData.email,
        phone: formattedPhone,
        token: `?token=${token}`,
        iam_type: customerData.iam_type,
        mobile: formattedPhone,
      });
    } catch (error: any) {
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
            placeholder="First Name *"
            variant="primary"
            size="xl"
            className={errors.firstName ? "border-red-500" : ""}
          />
          {(showErrors || touchedFields.firstName) && errors.firstName && (
            <p className="text-xs text-red-400">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            {...register("lastName")}
            type="text"
            placeholder="Last Name *"
            variant="primary"
            size="xl"
            className={errors.lastName ? "border-red-500" : ""}
          />
          {(showErrors || touchedFields.lastName) && errors.lastName && (
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
        <div className={cn(phoneError && "react-tel-input-error")}>
          <PhoneInput
            key={phoneInputKey}
            country={'in'}
            value={phoneNumber}
            countryCodeEditable={false}
            {...(onlyCountriesProp && { onlyCountries: onlyCountriesProp })}
            {...(excludeCountriesProp && { excludeCountries: excludeCountriesProp })}
            preferredCountries={['us', 'in', 'uk']}
            onChange={(value, countryData) => {
              setPhoneNumber(value);
              // Extract country code from countryData object
              const countryCode = (countryData as any)?.countryCode?.toLowerCase() || 
                                 (countryData as any)?.iso2?.toLowerCase() || 
                                 'in';
              setSelectedCountry(countryCode);
              setPhoneError(null); // Clear error when user types
              const formatted = value ? (value.startsWith("+") ? value : `+${value}`) : "";
              setValue("phone", formatted, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              trigger("phone");
            }}
            onBlur={() => {
              // Validate on blur
              if (phoneNumber) {
                try {
                  const phoneNumberWithCountry = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
                  const parsedNumber = parsePhoneNumber(phoneNumberWithCountry, selectedCountry.toUpperCase() as any);
                  
                  if (!parsedNumber || !parsedNumber.isValid()) {
                    setPhoneError("Please enter a valid phone number");
                  } else {
                    setPhoneError(null);
                  }
                } catch (error) {
                  setPhoneError("Please enter a valid phone number");
                }
              } else {
                setPhoneError(null);
              }
            }}
            placeholder="Mobile Number *"
            inputClass={`!w-full !h-11 !bg-gray-800/50 ${errors.phone || phoneError ? '!border-red-500 focus:!border-red-500' : '!border-gray-700'} !text-white !rounded-md !px-4 !py-2`}
            containerClass={cn("phone-input-container", phoneError && "phone-input-error")}
            buttonClass={`!bg-gray-800/50 ${errors.phone || phoneError ? '!border-red-500' : '!border-gray-700'}`}
          />
        </div>
        {(showErrors && errors.phone) || phoneError ? (
          <p className="text-xs text-red-400">{phoneError || (errors.phone?.message as string)}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Password *"
            variant="primary"
            size="xl"
            className={errors.password ? "pr-10 border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}

        { password && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${passwordStrength?.color} transition-all duration-300`}
                  style={{ width: `${passwordStrength?.score || 0}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${passwordStrength?.textColor}`}>
                {passwordStrength?.strength}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1 text-xs">
              {passwordStrength && Object.entries(passwordStrength.checks).map(([check, passed]) => (
                <div key={check} className={`flex items-center gap-1 ${passed ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span className="capitalize">
                    {check === 'length' ? '8+ characters' : 
                    check === 'lowercase' ? 'lowercase' :
                    check === 'uppercase' ? 'uppercase' :
                    check === 'numbers' ? 'numbers' : 'special'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            {...register("confirmPassword", {
              onChange: () => {
                setConfirmPasswordTouched(true);
              }
            })}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password *"
            variant="primary"
            size="xl"
            className={`pr-10 ${errors.confirmPassword || (!passwordsMatch && confirmPasswordTouched && confirmPassword) ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
        )}
        {passwordsMatch && confirmPassword && (
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Passwords match
          </p>  
        )}
        {!passwordsMatch && confirmPasswordTouched && confirmPassword && (
          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <X className="h-3 w-3" />
            Passwords do not match
          </p>
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
              onClick={() => {
                localStorage.clear();
                removeAllCookies();
                navigate('/accounts/signin');
              }}
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

  const recaptchaSiteKey = "6LdJ4SYsAAAAAE6o7fGLD287tW__WDlCqX3Iuf3R";

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

