import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../lib/auth';
import { getCostDefaults } from '../lib/storage';
import { getExchangeRate, aedToEur, eurToAed } from '../lib/exchangeRate';
import { formatCurrency, parseCurrencyInput } from '../lib/formatters';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';

export default function QuickCalc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateInfo, setRateInfo] = useState(null);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('schnellrechner');

  // Schnellrechner inputs
  const [dealerPriceAED, setDealerPriceAED] = useState('');
  const [marketPriceDE1, setMarketPriceDE1] = useState('');

  // Auktion inputs
  const [marketPriceDE2, setMarketPriceDE2] = useState('');

  // Shared cost inputs
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

  // Parse shared cost values
  const transport = parseCurrencyInput(transportCost) || 0;
  const tuv = parseCurrencyInput(tuvCost) || 0;
  const misc = parseCurrencyInput(miscCost) || 0;
  const otherCosts = transport + tuv + misc;

  // ========== SCHNELLRECHNER CALCULATIONS ==========
  const dealerAED = parseCurrencyInput(dealerPriceAED) || 0;
  const market1 = parseCurrencyInput(marketPriceDE1) || 0;

  const dealerEUR = exchangeRate ? aedToEur(dealerAED, exchangeRate) : 0;
  const duty1 = dealerEUR * 0.10;
  const vatBase1 = dealerEUR + duty1;
  const vat1 = vatBase1 * 0.19;
  const totalCost1 = dealerEUR + duty1 + vat1 + otherCosts;
  const margin1 = market1 - totalCost1;
  const marginPct1 = market1 > 0 ? (margin1 / market1) * 100 : 0;

  const getMarginColor = (margin, pct) => {
    if (margin < 0) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
    if (pct >= 35) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' };
    if (pct >= 10) return { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' };
    return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
  };

  // ========== AUKTION CALCULATIONS ==========
  const market2 = parseCurrencyInput(marketPriceDE2) || 0;

  // 15% minimum margin for auction
  const auctionTargetPct = 15;
  const targetMargin = market2 * (auctionTargetPct / 100);

  // Formula: maxBid = (marketPrice - targetMargin - otherCosts) / 1.309
  const maxBidRaw = (market2 - targetMargin - otherCosts) / 1.309;
  const maxBidEUR = Math.max(0, Math.floor(maxBidRaw / 50) * 50);
  const maxBidAED = exchangeRate ? eurToAed(maxBidEUR, exchangeRate) : 0;

  // Show what the costs would be at max bid
  const auctionDuty = maxBidEUR * 0.10;
  const auctionVatBase = maxBidEUR + auctionDuty;
  const auctionVat = auctionVatBase * 0.19;
  const auctionTotalCost = maxBidEUR + auctionDuty + auctionVat + otherCosts;
  const auctionProfit = market2 - auctionTotalCost;
  const auctionProfitPct = market2 > 0 ? (auctionProfit / market2) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const marginColors = getMarginColor(margin1, marginPct1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 pb-8">
      <Header
        title="Rechner"
        showBack
        backTo="/dashboard"
      />

      <div className="p-4 space-y-4">
        {/* Kurs-Banner */}
        <div className="text-center py-1 text-gray-400 text-sm">
          1 EUR = {exchangeRate?.toFixed(2)} AED
          {rateInfo?.isFallback && <span className="text-orange-500 ml-2">(Fallback)</span>}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="schnellrechner">Schnellrechner</TabsTrigger>
            <TabsTrigger value="auktion">Auktion</TabsTrigger>
          </TabsList>

          {/* ========== SCHNELLRECHNER TAB ========== */}
          <TabsContent value="schnellrechner" className="mt-4 space-y-4">
            {/* Haupt-Eingaben - Design 4: Zentriert mit inneren Boxen */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Einkauf AED</div>
                  <div className="bg-gray-50 rounded-xl p-4 relative">
                    {dealerAED > 0 ? (
                      <div
                        className="text-2xl font-bold text-gray-900 tabular-nums text-center cursor-text"
                        onClick={() => document.getElementById('schnell-aed').focus()}
                      >
                        {new Intl.NumberFormat('de-DE').format(dealerAED)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={dealerPriceAED}
                        onChange={(e) => setDealerPriceAED(e.target.value)}
                        placeholder="0"
                        className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300 text-center"
                      />
                    )}
                    <input
                      id="schnell-aed"
                      type="text"
                      inputMode="decimal"
                      value={dealerPriceAED}
                      onChange={(e) => setDealerPriceAED(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-text"
                    />
                  </div>
                  {dealerAED > 0 && (
                    <div className="text-gray-400 text-xs text-center mt-2">≈ {formatCurrency(dealerEUR)}</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Verkauf EUR</div>
                  <div className="bg-gray-50 rounded-xl p-4 relative">
                    {market1 > 0 ? (
                      <div
                        className="text-2xl font-bold text-gray-900 tabular-nums text-center cursor-text"
                        onClick={() => document.getElementById('schnell-eur').focus()}
                      >
                        {new Intl.NumberFormat('de-DE').format(market1)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={marketPriceDE1}
                        onChange={(e) => setMarketPriceDE1(e.target.value)}
                        placeholder="0"
                        className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300 text-center"
                      />
                    )}
                    <input
                      id="schnell-eur"
                      type="text"
                      inputMode="decimal"
                      value={marketPriceDE1}
                      onChange={(e) => setMarketPriceDE1(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-text"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kosten Breakdown - nur anzeigen wenn Werte eingegeben */}
            {dealerAED > 0 && market1 > 0 && (
              <>
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>Kaufpreis</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(dealerEUR)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Zoll (10%)</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(duty1)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>EUSt (19%)</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(vat1)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Transport</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(transport)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>TÜV/Zulassung</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(tuv)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Sonstiges</span>
                    <span className="text-gray-900 tabular-nums">{formatCurrency(misc)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="text-gray-600 font-medium">Gesamt</span>
                    <span className="text-gray-900 font-semibold tabular-nums">{formatCurrency(totalCost1)}</span>
                  </div>
                </div>

                {/* Marge */}
                <div className={`${marginColors.bg} ${marginColors.border} border rounded-2xl p-6 text-center`}>
                  <div className={`${marginColors.text} text-sm uppercase tracking-wider`}>Deine Marge</div>
                  <div className={`text-4xl font-bold mt-2 tabular-nums ${marginColors.text}`}>
                    {formatCurrency(margin1)}
                  </div>
                  <div className={`text-xl mt-1 ${marginColors.text}`}>{marginPct1.toFixed(1)}%</div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ========== AUKTION TAB ========== */}
          <TabsContent value="auktion" className="mt-4 space-y-4">
            {/* Haupt-Eingabe - Design 4: Zentriert mit innerem Rahmen */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-3">Verkaufspreis DE</div>

              <div className="bg-gray-50 rounded-xl p-6 relative">
                {market2 > 0 ? (
                  <div
                    className="text-4xl font-bold text-gray-900 tabular-nums text-center cursor-text"
                    onClick={() => document.getElementById('auction-input').focus()}
                  >
                    {formatCurrency(market2)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={marketPriceDE2}
                    onChange={(e) => setMarketPriceDE2(e.target.value)}
                    placeholder="0 €"
                    className="text-4xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300 text-center"
                  />
                )}
                <input
                  id="auction-input"
                  type="text"
                  inputMode="decimal"
                  value={marketPriceDE2}
                  onChange={(e) => setMarketPriceDE2(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>

              <p className="text-xs text-gray-400 text-center mt-3">
                Günstigstes vergleichbares Fahrzeug auf mobile.de
              </p>
            </div>

            {/* Max Bid Result */}
            {market2 > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                <div className="text-blue-600 text-sm uppercase tracking-wider">Maximales Gebot</div>
                <div className="text-blue-600 text-xs mt-1">für mind. {auctionTargetPct}% Marge</div>
                <div className="text-4xl font-bold text-blue-600 mt-3 tabular-nums">
                  {formatCurrency(maxBidAED, 'AED')}
                </div>
                <div className="text-gray-500 text-sm mt-1 tabular-nums">
                  ≈ {formatCurrency(maxBidEUR)}
                </div>

                {/* Breakdown */}
                <div className="border-t border-blue-200 mt-4 pt-4 space-y-1 text-sm text-left">
                  <div className="flex justify-between text-gray-500">
                    <span>Kaufpreis</span>
                    <span className="tabular-nums">{formatCurrency(maxBidEUR)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ Zoll (10%)</span>
                    <span className="tabular-nums">{formatCurrency(auctionDuty)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ EUSt (19%)</span>
                    <span className="tabular-nums">{formatCurrency(auctionVat)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ Transport</span>
                    <span className="tabular-nums">{formatCurrency(transport)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ TÜV/Zulassung</span>
                    <span className="tabular-nums">{formatCurrency(tuv)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>+ Sonstiges</span>
                    <span className="tabular-nums">{formatCurrency(misc)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700 pt-1">
                    <span>= Gesamtkosten</span>
                    <span className="tabular-nums">{formatCurrency(auctionTotalCost)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 pt-2">
                    <span>Verkauf DE</span>
                    <span className="tabular-nums">{formatCurrency(market2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600 pt-1">
                    <span>= Marge</span>
                    <span className="tabular-nums">{formatCurrency(auctionProfit)} ({auctionProfitPct.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
