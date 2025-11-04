import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="text-9xl font-bold text-cyan-400 mb-6">
            404
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              variant="signup"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="social"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PageNotFound;
