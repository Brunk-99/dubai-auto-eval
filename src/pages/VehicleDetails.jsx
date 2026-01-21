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
                {formatCurrency(costs.maxBid)}
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
              <MechanicReviewTab vehicle={vehicle} onUpdate={updateVehicle} currentUser={currentUser} />
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
  return (
    <Card>
      <div className="space-y-4">
        <InfoRow label="Status">
          <Badge className={STATUS_COLORS[vehicle.status]}>
            {STATUS_LABELS[vehicle.status]}
          </Badge>
        </InfoRow>

        {vehicle.year && <InfoRow label="Baujahr">{vehicle.year}</InfoRow>}
        {vehicle.color && <InfoRow label="Farbe">{vehicle.color}</InfoRow>}
        {vehicle.mileage && <InfoRow label="Kilometerstand">{formatMileage(vehicle.mileage)} km</InfoRow>}
        {vehicle.vin && <InfoRow label="VIN">{vehicle.vin}</InfoRow>}
        {vehicle.auctionLocation && <InfoRow label="Auktionsort">{vehicle.auctionLocation}</InfoRow>}

        {/* Only show financial info to admin */}
        {isAdmin && (
          <>
            <InfoRow label="Startgebot (AED)">{formatCurrency(vehicle.startBid, 'AED')}</InfoRow>
            <InfoRow label="Endpreis (AED)">{formatCurrency(vehicle.finalBid, 'AED')}</InfoRow>
            <InfoRow label="Vergleichspreis DE">{formatCurrency(vehicle.marketPriceDE)}</InfoRow>
          </>
        )}

        {vehicle.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Notizen</p>
            <p className="text-gray-700 whitespace-pre-wrap">{vehicle.notes}</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
          {vehicle.createdBy && <p>Erstellt von: {vehicle.createdBy.name}</p>}
          <p>Erstellt: {formatDateTime(vehicle.createdAt)}</p>
          {vehicle.updatedBy && <p>Bearbeitet von: {vehicle.updatedBy.name}</p>}
          <p>Aktualisiert: {formatDateTime(vehicle.updatedAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{children}</span>
    </div>
  );
}

// ============ PHOTOS TAB ============
function PhotosTab({ vehicle, onUpdate, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

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
    setPreviewPhoto(null);
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

      {/* Photo Grid */}
      {vehicle.photos?.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {vehicle.photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setPreviewPhoto(photo)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
            >
              <img
                src={photo.data}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine Fotos"
          description="Keine Fotos vorhanden"
        />
      )}

      {/* Photo Preview Modal */}
      <Modal
        isOpen={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        title="Foto"
      >
        {previewPhoto && (
          <div className="space-y-4">
            <img
              src={previewPhoto.data}
              alt=""
              className="w-full rounded-xl"
            />
            <p className="text-xs text-gray-500">
              {formatDateTime(previewPhoto.createdAt)}
            </p>
            {isAdmin && (
              <Button
                variant="danger"
                fullWidth
                onClick={() => handleDeletePhoto(previewPhoto.id)}
              >
                Foto löschen
              </Button>
            )}
          </div>
        )}
      </Modal>
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
          {/* Main Stats Card */}
          <Card>
            <div className="space-y-4">
              {/* Severity Score */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Schweregrad</span>
                <div className="flex items-center gap-2">
                  {report.severityScore !== undefined && (
                    <span className="text-sm text-gray-400">{report.severityScore}%</span>
                  )}
                  <span className={`font-bold ${SEVERITY_COLORS[report.severity]}`}>
                    {SEVERITY_LABELS[report.severity]}
                  </span>
                </div>
              </div>

              {/* Frame Risk */}
              {report.frameRisk && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Rahmenrisiko</span>
                  <span className={`font-bold ${
                    report.frameRisk === 'hoch' ? 'text-red-600' :
                    report.frameRisk === 'mittel' ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {report.frameRisk.charAt(0).toUpperCase() + report.frameRisk.slice(1)}
                  </span>
                </div>
              )}

              {/* Repair Hours */}
              {report.totalRepairHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Geschätzte Arbeitsstunden</span>
                  <span className="font-bold text-gray-900">
                    {report.totalRepairHours}h
                  </span>
                </div>
              )}

              {/* Repair Cost */}
              {report.estimatedRepairCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">KI-Reparaturschätzung</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(report.estimatedRepairCost)}
                  </span>
                </div>
              )}

              {/* Confidence */}
              {report.rawJson?.confidence && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Konfidenz</span>
                  <span className="text-gray-600">{report.rawJson.confidence}%</span>
                </div>
              )}
            </div>
          </Card>

          {/* Summary */}
          <Card>
            <p className="text-xs text-gray-500 mb-2">Zusammenfassung</p>
            <p className="text-gray-800">{report.summary}</p>

            {report.frameRiskReason && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Rahmenrisiko-Begründung</p>
                <p className="text-sm text-gray-700">{report.frameRiskReason}</p>
              </div>
            )}
          </Card>

          {/* Damaged Parts with Hours */}
          {report.damageDetails?.length > 0 && (
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
          {report.affectedAreas?.length > 0 && (
            <Card>
              <p className="text-xs text-gray-500 mb-2">Betroffene Bereiche</p>
              <div className="flex flex-wrap gap-2">
                {report.affectedAreas.map((area, i) => (
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
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Mechaniker-Konsens</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm">{consensus.green}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-sm">{consensus.orange}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">{consensus.red}</span>
            </div>
          </div>
          {consensus.dominant && (
            <p className="text-sm text-gray-600">
              Tendenz: <span className={`font-medium ${
                consensus.dominant === 'green' ? 'text-green-600' :
                consensus.dominant === 'orange' ? 'text-orange-600' :
                'text-red-600'
              }`}>{RECOMMENDATION_LABELS[consensus.dominant]}</span>
            </p>
          )}
          {avgRepairEstimate > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              Ø Reparaturschätzung: <span className="font-medium">{formatCurrency(avgRepairEstimate)}</span>
            </p>
          )}
        </Card>
      )}

      {/* All Reviews */}
      {vehicle.reviews?.length > 0 ? (
        <div className="space-y-3">
          {vehicle.reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{review.mechanicName}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</p>
                </div>
                {review.recommendation && (
                  <Badge className={RECOMMENDATION_COLORS[review.recommendation]}>
                    {RECOMMENDATION_LABELS[review.recommendation]}
                  </Badge>
                )}
              </div>

              {review.repairEstimate > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Reparaturschätzung</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(review.repairEstimate)}
                  </span>
                </div>
              )}

              {review.comment && (
                <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-100">
                  {review.comment}
                </p>
              )}

              <button
                onClick={() => handleDeleteReview(review.id)}
                className="text-xs text-red-600 mt-2"
              >
                Löschen
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
function MechanicReviewTab({ vehicle, onUpdate, currentUser }) {
  // Find this mechanic's review
  const myReview = (vehicle.reviews || []).find(r => r.mechanicId === currentUser?.id);

  const [form, setForm] = useState({
    recommendation: myReview?.recommendation || '',
    repairEstimate: myReview?.repairEstimate?.toString() || '',
    comment: myReview?.comment || '',
  });
  const [saving, setSaving] = useState(false);

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
      alert('Bewertung gespeichert!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Speichern fehlgeschlagen');
    } finally {
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
    </div>
  );
}

// ============ COSTS TAB (Admin only) ============
function CostsTab({ vehicle, costs, settings }) {
  const ampel = getAmpelStatus(vehicle, settings);

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
      <Card className="bg-blue-50 border-blue-200">
        <div className="text-center">
          <p className="text-sm text-blue-600 mb-1">Empfohlenes Maximalgebot</p>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(costs.maxBidAED, 'AED')}</p>
          <p className="text-lg text-blue-600">({formatCurrency(costs.maxBid)})</p>
          <p className="text-xs text-blue-500 mt-2">
            Bei Zielprofit von {costs.targetProfitPct}% + {formatCurrency(settings.safetyDeduction)} Sicherheit
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Kostenaufstellung (aktuelles Gebot)</h3>
        <div className="space-y-3">
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

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Ergebnis</h3>
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

      <Button fullWidth variant="secondary" onClick={handleExport}>
        Kalkulation teilen / exportieren
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
