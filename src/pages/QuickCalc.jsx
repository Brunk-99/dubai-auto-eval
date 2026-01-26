import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../lib/auth';
import { getCostDefaults } from '../lib/storage';
import { getExchangeRate, aedToEur, eurToAed } from '../lib/exchangeRate';
import { formatCurrency, parseCurrencyInput } from '../lib/formatters';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';

export default function QuickCalc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [settings, setSettings] = useState({});

  // Input values
  const [priceAED, setPriceAED] = useState('');
  const [marketPriceDE, setMarketPriceDE] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [tuvCost, setTuvCost] = useState('');
  const [miscCost, setMiscCost] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rateData, costDefaults] = await Promise.all([
        getExchangeRate(),
        getCostDefaults(),
      ]);

      setExchangeRate(rateData.rate);
      setRateInfo(rateData);
      setSettings(costDefaults);

      // Set defaults from settings
      setTransportCost(costDefaults.transportCost?.toString() || '2500');
      setTuvCost(costDefaults.tuvCost?.toString() || '800');
      setMiscCost(costDefaults.miscCost?.toString() || '500');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parse input values
  const aed = parseCurrencyInput(priceAED) || 0;
  const market = parseCurrencyInput(marketPriceDE) || 0;
  const transport = parseCurrencyInput(transportCost) || 0;
  const tuv = parseCurrencyInput(tuvCost) || 0;
  const misc = parseCurrencyInput(miscCost) || 0;

  // Calculations
  const bidPriceEUR = exchangeRate ? aedToEur(aed, exchangeRate) : 0;
  const duty10 = bidPriceEUR * 0.10;
  const vatBase = bidPriceEUR + duty10;
  const vat19 = vatBase * 0.19;
  const otherCosts = transport + tuv + misc;
  const totalCost = bidPriceEUR + duty10 + vat19 + otherCosts;
  const profit = market - totalCost;
  const profitPct = market > 0 ? (profit / market) * 100 : 0;
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // Max bid calculation (without repair costs)
  const targetProfitPct = settings.targetProfitPct || 35;
  const safetyDeduction = settings.safetyDeduction || 200;
  const targetProfit = market * (targetProfitPct / 100);
  const maxBidRaw = (market - targetProfit - safetyDeduction - otherCosts) / 1.309;
  const maxBidEUR = Math.max(0, Math.floor(maxBidRaw / 50) * 50);
  const maxBidAED = exchangeRate ? eurToAed(maxBidEUR, exchangeRate) : 0;

  // Profit status color
  const getProfitColor = () => {
    if (profit < 0) return 'text-red-600';
    if (profitPct >= targetProfitPct) return 'text-green-600';
    return 'text-yellow-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        title="Schnellrechner"
        showBack
        backTo="/dashboard"
      />

      <div className="p-4 space-y-4">
        {/* Exchange Rate Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Wechselkurs</span>
          <div className="text-right">
            <span className="font-medium tabular-nums">1 EUR = {exchangeRate?.toFixed(4)} AED</span>
            {rateInfo?.updatedAt && (
              <p className="text-xs text-gray-400">{rateInfo.updatedAt}</p>
            )}
            {rateInfo?.isFallback && (
              <p className="text-xs text-orange-500">Fallback-Kurs</p>
            )}
          </div>
        </div>

        {/* Price Input */}
        <Card>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Kaufpreis</h3>

          <Input
            label="Preis in AED"
            placeholder="z.B. 50000"
            type="text"
            inputMode="decimal"
            value={priceAED}
            onChange={(e) => setPriceAED(e.target.value)}
            suffix="AED"
          />

          {aed > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Umgerechnet</span>
                <span className="text-lg font-semibold text-blue-600 tabular-nums">
                  {formatCurrency(bidPriceEUR)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Market Reference */}
        <Card>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Referenz mobile.de</h3>

          <Input
            label="Günstigster Vergleichspreis DE"
            placeholder="z.B. 25000"
            type="text"
            inputMode="decimal"
            value={marketPriceDE}
            onChange={(e) => setMarketPriceDE(e.target.value)}
            suffix="€"
          />
          <p className="text-xs text-gray-400 mt-1">
            Günstigstes vergleichbares Fahrzeug (Ausstattung, Alter, km)
          </p>
        </Card>

        {/* Cost Inputs */}
        <Card>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Nebenkosten</h3>

          <div className="space-y-3">
            <Input
              label="Transport"
              placeholder="2500"
              type="text"
              inputMode="decimal"
              value={transportCost}
              onChange={(e) => setTransportCost(e.target.value)}
              suffix="€"
            />

            <Input
              label="TÜV/Zulassung"
              placeholder="800"
              type="text"
              inputMode="decimal"
              value={tuvCost}
              onChange={(e) => setTuvCost(e.target.value)}
              suffix="€"
            />

            <Input
              label="Sonstiges"
              placeholder="500"
              type="text"
              inputMode="decimal"
              value={miscCost}
              onChange={(e) => setMiscCost(e.target.value)}
              suffix="€"
            />
          </div>
        </Card>

        {/* Results */}
        {aed > 0 && market > 0 && (
          <Card>
            <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Kalkulation</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Kaufpreis (EUR)</span>
                <span className="tabular-nums">{formatCurrency(bidPriceEUR)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Zoll (10%)</span>
                <span className="tabular-nums">{formatCurrency(duty10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">EUSt (19%)</span>
                <span className="tabular-nums">{formatCurrency(vat19)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transport</span>
                <span className="tabular-nums">{formatCurrency(transport)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TÜV/Zulassung</span>
                <span className="tabular-nums">{formatCurrency(tuv)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sonstiges</span>
                <span className="tabular-nums">{formatCurrency(misc)}</span>
              </div>

              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-700">Gesamtkosten</span>
                  <span className="tabular-nums">{formatCurrency(totalCost)}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Marktpreis DE</span>
                <span className="tabular-nums">{formatCurrency(market)}</span>
              </div>

              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Profit</span>
                  <div className="text-right">
                    <span className={`text-lg font-semibold tabular-nums ${getProfitColor()}`}>
                      {formatCurrency(profit)}
                    </span>
                    <span className={`text-sm ml-2 tabular-nums ${getProfitColor()}`}>
                      ({profitPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>ROI</span>
                  <span className="tabular-nums">{roiPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Max Bid Recommendation */}
        {market > 0 && (
          <Card className="bg-blue-50 border-blue-100">
            <h3 className="text-xs text-blue-600 uppercase tracking-wide mb-3">
              Empfohlenes Maximalgebot
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Für {targetProfitPct}% Zielprofit
            </p>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 tabular-nums">
                  {formatCurrency(maxBidAED, 'AED')}
                </p>
                <p className="text-sm text-gray-500 tabular-nums">
                  ≈ {formatCurrency(maxBidEUR)}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
