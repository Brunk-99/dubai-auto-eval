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
    if (margin < 0) return 'text-red-600';
    if (pct >= 35) return 'text-green-600';
    if (pct >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  // ========== AUKTION CALCULATIONS ==========
  const market2 = parseCurrencyInput(marketPriceDE2) || 0;

  // 10% minimum margin for auction
  const auctionTargetPct = 10;
  const targetMargin = market2 * (auctionTargetPct / 100);

  // Formula: maxBid = (marketPrice - targetMargin - otherCosts) / 1.309
  // 1.309 = 1 + 0.10 (duty) + 0.19 * 1.10 (VAT on price+duty)
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        title="Rechner"
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="schnellrechner">Schnellrechner</TabsTrigger>
            <TabsTrigger value="auktion">Auktion</TabsTrigger>
          </TabsList>

          {/* ========== SCHNELLRECHNER TAB ========== */}
          <TabsContent value="schnellrechner" className="mt-4 space-y-4">
            {/* Dealer Price Input */}
            <Card>
              <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Händlerpreis</h3>

              <Input
                label="Verkaufspreis in AED"
                placeholder="z.B. 50000"
                type="text"
                inputMode="decimal"
                value={dealerPriceAED}
                onChange={(e) => setDealerPriceAED(e.target.value)}
                suffix="AED"
              />

              {dealerAED > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Umgerechnet</span>
                    <span className="text-lg font-semibold text-blue-600 tabular-nums">
                      {formatCurrency(dealerEUR)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Market Reference */}
            <Card>
              <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Referenz mobile.de</h3>

              <Input
                label="Vergleichspreis DE"
                placeholder="z.B. 25000"
                type="text"
                inputMode="decimal"
                value={marketPriceDE1}
                onChange={(e) => setMarketPriceDE1(e.target.value)}
                suffix="€"
              />
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
            {dealerAED > 0 && market1 > 0 && (
              <Card>
                <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Kalkulation</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kaufpreis (EUR)</span>
                    <span className="tabular-nums">{formatCurrency(dealerEUR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Zoll (10%)</span>
                    <span className="tabular-nums">{formatCurrency(duty1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">EUSt (19%)</span>
                    <span className="tabular-nums">{formatCurrency(vat1)}</span>
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
                      <span className="tabular-nums">{formatCurrency(totalCost1)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Marktpreis DE</span>
                    <span className="tabular-nums">{formatCurrency(market1)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Margin Result */}
            {dealerAED > 0 && market1 > 0 && (
              <Card className={`${margin1 >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Deine Marge</h3>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-3xl font-bold tabular-nums ${getMarginColor(margin1, marginPct1)}`}>
                      {formatCurrency(margin1)}
                    </p>
                    <p className={`text-sm tabular-nums ${getMarginColor(margin1, marginPct1)}`}>
                      {marginPct1.toFixed(1)}% vom Verkaufspreis
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ========== AUKTION TAB ========== */}
          <TabsContent value="auktion" className="mt-4 space-y-4">
            {/* Market Reference */}
            <Card>
              <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Referenz mobile.de</h3>

              <Input
                label="Vergleichspreis DE"
                placeholder="z.B. 25000"
                type="text"
                inputMode="decimal"
                value={marketPriceDE2}
                onChange={(e) => setMarketPriceDE2(e.target.value)}
                suffix="€"
              />
              <p className="text-xs text-gray-400 mt-1">
                Günstigstes vergleichbares Fahrzeug
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

            {/* Max Bid Result */}
            {market2 > 0 && (
              <Card className="bg-blue-50 border-blue-100">
                <h3 className="text-xs text-blue-600 uppercase tracking-wide mb-1">
                  Maximales Gebot
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Für mindestens {auctionTargetPct}% Marge
                </p>

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-blue-600 tabular-nums">
                      {formatCurrency(maxBidAED, 'AED')}
                    </p>
                    <p className="text-sm text-gray-500 tabular-nums">
                      ≈ {formatCurrency(maxBidEUR)}
                    </p>
                  </div>
                </div>

                {/* Breakdown at max bid */}
                <div className="border-t border-blue-200 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Kaufpreis</span>
                    <span className="tabular-nums">{formatCurrency(maxBidEUR)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>+ Zoll & EUSt</span>
                    <span className="tabular-nums">{formatCurrency(auctionDuty + auctionVat)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>+ Nebenkosten</span>
                    <span className="tabular-nums">{formatCurrency(otherCosts)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-700 pt-1">
                    <span>= Gesamtkosten</span>
                    <span className="tabular-nums">{formatCurrency(auctionTotalCost)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pt-2">
                    <span>Verkauf DE</span>
                    <span className="tabular-nums">{formatCurrency(market2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600 pt-1">
                    <span>= Marge</span>
                    <span className="tabular-nums">{formatCurrency(auctionProfit)} ({auctionProfitPct.toFixed(1)}%)</span>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
