import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  HomeIcon, 
  UserIcon, 
  BellIcon, 
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { logout } from '../../features/auth/authSlice';
import { DarkModeContext } from '../../app/DarkModeContext';
import NotificationBell from '../notifications/NotificationBell';

function NavBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { isDarkMode, toggleDarkMode } = useContext(DarkModeContext);
  useEffect(() => {
    console.log('Dark mode:', isDarkMode, 'HTML class:', document.documentElement.className);
  }, [isDarkMode]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [scrolled, setScrolled] = useState(false);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActivePath = (path) => location.pathname === path;

  const NavLink = ({ to, children, icon: Icon, mobile = false }) => (
    <Link
      to={to}
      className={`
        ${mobile ? 'flex items-center space-x-3 px-4 py-3 rounded-2xl text-base' : 'flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-sm'}
        font-semibold transition-all duration-300 group relative overflow-hidden
        ${isActivePath(to) 
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-lg hover:shadow-xl transform scale-105' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700/70 hover:text-emerald-600 dark:hover:text-emerald-400 backdrop-blur-sm'
        }
      `}
    >
      <Icon className={`${mobile ? 'h-6 w-6' : 'h-5 w-5'} ${isActivePath(to) ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'} transition-all duration-300`} />
      <span>{children}</span>
      {!isActivePath(to) && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      )}
    </Link>
  );

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-500
        ${scrolled 
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl dark:shadow-2xl border-b border-gray-200/30 dark:border-gray-700/30' 
          : 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-lg dark:shadow-xl'
        }
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 dark:from-emerald-600 dark:via-teal-700 dark:to-cyan-700 rounded-3xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110 border border-white/20 dark:border-gray-700/50">
                  <HeartIcon className="h-6 w-6 text-white drop-shadow-sm" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse shadow-lg"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  PharmaConnect
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 font-medium">Healthcare Platform</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              <NavLink to="/" icon={HomeIcon}>Home</NavLink>
              <NavLink to="/medicines" icon={HeartIcon}>Medicine Search</NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" icon={ChartBarIcon}>Dashboard</NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/profile" icon={UserIcon}>Profile</NavLink>
              )}
              <NavLink to="/settings" icon={Cog6ToothIcon}>Settings</NavLink>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              {isAuthenticated && (
                <NotificationBell />
              )}

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-3 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700/70 rounded-2xl transition-all duration-300 group backdrop-blur-sm"
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                {isDarkMode ? (
                  <SunIcon className="h-6 w-6 group-hover:rotate-180 group-hover:scale-110 transition-all duration-300" />
                ) : (
                  <MoonIcon className="h-6 w-6 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                )}
                <span className="sr-only">Current mode: {isDarkMode ? 'Dark' : 'Light'}</span>
              </button>

              {/* User Profile Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-gray-700/70 transition-all duration-300 group backdrop-blur-sm"
                  >
                    <div className="w-9 h-9 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 border-2 border-white/50 dark:border-gray-700/50">
                      <span className="text-white text-sm font-bold">
                        {user?.profile?.firstName?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user?.profile?.firstName} {user?.profile?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">
                        {user?.role}
                      </p>
                    </div>
                    <ChevronDownIcon className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-all duration-300 ${profileMenuOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-gray-800/95 rounded-3xl shadow-2xl dark:shadow-3xl border border-gray-200/50 dark:border-gray-700/50 py-3 animate-slide-down backdrop-blur-xl">
                      <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user?.profile?.firstName} {user?.profile?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                      
                      <Link to="/profile" className="flex items-center space-x-3 px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700/70 transition-all duration-200 group">
                        <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        <span className="font-medium">View Profile</span>
                      </Link>
                      
                      <Link to="/settings" className="flex items-center space-x-3 px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700/70 transition-all duration-200 group">
                        <Cog6ToothIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                        <span className="font-medium">Settings</span>
                      </Link>
                      
                      <div className="border-t border-gray-200/50 dark:border-gray-700/50 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-6 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 group"
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 rounded-2xl hover:bg-emerald-50 dark:hover:bg-gray-700/70 backdrop-blur-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-700 dark:hover:to-teal-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-3 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700/70 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 dark:bg-gray-900/95 border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl dark:shadow-3xl animate-slide-down backdrop-blur-xl">
            <div className="px-6 py-6 space-y-3">
              <NavLink to="/" icon={HomeIcon} mobile>Home</NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" icon={ChartBarIcon} mobile>Dashboard</NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/profile" icon={UserIcon} mobile>Profile</NavLink>
              )}
              <NavLink to="/settings" icon={Cog6ToothIcon} mobile>Settings</NavLink>
              
              {!isAuthenticated && (
                <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-full px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 border-2 border-gray-300/50 dark:border-gray-600/50 rounded-2xl hover:bg-emerald-50 dark:hover:bg-gray-700/70 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 backdrop-blur-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center w-full px-6 py-4 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 dark:hover:from-emerald-700 dark:hover:to-teal-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16"></div>
    </>
  );
}

export default NavBar;
