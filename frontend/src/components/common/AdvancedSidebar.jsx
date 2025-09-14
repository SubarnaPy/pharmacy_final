import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    XMarkIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    Bars3Icon,
    SparklesIcon,
    BellIcon,
    CogIcon,
    ArrowRightOnRectangleIcon,
    UserCircleIcon,
    MoonIcon,
    SunIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';

const AdvancedSidebar = ({
    title,
    items,
    activeSection,
    onSectionChange,
    isOpen,
    onToggle,
    userInfo,
    className = ""
}) => {
    const { isDarkMode, toggleDarkMode } = useContext(DarkModeContext);
    const navigate = useNavigate();
    const [expandedGroups, setExpandedGroups] = useState(new Set(['profile-management']));
    const [mounted, setMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredItems, setFilteredItems] = useState(items);
    const sidebarRef = useRef(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(null);
    const [clickedItem, setClickedItem] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter items based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredItems(items);
            return;
        }

        const filterItems = (items) => {
            return items.filter(item => {
                const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
                
                if (matchesSearch) return true;
                
                if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    if (filteredChildren.length > 0) {
                        return true;
                    }
                }
                
                return false;
            }).map(item => {
                if (item.children) {
                    return {
                        ...item,
                        children: filterItems(item.children)
                    };
                }
                return item;
            });
        };

        setFilteredItems(filterItems(items));
    }, [searchQuery, items]);

    // Mouse tracking for interactive effects
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (sidebarRef.current) {
                const rect = sidebarRef.current.getBoundingClientRect();
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        };

        if (sidebarRef.current) {
            sidebarRef.current.addEventListener('mousemove', handleMouseMove);
            return () => {
                if (sidebarRef.current) {
                    sidebarRef.current.removeEventListener('mousemove', handleMouseMove);
                }
            };
        }
    }, []);

    // Auto-expand parent groups when their children are active
    useEffect(() => {
        if (activeSection && filteredItems) {
            const newExpanded = new Set(expandedGroups);
            let hasChanges = false;
            
            // Find if any item has the active section as a child
            const findParentWithActiveChild = (items) => {
                for (const item of items) {
                    if (item.children) {
                        const hasActiveChild = item.children.some(child => child.key === activeSection);
                        if (hasActiveChild && !newExpanded.has(item.key)) {
                            newExpanded.add(item.key);
                            hasChanges = true;
                        }
                        // Recursively check nested children
                        findParentWithActiveChild(item.children);
                    }
                }
            };
            
            findParentWithActiveChild(filteredItems);
            
            if (hasChanges) {
                setExpandedGroups(newExpanded);
            }
        }
    }, [activeSection, filteredItems]);

    // Debounced navigation handler
    const handleNavigation = (item, hasChildren) => {
        if (isNavigating) return;
        
        setIsNavigating(true);
        
        setTimeout(() => {
            try {
                if (hasChildren) {
                    toggleGroup(item.key);
                } else if (item.route) {
                    navigate(item.route);
                } else {
                    onSectionChange && onSectionChange(item.key);
                }
            } catch (error) {
                console.error('Navigation error:', error);
            } finally {
                setIsNavigating(false);
            }
        }, 50); // Small delay to ensure UI updates
    };

    const toggleGroup = (groupKey) => {
        // Use callback to ensure state is updated correctly
        setExpandedGroups(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(groupKey)) {
                newExpanded.delete(groupKey);
            } else {
                newExpanded.add(groupKey);
            }
            return newExpanded;
        });
    };

    const SidebarItem = ({ item, level = 0 }) => {
        const Icon = item.icon;
        const isActive = activeSection === item.key;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.has(item.key);
        const hasNotification = item.badge && item.badge > 0;
        const isHovered = hoveredItem === item.key;

        return (
            <div 
                className={`${mounted ? 'animate-slideInLeft' : 'opacity-0'} relative group`}
                style={{ animationDelay: `${level * 50}ms` }}
                onMouseEnter={() => {
                    setHoveredItem(item.key);
                    if (isCollapsed) setShowTooltip(item.key);
                }}
                onMouseLeave={() => {
                    setHoveredItem(null);
                    setShowTooltip(null);
                }}
            >
                {/* Hover glow effect */}
                {isHovered && !isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm pointer-events-none" />
                )}
                
                {/* Active indicator */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-600 rounded-r-full shadow-lg shadow-blue-500/50" />
                )}

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Prevent multiple rapid clicks
                        if (clickedItem === item.key || isNavigating) return;
                        
                        setClickedItem(item.key);
                        
                        // Clear clicked state after animation
                        setTimeout(() => {
                            setClickedItem(null);
                        }, 300);
                        
                        // Handle navigation
                        handleNavigation(item, hasChildren);
                    }}
                    className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-300 group/button
                        relative overflow-hidden backdrop-blur-sm
                        ${level > 0 ? 'ml-4 mr-2' : ''}
                        ${clickedItem === item.key || isNavigating ? 'opacity-70 pointer-events-none' : ''}
                        ${isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl shadow-blue-500/40 transform scale-[1.02] border border-blue-400/50'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                        }
                        ${isCollapsed ? 'justify-center px-3' : ''}
                    `}
                >
                    {/* Ripple effect on click */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                        <div className={`
                            absolute inset-0 bg-gradient-to-r from-white/20 to-transparent 
                            transform translate-x-[-100%] group-active/button:translate-x-[100%] 
                            transition-transform duration-500 ease-out
                        `} />
                    </div>

                    <div className={`flex items-center space-x-3 flex-1 ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className={`
                            relative p-2.5 rounded-xl transition-all duration-300 group-hover/button:scale-110
                            ${isActive
                                ? 'bg-white/20 shadow-lg'
                                : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 group-hover/button:from-blue-100 group-hover/button:to-purple-100 dark:group-hover/button:from-blue-900/30 dark:group-hover/button:to-purple-900/30'
                            }
                        `}>
                            {/* Icon glow effect */}
                            {isActive && (
                                <div className="absolute inset-0 bg-white/30 rounded-xl blur-sm" />
                            )}
                            
                            {/* Icon or loading spinner */}
                            {clickedItem === item.key ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Icon className={`
                                    h-5 w-5 relative z-10 transition-all duration-300
                                    ${isActive 
                                        ? 'text-white drop-shadow-lg' 
                                        : 'text-gray-600 dark:text-gray-400 group-hover/button:text-blue-600 dark:group-hover/button:text-blue-400'
                                    }
                                `} />
                            )}
                            
                            {/* Notification indicator */}
                            {hasNotification && (
                                <div className="absolute -top-1 -right-1 flex items-center justify-center">
                                    <span className={`
                                        inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full
                                        ${isActive
                                            ? 'bg-white text-blue-600 shadow-lg'
                                            : 'bg-red-500 text-white shadow-md'
                                        }
                                        animate-pulse
                                    `}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                    <span className="absolute w-3 h-3 bg-red-400 rounded-full animate-ping opacity-75" />
                                </div>
                            )}
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                    <span className={`
                                        font-semibold truncate transition-all duration-300
                                        ${isActive ? 'text-white drop-shadow-sm' : 'group-hover/button:text-blue-600 dark:group-hover/button:text-blue-400'}
                                    `}>
                                        {item.label}
                                    </span>
                                    {item.isNew && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 animate-pulse">
                                            NEW
                                        </span>
                                    )}
                                </div>
                                {item.description && (
                                    <p className={`
                                        text-xs mt-1 truncate transition-colors duration-300
                                        ${isActive
                                            ? 'text-white/80'
                                            : 'text-gray-500 dark:text-gray-500 group-hover/button:text-blue-500 dark:group-hover/button:text-blue-400'
                                        }
                                    `}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {hasChildren && !isCollapsed && (
                        <div className={`
                            p-1.5 rounded-lg transition-all duration-300 transform
                            ${isExpanded ? 'rotate-180' : 'rotate-0'}
                            ${isActive ? 'text-white bg-white/10' : 'text-gray-400 group-hover/button:text-blue-500 group-hover/button:bg-blue-50 dark:group-hover/button:bg-blue-900/30'}
                        `}>
                            <ChevronDownIcon className="h-4 w-4" />
                        </div>
                    )}
                </button>

                {/* Tooltip for collapsed mode */}
                {isCollapsed && showTooltip === item.key && (
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-50 opacity-0 animate-fadeIn">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium shadow-xl border border-gray-700 dark:border-gray-300">
                            {item.label}
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45" />
                        </div>
                    </div>
                )}

                {/* Children */}
                {hasChildren && !isCollapsed && (
                    <div className={`
                        overflow-hidden transition-all duration-500 ease-in-out
                        ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
                    `}>
                        <div className="py-2 space-y-1 pl-2 border-l-2 border-gradient-to-b from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 ml-6 relative">
                            {/* Animated connecting line */}
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-600 transform origin-top scale-y-0 transition-transform duration-500 delay-100 group-hover:scale-y-100" />
                            
                            {item.children.map((child, index) => (
                                <div
                                    key={child.key}
                                    className="animate-slideInLeft"
                                    style={{ animationDelay: `${(level + 1) * 50 + index * 25}ms` }}
                                >
                                    <SidebarItem item={child} level={level + 1} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
                    onClick={onToggle}
                />
            )}

            {/* Interactive background gradient with glassmorphism */}
            <div 
                ref={sidebarRef}
                className={`
                    fixed top-0 left-0 z-40 h-screen flex flex-col
                    ${isCollapsed ? 'w-20' : 'w-80'}
                    bg-gradient-to-br from-white/90 via-blue-50/80 to-purple-50/90 
                    dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-blue-950/80 dark:to-purple-950/90
                    backdrop-blur-2xl border-r border-gradient-to-b from-white/40 to-white/20
                    dark:border-gradient-to-b dark:from-gray-700/40 dark:to-gray-700/20
                    transform transition-all duration-700 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    shadow-2xl shadow-blue-500/10 dark:shadow-purple-900/30
                    ${className}
                    relative overflow-hidden
                    before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-400/5 before:via-purple-400/3 before:to-pink-400/5
                    dark:before:from-blue-600/10 dark:before:via-purple-600/5 dark:before:to-pink-600/10
                    before:animate-pulse before:duration-4000
                `}
                style={{
                    background: `
                        radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, 
                            ${isDarkMode ? 'rgba(147, 197, 253, 0.08)' : 'rgba(147, 197, 253, 0.05)'} 0%, 
                            transparent 60%),
                        linear-gradient(135deg, 
                            ${isDarkMode 
                                ? 'rgba(17, 24, 39, 0.95) 0%, rgba(30, 58, 138, 0.4) 35%, rgba(88, 28, 135, 0.3) 70%, rgba(17, 24, 39, 0.95) 100%'
                                : 'rgba(255, 255, 255, 0.9) 0%, rgba(239, 246, 255, 0.85) 35%, rgba(245, 243, 255, 0.9) 70%, rgba(255, 255, 255, 0.9) 100%'
                            })
                    `,
                    boxShadow: isDarkMode 
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(147, 197, 253, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(147, 197, 253, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
            >
                {/* Enhanced animated background pattern */}
                <div className="absolute inset-0 opacity-40 dark:opacity-25">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-purple-50/40 to-pink-50/60 dark:from-blue-900/30 dark:via-purple-900/15 dark:to-pink-900/25 animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${isDarkMode ? '93C5FD' : '3B82F6'}' fill-opacity='${isDarkMode ? '0.08' : '0.04'}'%3E%3Ccircle cx='40' cy='40' r='1.5'/%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3Ccircle cx='60' cy='20' r='1'/%3E%3Ccircle cx='20' cy='60' r='1'/%3E%3Ccircle cx='60' cy='60' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        animation: 'float 20s ease-in-out infinite'
                    }} />
                    {/* Floating particles */}
                    <div className="absolute inset-0">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={`absolute w-1 h-1 bg-blue-400/30 dark:bg-blue-300/20 rounded-full animate-pulse`}
                                style={{
                                    left: `${20 + (i * 15)}%`,
                                    top: `${10 + (i * 20)}%`,
                                    animationDelay: `${i * 2}s`,
                                    animationDuration: `${4 + i}s`
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Enhanced Header */}
                <div className={`
                    flex items-center justify-between p-6 border-b 
                    border-gradient-to-r from-white/40 via-blue-200/30 to-purple-200/40
                    dark:border-gradient-to-r dark:from-gray-700/50 dark:via-blue-800/30 dark:to-purple-800/40
                    bg-gradient-to-r from-white/80 via-blue-50/70 to-purple-50/80 
                    dark:from-gray-800/80 dark:via-blue-900/40 dark:to-purple-900/50
                    backdrop-blur-lg relative z-10 shadow-lg shadow-blue-500/5 dark:shadow-purple-900/20
                    ${isCollapsed ? 'px-4' : 'px-6'}
                    before:absolute before:inset-0 before:bg-gradient-to-r 
                    before:from-blue-400/5 before:via-purple-400/3 before:to-pink-400/5
                    dark:before:from-blue-600/10 dark:before:via-purple-600/5 dark:before:to-pink-600/10
                `}>
                    {!isCollapsed && (
                        <div className="flex items-center space-x-4">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                                <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
                                    <span className="text-white font-bold text-xl drop-shadow-lg">
                                        {title.charAt(0)}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white dark:border-gray-900 animate-pulse shadow-lg">
                                    <div className="absolute inset-1 bg-white/30 rounded-full" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent flex items-center space-x-2">
                                    <span>{title}</span>
                                    <SparklesIcon className="h-5 w-5 text-yellow-400 animate-pulse drop-shadow-sm" />
                                </h2>
                                {userInfo && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2 mt-1">
                                        <UserCircleIcon className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium">{userInfo}</span>
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center space-x-3">
                        {/* Enhanced Dark mode toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20 border border-white/40 dark:border-gray-700/40 transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:scale-105"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5 text-yellow-500 group-hover:rotate-180 group-hover:text-yellow-400 transition-all duration-500 drop-shadow-sm" />
                            ) : (
                                <MoonIcon className="h-5 w-5 text-gray-700 group-hover:rotate-12 group-hover:text-blue-600 transition-all duration-300 drop-shadow-sm" />
                            )}
                        </button>

                        {/* Enhanced Collapse toggle */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 border border-white/40 dark:border-gray-700/40 transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:scale-105"
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            <Bars3Icon className={`h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 drop-shadow-sm ${isCollapsed ? 'rotate-90' : 'rotate-0'}`} />
                        </button>

                        {/* Enhanced Mobile close button */}
                        <button
                            onClick={onToggle}
                            className="lg:hidden p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 border border-white/40 dark:border-gray-700/40 transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <XMarkIcon className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:rotate-90 group-hover:text-red-600 dark:group-hover:text-red-400 transition-all duration-300 drop-shadow-sm" />
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                {!isCollapsed && (
                    <div className="p-4 border-b border-white/20 dark:border-gray-700/30">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search features..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 pl-10 bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-300"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className={`
                    flex-1 overflow-y-auto p-4 space-y-2 
                    scrollbar-thin scrollbar-thumb-gray-300/50 dark:scrollbar-thumb-gray-600/50 
                    scrollbar-track-transparent hover:scrollbar-thumb-gray-400/50 dark:hover:scrollbar-thumb-gray-500/50
                    min-h-0 relative z-10
                    ${isCollapsed ? 'px-2' : 'px-4'}
                `}>
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <div
                                key={item.key}
                                className="animate-slideInLeft"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <SidebarItem item={item} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-gray-400 dark:text-gray-600 mb-2">
                                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.49.901-6.082 2.379l-.518-.518A8.962 8.962 0 0112 14z" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">No features found</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search</p>
                        </div>
                    )}
                </nav>

                {/* Footer with copyright only */}
                {!isCollapsed && (
                    <div className="p-4 border-t border-white/30 dark:border-gray-700/40 bg-gradient-to-r from-gray-50/70 to-blue-50/70 dark:from-gray-800/70 dark:to-gray-900/70 backdrop-blur-sm relative z-10">
                        <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-1">
                                <SparklesIcon className="h-3 w-3" />
                                <span>Healthcare Platform v2.0</span>
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                © 2025 All rights reserved
                            </p>
                        </div>
                    </div>
                )}


            </div>
        </>
    );
};

export default AdvancedSidebar;