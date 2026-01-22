import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllVehicles, getCostDefaults } from '../lib/storage';
import { getAmpelStatus, calculateCosts, getReviewConsensus, aedToEur } from '../lib/calculations';
import { formatCurrency, formatMileage, STATUS_LABELS, STATUS_COLORS } from '../lib/formatters';
import { isAdmin, getCurrentUser, clearCurrentUser } from '../lib/auth';
import Header from '../components/Header';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Ampel from '../components/Ampel';
import FloatingButton from '../components/FloatingButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import Select from '../components/Select';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle Status' },
  { value: 'watching', label: 'Beobachten' },
  { value: 'bid_placed', label: 'Gebot aktiv' },
  { value: 'bought', label: 'Gekauft' },
  { value: 'rejected', label: 'Abgelehnt' },
];

const AMPEL_OPTIONS = [
  { value: '', label: 'Alle Ampeln' },
  { value: 'green', label: 'Grün' },
  { value: 'yellow', label: 'Gelb' },
  { value: 'red', label: 'Rot' },
];

const SORT_OPTIONS_ADMIN = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'maxBid', label: 'Max-Gebot (hoch→niedrig)' },
  { value: 'profit', label: 'Profit (hoch→niedrig)' },
  { value: 'price', label: 'Preis (niedrig→hoch)' },
];

