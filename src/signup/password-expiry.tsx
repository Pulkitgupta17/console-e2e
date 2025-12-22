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
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { getCookie, removeCookie, calculatePasswordStrength } from "@/services/commonMethods"
import { useAppSelector } from "@/store/store"
import { changeExpiredPassword, logoutAPI } from "@/services/signupService"
import { MYACCOUNT_URL } from "@/constants/global.constants"

// Password validation: 8-30 chars, mixed case, digits (matching Angular regex)
const passwordRegex = /^(?=\D*\d)(?=[^a-z]*[a-z])(?=[^A-Z]*[A-Z]).{8,30}$/;

const schema = z.object({
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(30, { message: "Password must be at most 30 characters long" })
    .regex(passwordRegex, { 
      message: "Password must contain uppercase, lowercase, and numbers" 
    }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormFields = z.infer<typeof schema>;

interface PasswordExpiryProps {
  className?: string;
}

function PasswordExpiry({ className }: PasswordExpiryProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormFields>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(schema),
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUsed, setPasswordUsed] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    const passwordExpired = localStorage.getItem('password_expired');

    const timer = setTimeout(() => {
      if (passwordExpired !== 'true') {
        if (!isAuthenticated) {
          navigate('/accounts/signin');
        } else {
          window.location.href = MYACCOUNT_URL;
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  const passwordStrength = password ? calculatePasswordStrength(password, {
    minLength: 8,
    maxLength: 30,
    requireSpecialChars: false,
  }) : null;

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    setPasswordUsed(false);
    setBtnDisabled(true);
    setIsLoading(true);

    try {
      await changeExpiredPassword({
        new_password1: data.password,
        new_password2: data.confirmPassword,
      });

      toast.success("Your Password has been changed Successfully!");

      // Wait 3 seconds before logout and redirect
      setTimeout(async () => {
        setIsLoading(false);

        // Logout from API (using session ID from cookie)
        try {
          const sessionId = getCookie('yyy_xxx');
          if (sessionId) {
            await logoutAPI(sessionId);
          }
        } catch (error) {
          console.error("Logout API error:", error);
        }

        // Clear password expired flag
        localStorage.setItem('password_expired', 'false');
        
        // Clear auth tokens and user data manually (don't call logout() as it redirects)
        removeCookie('token');
        removeCookie('apikey');
        removeCookie('user');
        localStorage.removeItem('currentUser');
        
        // Redirect to login
        navigate('/accounts/signin');
      }, 3000);
    } catch (error: any) {
      setIsLoading(false);
      setBtnDisabled(false);

      if (error?.response?.data?.errors === 'password already used') {
        setPasswordUsed(true);
        setBtnDisabled(true);
        
        // Re-enable button after 4 seconds
        setTimeout(() => {
          setBtnDisabled(false);
          setIsLoading(false);
        }, 4000);
      } else {
        const errorMessage = error?.response?.data?.errors || error?.response?.data?.message || "Failed to change password. Please try again.";
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Change Your Password
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your password has expired. Please create a new password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(onSubmit)}>
            {/* Password Field */}
            <div className="space-y-2 relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                variant="primary"
                size="xl"
                className={`pr-10 ${errors.password || passwordUsed ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}`}
                required
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}

              {passwordUsed && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Password already used. Please choose a different password.
                </p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {password && (
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
                         'numbers'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="space-y-2 relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                variant="primary"
                size="xl"
                className={`pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}`}
                required
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors.confirmPassword.message}
                </p>
              )}
              
              {passwordsMatch && confirmPassword && (
                <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
              
              {!passwordsMatch && password && confirmPassword && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <X className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-4">
              <Button
                type="submit"
                variant="signup"
                size="xl"
                disabled={isLoading || isSubmitting || btnDisabled || !passwordsMatch}
                className="w-full"
              >
                {isLoading ? "Changing Password..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PasswordExpiry

