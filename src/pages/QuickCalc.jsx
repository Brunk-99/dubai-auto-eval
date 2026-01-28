import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../lib/auth';
import { getCostDefaults } from '../lib/storage';
import { getExchangeRate, aedToEur, eurToAed } from '../lib/exchangeRate';
import { formatCurrency, parseCurrencyInput } from '../lib/formatters';
import { useTheme } from '../lib/theme.jsx';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import NumberInput from '../components/NumberInput';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';

export default function QuickCalc() {
  const navigate = useNavigate();
  const { theme, themeId } = useTheme();
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
  // Total cost WITHOUT VAT - VAT is recoverable as Vorsteuer when selling via GmbH
  const totalCost1 = dealerEUR + duty1 + otherCosts;
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

  // Formula: maxBid = (marketPrice - targetMargin - otherCosts) / 1.10
  // 1.10 = 1 + 0.10 (duty only, VAT is recoverable as Vorsteuer)
  const maxBidRaw = (market2 - targetMargin - otherCosts) / 1.10;
  const maxBidEUR = Math.max(0, Math.floor(maxBidRaw / 50) * 50);
  const maxBidAED = exchangeRate ? eurToAed(maxBidEUR, exchangeRate) : 0;

  // Show what the costs would be at max bid
  const auctionDuty = maxBidEUR * 0.10;
  const auctionVatBase = maxBidEUR + auctionDuty;
  const auctionVat = auctionVatBase * 0.19;
  // Total cost WITHOUT VAT - VAT is recoverable as Vorsteuer
  const auctionTotalCost = maxBidEUR + auctionDuty + otherCosts;
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

  // Theme-aware card styles
  const cardBg = themeId === 'dark' ? 'bg-gray-800' : 'bg-white';
  const inputBg = themeId === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
  const breakdownText = themeId === 'dark' ? 'text-gray-400' : 'text-gray-400';
  const breakdownValue = themeId === 'dark' ? 'text-gray-200' : 'text-gray-900';
  const borderColor = themeId === 'dark' ? 'border-gray-700' : 'border-gray-100';

  return (
    <div className={`min-h-screen ${theme.pageBg} pb-8`}>
      <Header
        title="Rechner"
        showBack
        backTo="/dashboard"
      />

      <div className="p-4 space-y-4">
        {/* Kurs-Banner */}
        <div className={`text-center py-1 ${theme.textMuted} text-sm`}>
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
            {/* Haupt-Eingaben */}
            <div className={`${cardBg} rounded-2xl p-5 shadow-sm`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <NumberInput
                    label="Einkauf AED"
                    value={dealerPriceAED}
                    onChange={(e) => setDealerPriceAED(e.target.value)}
                    placeholder="0"
                    theme={{ inputBg, textPrimary: theme.textPrimary, textMuted: theme.textMuted }}
                  />
                  {dealerAED > 0 && (
                    <div className={`${theme.textMuted} text-xs text-center mt-2`}>≈ {formatCurrency(dealerEUR)}</div>
                  )}
                </div>

                <div>
                  <NumberInput
                    label="Verkauf EUR"
                    value={marketPriceDE1}
                    onChange={(e) => setMarketPriceDE1(e.target.value)}
                    placeholder="0"
                    theme={{ inputBg, textPrimary: theme.textPrimary, textMuted: theme.textMuted }}
                  />
                </div>
              </div>
            </div>

            {/* Kosten Breakdown - zeigen sobald AED eingegeben */}
            {dealerAED > 0 && (
              <>
                <div className={`${cardBg} rounded-2xl p-5 shadow-sm space-y-3`}>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>Kaufpreis</span>
                    <span className={`${breakdownValue} tabular-nums`}>{formatCurrency(dealerEUR)}</span>
                  </div>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>Zoll (10%)</span>
                    <span className={`${breakdownValue} tabular-nums`}>{formatCurrency(duty1)}</span>
                  </div>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>EUSt (19%)</span>
                    <span className={`${breakdownValue} tabular-nums`}>({formatCurrency(vat1)})</span>
                  </div>
                  <div className={`text-xs ${theme.textMuted} -mt-2`}>
                    Vorsteuer - wird bei Verkauf zurückerstattet
                  </div>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>Transport</span>
                    <span className={`${breakdownValue} tabular-nums`}>{formatCurrency(transport)}</span>
                  </div>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>TÜV/Zulassung</span>
                    <span className={`${breakdownValue} tabular-nums`}>{formatCurrency(tuv)}</span>
                  </div>
                  <div className={`flex justify-between ${breakdownText}`}>
                    <span>Sonstiges</span>
                    <span className={`${breakdownValue} tabular-nums`}>{formatCurrency(misc)}</span>
                  </div>
                  <div className={`border-t ${borderColor} pt-3 flex justify-between`}>
                    <span className={`${theme.textSecondary} font-medium`}>Gesamt</span>
                    <span className={`${theme.textPrimary} font-semibold tabular-nums`}>{formatCurrency(totalCost1)}</span>
                  </div>
                </div>

                {/* Marge - nur anzeigen wenn auch Verkaufspreis eingegeben */}
                {market1 > 0 && (
                  <div className={`${marginColors.bg} ${marginColors.border} border rounded-2xl p-6 text-center`}>
                    <div className={`${marginColors.text} text-sm uppercase tracking-wider`}>Deine Marge</div>
                    <div className={`text-4xl font-bold mt-2 tabular-nums ${marginColors.text}`}>
                      {formatCurrency(margin1)}
                    </div>
                    <div className={`text-xl mt-1 ${marginColors.text}`}>{marginPct1.toFixed(1)}%</div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ========== AUKTION TAB ========== */}
          <TabsContent value="auktion" className="mt-4 space-y-4">
            {/* Haupt-Eingabe */}
            <div className={`${cardBg} rounded-2xl p-5 shadow-sm`}>
              <NumberInput
                label="Verkaufspreis DE"
                value={marketPriceDE2}
                onChange={(e) => setMarketPriceDE2(e.target.value)}
                placeholder="0"
                suffix="€"
                size="large"
                theme={{ inputBg, textPrimary: theme.textPrimary, textMuted: theme.textMuted }}
              />

              <p className={`text-xs ${theme.textMuted} text-center mt-3`}>
                Günstigstes vergleichbares Fahrzeug auf mobile.de
              </p>
            </div>

            {/* Max Bid Result */}
            {market2 > 0 && (
              <div className={`${themeId === 'dark' ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-100'} border rounded-2xl p-6 text-center`}>
                <div className={`${themeId === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-sm uppercase tracking-wider`}>Maximales Gebot</div>
                <div className={`${themeId === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-xs mt-1`}>für mind. {auctionTargetPct}% Marge</div>
                <div className={`text-4xl font-bold ${themeId === 'dark' ? 'text-blue-400' : 'text-blue-600'} mt-3 tabular-nums`}>
                  {formatCurrency(maxBidAED, 'AED')}
                </div>
                <div className={`${theme.textSecondary} text-sm mt-1 tabular-nums`}>
                  ≈ {formatCurrency(maxBidEUR)}
                </div>

                {/* Breakdown */}
                <div className={`border-t ${themeId === 'dark' ? 'border-blue-800' : 'border-blue-200'} mt-4 pt-4 space-y-1 text-sm text-left`}>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>Kaufpreis</span>
                    <span className="tabular-nums">{formatCurrency(maxBidEUR)}</span>
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>+ Zoll (10%)</span>
                    <span className="tabular-nums">{formatCurrency(auctionDuty)}</span>
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>+ EUSt (19%)</span>
                    <span className="tabular-nums">({formatCurrency(auctionVat)})</span>
                  </div>
                  <div className={`text-xs ${theme.textMuted} -mt-1 ml-2`}>
                    Vorsteuer - zurückerstattet
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>+ Transport</span>
                    <span className="tabular-nums">{formatCurrency(transport)}</span>
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>+ TÜV/Zulassung</span>
                    <span className="tabular-nums">{formatCurrency(tuv)}</span>
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary}`}>
                    <span>+ Sonstiges</span>
                    <span className="tabular-nums">{formatCurrency(misc)}</span>
                  </div>
                  <div className={`flex justify-between font-medium ${theme.textPrimary} pt-1`}>
                    <span>= Gesamtkosten</span>
                    <span className="tabular-nums">{formatCurrency(auctionTotalCost)}</span>
                  </div>
                  <div className={`flex justify-between ${theme.textSecondary} pt-2`}>
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