const SORT_OPTIONS_MECHANIC = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'needsReview', label: 'Braucht Bewertung' },
];

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ampelFilter, setAmpelFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userIsAdmin = isAdmin();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[Dashboard] loadData starting...');
    try {
      const [vehicleData, costDefaults] = await Promise.all([
        getAllVehicles(),
        getCostDefaults(),
      ]);
      console.log('[Dashboard] loadData - vehicleData received:', vehicleData?.length || 0, 'vehicles');
      console.log('[Dashboard] loadData - vehicle IDs:', vehicleData?.map(v => v.id) || []);
      setVehicles(vehicleData || []);
      setSettings(costDefaults);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedVehicles = useMemo(() => {
    let result = [...vehicles];

    // Filter by search
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(v =>
        v.title?.toLowerCase().includes(term) ||
        v.vin?.toLowerCase().includes(term) ||
        v.color?.toLowerCase().includes(term) ||
        v.auctionLocation?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter) {
      result = result.filter(v => v.status === statusFilter);
    }

    // Filter by ampel
    if (ampelFilter) {
      result = result.filter(v => {
        const ampel = getAmpelStatus(v, settings);
        return ampel.color === ampelFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'maxBid': {
          const maxBidA = calculateCosts(a, settings).maxBid;
          const maxBidB = calculateCosts(b, settings).maxBid;
          return maxBidB - maxBidA;
        }
        case 'profit': {
          const profitA = calculateCosts(a, settings).profit;
          const profitB = calculateCosts(b, settings).profit;
          return profitB - profitA;
        }
        case 'price':
          return (a.finalBid || a.startBid || 0) - (b.finalBid || b.startBid || 0);
        case 'needsReview': {
          // Vehicles without this mechanic's review come first
          const hasReviewA = (a.reviews || []).some(r => r.mechanicId === currentUser?.id);
          const hasReviewB = (b.reviews || []).some(r => r.mechanicId === currentUser?.id);
          if (!hasReviewA && hasReviewB) return -1;
          if (hasReviewA && !hasReviewB) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return result;
  }, [vehicles, search, statusFilter, ampelFilter, sortBy, settings, currentUser]);

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/', { replace: true });
  };

  const handleAddVehicle = () => {
    navigate('/vehicle/new');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const sortOptions = userIsAdmin ? SORT_OPTIONS_ADMIN : SORT_OPTIONS_MECHANIC;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header
        title="Fahrzeuge"
        rightAction={
          <div className="flex items-center gap-2">
            {userIsAdmin && (
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Einstellungen"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 active:text-gray-900 px-2 py-1"
            >
              Abmelden
            </button>
          </div>
        }
      />

      {/* User info bar - Enhanced */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-lg">{currentUser?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{currentUser?.name}</p>
              <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                userIsAdmin
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {userIsAdmin ? '👑 Admin' : '🔧 Mechaniker'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Willkommen zurück!</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-3 bg-white border-b border-gray-100">
        <Input
          placeholder="Suchen (Titel, VIN, Farbe...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="flex-1"
          />
          <Select
            value={ampelFilter}
            onChange={(e) => setAmpelFilter(e.target.value)}
            options={AMPEL_OPTIONS}
            className="flex-1"
          />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={sortOptions}
          className="w-full"
        />
      </div>

      {/* Stats summary for Admin - Enhanced */}
      {userIsAdmin && vehicles.length > 0 && (
        <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs uppercase tracking-wider">Fahrzeuge</p>
              <p className="text-white text-2xl font-bold">{filteredAndSortedVehicles.length}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center bg-white/10 rounded-xl px-3 py-2">
                <div className="w-4 h-4 rounded-full bg-green-400 shadow-lg shadow-green-500/30"></div>
                <span className="text-white font-bold text-lg mt-1">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'green').length}
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/10 rounded-xl px-3 py-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-lg shadow-yellow-500/30"></div>
                <span className="text-white font-bold text-lg mt-1">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'yellow').length}
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/10 rounded-xl px-3 py-2">
                <div className="w-4 h-4 rounded-full bg-red-400 shadow-lg shadow-red-500/30"></div>
                <span className="text-white font-bold text-lg mt-1">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'red').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      <div className="p-4 space-y-3">
        {filteredAndSortedVehicles.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
            title={search || statusFilter || ampelFilter ? 'Keine Treffer' : 'Noch keine Fahrzeuge'}
            description={
              search || statusFilter || ampelFilter
                ? 'Versuche andere Suchbegriffe oder Filter'
                : userIsAdmin
                  ? 'Füge dein erstes Fahrzeug hinzu'
                  : 'Warte auf neue Fahrzeuge'
            }
          />
        ) : (
          filteredAndSortedVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              settings={settings}
              isAdmin={userIsAdmin}
              currentUser={currentUser}
              onClick={() => navigate(`/vehicle/${vehicle.id}`)}
            />
          ))
        )}
      </div>

      {/* Add button (Admin only) */}
      {userIsAdmin && (
        <FloatingButton onClick={handleAddVehicle}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </FloatingButton>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, settings, isAdmin, currentUser, onClick }) {
  const costs = calculateCosts(vehicle, settings);
  const ampel = getAmpelStatus(vehicle, settings);
  const consensus = getReviewConsensus(vehicle.reviews);
  // Thumbnail kommt aus separatem Storage (thumbnailPhoto) oder aus photos Array
  const thumbnail = vehicle.thumbnailPhoto?.data || vehicle.photos?.[0]?.data;

  // For mechanics: check if they've reviewed this vehicle
  const myReview = !isAdmin
    ? (vehicle.reviews || []).find(r => r.mechanicId === currentUser?.id)
    : null;

  // Check if vehicle has any reviews (for admin view)
  const hasReviews = (vehicle.reviews || []).length > 0;

  // Get border color based on ampel status
  const getBorderColor = () => {
    switch (ampel.color) {
      case 'green': return 'border-l-green-500';
      case 'yellow': return 'border-l-yellow-500';
      case 'red': return 'border-l-red-500';
      default: return 'border-l-gray-300';
    }
  };

  // Get background gradient based on review status
  const getCardBackground = () => {
    if (isAdmin) {
      return hasReviews ? 'bg-gradient-to-r from-green-50/50 to-white' : 'bg-gradient-to-r from-orange-50/50 to-white';
    } else {
      return myReview ? 'bg-gradient-to-r from-green-50/50 to-white' : 'bg-gradient-to-r from-orange-50/50 to-white';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${getCardBackground()}`}
    >
      {/* Left accent border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBorderColor()}`} />

      <div className="flex gap-3 p-4 pl-5">
        {/* Thumbnail with enhanced styling */}
        <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl overflow-hidden relative shadow-inner">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={vehicle.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Photo count badge */}
          {(vehicle.photoCount || vehicle.photos?.length || 0) > 1 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs px-2 py-0.5 rounded-lg font-medium backdrop-blur-sm">
              📷 {vehicle.photoCount || vehicle.photos?.length}
            </div>
          )}
          {/* Ampel indicator overlay */}
          <div className="absolute top-1.5 right-1.5">
            <Ampel status={ampel} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Header row */}
          <div>
            <h3 className="font-bold text-gray-900 truncate text-base">
              {vehicle.title || 'Ohne Titel'}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`${STATUS_COLORS[vehicle.status]} shadow-sm`}>
                {STATUS_LABELS[vehicle.status]}
              </Badge>
              {vehicle.color && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{vehicle.color}</span>
              )}
              {vehicle.year && (
                <span className="text-xs text-gray-400">{vehicle.year}</span>
              )}
            </div>
          </div>

          {/* Admin view: Enhanced financial display */}
          {isAdmin && (
            <div className="mt-2">
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-0.5">
                  {/* Start Bid (converted to EUR) */}
                  {(vehicle.startBid || vehicle.finalBid) > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">Start</span>
                      <span className="text-sm font-medium text-gray-600">
                        {formatCurrency(aedToEur(vehicle.finalBid || vehicle.startBid))}
                      </span>
                    </div>
                  )}
                  {/* Max Bid (EUR) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-blue-500 uppercase tracking-wide">Max</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(costs.maxBid)}
                    </span>
                  </div>
                </div>

                {/* Profit display */}
                <div className="text-right">
                  <div className={`text-lg font-bold ${costs.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {costs.profit >= 0 ? '+' : ''}{formatCurrency(costs.profit)}
                  </div>
                  {/* Review consensus indicator */}
                  {consensus.total > 0 && (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{consensus.total} Reviews</span>
                      <div className="flex items-center gap-0.5">
                        {consensus.green > 0 && (
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                        )}
                        {consensus.orange > 0 && (
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
                        )}
                        {consensus.red > 0 && (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mechanic view: Enhanced review status */}
          {!isAdmin && (
            <div className="flex items-center justify-between mt-2">
              {myReview ? (
                <div className="flex items-center gap-2 bg-green-100 px-2.5 py-1 rounded-full">
                  <div className={`w-3 h-3 rounded-full shadow-sm ${
                    myReview.recommendation === 'green' ? 'bg-green-500' :
                    myReview.recommendation === 'orange' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-green-700 text-xs font-medium">Bewertet</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-orange-100 px-2.5 py-1 rounded-full animate-pulse">
                  <span className="text-orange-600">⚡</span>
                  <span className="text-orange-700 text-xs font-medium">Bewertung fehlt</span>
                </div>
              )}
              {vehicle.mileage && (
                <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {formatMileage(vehicle.mileage)} km
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
