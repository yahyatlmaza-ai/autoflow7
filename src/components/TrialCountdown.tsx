import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { useNavigate } from 'react-router-dom';

export default function TrialCountdown({ trialEnd, compact }: { trialEnd?: string; compact?: boolean }) {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 10, hours: 0, minutes: 0, urgent: false });

  useEffect(() => {
    const end = trialEnd ? new Date(trialEnd) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const update = () => {
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, urgent: true }); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days, hours, minutes, urgent: days < 3 });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [trialEnd]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
        timeLeft.urgent ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      }`}>
        <Clock className="w-3.5 h-3.5" />
        {timeLeft.days}d {timeLeft.hours}h left
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 border ${
      timeLeft.urgent
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className={`w-4 h-4 ${timeLeft.urgent ? 'text-red-500' : 'text-amber-500'}`} />
        <span className={`text-xs font-bold ${timeLeft.urgent ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {t(lang, 'trial_countdown')}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        {[{ v: timeLeft.days, l: 'd' }, { v: timeLeft.hours, l: 'h' }, { v: timeLeft.minutes, l: 'm' }].map((item, i) => (
          <div key={i} className={`flex-1 text-center py-1.5 rounded-xl font-black text-sm ${
            timeLeft.urgent ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {item.v}{item.l}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/dashboard?tab=settings&section=billing')}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors ${
          timeLeft.urgent ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}>
        <Zap className="w-3 h-3" />
        Upgrade Now
      </button>
    </div>
  );
}
