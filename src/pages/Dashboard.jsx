import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllVehicles, getCostDefaults } from '../lib/storage';
import { getAmpelStatus, calculateCosts, getReviewConsensus } from '../lib/calculations';
import { formatCurrency, STATUS_LABELS, STATUS_COLORS } from '../lib/formatters';
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

      {/* User info bar */}
      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">{currentUser?.name?.charAt(0)}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">{currentUser?.name}</span>
            <span className="text-xs text-gray-400 ml-2">
              {userIsAdmin ? 'Admin' : 'Mechaniker'}
            </span>
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

      {/* Stats summary for Admin */}
      {userIsAdmin && vehicles.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-600">
              {filteredAndSortedVehicles.length} Fahrzeuge
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'green').length}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'yellow').length}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">
                  {filteredAndSortedVehicles.filter(v => getAmpelStatus(v, settings).color === 'red').length}
                </span>
              </span>
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

  return (
    <Card onClick={onClick} className="flex gap-3">
      {/* Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={vehicle.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Photo count badge */}
        {(vehicle.photoCount || vehicle.photos?.length || 0) > 1 && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            {vehicle.photoCount || vehicle.photos?.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {vehicle.title || 'Ohne Titel'}
          </h3>
          <Ampel status={ampel} size="md" />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Badge className={STATUS_COLORS[vehicle.status]}>
            {STATUS_LABELS[vehicle.status]}
          </Badge>
          {vehicle.color && (
            <span className="text-xs text-gray-500">{vehicle.color}</span>
          )}
        </div>

        {/* Admin view: Show MaxBid and Profit */}
        {isAdmin && (
          <div className="flex items-center justify-between mt-2 text-sm">
            <div>
              <span className="text-xs text-gray-400">Max: </span>
              <span className="font-medium text-blue-600">
                {formatCurrency(costs.maxBid)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={costs.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {formatCurrency(costs.profit)}
              </span>
              {/* Review consensus indicator */}
              {consensus.total > 0 && (
                <div className="flex items-center gap-0.5">
                  {consensus.green > 0 && (
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  )}
                  {consensus.orange > 0 && (
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  )}
                  {consensus.red > 0 && (
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mechanic view: Show if reviewed and review summary */}
        {!isAdmin && (
          <div className="flex items-center justify-between mt-2 text-sm">
            {myReview ? (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  myReview.recommendation === 'green' ? 'bg-green-500' :
                  myReview.recommendation === 'orange' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-gray-600 text-xs">Bewertet</span>
              </div>
            ) : (
              <span className="text-orange-600 text-xs font-medium">
                Bewertung fehlt
              </span>
            )}
            {vehicle.mileage && (
              <span className="text-gray-400 text-xs">{vehicle.mileage} km</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
