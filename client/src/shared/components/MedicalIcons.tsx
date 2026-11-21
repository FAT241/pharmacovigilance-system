import React from 'react'

/** Logo huy hiệu bệnh viện hiện đại */
export const HospitalCrest: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <rect width="48" height="48" rx="12" fill="url(#crest_grad)" />
    <path
      d="M24 10C16.268 10 10 16.268 10 24C10 31.732 16.268 38 24 38C31.732 38 38 31.732 38 24C38 16.268 31.732 10 24 10Z"
      fill="#ffffff"
      fillOpacity="0.15"
    />
    {/* Chữ thập y tế */}
    <path
      d="M21 16H27V21H32V27H27V32H21V27H16V21H21V16Z"
      fill="#ffffff"
    />
    <defs>
      <linearGradient id="crest_grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284c7" />
        <stop offset="1" stopColor="#0369a1" />
      </linearGradient>
    </defs>
  </svg>
)

/** Biểu tượng nhịp tim ECG động */
export const HeartbeatPulseIcon: React.FC<{ size?: number; color?: string; animated?: boolean }> = ({
  size = 24,
  color = '#ef4444',
  animated = true,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      d="M3 16H8L11 8L16 25L20 13L23 18H29"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={animated ? 'heartbeat-svg-line' : undefined}
    />
  </svg>
)

/** Biểu tượng huyết áp */
export const BloodPressureIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#dc2626' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M12 5v6l3 2" />
  </svg>
)

/** Biểu tượng đường huyết (Glucose giọt máu) */
export const BloodGlucoseIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#f59e0b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 4.5 7.5a6 6 0 1 1-9 0L12 2z" />
    <path d="M12 11v4" />
    <path d="M10 13h4" />
  </svg>
)

/** Biểu tượng chức năng thận / eGFR */
export const KidneyIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#0284c7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4c-4.5 0-8 3.5-8 8s3.5 8 8 8 8-3.5 8-8-3.5-8-8-8z" />
    <path d="M12 8a4 4 0 0 0-4 4c0 2.2 1.8 4 4 4" />
  </svg>
)

/** Biểu tượng cân nặng (Weight Scale) */
export const WeightScaleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#059669' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="18" x="2" y="3" rx="3" />
    <path d="M12 7v4" />
    <path d="M9 11a3 3 0 0 1 6 0" />
    <path d="M6 18h12" />
  </svg>
)

/** Biểu tượng viên thuốc 3D (Drug Pill) */
export const DrugPillIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#0284c7' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
)

/** Mascot Trợ lý Lâm sàng AI (AiBotMascot) */
export const AiBotMascot: React.FC<{ size?: number; thinking?: boolean }> = ({ size = 48, thinking = false }) => (
  <div className={`ai-mascot-wrapper ${thinking ? 'ai-thinking' : ''}`} style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bot_body" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284c7" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="bot_visor" x1="16" y1="20" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {/* Anten */}
      <path d="M32 6V14" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="6" r="3" fill="#38bdf8" className="ai-antenna-dot" />
      {/* Đầu bot */}
      <rect x="12" y="14" width="40" height="34" rx="12" fill="url(#bot_body)" />
      {/* Kính ngắm (Visor) */}
      <rect x="16" y="22" width="32" height="18" rx="7" fill="url(#bot_visor)" />
      {/* Mắt bot */}
      <circle cx="26" cy="31" r="3" fill="#38bdf8" className="ai-eye-blink" />
      <circle cx="38" cy="31" r="3" fill="#38bdf8" className="ai-eye-blink" />
      {/* Tai bot */}
      <rect x="7" y="24" width="5" height="12" rx="2.5" fill="#0284c7" />
      <rect x="52" y="24" width="5" height="12" rx="2.5" fill="#0284c7" />
      {/* Đế / Thân nhỏ */}
      <path d="M22 52C22 50 26 48 32 48C38 48 42 50 42 52" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
)

/** Tranh minh họa rỗng phong cách lâm sàng */
export const EmptyMedicalIllustration: React.FC<{ size?: number }> = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="16" width="64" height="72" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
    <path d="M32 12H64V22H32V12Z" rx="4" fill="#0284c7" />
    <circle cx="48" cy="17" r="2.5" fill="#ffffff" />
    <line x1="28" y1="36" x2="68" y2="36" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="28" y1="48" x2="60" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="58" x2="52" y2="58" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    <circle cx="68" cy="68" r="14" fill="#0284c7" fillOpacity="0.1" stroke="#0284c7" strokeWidth="2" />
    <path d="M68 62V74" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
    <path d="M62 68H74" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
