import { useAppSelector, useAppDispatch } from "@/store/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logout } from "@/store/authSlice";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);


  const displayName = user?.first_name || user?.username || user?.email?.split('@')[0] || 'User';
  const fullName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : displayName;

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end mb-6">
          <Button
            variant="social"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div>
        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white">
              Hi, {displayName}! 👋
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xl text-gray-300">
                Welcome to the E2E Networks Console Dashboard
              </p>
              
              {user && (
                <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-3">Your Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {user.first_name && (
                      <div>
                        <span className="text-gray-400">Name:</span>{" "}
                        <span className="text-white">{fullName}</span>
                      </div>
                    )}
                    {user.email && (
                      <div>
                        <span className="text-gray-400">Email:</span>{" "}
                        <span className="text-white">{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div>
                        <span className="text-gray-400">Phone:</span>{" "}
                        <span className="text-white">{user.phone}</span>
                      </div>
                    )}
                    {user.location && (
                      <div>
                        <span className="text-gray-400">Location:</span>{" "}
                        <span className="text-white">{user.location}</span>
                      </div>
                    )}
                    {user.projectId && (
                      <div>
                        <span className="text-gray-400">Project ID:</span>{" "}
                        <span className="text-white">{user.projectId}</span>
                      </div>
                    )}
                    {user.crn && (
                      <div>
                        <span className="text-gray-400">CRN:</span>{" "}
                        <span className="text-white">{user.crn}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-8">
                <p className="text-gray-400">
                  Your cloud infrastructure management tools are ready to use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

