import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVehicle, saveVehicle, createMechanicReview, getCostDefaults } from '../lib/storage';
import { calculateCosts, getAmpelStatus, getReviewConsensus, RECOMMENDATION_LABELS, RECOMMENDATION_COLORS } from '../lib/calculations';
import { analyzeVehicleDamage } from '../lib/damageAnalysis';
import { compressImage, isValidImageType } from '../lib/imageUtils';
import {
  formatCurrency,
  formatPercent,
  formatDateTime,
  formatMileage,
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  parseCurrencyInput,
} from '../lib/formatters';
import { isAdmin, isMechanic, getCurrentUser } from '../lib/auth';
import Header from '../components/Header';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';
import Ampel from '../components/Ampel';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ImageGallery from '../components/ImageGallery';
import Lightbox from '../components/Lightbox';

// UUID Generator (safe for non-HTTPS)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('info');
  const currentUser = getCurrentUser();
  const userIsAdmin = isAdmin();
  const userIsMechanic = isMechanic();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    const [vehicleData, costDefaults] = await Promise.all([
      getVehicle(id),
      getCostDefaults(),
    ]);

    if (vehicleData) {
      setVehicle(vehicleData);
      setSettings(costDefaults);
    } else {
      navigate('/dashboard', { replace: true });
    }
    setLoading(false);
  };

  const updateVehicle = async (updates) => {
    const updated = {
      ...vehicle,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
    };
    await saveVehicle(updated);
    setVehicle(updated);
  };

  if (loading || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const costs = calculateCosts(vehicle, settings);
  const ampel = getAmpelStatus(vehicle, settings);

  // Determine which tabs to show based on role
  const showCostsTab = userIsAdmin;
  const showAllReviews = userIsAdmin;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        title={vehicle.title || 'Details'}
        showBack
        backTo="/dashboard"
        rightAction={
          userIsAdmin && (
            <button
              onClick={() => navigate(`/vehicle/${id}/edit`)}
              className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )
        }
      />

      {/* Quick Stats Bar - Different for Admin vs Mechanic */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ampel status={ampel} size="lg" showLabel />
          </div>
          {userIsAdmin ? (
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Max. Gebot</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(costs.maxBidAED, 'AED')}
              </p>
              <p className="text-xs text-gray-400">
                ({formatCurrency(costs.maxBid)})
              </p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-xs text-gray-500">Deine Bewertung zählt</p>
            </div>
          )}
        </div>

        {/* Admin: Show profit below */}
        {userIsAdmin && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">Profit bei aktuellem Gebot</span>
            <span className={`font-bold ${costs.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(costs.profit)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs - Different for Admin vs Mechanic */}
      <div className="sticky top-14 z-30 bg-gray-50 px-4 py-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="damage">Schaden</TabsTrigger>
            <TabsTrigger value="reviews">
              {userIsMechanic ? 'Bewerten' : 'Reviews'}
            </TabsTrigger>
            {showCostsTab && <TabsTrigger value="costs">Kosten</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        <Tabs value={activeTab}>
          <TabsContent value="info">
            <InfoTab vehicle={vehicle} isAdmin={userIsAdmin} />
          </TabsContent>

          <TabsContent value="photos">
            <PhotosTab vehicle={vehicle} onUpdate={updateVehicle} isAdmin={userIsAdmin} />
          </TabsContent>

          <TabsContent value="damage">
            <DamageTab vehicle={vehicle} onUpdate={updateVehicle} costs={costs} isAdmin={userIsAdmin} />
          </TabsContent>

          <TabsContent value="reviews">
            {userIsAdmin ? (
              <AdminReviewsTab vehicle={vehicle} onUpdate={updateVehicle} />
            ) : (
              <MechanicReviewTab vehicle={vehicle} onUpdate={updateVehicle} currentUser={currentUser} navigate={navigate} />
            )}
          </TabsContent>

          {showCostsTab && (
            <TabsContent value="costs">
              <CostsTab vehicle={vehicle} costs={costs} settings={settings} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Comments Section - Only for Admin */}
      {userIsAdmin && (
        <div className="px-4 mt-6">
          <CommentsSection vehicle={vehicle} onUpdate={updateVehicle} currentUser={currentUser} />
        </div>
      )}
    </div>
  );
}

// ============ INFO TAB ============
function InfoTab({ vehicle, isAdmin }) {
  // SVG Icons (alle in blue-600)
  const StatusIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const CarIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
  const MoneyIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  const LocationIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const ClockIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {/* Status Section */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <StatusIcon />
          </div>
          <h3 className="font-semibold text-gray-900">Status</h3>
        </div>
        <Badge className={`${STATUS_COLORS[vehicle.status]} text-sm px-3 py-1.5`}>
          {STATUS_LABELS[vehicle.status]}
        </Badge>
      </Card>

      {/* Vehicle Data Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <CarIcon />
          </div>
          <h3 className="font-semibold text-gray-900">Fahrzeugdaten</h3>
        </div>
        <div className="space-y-3">
          {vehicle.year && <InfoRow label="Baujahr">{vehicle.year}</InfoRow>}
          {vehicle.color && <InfoRow label="Farbe">{vehicle.color}</InfoRow>}
          {vehicle.mileage && <InfoRow label="Kilometerstand">{formatMileage(vehicle.mileage)} km</InfoRow>}
          {vehicle.vin && <InfoRow label="VIN" mono>{vehicle.vin}</InfoRow>}
        </div>
      </Card>

      {/* Auction Section */}
      {vehicle.auctionLocation && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <LocationIcon />
            </div>
            <h3 className="font-semibold text-gray-900">Auktion</h3>
          </div>
          <InfoRow label="Auktionsort">{vehicle.auctionLocation}</InfoRow>
        </Card>
      )}

      {/* Financial Info - Admin Only */}
      {isAdmin && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MoneyIcon />
            </div>
            <h3 className="font-semibold text-gray-900">Finanzdaten</h3>
          </div>
          <div className="space-y-3">
            <InfoRow label="Startgebot">{formatCurrency(vehicle.startBid, 'AED')}</InfoRow>
            <InfoRow label="Endpreis">{formatCurrency(vehicle.finalBid, 'AED')}</InfoRow>
            <InfoRow label="Vergleichspreis DE" highlight>{formatCurrency(vehicle.marketPriceDE)}</InfoRow>
          </div>
        </Card>
      )}

      {/* Notes Section */}
      {vehicle.notes && (
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notizen</p>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{vehicle.notes}</p>
        </Card>
      )}

      {/* Meta Info */}
      <Card className="bg-gray-50 border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <ClockIcon />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Verlauf</h3>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          {vehicle.createdBy && <p>Erstellt von: {vehicle.createdBy.name}</p>}
          <p>Erstellt: {formatDateTime(vehicle.createdAt)}</p>
          {vehicle.updatedBy && <p>Bearbeitet von: {vehicle.updatedBy.name}</p>}
          <p>Aktualisiert: {formatDateTime(vehicle.updatedAt)}</p>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, children, mono, highlight }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 last:pb-0 first:pt-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono text-sm' : ''} ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {children}
      </span>
    </div>
  );
}

// ============ PHOTOS TAB ============
function PhotosTab({ vehicle, onUpdate, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const newPhotos = [];

      for (const file of files) {
        if (!isValidImageType(file)) {
          console.warn('Skipping invalid file type:', file.type);
          continue;
        }

        const compressed = await compressImage(file);
        newPhotos.push({
          id: generateUUID(),
          createdAt: new Date().toISOString(),
          data: compressed,
          caption: '',
        });
      }

      if (newPhotos.length > 0) {
        await onUpdate({
          photos: [...(vehicle.photos || []), ...newPhotos],
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Foto-Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!isAdmin) return;
    const updated = (vehicle.photos || []).filter(p => p.id !== photoId);
    await onUpdate({ photos: updated });
    // Close lightbox if no photos left
    if (updated.length === 0) {
      setLightboxOpen(false);
    }
  };

  const handlePhotoClick = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Upload Buttons - Only for Admin */}
      {isAdmin && (
        <div className="flex gap-3">
          {/* Camera Button */}
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-pointer hover:border-blue-400 active:bg-gray-50 transition-colors">
              {uploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-600 font-medium text-sm">Kamera</span>
                </>
              )}
            </div>
          </label>

          {/* Gallery Button */}
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-white cursor-pointer hover:border-blue-400 active:bg-gray-50 transition-colors">
              {uploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-600 font-medium text-sm">Galerie</span>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Photo Gallery with Swipe */}
      {vehicle.photos?.length > 0 ? (
        <ImageGallery
          photos={vehicle.photos}
          onPhotoClick={handlePhotoClick}
        />
      ) : (
        <EmptyState
          title="Keine Fotos"
          description="Keine Fotos vorhanden"
        />
      )}

      {/* Fullscreen Lightbox */}
      <Lightbox
        photos={vehicle.photos || []}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={handleDeletePhoto}
        canDelete={isAdmin}
      />
    </div>
  );
}

// ============ DAMAGE TAB ============
// Globaler Store für laufende Analysen (bleibt bei Tab-Wechsel erhalten)
const runningAnalyses = new Map();

function DamageTab({ vehicle, onUpdate, costs, isAdmin }) {
  const [progress, setProgress] = useState(null);
  const analyzeInProgress = useRef(false); // Zusätzliche Sicherung gegen Doppelklick
  const report = vehicle.aiDamageReport;

  // Prüfe ob bereits eine Analyse für dieses Fahrzeug läuft
  const isAnalyzing = runningAnalyses.has(vehicle.id) || vehicle.analysisStatus === 'analyzing';

  // Beim Mount: Prüfe ob Analyse bereits läuft und setze Progress
  useEffect(() => {
    const existing = runningAnalyses.get(vehicle.id);
    if (existing) {
      setProgress(existing.progress);
    }
  }, [vehicle.id]);

  const handleAnalyze = async () => {
    if (!vehicle.photos?.length) {
      alert('Bitte füge zuerst Fotos hinzu');
      return;
    }

    // DREIFACHE Sicherung gegen Doppelstart
    if (analyzeInProgress.current) {
      console.log('[DamageTab] Blocked by ref - already in progress');
      return;
    }
    if (runningAnalyses.has(vehicle.id)) {
      console.log('[DamageTab] Blocked by global map - already running for', vehicle.id);
      return;
    }
    if (isAnalyzing) {
      console.log('[DamageTab] Blocked by isAnalyzing state');
      return;
    }

    // Sofort blockieren
    analyzeInProgress.current = true;
    console.log('[DamageTab] Starting analysis for', vehicle.id);

    // Markiere als laufend (global + in DB)
    const analysisState = {
      progress: { status: 'starting', attempt: 0, maxAttempts: 60 },
      aborted: false
    };
    runningAnalyses.set(vehicle.id, analysisState);
    setProgress(analysisState.progress);

    // Speichere Status in DB damit es bei Reload sichtbar ist
    await onUpdate({ analysisStatus: 'analyzing' });

    try {
      const result = await analyzeVehicleDamage(
        vehicle.photos,
        {
          title: vehicle.title,
          mileage: vehicle.mileage,
        },
        {
          enableNotifications: true,
          onProgress: (progressInfo) => {
            // Prüfe ob abgebrochen
            const state = runningAnalyses.get(vehicle.id);
            if (!state || state.aborted) {
              console.log('[DamageTab] Analysis aborted, ignoring progress');
              return;
            }
            state.progress = progressInfo;
            setProgress(progressInfo);
          },
        }
      );

      // Prüfe ob noch aktiv (könnte durch Cleanup abgebrochen sein)
      const state = runningAnalyses.get(vehicle.id);
      if (!state || state.aborted) {
        console.log('[DamageTab] Analysis was aborted, not saving result');
        return;
      }

      // Analyse beendet - aufräumen
      console.log('[DamageTab] Analysis completed for', vehicle.id, '- success:', result.success);
      runningAnalyses.delete(vehicle.id);

      if (result.success) {
        await onUpdate({
          aiDamageReport: result.report,
          analysisStatus: 'completed'
        });
        setProgress(null);
      } else {
        await onUpdate({ analysisStatus: 'failed' });
        alert(result.error || 'Analyse fehlgeschlagen');
        setProgress(null);
      }
    } catch (error) {
      console.error('[DamageTab] Analysis failed:', error);

      // Nur aufräumen wenn noch aktiv
      const state = runningAnalyses.get(vehicle.id);
      if (state && !state.aborted) {
        runningAnalyses.delete(vehicle.id);
        await onUpdate({ analysisStatus: 'failed' });
        alert('Analyse fehlgeschlagen: ' + error.message);
      }
      setProgress(null);
    } finally {
      // IMMER freigeben am Ende
      analyzeInProgress.current = false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Analyze Button - Only for Admin */}
      {isAdmin && (
        <Button
          fullWidth
          onClick={handleAnalyze}
          loading={isAnalyzing}
          disabled={!vehicle.photos?.length || isAnalyzing}
        >
          {isAnalyzing ? 'Analysiere...' : report ? 'Erneut analysieren' : 'KI-Schadensanalyse starten'}
        </Button>
      )}

      {/* Progress Indicator */}
      {isAnalyzing && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                {!progress && 'Analyse läuft...'}
                {progress?.status === 'starting' && 'Analyse wird gestartet...'}
                {progress?.status === 'pending' && 'In Warteschlange...'}
                {progress?.status === 'processing' && 'KI analysiert Bilder...'}
              </p>
              <p className="text-xs text-blue-600">
                {progress?.attempt > 0 && `Versuch ${progress.attempt}/${progress.maxAttempts}`}
                {progress?.elapsedMs > 0 && ` • ${Math.round(progress.elapsedMs / 1000)}s`}
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Du kannst die App weiter nutzen. Du wirst benachrichtigt, wenn die Analyse fertig ist.
          </p>
        </Card>
      )}

      {report ? (
        <div className="space-y-4">
          {/* Hero Card - Schweregrad & Kosten */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white p-5">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
                <rect width="100" height="100" fill="url(#grid)"/>
              </svg>
            </div>

            <div className="relative">
              {/* Schweregrad Anzeige */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Technischer Schweregrad</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold">{report.schweregrad || Math.round(report.severityScore / 10)}</span>
                    <span className="text-gray-400 text-lg">/10</span>
                  </div>
                </div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  report.schweregrad >= 7 ? 'bg-red-500/20' :
                  report.schweregrad >= 4 ? 'bg-orange-500/20' :
                  'bg-green-500/20'
                }`}>
                  <span className="text-3xl">
                    {report.schweregrad >= 7 ? '🔴' : report.schweregrad >= 4 ? '🟠' : '🟢'}
                  </span>
                </div>
              </div>

              {/* Schweregrad Balken */}
              <div className="mb-4">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      report.schweregrad >= 7 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      report.schweregrad >= 4 ? 'bg-gradient-to-r from-orange-500 to-yellow-400' :
                      'bg-gradient-to-r from-green-500 to-green-400'
                    }`}
                    style={{ width: `${(report.schweregrad || report.severityScore / 10) * 10}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Kosmetisch</span>
                  <span>Mittel</span>
                  <span>Schwer</span>
                </div>
              </div>

              {/* Fahrbereit Status */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                report.fahrbereit === 'YES' ? 'bg-green-500/20 text-green-300' :
                report.fahrbereit === 'NO' ? 'bg-red-500/20 text-red-300' :
                'bg-yellow-500/20 text-yellow-300'
              }`}>
                <span>{report.fahrbereit === 'YES' ? '✓' : report.fahrbereit === 'NO' ? '✕' : '?'}</span>
                <span>
                  {report.fahrbereit === 'YES' ? 'Fahrbereit' :
                   report.fahrbereit === 'NO' ? 'Nicht fahrbereit' : 'Prüfung erforderlich'}
                </span>
              </div>
            </div>
          </div>

          {/* Kosten-Übersicht Card */}
          {report.kostenAed?.gesamtRange && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">💰 Geschätzte Reparaturkosten</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {report.kostenEur?.gesamtRange?.mid?.toLocaleString('de-DE') || Math.round(report.kostenAed.gesamtRange.mid / 4.29).toLocaleString('de-DE')}
                    </span>
                    <span className="text-blue-200 text-lg">€</span>
                  </div>
                  <p className="text-blue-300 text-sm mt-1">
                    {report.kostenEur?.gesamtRange?.low?.toLocaleString('de-DE') || Math.round(report.kostenAed.gesamtRange.low / 4.29).toLocaleString('de-DE')} – {report.kostenEur?.gesamtRange?.high?.toLocaleString('de-DE') || Math.round(report.kostenAed.gesamtRange.high / 4.29).toLocaleString('de-DE')} €
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-300 text-xs">In AED</p>
                  <p className="text-lg font-semibold">{report.kostenAed.gesamtRange.mid?.toLocaleString('de-DE')}</p>
                  <p className="text-blue-300 text-xs">Kurs: {report.kostenEur?.kurs || 4.29}</p>
                </div>
              </div>

              {/* Kosten-Aufschlüsselung */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-200 text-xs mb-1">🔩 Teile</p>
                  <p className="font-semibold">{report.kostenAed.teileRange?.mid?.toLocaleString('de-DE') || '–'} AED</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-200 text-xs mb-1">🔧 Arbeit</p>
                  <p className="font-semibold">{report.kostenAed.arbeitRange?.mid?.toLocaleString('de-DE') || '–'} AED</p>
                </div>
              </div>

              {/* Annahmen */}
              {report.kostenAed.annahmen?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-blue-200 text-xs mb-1">Annahmen:</p>
                  <div className="flex flex-wrap gap-1">
                    {report.kostenAed.annahmen.map((a, i) => (
                      <span key={i} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bauteil & Analyse */}
          <Card className="border-0 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">📋</div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Hauptschaden</p>
                <p className="font-semibold text-gray-900">{report.bauteil}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{report.schadenAnalyse || report.summary}</p>

            {/* Reparaturweg */}
            {report.reparaturWeg && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Empfohlener Reparaturweg</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(report.reparaturWeg) ? report.reparaturWeg : [report.reparaturWeg]).map((weg, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {weg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Legacy Stats (für alte Reports ohne neue Felder) */}
          {!report.kostenAed?.gesamtRange && report.estimatedRepairCost > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">KI-Reparaturschätzung</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(report.estimatedRepairCost)}
                </span>
              </div>
            </Card>
          )}

          {/* V2: Teileliste - Muss ersetzt werden */}
          {report.teileliste?.mussErsetztWerden?.length > 0 && (
            <div className="rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg">⚠️</span>
                  <span className="text-white font-semibold">Muss ersetzt werden</span>
                </div>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {report.teileliste.mussErsetztWerden.length} {report.teileliste.mussErsetztWerden.length === 1 ? 'Teil' : 'Teile'}
                </span>
              </div>
              {/* Items */}
              <div className="bg-red-50 divide-y divide-red-100">
                {report.teileliste.mussErsetztWerden.map((teil, i) => (
                  <div key={i} className="p-4 hover:bg-red-100/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-600 text-sm font-bold">{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{teil.teilBezeichnung}</p>
                          <p className="text-sm text-red-600 mt-0.5">{teil.grund}</p>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        teil.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                        teil.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {Math.round(teil.confidence * 100)}%
                      </div>
                    </div>
                    {teil.evidence && (
                      <p className="text-xs text-gray-500 italic ml-11 bg-white/50 rounded px-2 py-1">
                        💬 "{teil.evidence}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* V2: Teileliste - Prüfen */}
          {report.teileliste?.vermutlichDefektPruefen?.length > 0 && (
            <div className="rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg">🔍</span>
                  <span className="text-white font-semibold">Zu prüfen</span>
                </div>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {report.teileliste.vermutlichDefektPruefen.length} {report.teileliste.vermutlichDefektPruefen.length === 1 ? 'Teil' : 'Teile'}
                </span>
              </div>
              {/* Items */}
              <div className="bg-orange-50 divide-y divide-orange-100">
                {report.teileliste.vermutlichDefektPruefen.map((teil, i) => (
                  <div key={i} className="p-4 hover:bg-orange-100/50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-orange-600 text-sm font-bold">{i + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{teil.teilBezeichnung}</p>
                          <p className="text-sm text-orange-600 mt-0.5">{teil.verdacht}</p>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        teil.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                        teil.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {Math.round(teil.confidence * 100)}%
                      </div>
                    </div>
                    <div className="ml-11 flex items-center gap-2 text-xs text-gray-600 bg-white/50 rounded px-2 py-1.5">
                      <span>🔧</span>
                      <span>{teil.pruefung}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* V2: Arbeitszeit-Aufschlüsselung */}
          {report.arbeitszeitSchaetzung?.posten?.length > 0 && (
            <Card className="border-0 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600">⏱️</span>
                </div>
                <p className="font-semibold text-gray-900">Arbeitszeit</p>
              </div>
              <div className="space-y-3">
                {report.arbeitszeitSchaetzung.posten.filter(p => p.stunden > 0).map((posten, i) => {
                  const maxStunden = Math.max(...report.arbeitszeitSchaetzung.posten.map(p => p.stunden));
                  const percent = (posten.stunden / maxStunden) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{posten.name}</span>
                        <span className="font-medium text-gray-900">{posten.stunden}h</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {report.arbeitszeitSchaetzung.stundenRange && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Gesamt</span>
                    <span className="text-lg font-bold text-purple-600">
                      {report.arbeitszeitSchaetzung.stundenRange.mid}h
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* V2: Risk Flags */}
          {report.riskFlags?.length > 0 && (
            <div className="rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-400 px-4 py-3 flex items-center gap-2">
                <span className="text-white text-lg">⚡</span>
                <span className="text-white font-semibold">Risiko-Hinweise</span>
              </div>
              <div className="bg-yellow-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {report.riskFlags.map((flag, i) => {
                    const translations = {
                      'HEADLIGHT_MISSING': '💡 Scheinwerfer fehlt',
                      'BUMPER_STRUCTURAL_SUSPECT': '🛡️ Stoßfänger-Struktur prüfen',
                      'RADIATOR_SUPPORT_SUSPECT': '🌡️ Kühlerträger prüfen',
                      'ADAS_SENSOR_SUSPECT': '📡 Fahrassistenz-Sensoren prüfen',
                      'SUSPENSION_ALIGNMENT_SUSPECT': '🔄 Fahrwerk/Spur prüfen',
                      'AIRBAG_DEPLOYED_SUSPECT': '🎈 Airbag ausgelöst?',
                      'FLUID_LEAK_SUSPECT': '💧 Flüssigkeitsaustritt prüfen',
                      'FRAME_DAMAGE_SUSPECT': '🔩 Rahmenschaden möglich',
                    };
                    const label = translations[flag] || flag;
                    return (
                      <span key={i} className="text-sm px-3 py-1.5 rounded-full bg-white text-yellow-800 font-medium shadow-sm border border-yellow-200">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Legacy: Damaged Parts with Hours (fallback für alte Reports) */}
          {!report.teileliste && report.damageDetails?.length > 0 && (
            <Card>
              <p className="text-xs text-gray-500 mb-3">Beschädigte Teile</p>
              <div className="space-y-2">
                {report.damageDetails.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{d.area}</p>
                      <p className="text-sm text-gray-500">{d.type}</p>
                    </div>
                    {d.repairHours > 0 && (
                      <span className="text-sm text-gray-600">{d.repairHours}h</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Affected Areas */}
          {report.affectedParts?.length > 0 && (
            <Card>
              <p className="text-xs text-gray-500 mb-2">Betroffene Bereiche</p>
              <div className="flex flex-wrap gap-2">
                {report.affectedParts.map((area, i) => (
                  <Badge key={i} variant="default">{area}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Warnings */}
          {report.warnings?.length > 0 && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-600 font-medium mb-2">Warnungen</p>
              <ul className="space-y-1 text-sm text-red-700">
                {report.warnings.map((w, i) => (
                  <li key={i}>⚠️ {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-2">Empfehlungen</p>
              <ul className="space-y-1 text-sm text-blue-700">
                {report.recommendations.map((r, i) => (
                  <li key={i}>💡 {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta Info */}
          <p className="text-xs text-gray-400 text-center">
            Analysiert: {formatDateTime(report.createdAt)} | {report.photosAnalyzed} Fotos
            {report.rawJson?.model && ` | ${report.rawJson.model}`}
          </p>
        </div>
      ) : (
        <EmptyState
          title="Keine Analyse"
          description={isAdmin ? "Starte die KI-Schadensanalyse" : "Noch keine KI-Analyse vorhanden"}
        />
      )}
    </div>
  );
}

// ============ ADMIN REVIEWS TAB ============
function AdminReviewsTab({ vehicle, onUpdate }) {
  const consensus = getReviewConsensus(vehicle.reviews);

  // SVG Icons
  const UsersIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  // Calculate average repair estimate
  const estimates = (vehicle.reviews || [])
    .map(r => r.repairEstimate)
    .filter(e => typeof e === 'number' && e > 0);
  const avgRepairEstimate = estimates.length > 0
    ? estimates.reduce((a, b) => a + b, 0) / estimates.length
    : 0;

  const handleDeleteReview = async (reviewId) => {
    const updated = (vehicle.reviews || []).filter(r => r.id !== reviewId);
    await onUpdate({ reviews: updated });
  };

  return (
    <div className="space-y-4">
      {/* Consensus Summary */}
      {consensus.total > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <UsersIcon />
            </div>
            <h3 className="font-semibold text-gray-900">Mechaniker-Konsens</h3>
            <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
              {consensus.total} {consensus.total === 1 ? 'Bewertung' : 'Bewertungen'}
            </span>
          </div>

          {/* Visual Consensus Bar */}
          <div className="mb-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
              {consensus.green > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(consensus.green / consensus.total) * 100}%` }}
                />
              )}
              {consensus.orange > 0 && (
                <div
                  className="bg-orange-500 transition-all"
                  style={{ width: `${(consensus.orange / consensus.total) * 100}%` }}
                />
              )}
              {consensus.red > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(consensus.red / consensus.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="text-gray-600">{consensus.green} Kaufen</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-gray-600">{consensus.orange} Prüfen</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-gray-600">{consensus.red} Ablehnen</span>
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            {consensus.dominant && (
              <div>
                <span className="text-xs text-gray-500">Tendenz</span>
                <p className={`font-semibold ${
                  consensus.dominant === 'green' ? 'text-green-600' :
                  consensus.dominant === 'orange' ? 'text-orange-600' :
                  'text-red-600'
                }`}>{RECOMMENDATION_LABELS[consensus.dominant]}</p>
              </div>
            )}
            {avgRepairEstimate > 0 && (
              <div className="text-right">
                <span className="text-xs text-gray-500">Ø Reparatur</span>
                <p className="font-semibold text-gray-900">{formatCurrency(avgRepairEstimate)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* All Reviews */}
      {vehicle.reviews?.length > 0 ? (
        <div className="space-y-3">
          {vehicle.reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    review.recommendation === 'green' ? 'bg-green-500' :
                    review.recommendation === 'orange' ? 'bg-orange-500' :
                    review.recommendation === 'red' ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {review.mechanicName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.mechanicName}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</p>
                  </div>
                </div>
                {review.recommendation && (
                  <Badge className={RECOMMENDATION_COLORS[review.recommendation]}>
                    {RECOMMENDATION_LABELS[review.recommendation]}
                  </Badge>
                )}
              </div>

              {review.repairEstimate > 0 && (
                <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg mb-3">
                  <span className="text-sm text-gray-500">Reparaturschätzung</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(review.repairEstimate)}
                  </span>
                </div>
              )}

              {review.comment && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {review.comment}
                </p>
              )}

              <button
                onClick={() => handleDeleteReview(review.id)}
                className="flex items-center gap-1.5 text-xs text-red-600 mt-3 pt-3 border-t border-gray-100 hover:text-red-700"
              >
                <TrashIcon />
                <span>Löschen</span>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine Reviews"
          description="Noch keine Mechaniker-Bewertungen vorhanden"
        />
      )}
    </div>
  );
}

// ============ MECHANIC REVIEW TAB ============
function MechanicReviewTab({ vehicle, onUpdate, currentUser, navigate }) {
  // Find this mechanic's review
  const myReview = (vehicle.reviews || []).find(r => r.mechanicId === currentUser?.id);

  const [form, setForm] = useState({
    recommendation: myReview?.recommendation || '',
    repairEstimate: myReview?.repairEstimate?.toString() || '',
    comment: myReview?.comment || '',
  });
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async () => {
    if (!form.recommendation) {
      alert('Bitte wähle eine Empfehlung (Ampel)');
      return;
    }

    setSaving(true);
    try {
      const reviewData = {
        recommendation: form.recommendation,
        repairEstimate: parseCurrencyInput(form.repairEstimate),
        comment: form.comment.trim(),
      };

      let updatedReviews;
      if (myReview) {
        // Update existing review
        updatedReviews = (vehicle.reviews || []).map(r =>
          r.id === myReview.id
            ? { ...r, ...reviewData, updatedAt: new Date().toISOString() }
            : r
        );
      } else {
        // Create new review
        const newReview = createMechanicReview(currentUser, reviewData);
        updatedReviews = [...(vehicle.reviews || []), newReview];
      }

      await onUpdate({ reviews: updatedReviews });
      // Show toast and navigate to dashboard
      setShowToast(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Speichern fehlgeschlagen');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">
          {myReview ? 'Deine Bewertung bearbeiten' : 'Fahrzeug bewerten'}
        </h3>

        {/* Ampel Selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">Deine Empfehlung *</p>
          <div className="flex gap-3">
            {['green', 'orange', 'red'].map((color) => (
              <button
                key={color}
                onClick={() => setForm(f => ({ ...f, recommendation: color }))}
                className={`flex-1 py-4 rounded-xl border-2 transition-all ${
                  form.recommendation === color
                    ? color === 'green'
                      ? 'border-green-500 bg-green-50'
                      : color === 'orange'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${
                  color === 'green' ? 'bg-green-500' :
                  color === 'orange' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}></div>
                <p className={`text-xs font-medium ${
                  form.recommendation === color ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {RECOMMENDATION_LABELS[color]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Repair Estimate */}
        <div className="mb-4">
          <Input
            label="Reparaturschätzung (optional)"
            placeholder="z.B. 3000"
            type="text"
            inputMode="decimal"
            value={form.repairEstimate}
            onChange={(e) => setForm(f => ({ ...f, repairEstimate: e.target.value }))}
            suffix="€"
          />
        </div>

        {/* Comment */}
        <div className="mb-4">
          <TextArea
            label="Kommentar (optional)"
            placeholder="Zusätzliche Anmerkungen zum Fahrzeug..."
            value={form.comment}
            onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
            rows={3}
          />
        </div>

        <Button
          fullWidth
          onClick={handleSubmit}
          loading={saving}
          disabled={!form.recommendation}
        >
          {myReview ? 'Bewertung aktualisieren' : 'Bewertung abgeben'}
        </Button>
      </Card>

      {/* Show own review summary if exists */}
      {myReview && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-2">Deine aktuelle Bewertung</h3>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full ${
              myReview.recommendation === 'green' ? 'bg-green-500' :
              myReview.recommendation === 'orange' ? 'bg-orange-500' :
              'bg-red-500'
            }`}></div>
            <span className="font-medium">{RECOMMENDATION_LABELS[myReview.recommendation]}</span>
            {myReview.repairEstimate > 0 && (
              <span className="text-gray-500">| {formatCurrency(myReview.repairEstimate)}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Abgegeben: {formatDateTime(myReview.createdAt)}
          </p>
        </Card>
      )}

      {/* Info text */}
      <div className="text-center text-sm text-gray-500 px-4">
        <p>Deine Bewertung ist nur für Admins sichtbar.</p>
        <p>Andere Mechaniker können deine Bewertung nicht sehen.</p>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Bewertung gespeichert!</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ COSTS TAB (Admin only) ============
function CostsTab({ vehicle, costs, settings }) {
  const ampel = getAmpelStatus(vehicle, settings);

  // SVG Icons (alle in blue-600)
  const CalculatorIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  const ListIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  const ChartIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  const ExportIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );

  const handleExport = () => {
    const data = [
      `Fahrzeug: ${vehicle.title}`,
      `Datum: ${new Date().toLocaleDateString('de-DE')}`,
      '',
      '--- Max. Gebot ---',
      `Empfohlenes Max-Gebot: ${formatCurrency(costs.maxBid)}`,
      '',
      '--- Kosten (bei aktuellem Gebot) ---',
      `Kaufpreis: ${formatCurrency(costs.bidPrice)}`,
      `Zoll (10%): ${formatCurrency(costs.duty10)}`,
      `MwSt (19%): ${formatCurrency(costs.vat19)}`,
      `Transport: ${formatCurrency(costs.transportCost)}`,
      `TÜV: ${formatCurrency(costs.tuvCost)}`,
      `Sonstiges: ${formatCurrency(costs.miscCost)}`,
      `Reparatur (gepuffert): ${formatCurrency(costs.repairBuffered)}`,
      '',
      `GESAMTKOSTEN: ${formatCurrency(costs.totalCost)}`,
      '',
      '--- Ergebnis ---',
      `Vergleichspreis DE: ${formatCurrency(costs.marketPrice)}`,
      `Profit: ${formatCurrency(costs.profit)}`,
      `ROI: ${formatPercent(costs.roiPct)}`,
      `Bewertung: ${ampel.label} (${ampel.reason})`,
    ].join('\n');

    if (navigator.share) {
      navigator.share({
        title: `Kalkulation: ${vehicle.title}`,
        text: data,
      }).catch(() => {
        copyToClipboard(data);
      });
    } else {
      copyToClipboard(data);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('In Zwischenablage kopiert!');
    }).catch(() => {
      alert('Kopieren fehlgeschlagen');
    });
  };

  return (
    <div className="space-y-4">
      {/* Max Bid Highlight */}
      <Card className="bg-blue-50 border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <CalculatorIcon />
          </div>
          <h3 className="font-semibold text-blue-900">Maximalgebot</h3>
        </div>

        <div className="text-center py-2">
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(costs.maxBidAED, 'AED')}</p>
          <p className="text-sm text-blue-600 mt-1">{formatCurrency(costs.maxBid)}</p>
        </div>

        {/* Calculation breakdown - collapsible style */}
        <details className="mt-4 pt-4 border-t border-blue-200">
          <summary className="text-xs text-blue-700 font-medium cursor-pointer hover:text-blue-800">
            Berechnung anzeigen
          </summary>
          <div className="mt-3 text-xs text-blue-700 space-y-1.5">
            <div className="flex justify-between">
              <span>Vergleichspreis DE</span>
              <span>{formatCurrency(costs.marketPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Zielprofit ({costs.targetProfitPct}%)</span>
              <span>-{formatCurrency(costs.targetProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Sicherheitsabschlag</span>
              <span>-{formatCurrency(costs.safetyDeduction)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Transport</span>
              <span>-{formatCurrency(costs.transportCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>- TÜV/Zulassung</span>
              <span>-{formatCurrency(costs.tuvCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Sonstiges</span>
              <span>-{formatCurrency(costs.miscCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Reparatur (gepuffert)</span>
              <span>-{formatCurrency(costs.repairBuffered)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200 font-semibold">
              <span>Verfügbar inkl. Zoll/MwSt</span>
              <span>{formatCurrency(costs.marketPrice - costs.targetProfit - costs.safetyDeduction - costs.otherCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span>÷ 1,309 (Zoll + MwSt)</span>
              <span>= {formatCurrency(costs.maxBid)}</span>
            </div>
          </div>
        </details>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <ListIcon />
          </div>
          <h3 className="font-semibold text-gray-900">Kostenaufstellung</h3>
        </div>
        <div className="space-y-2">
          <CostRow label={`Kaufpreis (${formatCurrency(costs.bidPriceAED, 'AED')})`} value={costs.bidPrice} />
          <CostRow label="Zoll (10%)" value={costs.duty10} />
          <CostRow label="MwSt (19%)" value={costs.vat19} />
          <CostRow label="Transport" value={costs.transportCost} />
          <CostRow label="TÜV/Zulassung" value={costs.tuvCost} />
          <CostRow label="Sonstiges" value={costs.miscCost} />
          <CostRow
            label={`Reparatur (+${vehicle.costInputs?.repairBufferPct || 0}% Puffer)`}
            value={costs.repairBuffered}
            sublabel={
              costs.repairEstimateSource === 'mechanic'
                ? `Ø ${costs.repairEstimateCount} Mechaniker`
                : costs.repairEstimateSource === 'ai'
                  ? 'KI-Schätzung'
                  : null
            }
          />

          <div className="pt-3 mt-3 border-t-2 border-gray-200">
            <CostRow label="GESAMTKOSTEN" value={costs.totalCost} bold />
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <ChartIcon />
          </div>
          <h3 className="font-semibold text-gray-900">Ergebnis</h3>
        </div>
        <div className="space-y-3">
          <CostRow label="Vergleichspreis DE" value={costs.marketPrice} />

          <div className="pt-3 mt-3 border-t-2 border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Profit</span>
              <span className={`text-xl font-bold ${costs.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(costs.profit)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">ROI</span>
              <span className={`font-medium ${costs.roiPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(costs.roiPct)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-gray-600">Bewertung</span>
              <Ampel status={ampel} size="lg" showLabel />
            </div>
          </div>
        </div>
      </Card>

      <Button fullWidth variant="secondary" onClick={handleExport} className="flex items-center justify-center gap-2">
        <ExportIcon />
        <span>Kalkulation teilen</span>
      </Button>
    </div>
  );
}

function CostRow({ label, value, sublabel, bold }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-600'}>
          {label}
        </span>
        {sublabel && (
          <p className="text-xs text-gray-400">{sublabel}</p>
        )}
      </div>
      <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-900'}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ============ COMMENTS SECTION (Admin only) ============
function CommentsSection({ vehicle, onUpdate, currentUser }) {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newComment = {
      id: generateUUID(),
      authorId: currentUser?.id || null,
      authorName: currentUser?.name || 'Unbekannt',
      authorRole: currentUser?.role || null,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    await onUpdate({
      comments: [...(vehicle.comments || []), newComment],
    });
    setText('');
  };

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4">
        Kommentare ({vehicle.comments?.length || 0})
      </h3>

      {/* Comment List */}
      {vehicle.comments?.length > 0 ? (
        <div className="space-y-3 mb-4">
          {vehicle.comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900">
                  {comment.authorName}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm mb-4">Noch keine Kommentare</p>
      )}

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Kommentar schreiben..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-4 py-3 min-h-[48px] bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Button type="submit" disabled={!text.trim()}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </form>
    </Card>
  );
}
