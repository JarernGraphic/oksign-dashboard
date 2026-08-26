import React from 'react';

export function LineLoginButton({
  className,
  style,
  text = 'เข้าสู่ระบบด้วย LINE',
}: {
  className?: string;
  style?: React.CSSProperties;
  text?: string;
}) {
  return (
    <a
      href="/api/auth/line"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: '#06C755',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '15px',
        textDecoration: 'none',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(6, 199, 85, 0.25)',
        transition: 'background-color 0.2s ease, transform 0.1s ease',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Official LINE Logo SVG */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.035 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.573-3.844 2.573-5.992z" />
      </svg>
      <span>{text}</span>
    </a>
  );
}
