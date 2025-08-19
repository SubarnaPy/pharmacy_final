import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';

function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDarkMode } = useContext(DarkModeContext);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubscribed(true);
    setEmail('');
    setIsSubmitting(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SocialIcon = ({ href, label, hoverColor, children }) => (
    <a
      href={href}
      aria-label={label}
      className={`group p-3 rounded-2xl bg-white/10 dark:bg-gray-800/70 backdrop-blur-sm hover:bg-emerald-500 dark:hover:bg-emerald-600 text-gray-600 dark:text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:shadow-xl shadow-md border border-white/20 dark:border-gray-700/30`}
    >
      {children}
    </a>
  );

  const FooterLink = ({ to, children, external = false }) => {
    const className = "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300 text-sm hover:underline font-medium";
    
    if (external) {
      return (
        <a href={to} className={className} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <footer className="relative bg-gradient-to-br from-gray-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-emerald-900 dark:to-teal-900 text-gray-900 dark:text-white overflow-hidden border-t border-gray-200 dark:border-gray-700">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/20 to-teal-200/20 dark:from-emerald-600/10 dark:to-teal-600/10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_40%,rgba(16,185,129,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_60%,rgba(20,184,166,0.1)_0%,transparent_50%)]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <HeartIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  PharmaConnect
                </span>
              </div>
              
              <p className="text-gray-400 mb-6 leading-relaxed">
                Revolutionizing healthcare with secure, intelligent prescription management 
                and seamless pharmacy connections for better patient outcomes.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                  <span>HIPAA Compliant & Secure</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <ClockIcon className="h-4 w-4 text-teal-400" />
                  <span>24/7 Support Available</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <GlobeAltIcon className="h-4 w-4 text-purple-400" />
                  <span>50+ Partner Pharmacies</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
              <div className="space-y-3">
                <FooterLink to="/about">About Us</FooterLink>
                <FooterLink to="/services">Our Services</FooterLink>
                <FooterLink to="/pharmacy">Find Pharmacy</FooterLink>
                <FooterLink to="/consultation">Consultations</FooterLink>
                <FooterLink to="/blog">Health Blog</FooterLink>
                <FooterLink to="/careers">Careers</FooterLink>
                <FooterLink to="/contact">Contact</FooterLink>
              </div>
            </div>

            {/* Support & Legal */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Support</h3>
              <div className="space-y-3">
                <FooterLink to="/help">Help Center</FooterLink>
                <FooterLink to="/faq">FAQ</FooterLink>
                <FooterLink to="/privacy">Privacy Policy</FooterLink>
                <FooterLink to="/terms">Terms of Service</FooterLink>
                <FooterLink to="/security">Security</FooterLink>
                <FooterLink to="/accessibility">Accessibility</FooterLink>
                <FooterLink to="/sitemap">Sitemap</FooterLink>
              </div>
            </div>

            {/* Newsletter & Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white">Stay Connected</h3>
              
              {/* Newsletter Signup */}
              <div className="mb-6">
                {!isSubscribed ? (
                  <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 bg-gray-800/70 backdrop-blur-sm border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-lg"
                        required
                      />
                      <EnvelopeIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <span>Subscribe</span>
                          <ArrowUpIcon className="h-4 w-4 rotate-45" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 text-center backdrop-blur-sm shadow-lg">
                    <CheckCircleIcon className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-medium">Thank you for subscribing!</p>
                    <p className="text-emerald-300 text-sm">Stay tuned for health updates</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Get health tips, updates, and exclusive offers delivered to your inbox.
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-400">support@pharmaconnect.com</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <PhoneIcon className="h-4 w-4 text-teal-400" />
                  <span className="text-gray-400">1-800-PHARMA-1</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-400">Live Chat Available</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <MapPinIcon className="h-4 w-4 text-teal-400" />
                  <span className="text-gray-400">San Francisco, CA</span>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-300">Follow Us</h4>
                <div className="flex space-x-3">
                  <SocialIcon
                    href="https://facebook.com/pharmaconnect"
                    label="Facebook"
                    hoverColor="bg-emerald-600"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </SocialIcon>
                  <SocialIcon
                    href="https://twitter.com/pharmaconnect"
                    label="Twitter"
                    hoverColor="bg-teal-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </SocialIcon>
                  <SocialIcon
                    href="https://instagram.com/pharmaconnect"
                    label="Instagram"
                    hoverColor="bg-emerald-500"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-2.297 0-4.163-1.865-4.163-4.163S6.152 8.662 8.449 8.662s4.163 1.865 4.163 4.163-1.865 4.163-4.163 4.163zm7.718 0c-2.297 0-4.163-1.865-4.163-4.163s1.866-4.163 4.163-4.163 4.163 1.865 4.163 4.163-1.866 4.163-4.163 4.163z"/>
                    </svg>
                  </SocialIcon>
                  <SocialIcon
                    href="https://linkedin.com/company/pharmaconnect"
                    label="LinkedIn"
                    hoverColor="bg-teal-600"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </SocialIcon>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} PharmaConnect. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Made with</span>
                <HeartIcon className="h-3 w-3 text-red-400" />
                <span>for better healthcare</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>System Status: Operational</span>
              </div>
              
              <button
                onClick={scrollToTop}
                className="p-2 bg-gray-800/70 backdrop-blur-sm hover:bg-emerald-600 rounded-xl transition-colors duration-200 group shadow-md"
                aria-label="Scroll to top"
              >
                <ArrowUpIcon className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
