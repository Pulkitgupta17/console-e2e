import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { navigateWithQueryParams, removeAllCookies } from "@/services/commonMethods"

interface SSOOrganizationFormProps {
  onSubmit: (organizationId: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

function SSOOrganizationForm({
  className,
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: SSOOrganizationFormProps) {
  const [organizationId, setOrganizationId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setOrganizationId("");
    setLocalError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!organizationId.trim()) {
      setLocalError("Organization ID is required");
      return;
    }

    await onSubmit(organizationId.trim());
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={handleBack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <CardTitle className="text-xl font-bold text-white">
              Sign in with SSO
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {(error || localError) && (
                <div className="text-red-400 text-sm text-center">
                  {error || localError}
                </div>
              )}
              
              <div className="space-y-2">
                <Input
                  id="organizationId"
                  type="text"
                  placeholder="Organization ID"
                  variant="primary"
                  size="xl"
                  required
                  value={organizationId}
                  onChange={(e) => {
                    setOrganizationId(e.target.value);
                    setLocalError(null);
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                type="submit" 
                variant="signup" 
                size="xl"
                disabled={isLoading || !organizationId.trim()}
                className="w-full"
              >
                {isLoading ? "Loading..." : "Sign in with SSO"}
              </Button>
            </div>
            
            <p className="text-center text-gray-400 text-sm mt-8 mb-2">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => 
                  {
                    localStorage.clear();
                    removeAllCookies();
                    navigate(navigateWithQueryParams('/accounts/signup'));
                  }}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Sign up
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SSOOrganizationForm;

