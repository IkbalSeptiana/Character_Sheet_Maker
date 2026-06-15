import { Link, useLocation } from 'react-router-dom';

export default function NavBar() {
  const location = useLocation();

  const navStyle = { display: 'flex', justifyContent: 'center', gap: '8px', background: '#0f1012', padding: '12px', borderBottom: '1px solid #1e2024' };
  
  const linkStyle = (path) => ({
    padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: '600',
    background: location.pathname === path ? '#c09050' : '#141618',
    color: location.pathname === path ? '#07080a' : '#b0a898',
    transition: 'all 0.2s ease'
  });

  return (
    <nav style={navStyle}>
      <Link to="/" style={linkStyle('/')}>👤 Character Reference</Link>
      <Link to="/photo-prompt" style={linkStyle('/photo-prompt')}>◈ Photo Prompt Builder</Link>
    </nav>
  );
}