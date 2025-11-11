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
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

interface ChangeContactInformationProps extends React.ComponentProps<"div"> {
  onBack?: () => void
}

function ChangeContactInformation({
  className,
  onBack,
  ...props
}: ChangeContactInformationProps) {
  const [phoneNumber, setPhoneNumber] = useState('9876543211')
  const [email, setEmail] = useState('q@gamil.com')

  const handleBack = () => {
    if (onBack) {
      onBack()
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)} {...props}>
      <Card className="border-gray-800/50 backdrop-blur-sm form-fade-in" style={{ backgroundColor: 'var(--signup-card-bg)' }}>
        <CardHeader className="text-left space-y-2">
          <div className="mb-2">
            <button
              type="button"
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors mb-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <CardTitle className="text-2xl font-bold text-white">
              Change Contact Information
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Update your phone number or email address to receive new verification codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6 mt-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Phone Number</label>
                <PhoneInput
                  country={'in'}
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="Mobile No."
                />
                <p className="text-xs text-gray-400 mt-1">Current: +91 9876543211</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email Address</label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="primary"
                  size="xl"
                />
                <p className="text-xs text-gray-400 mt-1">Current: q@gamil.com</p>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-md p-4">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="mt-1 w-4 h-4 text-cyan-600 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2 pointer-events-none"
                />
                <p className="text-sm text-gray-300">
                  New verification codes will be sent to any contact information you change.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                variant="ghost" 
                size="xl"
                type="button"
                onClick={handleBack}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="signup" 
                size="xl"
                type="submit"
                className="flex-1"
              >
                Update & Send Code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangeContactInformation
