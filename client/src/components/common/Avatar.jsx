import React from 'react';

export default function Avatar({ src, name, size = 'md', status, className = '' }) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-3xl'
  };

  const statusDotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-5 h-5',
    '2xl': 'w-6 h-6'
  };

  const getInitials = (n) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const statusColors = {
    available: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
    ringing: 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.7)]',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
    offline: 'bg-slate-500'
  };

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-2xl object-cover ring-2 ring-white/10 shadow-md`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}

      <div
        style={{ display: src ? 'none' : 'flex' }}
        className={`${sizeClasses[size]} rounded-2xl items-center justify-center font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-2 ring-white/10 shadow-md`}
      >
        {getInitials(name)}
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[#0B0F19] ${statusDotSizes[size]} ${
            statusColors[status] || statusColors.offline
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
