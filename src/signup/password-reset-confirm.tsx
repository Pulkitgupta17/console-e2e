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
import { useNavigate, useSearchParams } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { getCookie } from "@/services/commonMethods"
import { useAppDispatch } from "@/store/store"
import { logout } from "@/store/authSlice"
import { verifyPasswordResetToken, confirmPasswordReset } from "@/services/signupService"

const schema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormFields = z.infer<typeof schema>;

interface PasswordResetConfirmProps {
  className?: string;
}

function PasswordResetConfirm({ className }: PasswordResetConfirmProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormFields>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(schema),
  });

  const [token, setToken] = useState("");
  const [uuid, setUuid] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [successDiv, setSuccessDiv] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [samePreviousPassword, setSamePreviousPassword] = useState(false);

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  // Calculate password strength (same as signup page)
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    if (checks.length) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.numbers) score += 20;
    if (checks.special) score += 20;

    let strength = 'weak';
    let color = 'from-red-500 to-red-600';
    let bgColor = 'bg-red-500/20';
    let textColor = 'text-red-400';

    if (score >= 80) {
      strength = 'strong';
      color = 'from-emerald-500 to-emerald-600';
      bgColor = 'bg-emerald-500/20';
      textColor = 'text-emerald-400';
    } else if (score >= 60) {
      strength = 'good';
      color = 'from-cyan-500 to-cyan-600';
      bgColor = 'bg-cyan-500/20';
      textColor = 'text-cyan-400';
    } else if (score >= 40) {
      strength = 'fair';
      color = 'from-yellow-500 to-yellow-600';
      bgColor = 'bg-yellow-500/20';
      textColor = 'text-yellow-400';
    }

    return { score, strength, color, bgColor, textColor, checks };
  };

  const passwordStrength = calculatePasswordStrength(password || "");
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Extract token and verify on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    
    if (!tokenParam) {
      toast.error("Invalid reset link");
      navigate('/accounts/signin');
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams, navigate]);

  // Logout if user is logged in
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = getCookie('token');
      const apikey = getCookie('apikey');

      if (token && apikey) {
        // User is logged in, logout first
        dispatch(logout());
        localStorage.removeItem('logininprogress');
      }
    };

    checkLoggedIn();
  }, [dispatch]);

  const verifyToken = async (tokenParam: string) => {
    try {
      const response = await verifyPasswordResetToken(tokenParam);
      
      setTokenValid(true);
      setIsLoading(false);
      // Extract UUID if provided in response
      if (response?.uid) {
        setUuid(response.uid);
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      
      const errorMsg = error?.response?.data?.errors?.non_field_errors?.[0];
      
      if (errorMsg?.toLowerCase().includes('expired')) {
        setTokenExpired(true);
      }
      
      setTokenValid(false);
      setIsLoading(false);
      toast.error(errorMsg || "Invalid or expired reset link");
    }
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setBtnLoading(true);
    setSamePreviousPassword(false);

    try {
      const response = await confirmPasswordReset({
        uid: uuid || "",
        token: token,
        new_password1: data.password,
        new_password2: data.confirmPassword,
      }, token);

      if (response.code === 200) {
        setSuccessDiv(true);
        toast.success("Password has been reset successfully!");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/accounts/signin');
        }, 3000);
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      const errorData = error?.response?.data;
      
      if (errorData?.token?.[0] === "Invalid value") {
        setTokenValid(false);
        toast.error("Invalid token. Please request a new password reset link.");
      } else if (errorData?.errors === "Password you entered already in use. Please enter new password") {
        setSamePreviousPassword(true);
        toast.error("This password was previously used. Please choose a different password.");
      } else if (errorData?.errors?.non_field_errors?.[0]) {
        toast.error(errorData.errors.non_field_errors[0]);
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } finally {
      setBtnLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("w-full max-w-md mx-auto flex items-center justify-center min-h-[400px]", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid/Expired token state
  if (!tokenValid) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {tokenExpired ? "Link Expired" : "Invalid Link"}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {tokenExpired 
                ? "This password reset link has expired. Password reset links are valid for 24 hours."
                : "This password reset link is invalid. The link may have already been used or is malformed."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="signup" 
              size="xl"
              className="w-full"
              onClick={() => navigate('/accounts/password/reset')}
            >
              Request New Reset Link
            </Button>
            
            <p className="text-center text-gray-400 text-sm mt-6">
              <button
                type="button"
                onClick={() => navigate('/accounts/signin')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Back to Sign In
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (successDiv) {
    return (
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Password Reset Successful!
            </CardTitle>
            <CardDescription className="text-gray-300">
              Your password has been reset successfully. You can now login with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="signup" 
              size="xl"
              className="w-full"
              onClick={() => navigate('/accounts/signin')}
            >
              Go to Sign In
            </Button>
            
            <p className="text-center text-gray-400 text-sm mt-4">
              Redirecting in 3 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Reset your password
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter a new password for your E2E Networks account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    variant="primary"
                    size="xl"
                    className={`pr-10 ${errors.password || samePreviousPassword ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : ""}`}
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
                </div>
                
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}
                
                {samePreviousPassword && (
                  <p className="text-red-400 text-xs mt-1">This password was previously used. Please choose a different password.</p>
                )}

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.textColor}`}>
                        {passwordStrength.strength}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(passwordStrength.checks).map(([check, passed]) => (
                        <div key={check} className={`flex items-center gap-1 ${passed ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span className="capitalize">
                            {check === 'length' ? '8+ chars' : 
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

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <div className="relative">
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
                </div>
                
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
                
                {passwordsMatch && (
                  <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Passwords match
                  </p>  
                )}
                {!passwordsMatch && (
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
                disabled={btnLoading || isSubmitting || !passwordsMatch}
                className="w-full"
              >
                {btnLoading ? "Resetting Password..." : "Reset Password"}
              </Button>

              <p className="text-center text-gray-400 text-sm mt-6">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => navigate('/accounts/signin')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PasswordResetConfirm;

