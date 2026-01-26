import { useState } from 'react';
import Header from '../components/Header';

// Helper: Format number as German currency display
function formatEUR(value) {
  if (!value || value === 0) return '';
  return new Intl.NumberFormat('de-DE').format(value) + ' €';
}

function formatAED(value) {
  if (!value || value === 0) return '';
  return new Intl.NumberFormat('de-DE').format(value) + ' AED';
}

// Helper: Parse input to number
function parseInput(str) {
  if (!str) return 0;
  return parseInt(str.replace(/\D/g, ''), 10) || 0;
}

// Mock exchange rate
const RATE = 4.35;
function aedToEur(aed) {
  return aed / RATE;
}

export default function DesignTest() {
  // Design 1
  const [aed1, setAed1] = useState('');
  const [eur1, setEur1] = useState('');
  // Design 2
  const [aed2, setAed2] = useState('');
  const [eur2, setEur2] = useState('');
  // Design 3
  const [aed3, setAed3] = useState('');
  const [eur3, setEur3] = useState('');
  // Design 4
  const [aed4, setAed4] = useState('');
  const [eur4, setEur4] = useState('');
  // Design 5
  const [aed5, setAed5] = useState('');
  const [eur5, setEur5] = useState('');

  const numAed1 = parseInput(aed1);
  const numEur1 = parseInput(eur1);
  const numAed2 = parseInput(aed2);
  const numEur2 = parseInput(eur2);
  const numAed3 = parseInput(aed3);
  const numEur3 = parseInput(eur3);
  const numAed4 = parseInput(aed4);
  const numEur4 = parseInput(eur4);
  const numAed5 = parseInput(aed5);
  const numEur5 = parseInput(eur5);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header title="Design Test" showBack backTo="/dashboard" />

      <div className="p-4 space-y-6">
        <h2 className="text-lg font-bold text-gray-900">5 Design-Vorschläge für Schnellrechner</h2>
        <p className="text-sm text-gray-500">Einkauf AED + Verkauf EUR Eingabe</p>

        {/* ========== DESIGN 1: Nebeneinander minimalistisch ========== */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-blue-600 font-medium mb-4">DESIGN 1 - Nebeneinander minimalistisch</div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Einkauf AED</div>
              <div className="relative">
                {numAed1 > 0 ? (
                  <div
                    className="text-3xl font-light text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d1-aed').focus()}
                  >
                    {formatAED(numAed1)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aed1}
                    onChange={(e) => setAed1(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 AED"
                    className="text-3xl font-light text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d1-aed"
                  type="text"
                  inputMode="numeric"
                  value={aed1}
                  onChange={(e) => setAed1(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
              {numAed1 > 0 && (
                <div className="text-gray-400 text-sm mt-1">≈ {formatEUR(Math.round(aedToEur(numAed1)))}</div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Verkauf EUR</div>
              <div className="relative">
                {numEur1 > 0 ? (
                  <div
                    className="text-3xl font-light text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d1-eur').focus()}
                  >
                    {formatEUR(numEur1)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={eur1}
                    onChange={(e) => setEur1(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 €"
                    className="text-3xl font-light text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d1-eur"
                  type="text"
                  inputMode="numeric"
                  value={eur1}
                  onChange={(e) => setEur1(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== DESIGN 2: Gestapelt mit Trennlinie ========== */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-blue-600 font-medium mb-4">DESIGN 2 - Gestapelt mit Trennlinie</div>

          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Einkauf AED</div>
              <div className="relative">
                {numAed2 > 0 ? (
                  <div
                    className="text-3xl font-semibold text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d2-aed').focus()}
                  >
                    {formatAED(numAed2)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aed2}
                    onChange={(e) => setAed2(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 AED"
                    className="text-3xl font-semibold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d2-aed"
                  type="text"
                  inputMode="numeric"
                  value={aed2}
                  onChange={(e) => setAed2(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
              {numAed2 > 0 && (
                <div className="text-blue-500 text-sm mt-1">≈ {formatEUR(Math.round(aedToEur(numAed2)))}</div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <div className="text-gray-400 text-xs">→</div>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Verkauf EUR</div>
              <div className="relative">
                {numEur2 > 0 ? (
                  <div
                    className="text-3xl font-semibold text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d2-eur').focus()}
                  >
                    {formatEUR(numEur2)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={eur2}
                    onChange={(e) => setEur2(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 €"
                    className="text-3xl font-semibold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d2-eur"
                  type="text"
                  inputMode="numeric"
                  value={eur2}
                  onChange={(e) => setEur2(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== DESIGN 3: Zwei separate Boxen ========== */}
        <div className="text-xs text-blue-600 font-medium mb-2 px-1">DESIGN 3 - Zwei separate Boxen</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Einkauf</div>
            <div className="relative">
              {numAed3 > 0 ? (
                <div
                  className="text-2xl font-bold text-gray-900 tabular-nums cursor-text"
                  onClick={() => document.getElementById('d3-aed').focus()}
                >
                  {formatAED(numAed3)}
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  value={aed3}
                  onChange={(e) => setAed3(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 AED"
                  className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                />
              )}
              <input
                id="d3-aed"
                type="text"
                inputMode="numeric"
                value={aed3}
                onChange={(e) => setAed3(e.target.value.replace(/\D/g, ''))}
                className="absolute inset-0 opacity-0 cursor-text"
              />
            </div>
            {numAed3 > 0 && (
              <div className="text-gray-400 text-xs mt-1">≈ {formatEUR(Math.round(aedToEur(numAed3)))}</div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Verkauf</div>
            <div className="relative">
              {numEur3 > 0 ? (
                <div
                  className="text-2xl font-bold text-gray-900 tabular-nums cursor-text"
                  onClick={() => document.getElementById('d3-eur').focus()}
                >
                  {formatEUR(numEur3)}
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  value={eur3}
                  onChange={(e) => setEur3(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 €"
                  className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                />
              )}
              <input
                id="d3-eur"
                type="text"
                inputMode="numeric"
                value={eur3}
                onChange={(e) => setEur3(e.target.value.replace(/\D/g, ''))}
                className="absolute inset-0 opacity-0 cursor-text"
              />
            </div>
          </div>
        </div>

        {/* ========== DESIGN 4: Zentriert mit inneren Boxen ========== */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-blue-600 font-medium mb-4">DESIGN 4 - Zentriert mit inneren Boxen</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Einkauf AED</div>
              <div className="bg-gray-50 rounded-xl p-4 relative">
                {numAed4 > 0 ? (
                  <div
                    className="text-2xl font-bold text-gray-900 tabular-nums text-center cursor-text"
                    onClick={() => document.getElementById('d4-aed').focus()}
                  >
                    {new Intl.NumberFormat('de-DE').format(numAed4)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aed4}
                    onChange={(e) => setAed4(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300 text-center"
                  />
                )}
                <input
                  id="d4-aed"
                  type="text"
                  inputMode="numeric"
                  value={aed4}
                  onChange={(e) => setAed4(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
              {numAed4 > 0 && (
                <div className="text-gray-400 text-xs text-center mt-2">≈ {formatEUR(Math.round(aedToEur(numAed4)))}</div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-2">Verkauf EUR</div>
              <div className="bg-gray-50 rounded-xl p-4 relative">
                {numEur4 > 0 ? (
                  <div
                    className="text-2xl font-bold text-gray-900 tabular-nums text-center cursor-text"
                    onClick={() => document.getElementById('d4-eur').focus()}
                  >
                    {new Intl.NumberFormat('de-DE').format(numEur4)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={eur4}
                    onChange={(e) => setEur4(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300 text-center"
                  />
                )}
                <input
                  id="d4-eur"
                  type="text"
                  inputMode="numeric"
                  value={eur4}
                  onChange={(e) => setEur4(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== DESIGN 5: Mit farbigen Akzenten ========== */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-blue-600 font-medium mb-4">DESIGN 5 - Mit farbigen Akzenten</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-l-4 border-orange-400 pl-4">
              <div className="text-xs text-orange-600 font-medium mb-1">EINKAUF</div>
              <div className="relative">
                {numAed5 > 0 ? (
                  <div
                    className="text-2xl font-bold text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d5-aed').focus()}
                  >
                    {formatAED(numAed5)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aed5}
                    onChange={(e) => setAed5(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 AED"
                    className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d5-aed"
                  type="text"
                  inputMode="numeric"
                  value={aed5}
                  onChange={(e) => setAed5(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
              {numAed5 > 0 && (
                <div className="text-gray-400 text-xs mt-1">≈ {formatEUR(Math.round(aedToEur(numAed5)))}</div>
              )}
            </div>

            <div className="border-l-4 border-green-400 pl-4">
              <div className="text-xs text-green-600 font-medium mb-1">VERKAUF</div>
              <div className="relative">
                {numEur5 > 0 ? (
                  <div
                    className="text-2xl font-bold text-gray-900 tabular-nums cursor-text"
                    onClick={() => document.getElementById('d5-eur').focus()}
                  >
                    {formatEUR(numEur5)}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={eur5}
                    onChange={(e) => setEur5(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 €"
                    className="text-2xl font-bold text-gray-900 tabular-nums w-full bg-transparent border-none outline-none placeholder-gray-300"
                  />
                )}
                <input
                  id="d5-eur"
                  type="text"
                  inputMode="numeric"
                  value={eur5}
                  onChange={(e) => setEur5(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 opacity-0 cursor-text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-400 pt-4">
          Wähle ein Design und sag mir die Nummer!
        </div>
      </div>
    </div>
  );
}
