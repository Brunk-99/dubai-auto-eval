import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCostDefaults, saveCostDefaults } from '../lib/storage';
import { clearCurrentUser, isAdmin, getCurrentUser } from '../lib/auth';
import { parseCurrencyInput } from '../lib/formatters';
import { useTheme, THEMES } from '../lib/theme.jsx';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Settings() {
  const navigate = useNavigate();
  const { theme, themeId, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentUser = getCurrentUser();
  const [defaults, setDefaults] = useState({
    transportCost: 2500,
    tuvCost: 800,
    miscCost: 500,
    repairBufferPct: 15,
    defaultMarketPriceDE: 0,
    targetProfitPct: 35,
    safetyDeduction: 200,
  });

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    const data = await getCostDefaults();
    setDefaults(data);
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setDefaults(prev => ({
      ...prev,
      [field]: parseCurrencyInput(value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCostDefaults(defaults);
      alert('Einstellungen gespeichert');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Theme preview colors for selector
  const themePreviewColors = {
    classic: { bg: 'bg-gray-100', accent: 'bg-blue-600', header: 'bg-white' },
    modern: { bg: 'bg-gradient-to-br from-sky-100 to-blue-100', accent: 'bg-blue-500', header: 'bg-gradient-to-r from-blue-400 to-blue-500' },
    dark: { bg: 'bg-gray-900', accent: 'bg-blue-600', header: 'bg-gray-800' },
  };

  return (
    <div className={`min-h-screen ${theme.pageBg} pb-8`}>
      <Header
        title="Einstellungen"
        showBack
        backTo="/dashboard"
      />

      <div className="p-4 space-y-4">
        {/* Theme Selector */}
        <Card>
          <h2 className={`font-semibold ${theme.textPrimary} mb-4`}>Design auswählen</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative rounded-xl overflow-hidden transition-all ${
                  themeId === t.id
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : 'hover:scale-105'
                }`}
              >
                {/* Mini Preview */}
                <div className={`${themePreviewColors[t.id].bg} p-2 aspect-[3/4]`}>
                  {/* Mini Header */}
                  <div className={`${themePreviewColors[t.id].header} rounded-t h-3 mb-1`}></div>
                  {/* Mini Cards */}
                  <div className={`${t.id === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded h-4 mb-1`}></div>
                  <div className={`${t.id === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded h-4 mb-1`}></div>
                  {/* Mini Button */}
                  <div className={`${themePreviewColors[t.id].accent} rounded h-2 w-2/3 mx-auto`}></div>
                </div>
                {/* Label */}
                <div className={`text-xs font-medium py-2 ${
                  t.id === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}>
                  {t.name}
                </div>
                {/* Checkmark */}
                {themeId === t.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className={`text-xs ${theme.textMuted} mt-3 text-center`}>
            {THEMES[themeId].description}
          </p>
        </Card>

        {/* User Info */}
        <Card>
          <h2 className={`font-semibold ${theme.textPrimary} mb-2`}>Angemeldet als</h2>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${themeId === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
              <span className={`${themeId === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-bold`}>{currentUser?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className={`font-medium ${theme.textPrimary}`}>{currentUser?.name}</p>
              <p className={`text-sm ${theme.textSecondary}`}>
                {currentUser?.role === 'admin' ? 'Administrator' : 'Mechaniker'}
              </p>
            </div>
          </div>
        </Card>

        {/* Max Bid Settings */}
        <Card>
          <h2 className={`font-semibold ${theme.textPrimary} mb-4`}>Maximalgebot-Berechnung</h2>
          <p className={`text-sm ${theme.textSecondary} mb-4`}>
            Diese Werte werden für die Berechnung des empfohlenen Maximalgebots verwendet.
          </p>

          <div className="space-y-3">
            <Input
              label="Standard-Vergleichspreis DE"
              placeholder="0"
              type="text"
              inputMode="decimal"
              value={defaults.defaultMarketPriceDE || ''}
              onChange={(e) => handleChange('defaultMarketPriceDE', e.target.value)}
              suffix="€"
            />

            <Input
              label="Zielprofit"
              placeholder="35"
              type="text"
              inputMode="decimal"
              value={defaults.targetProfitPct || ''}
              onChange={(e) => handleChange('targetProfitPct', e.target.value)}
              suffix="%"
            />

            <Input
              label="Sicherheitsabschlag"
              placeholder="200"
              type="text"
              inputMode="decimal"
              value={defaults.safetyDeduction || ''}
              onChange={(e) => handleChange('safetyDeduction', e.target.value)}
              suffix="€"
            />
          </div>
        </Card>

        {/* Cost Defaults */}
        <Card>
          <h2 className={`font-semibold ${theme.textPrimary} mb-4`}>Standard-Kostenparameter</h2>
          <p className={`text-sm ${theme.textSecondary} mb-4`}>
            Diese Werte werden bei neuen Fahrzeugen als Voreinstellung verwendet.
          </p>

          <div className="space-y-3">
            <Input
              label="Transport"
              placeholder="2500"
              type="text"
              inputMode="decimal"
              value={defaults.transportCost || ''}
              onChange={(e) => handleChange('transportCost', e.target.value)}
              suffix="€"
            />

            <Input
              label="TÜV/Zulassung"
              placeholder="800"
              type="text"
              inputMode="decimal"
              value={defaults.tuvCost || ''}
              onChange={(e) => handleChange('tuvCost', e.target.value)}
              suffix="€"
            />

            <Input
              label="Sonstiges"
              placeholder="500"
              type="text"
              inputMode="decimal"
              value={defaults.miscCost || ''}
              onChange={(e) => handleChange('miscCost', e.target.value)}
              suffix="€"
            />

            <Input
              label="Reparatur-Puffer"
              placeholder="15"
              type="text"
              inputMode="decimal"
              value={defaults.repairBufferPct || ''}
              onChange={(e) => handleChange('repairBufferPct', e.target.value)}
              suffix="%"
            />
          </div>
        </Card>

        <Button
          fullWidth
          onClick={handleSave}
          loading={saving}
        >
          Einstellungen speichern
        </Button>

        <Card>
          <h2 className={`font-semibold ${theme.textPrimary} mb-4`}>App-Info</h2>
          <div className={`space-y-2 text-sm ${theme.textSecondary}`}>
            <p>Dubai Auto Eval v2.0</p>
            <p>Fahrzeugbewertung für den Import nach Deutschland</p>
          </div>
        </Card>

        <Button
          fullWidth
          variant="secondary"
          onClick={handleLogout}
        >
          Abmelden
        </Button>
      </div>
    </div>
  );
}
