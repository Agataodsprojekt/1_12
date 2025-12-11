import { useTheme } from "../contexts/ThemeContext";

interface ViewerHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Header component for the Viewer page
 * Displays application title and subtitle with theme support
 */
export function ViewerHeader({ 
  title = "IFC Construction Calculator",
  subtitle = "Wizualizacja i analiza konstrukcji budowlanych"
}: ViewerHeaderProps) {
  const { theme } = useTheme();

  return (
    <header 
      className={theme === 'dark' ? 'header-dark' : 'header-light'} 
      style={{
        borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
        padding: '12px 20px',
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        flexShrink: 0,
      }}
    >
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: theme === 'dark' ? '#f9fafb' : '#111827',
        margin: 0,
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: '0.875rem',
        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        margin: '4px 0 0 0',
      }}>
        {subtitle}
      </p>
    </header>
  );
}
