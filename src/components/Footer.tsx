import { Phone, Linkedin, Facebook, Twitter, Rss } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"

function Footer() {
  const currentYear = new Date().getFullYear()
  const [showSalesContact, setShowSalesContact] = useState(false)

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 app-footer">
      <div className="bg-slate-900 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 text-sm">
          {/* Left: Legal link */}
          <div className="flex items-center">
            <a 
              href="https://www.e2enetworks.com/policies/terms-of-service/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Legal
            </a>
          </div>

          {/* Center: Copyright */}
          <div className="flex items-center text-gray-400 text-sm text-center">
            <a 
              href="/" 
              className="text-gray-400 hover:text-white transition-colors"
            >
              © {currentYear} E2E Networks Limited™
            </a>
          </div>

          {/* Center-right: Social media icons */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.linkedin.com/company/e2enetworks"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="https://www.facebook.com/e2enetworks"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com/e2enetworks"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://www.e2enetworks.com/blog/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="RSS Feed"
            >
              <Rss className="w-4 h-4" />
            </a>
          </div>

          {/* Right: Contact Us with tooltip */}
          <div className="relative flex items-center">
            <div 
              className={`absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-md p-3 shadow-lg min-w-[200px] ${
                showSalesContact ? 'block' : 'hidden'
              }`}
            >
              <p className="mb-1 text-right text-sm text-gray-300">
                <strong className="text-white">Sales: </strong>
                <span>+91-11-4084-4965</span>
              </p>
              <p className="mb-1 text-right text-sm text-gray-300">
                <strong className="text-white">Support: </strong>
                <span>+91-11-4117-1818</span>
              </p>
              <p className="mb-0 text-right text-sm text-gray-300">
                <strong className="text-white">Finance: </strong>
                <span>+91-11-4084-4964</span>
              </p>
            </div>
            <button
              onClick={() => setShowSalesContact(!showSalesContact)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Contact Us</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

