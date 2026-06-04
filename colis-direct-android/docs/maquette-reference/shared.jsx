// Shared design tokens + atoms for ColisDirect mockups.
// Exports to window: CD (tokens), CDLogo, CDIcon, ImgSlot

const CD = {
  // Brand
  orange: '#FF6C00',
  orangeHover: '#E66100',
  orangeSoft: '#FFF3E8',
  orangeDeep: '#C24F00',
  // Neutrals
  ink: '#1A1A1A',
  ink2: '#3A3A3A',
  muted: '#6B7280',
  line: '#E6E6E6',
  bg: '#FFFFFF',
  bgSoft: '#F6F7F9',
  // Status
  green: '#16A34A',
  greenSoft: '#E6F6EC',
  red: '#DC2626',
  blue: '#2563EB',
  // Font stack
  font: '"Inter", "SF Pro Text", -apple-system, system-ui, sans-serif',
  fontDisplay: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
};

function CDLogo({ size = 28, color = CD.orange, light = false }) {
  // Use the actual project logo (cropped from the brand asset).
  const s = size * 1.55;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.36 }}>
      <img
        src="assets/logo-icon.png"
        alt="ColisDirect"
        style={{ width: s, height: s, display: 'block', borderRadius: s * 0.18, flexShrink: 0 }}
      />
      <span style={{
        fontFamily: CD.fontDisplay,
        fontWeight: 900, letterSpacing: -0.2,
        fontSize: size * 0.9,
        color: light ? '#fff' : CD.ink,
      }}>COLISDIRECT</span>
    </div>
  );
}

// Single small icon factory — pick by name, get a stroked lucide-style SVG.
function CDIcon({ name, size = 20, color = 'currentColor', stroke = 1.8 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return (<svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>);
    case 'package': return (<svg {...common}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>);
    case 'pin': return (<svg {...common}><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>);
    case 'user': return (<svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>);
    case 'truck': return (<svg {...common}><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>);
    case 'search': return (<svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>);
    case 'shield': return (<svg {...common}><path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>);
    case 'check': return (<svg {...common}><path d="m5 12 5 5L20 7"/></svg>);
    case 'check-circle': return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>);
    case 'clipboard': return (<svg {...common}><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/></svg>);
    case 'calendar': return (<svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>);
    case 'box': return (<svg {...common}><path d="m3 8 9-5 9 5v8l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>);
    case 'eye': return (<svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>);
    case 'phone': return (<svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z"/></svg>);
    case 'clock': return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'chev-down': return (<svg {...common}><path d="m6 9 6 6 6-6"/></svg>);
    case 'chev-right': return (<svg {...common}><path d="m9 6 6 6-6 6"/></svg>);
    case 'chev-left': return (<svg {...common}><path d="m15 6-6 6 6 6"/></svg>);
    case 'plus': return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case 'minus': return (<svg {...common}><path d="M5 12h14"/></svg>);
    case 'settings': return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.6-2-3.5-2.4 1a7 7 0 0 0-2.2-1.3L13.8 3h-3.6l-.5 2.3a7 7 0 0 0-2.2 1.3l-2.4-1-2 3.5 2 1.6A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.5 2.4-1a7 7 0 0 0 2.2 1.3l.5 2.3h3.6l.5-2.3a7 7 0 0 0 2.2-1.3l2.4 1 2-3.5-2-1.6c.1-.4.1-.9.1-1.3Z"/></svg>);
    case 'bell': return (<svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>);
    case 'wallet': return (<svg {...common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 13h3"/><path d="M3 9V6l13-3v3"/></svg>);
    case 'map': return (<svg {...common}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>);
    case 'mail': return (<svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>);
    case 'logout': return (<svg {...common}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="m10 17-5-5 5-5"/><path d="M5 12h11"/></svg>);
    case 'menu': return (<svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>);
    case 'refresh': return (<svg {...common}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>);
    case 'star': return (<svg {...common}><path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 3 1-6.3L3 9.6l6.3-.9L12 3Z"/></svg>);
    case 'qr': return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/></svg>);
    case 'support': return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8.5 9a3.5 3.5 0 1 1 5.6 2.8c-.7.5-1.6 1-1.6 2.2"/><circle cx="12" cy="17" r=".5"/></svg>);
    case 'card': return (<svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>);
    case 'history': return (<svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/></svg>);
    case 'send': return (<svg {...common}><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7Z"/></svg>);
    case 'zap': return (<svg {...common}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>);
    case 'briefcase': return (<svg {...common}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>);
    case 'globe': return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

// Image placeholder with diagonal stripes + caption (mono explainer).
function ImgSlot({ label, height = 200, radius = 12, tone = 'orange', style = {} }) {
  const stripe = tone === 'orange' ? 'rgba(255,108,0,0.10)' : 'rgba(0,0,0,0.05)';
  const bg = tone === 'orange' ? '#FFF6EE' : '#F2F3F5';
  const text = tone === 'orange' ? CD.orangeDeep : '#666';
  return (
    <div style={{
      height, borderRadius: radius,
      background: `repeating-linear-gradient(45deg, ${stripe} 0 12px, transparent 12px 24px), ${bg}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
        fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase',
        color: text, opacity: 0.85,
      }}>{label}</span>
    </div>
  );
}

Object.assign(window, { CD, CDLogo, CDIcon, ImgSlot });
