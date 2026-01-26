import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USERS, authenticateUser, saveCurrentUser } from '../lib/auth';

export default function AccessGate() {
  const [selectedUser, setSelectedUser] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Bitte wähle einen Namen');
      return;
    }

    if (!code.trim()) {
      setError('Bitte gib deinen Code ein');
      return;
    }

    setLoading(true);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const user = authenticateUser(selectedUser, code.trim());

    if (user) {
      saveCurrentUser(user);
      navigate('/dashboard', { replace: true });
    } else {
      setError('Falscher Code');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 -right-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-20 animate-pulse" />

      <div className="w-full max-w-sm relative">
        <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl p-8 shadow-2xl">
          {/* Logo - Auto/PKW Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-1.5-4.5A2 2 0 0015.6 3H8.4a2 2 0 00-1.9 1.5L5 9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 14v4a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-4" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 14h18v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
                <circle cx="7.5" cy="14.5" r="1.5" strokeWidth={1.5} />
                <circle cx="16.5" cy="14.5" r="1.5" strokeWidth={1.5} />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Dubai Auto Eval
          </h1>
          <p className="text-center text-white/70 mb-8 text-sm">
            Fahrzeugbewertung für den Import
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none text-center"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
              >
                <option value="" className="text-gray-800">Wer bist du?</option>
                {USERS.map(u => (
                  <option key={u.id} value={u.id} className="text-gray-800">{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="password"
                placeholder="Zugangscode eingeben"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 text-center text-lg tracking-widest"
              />
              {error && (
                <p className="text-white/90 text-sm mt-2 text-center bg-red-500/30 rounded-lg py-1">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !selectedUser || !code.trim()}
              className="w-full py-3 bg-white text-blue-500 font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Laden...
                </span>
              ) : (
                'Zugang'
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-blue-400 mt-6">
          Nur autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}
