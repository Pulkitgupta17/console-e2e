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
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { login } from "@/services/loginService"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

const schema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});
type FormFields = z.infer<typeof schema>;

function Signin({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { register, handleSubmit, watch, formState: {isSubmitting, isValid} } = useForm<FormFields>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(schema),
  });
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleForgotPassword = () => {
    if (!watch("email").trim()) {
      toast.error("Please enter your email address first");
      return;
    }
    toast.success("Password reset link sent to your email!");
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    debugger
    if (!executeRecaptcha) {
      toast.error("Unable to execute reCAPTCHA. Please reload the page.");
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha("login");
      
      const response = await login(data.email, data.password, recaptchaToken, "v3");
      
      if (response.code === 200) {
        toast.success("Login successful!");
        console.log('Login successful:', response);
      } else {
        toast.error(response.message || "Login failed");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.response?.data?.[0] ||
                          "Login failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className={cn("w-full min-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome back
          </CardTitle>
          <CardDescription className="text-gray-400">
            Sign in to your E2E Networks account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 mt-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 input-glow focus:border-cyan-500 h-14"
                  required
                  {...register("email")}
                />
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 input-glow focus:border-cyan-500 pr-10 h-14"
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
              </div>
              
              <div className="flex items-center justify-between mt-6 mb-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >Forgot password?</button>
              </div>
              
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  variant="signup" 
                  size="xl"
                  disabled={isSubmitting || !isValid || !executeRecaptcha}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </div>
              
              <div className="relative mt-10 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-900 px-2 text-gray-500">OR</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button 
                  variant="social" 
                  type="button"
                  size="xl"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Button>
              </div>
              
              <p className="text-center text-gray-400 text-sm mt-8 mb-2">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate('/accounts/signup')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ReCaptcha Provider Wrapper
const SigninWithRecaptcha = (props: React.ComponentProps<"div">) => {
  const siteKey = "6LeJ7_4jAAAAAKqjyjQ2jEC4yJenDE6R8KyTu9Mt";
  
  if (!siteKey) {
    console.error("VITE_RECAPTCHA_V3_SITE_KEY is not set");
    return (
      <div className="text-red-400 text-center p-4">
        reCAPTCHA configuration error. Please contact support.
      </div>
    );
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <Signin {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default SigninWithRecaptcha