import React from 'react';

interface OAuthButtonsWidgetProps {
  onGoogleLogin: () => void;
  loading: boolean;
}

export default function OAuthButtonsWidget({ onGoogleLogin, loading }: OAuthButtonsWidgetProps) {
  return (
    <div className="w-full min-w-0 relative">
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.99] btn-typography-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm disabled:opacity-50"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 my-6">
        <div className="flex-1 h-[1px] bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/40 font-mono">or email</span>
        <div className="flex-1 h-[1px] bg-white/10" />
      </div>
    </div>
  );
}
