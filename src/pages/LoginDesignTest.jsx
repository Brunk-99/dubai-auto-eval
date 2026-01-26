import { useState } from 'react';
import { USERS } from '../lib/auth';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';

// Shared form state for all designs
function useLoginForm() {
  const [selectedUser, setSelectedUser] = useState('');
  const [code, setCode] = useState('');

  const userOptions = [
    { value: '', label: 'Wer bist du?' },
    ...USERS.map(u => ({ value: u.id, label: u.name })),
  ];

  return { selectedUser, setSelectedUser, code, setCode, userOptions };
}

// ========== DESIGN 1: Minimalist Card ==========
function Design1() {
  const { selectedUser, setSelectedUser, code, setCode, userOptions } = useLoginForm();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-sm">
        {/* Clean white card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Simple text logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              DAE
            </h1>
            <p className="text-sm text-gray-400 mt-1">Dubai Auto Eval</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-14 px-4 bg-gray-50 border-0 rounded-xl text-gray-900 text-center appearance-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              {userOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-14 px-4 bg-gray-50 border-0 rounded-xl text-gray-900 text-center text-xl tracking-[0.3em] placeholder:tracking-normal placeholder:text-base focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />

            <button
              className="w-full h-14 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              Anmelden
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Nur autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}

// ========== DESIGN 2: Gradient Hero ==========
function Design2() {
  const { selectedUser, setSelectedUser, code, setCode, userOptions } = useLoginForm();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Top section with branding */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">Dubai Auto Eval</h1>
        <p className="text-blue-200">Fahrzeugbewertung</p>
      </div>

      {/* Bottom card */}
      <div className="bg-white rounded-t-[2.5rem] p-8 pt-10">
        <div className="max-w-sm mx-auto space-y-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full h-14 px-4 bg-gray-100 border-0 rounded-2xl text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {userOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="password"
            placeholder="Zugangscode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-14 px-4 bg-gray-100 border-0 rounded-2xl text-gray-900 text-center tracking-widest focus:ring-2 focus:ring-blue-500 transition-all"
          />

          <button className="w-full h-14 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30">
            Einloggen
          </button>

          <p className="text-center text-xs text-gray-400 pt-4">
            Nur autorisierte Nutzer
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== DESIGN 3: Dark Mode ==========
function Design3() {
  const { selectedUser, setSelectedUser, code, setCode, userOptions } = useLoginForm();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div className="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-xl -z-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-1">
          Dubai Auto Eval
        </h1>
        <p className="text-center text-gray-500 mb-10">
          Fahrzeugbewertung
        </p>

        {/* Form */}
        <div className="space-y-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full h-14 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          >
            {userOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <input
            type="password"
            placeholder="Code eingeben"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-14 px-4 bg-gray-900 border border-gray-800 rounded-xl text-white text-center tracking-widest placeholder:tracking-normal focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />

          <button className="w-full h-14 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 active:scale-[0.98] transition-all">
            Zugang
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Nur autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}

// ========== DESIGN 4: Split Screen ==========
function Design4() {
  const { selectedUser, setSelectedUser, code, setCode, userOptions } = useLoginForm();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 items-center justify-center p-12">
        <div className="text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">Dubai Auto Eval</h1>
          <p className="text-blue-200 text-lg">Fahrzeugbewertung für den Import</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dubai Auto Eval</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2 hidden lg:block">Willkommen</h2>
          <p className="text-gray-500 mb-8 hidden lg:block">Melde dich an, um fortzufahren</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Benutzer</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {userOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zugangscode</label>
              <input
                type="password"
                placeholder="****"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <button className="w-full h-12 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all mt-2">
              Anmelden
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Nur autorisierte Nutzer
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== DESIGN 5: Glassmorphism ==========
function Design5() {
  const { selectedUser, setSelectedUser, code, setCode, userOptions } = useLoginForm();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 -right-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-20 animate-pulse" />

      <div className="w-full max-w-sm relative">
        {/* Glass card - darker blue gradient */}
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

          <h1 className="text-2xl font-bold text-center text-white mb-1">
            Dubai Auto Eval
          </h1>
          <p className="text-center text-white/60 mb-8">
            Fahrzeugbewertung
          </p>

          {/* Form */}
          <div className="space-y-4">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-14 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all backdrop-blur-sm [&>option]:text-gray-900"
            >
              {userOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Zugangscode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-14 px-4 bg-white/10 border border-white/20 rounded-xl text-white text-center tracking-widest placeholder:text-white/40 placeholder:tracking-normal focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all backdrop-blur-sm"
            />

            <button className="w-full h-14 bg-white text-gray-900 font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all">
              Einloggen
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-blue-400 mt-6">
          Nur autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}

// ========== MAIN TEST PAGE ==========
export default function LoginDesignTest() {
  const [activeDesign, setActiveDesign] = useState(1);

  const designs = [
    { id: 1, name: 'Minimalist Card', component: Design1 },
    { id: 2, name: 'Gradient Hero', component: Design2 },
    { id: 3, name: 'Dark Mode', component: Design3 },
    { id: 4, name: 'Split Screen', component: Design4 },
    { id: 5, name: 'Glassmorphism', component: Design5 },
  ];

  const ActiveDesign = designs.find(d => d.id === activeDesign)?.component || Design1;

  return (
    <div className="relative">
      {/* Design Switcher */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-lg p-1 flex gap-1">
        {designs.map((design) => (
          <button
            key={design.id}
            onClick={() => setActiveDesign(design.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeDesign === design.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {design.id}
          </button>
        ))}
      </div>

      {/* Design Label */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-sm">
        Design {activeDesign}: {designs.find(d => d.id === activeDesign)?.name}
      </div>

      {/* Active Design */}
      <ActiveDesign />
    </div>
  );
}
