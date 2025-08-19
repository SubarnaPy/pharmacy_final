import React, { createContext, useState, useEffect } from 'react';

export const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Always default to light mode unless user has toggled
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? JSON.parse(savedMode) : false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      document.documentElement.classList.toggle('dark', !prev);
      localStorage.setItem('darkMode', JSON.stringify(!prev));
      return !prev;
    });
  };

  // Set initial dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
