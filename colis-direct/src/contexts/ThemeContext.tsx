import { createContext, useContext, useState, ReactNode } from 'react';

type ThemeType = 'standard' | 'pro';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
  primaryColor: string;
  primaryHover: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('colisdirect-theme');
    return (saved as ThemeType) || 'standard';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('colisdirect-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'standard' ? 'pro' : 'standard');
  };

  const primaryColor = theme === 'pro' ? '#16a34a' : '#FF6C00';
  const primaryHover = theme === 'pro' ? '#15803d' : '#e66100';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, primaryColor, primaryHover }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
