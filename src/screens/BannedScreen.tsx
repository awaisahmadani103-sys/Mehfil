import React from 'react';
import { Logo } from '../components/Logo';
import { Credits } from '../components/Credits';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BannedScreenProps {
  reason?: string;
  expiresAt?: string;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({
  reason = 'Violation of Mehfil Community Standards',
  expiresAt = 'permanent',
}) => {
  const { logout } = useAuth();

  const isPermanent = !expiresAt || expiresAt === 'permanent';

  return (
    <div className="min-h-screen w-full bg-[#111111] text-white flex flex-col justify-between items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background ambient red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#EF4444]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-md flex justify-center pt-4">
        <Logo variant="full" size="md" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-zinc-950/90 border border-red-900/60 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10 text-center space-y-5 my-auto">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-[#EF4444] shadow-lg shadow-red-950">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white">Your Account Has Been Banned</h2>
          <p className="text-xs text-zinc-400">
            Access to Mehfil has been suspended by administration.
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-left space-y-1.5 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Reason for Suspension:
          </span>
          <p className="text-zinc-200 font-medium leading-relaxed">{reason}</p>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>
            Duration:{' '}
            <strong className="text-white">
              {isPermanent ? 'Permanent' : `Until ${new Date(expiresAt).toLocaleDateString()}`}
            </strong>
          </span>
        </div>

        {/* Return / Logout Button */}
        <button
          onClick={logout}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 text-zinc-400" />
          <span>Return to Welcome Screen</span>
        </button>
      </div>

      {/* Credits */}
      <div className="w-full max-w-md pb-2">
        <Credits />
      </div>
    </div>
  );
};
