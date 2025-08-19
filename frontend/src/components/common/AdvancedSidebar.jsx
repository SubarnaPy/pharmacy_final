import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    XMarkIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    Bars3Icon
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
    const { isDarkMode } = useContext(DarkModeContext);
    const navigate = useNavigate();
    const [expandedGroups, setExpandedGroups] = useState(new Set(['profile-management']));
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-expand parent groups when their children are active
    useEffect(() => {
        if (activeSection && items) {
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
            
            findParentWithActiveChild(items);
            
            if (hasChanges) {
                setExpandedGroups(newExpanded);
            }
        }
    }, [activeSection, items]);

    const toggleGroup = (groupKey) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey);
        } else {
            newExpanded.add(groupKey);
        }
        setExpandedGroups(newExpanded);
    };

    const SidebarItem = ({ item, level = 0 }) => {
        const Icon = item.icon;
        const isActive = activeSection === item.key;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.has(item.key);
        const hasNotification = item.badge && item.badge > 0;

        return (
            <div className={`${mounted ? 'animate-slideInLeft' : 'opacity-0'}`}
                style={{ animationDelay: `${level * 50}ms` }}>
                <button
                    onClick={() => {
                        if (hasChildren) {
                            toggleGroup(item.key);
                        } else if (item.route) {
                            // Navigate to external route
                            navigate(item.route);
                        } else {
                            onSectionChange(item.key);
                        }
                    }}
                    className={`
            w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-300 group
            ${level > 0 ? 'ml-4 mr-2' : ''}
            ${isActive
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 transform scale-[1.02]'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'
                        }
          `}
                >
                    <div className="flex items-center space-x-3 flex-1">
                        <div className={`
              p-2 rounded-lg transition-all duration-300 group-hover:scale-110
              ${isActive
                                ? 'bg-white/20'
                                : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                            }
            `}>
                            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <span className={`font-medium truncate ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                </span>
                                {hasNotification && (
                                    <div className="relative">
                                        <span className={`
                      inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full animate-pulse
                      ${isActive
                                                ? 'bg-white text-blue-600'
                                                : 'bg-red-500 text-white'
                                            }
                    `}>
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                        {item.badge > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className={`
                text-xs mt-1 truncate transition-colors
                ${isActive
                                    ? 'text-white/80'
                                    : 'text-gray-500 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400'
                                }
              `}>
                                {item.description}
                            </p>
                        </div>
                    </div>

                    {hasChildren && (
                        <div className={`
              p-1 rounded transition-transform duration-300
              ${isExpanded ? 'rotate-180' : 'rotate-0'}
              ${isActive ? 'text-white' : 'text-gray-400'}
            `}>
                            <ChevronDownIcon className="h-4 w-4" />
                        </div>
                    )}
                </button>

                {/* Children */}
                {hasChildren && (
                    <div className={`
            overflow-y-auto overflow-hidden transition-all duration-300 ease-in-out
            ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
                        <div className="py-2 space-y-1">
                            {item.children.map((child) => (
                                <SidebarItem key={child.key} item={child} level={level + 1} />
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
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div className={`
        fixed top-0 left-0 z-50 h-screen w-80 flex flex-col
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
        border-r border-white/20 dark:border-gray-700/30
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${className}
      `}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                                {title.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {title}
                            </h2>
                            {userInfo && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {userInfo}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onToggle}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-0 scroll-container">
                    {items.map((item) => (
                        <SidebarItem key={item.key} item={item} />
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Healthcare Platform v2.0
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            © 2025 All rights reserved
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdvancedSidebar;