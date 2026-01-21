import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USERS, authenticateUser, saveCurrentUser } from '../lib/auth';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';

export default function AccessGate() {
  const [selectedUser, setSelectedUser] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const userOptions = [
    { value: '', label: 'Wer bist du?' },
    ...USERS.map(u => ({ value: u.id, label: u.name })),
  ];

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-sm">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Dubai Auto Eval
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Fahrzeugbewertung für den Import
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            options={userOptions}
            className="text-center"
          />

          <Input
            type="password"
            placeholder="Zugangscode eingeben"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            autoComplete="off"
            className="text-center text-lg tracking-widest"
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={!selectedUser || !code.trim()}
          >
            Zugang
          </Button>
        </form>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Nur für autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}
