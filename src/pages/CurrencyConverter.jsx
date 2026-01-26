import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../lib/auth';
import { getExchangeRate, aedToEur, eurToAed } from '../lib/exchangeRate';
import { useTheme } from '../lib/theme.jsx';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CurrencyConverter() {
  const navigate = useNavigate();
  const { theme, themeId } = useTheme();
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [isAedToEur, setIsAedToEur] = useState(true); // true = AED→EUR, false = EUR→AED

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadRate();
  }, []);

  const loadRate = async () => {
    try {
      const rateData = await getExchangeRate();
      setExchangeRate(rateData.rate);
      setRateInfo(rateData);
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parse input to number
  const parseInput = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  };

  const inputAmount = parseInput(amount);

  // Calculate converted amount
  const convertedAmount = isAedToEur
    ? aedToEur(inputAmount, exchangeRate)
    : eurToAed(inputAmount, exchangeRate);

  // Format numbers
  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Toggle direction
  const toggleDirection = () => {
    setIsAedToEur(!isAedToEur);
    setAmount('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const fromCurrency = isAedToEur ? 'AED' : 'EUR';
  const toCurrency = isAedToEur ? 'EUR' : 'AED';

  // Theme-aware styles
  const cardBg = themeId === 'dark' ? 'bg-gray-800' : 'bg-white';
  const inputBg = themeId === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
  const toggleBg = themeId === 'dark'
    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50';
  const resultBg = themeId === 'dark'
    ? 'bg-blue-900/30 border-blue-800'
    : 'bg-blue-50 border-blue-100';
  const resultText = themeId === 'dark' ? 'text-blue-400' : 'text-blue-600';

  return (
    <div className={`min-h-screen ${theme.pageBg} pb-8`}>
      <Header
        title="Währungsrechner"
        showBack
        backTo="/dashboard"
      />

      <div className="p-4 space-y-4">
        {/* Kurs-Banner */}
        <div className={`text-center py-1 ${theme.textMuted} text-sm`}>
          1 EUR = {exchangeRate?.toFixed(4)} AED
          {rateInfo?.isFallback && rateInfo?.isLastKnown && (
            <span className="text-orange-500 ml-2">(letzter Kurs)</span>
          )}
          {rateInfo?.isFallback && !rateInfo?.isLastKnown && (
            <span className="text-orange-500 ml-2">(Fallback)</span>
          )}
          {rateInfo?.fromCache && !rateInfo?.isFallback && (
            <span className={`${theme.textMuted} ml-2`}>(gecached)</span>
          )}
        </div>

        {/* Eingabe */}
        <div className={`${cardBg} rounded-2xl p-5 shadow-sm`}>
          <div className={`text-xs ${theme.textMuted} uppercase tracking-wider text-center mb-3`}>
            {fromCurrency} eingeben
          </div>

          <div className={`${inputBg} rounded-xl p-6 relative`}>
            {inputAmount > 0 ? (
              <div
                className={`text-4xl font-bold ${theme.textPrimary} tabular-nums text-center cursor-text`}
                onClick={() => document.getElementById('currency-input').focus()}
              >
                {formatNumber(inputAmount)} {fromCurrency}
              </div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`0 ${fromCurrency}`}
                className={`text-4xl font-bold ${theme.textPrimary} tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-400 text-center`}
              />
            )}
            <input
              id="currency-input"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-text"
            />
          </div>
        </div>

        {/* Toggle Button */}
        <div className="flex justify-center">
          <button
            onClick={toggleDirection}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border transition-colors ${toggleBg}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm font-medium">{fromCurrency} → {toCurrency}</span>
          </button>
        </div>

        {/* Ergebnis */}
        {inputAmount > 0 && (
          <div className={`${resultBg} border rounded-2xl p-6 text-center`}>
            <div className={`${resultText} text-sm uppercase tracking-wider`}>Ergebnis</div>
            <div className={`text-4xl font-bold ${resultText} mt-3 tabular-nums`}>
              {formatNumber(convertedAmount)} {toCurrency}
            </div>
            <div className={`${theme.textSecondary} text-sm mt-3`}>
              {isAedToEur ? (
                <>1 AED = {(1 / exchangeRate).toFixed(4)} EUR</>
              ) : (
                <>1 EUR = {exchangeRate?.toFixed(4)} AED</>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <p className={`text-xs ${theme.textMuted} text-center mt-4`}>
          Wechselkurs wird alle 4 Stunden aktualisiert
        </p>
      </div>
    </div>
  );
}
