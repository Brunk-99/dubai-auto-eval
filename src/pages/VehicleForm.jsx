import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVehicle, saveVehicle, deleteVehicle, createEmptyVehicle, getCostDefaults } from '../lib/storage';
import { parseCurrencyInput } from '../lib/formatters';
import { isAdmin, getCurrentUser } from '../lib/auth';
import { analyzeVehicleDamage } from '../lib/damageAnalysis';
import { compressImage, isValidImageType } from '../lib/imageUtils';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import TextArea from '../components/TextArea';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ImageGallery from '../components/ImageGallery';
import Lightbox from '../components/Lightbox';

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Beobachten' },
  { value: 'bid_placed', label: 'Gebot aktiv' },
  { value: 'bought', label: 'Gekauft' },
  { value: 'rejected', label: 'Abgelehnt' },
];

// Baujahr-Optionen (letzte 20 Jahre)
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: '', label: 'Baujahr wählen...' },
  ...Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: year.toString() };
  }),
];

// Top 20 Automarken für den deutschen Gebrauchtwagenmarkt
const CAR_BRANDS = [
  { value: '', label: 'Marke wählen...' },
  { value: 'Mercedes-Benz', label: 'Mercedes-Benz' },
  { value: 'BMW', label: 'BMW' },
  { value: 'Audi', label: 'Audi' },
  { value: 'Volkswagen', label: 'Volkswagen' },
  { value: 'Porsche', label: 'Porsche' },
  { value: 'Ford', label: 'Ford' },
  { value: 'Opel', label: 'Opel' },
  { value: 'Toyota', label: 'Toyota' },
  { value: 'Skoda', label: 'Skoda' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Seat', label: 'Seat' },
  { value: 'Renault', label: 'Renault' },
  { value: 'Mazda', label: 'Mazda' },
  { value: 'Fiat', label: 'Fiat' },
  { value: 'Nissan', label: 'Nissan' },
  { value: 'Kia', label: 'Kia' },
  { value: 'Peugeot', label: 'Peugeot' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Honda', label: 'Honda' },
  { value: 'Land Rover', label: 'Land Rover' },
  { value: '_other', label: '➕ Andere Marke...' },
];

// Gängige Autofarben mit Farbcodes (für visuellen Picker)
const CAR_COLORS = [
  { value: 'Schwarz', color: '#1a1a1a' },
  { value: 'Weiß', color: '#ffffff' },
  { value: 'Silber', color: '#c0c0c0' },
  { value: 'Anthrazit', color: '#383838' },
  { value: 'Grau', color: '#808080' },
  { value: 'Blau', color: '#1e40af' },
  { value: 'Dunkelblau', color: '#1e3a5f' },
  { value: 'Hellblau', color: '#60a5fa' },
  { value: 'Rot', color: '#dc2626' },
  { value: 'Weinrot', color: '#722f37' },
  { value: 'Grün', color: '#16a34a' },
  { value: 'Dunkelgrün', color: '#14532d' },
  { value: 'Braun', color: '#78350f' },
  { value: 'Beige', color: '#d4b896' },
  { value: 'Gelb', color: '#eab308' },
  { value: 'Orange', color: '#ea580c' },
  { value: 'Gold', color: '#b8860b' },
  { value: 'Champagner', color: '#f7e7ce' },
];

// Modelle pro Marke (Hauptmodelle der letzten 15 Jahre, ohne Motor-Varianten)
const CAR_MODELS = {
  'Mercedes-Benz': [
    'A-Klasse', 'B-Klasse', 'C-Klasse', 'E-Klasse', 'S-Klasse',
    'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Klasse',
    'AMG GT', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'Vito', 'V-Klasse', 'Sprinter'
  ],
  'BMW': [
    '1er', '2er', '3er', '4er', '5er', '6er', '7er', '8er',
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM',
    'Z4', 'i3', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX3'
  ],
  'Audi': [
    'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
    'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q8',
    'TT', 'R8', 'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7'
  ],
  'Volkswagen': [
    'Polo', 'Golf', 'Passat', 'Arteon', 'Jetta', 'Scirocco',
    'T-Cross', 'T-Roc', 'Tiguan', 'Touareg', 'Atlas',
    'ID.3', 'ID.4', 'ID.5', 'ID.Buzz', 'Caddy', 'Transporter', 'Multivan'
  ],
  'Porsche': [
    '911', '718 Boxster', '718 Cayman', 'Panamera', 'Taycan',
    'Macan', 'Cayenne'
  ],
  'Ford': [
    'Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Mustang Mach-E',
    'Puma', 'Kuga', 'Edge', 'Explorer', 'Ranger', 'Transit'
  ],
  'Opel': [
    'Corsa', 'Astra', 'Insignia', 'Mokka', 'Crossland', 'Grandland',
    'Combo', 'Zafira', 'Vivaro', 'Movano'
  ],
  'Toyota': [
    'Aygo', 'Yaris', 'Corolla', 'Camry', 'Prius', 'Mirai',
    'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Hilux', 'Supra', 'GR86'
  ],
  'Skoda': [
    'Fabia', 'Scala', 'Octavia', 'Superb',
    'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'
  ],
  'Hyundai': [
    'i10', 'i20', 'i30', 'i40', 'Ioniq', 'Ioniq 5', 'Ioniq 6',
    'Bayon', 'Kona', 'Tucson', 'Santa Fe', 'Nexo'
  ],
  'Seat': [
    'Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Cupra Formentor', 'Cupra Born'
  ],
  'Renault': [
    'Twingo', 'Clio', 'Megane', 'Talisman', 'Captur', 'Kadjar',
    'Koleos', 'Scenic', 'Espace', 'Kangoo', 'Zoe', 'Megane E-Tech'
  ],
  'Mazda': [
    'Mazda2', 'Mazda3', 'Mazda6', 'MX-5', 'MX-30',
    'CX-3', 'CX-30', 'CX-5', 'CX-60'
  ],
  'Fiat': [
    '500', '500X', '500L', 'Panda', 'Tipo', 'Punto',
    'Doblo', 'Ducato'
  ],
  'Nissan': [
    'Micra', 'Leaf', 'Pulsar', 'Qashqai', 'X-Trail', 'Juke',
    'Ariya', 'Navara', '370Z', 'GT-R'
  ],
  'Kia': [
    'Picanto', 'Rio', 'Ceed', 'Stinger', 'EV6', 'EV9',
    'Stonic', 'Niro', 'Sportage', 'Sorento'
  ],
  'Peugeot': [
    '108', '208', '308', '508', '2008', '3008', '5008',
    'Rifter', 'Traveller', 'e-208', 'e-2008'
  ],
  'Volvo': [
    'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90',
    'C40', 'EX30', 'EX90'
  ],
  'Honda': [
    'Jazz', 'Civic', 'Accord', 'HR-V', 'CR-V', 'e', 'e:Ny1'
  ],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport',
    'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'
  ],
};

// Kilometerstand-Optionen (0-200.000 in 10.000er Schritten)
const MILEAGE_OPTIONS = [
  { value: '', label: 'KM wählen...' },
  ...Array.from({ length: 21 }, (_, i) => {
    const km = i * 10000;
    return {
      value: km.toString(),
      label: km.toLocaleString('de-DE') + ' km',
    };
  }),
  { value: '_other', label: '➕ Andere Angabe...' },
];

// Auktionsorte
const AUCTION_LOCATIONS = [
  { value: '', label: 'Auktionsort wählen...' },
  { value: 'Al Aweer Auto Market, Dubai', label: 'Al Aweer Auto Market – Dubai' },
  { value: 'Emirates Auction, Ras Al Khor', label: 'Emirates Auction – Ras Al Khor' },
  { value: '_other', label: '➕ Anderer Ort...' },
];

// Draft storage key
const DRAFT_STORAGE_KEY = 'dubai-auto-eval-draft';

// UUID Generator for photos
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

// Draft storage functions
function saveDraft(vehicle) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      vehicle,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Failed to save draft:', e);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Check if draft is less than 24 hours old
      const savedAt = new Date(data.savedAt);
      const now = new Date();
      const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        return data.vehicle;
      }
    }
  } catch (e) {
    console.error('Failed to load draft:', e);
  }
  return null;
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear draft:', e);
  }
}

export default function VehicleForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [costDefaults, setCostDefaults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  // States für manuelle Eingabe bei Dropdowns
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [showCustomMileage, setShowCustomMileage] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);

  useEffect(() => {
    // Admin check
    if (!isAdmin()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    initForm();
  }, [id, isNew, navigate]);

  // Auto-save draft when vehicle changes (only for new vehicles)
  useEffect(() => {
    if (isNew && vehicle && draftLoaded) {
      // Debounce the save
      const timer = setTimeout(() => {
        saveDraft(vehicle);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [vehicle, isNew, draftLoaded]);

  const initForm = async () => {
    try {
      const defaults = await getCostDefaults();
      setCostDefaults(defaults);

      if (isNew) {
        // Check for existing draft
        const draft = loadDraft();
        if (draft && (draft.brand || draft.title)) {
          // Show modal to ask if user wants to restore draft
          setPendingDraft(draft);
          setShowDraftModal(true);
          // Create new vehicle in the meantime
          const newVehicle = createEmptyVehicle(defaults, currentUser);
          setVehicle(newVehicle);
        } else {
          const newVehicle = createEmptyVehicle(defaults, currentUser);
          setVehicle(newVehicle);
          setDraftLoaded(true);
        }
      } else {
        const data = await getVehicle(id);
        if (data) {
          setVehicle(data);
          setDraftLoaded(true);
        } else {
          navigate('/dashboard', { replace: true });
          return;
        }
      }
    } catch (error) {
      console.error('Init form error:', error);
      navigate('/dashboard', { replace: true });
      return;
    }
    setLoading(false);
  };

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setVehicle(pendingDraft);
    }
    setShowDraftModal(false);
    setDraftLoaded(true);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftModal(false);
    setDraftLoaded(true);
    setPendingDraft(null);
  };

  const handleChange = (field, value) => {
    setVehicle(prev => ({
      ...prev,
      [field]: value,
      updatedBy: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleNumberChange = (field, value) => {
    const num = parseCurrencyInput(value);
    handleChange(field, num);
  };

  const handleCostInputChange = (field, value) => {
    const num = parseCurrencyInput(value);
    setVehicle(prev => ({
      ...prev,
      costInputs: {
        ...prev.costInputs,
        [field]: num,
      },
      updatedBy: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Helper: Prüft ob Wert in Dropdown existiert
  const isValueInOptions = (value, options) => {
    if (!value) return true;
    return options.some(opt => opt.value === value);
  };

  // Helper: Prüft ob Modell für Marke existiert
  const isModelForBrand = (brand, model) => {
    if (!brand || !model) return false;
    const models = CAR_MODELS[brand];
    return models ? models.includes(model) : false;
  };

  // Helper: Prüft ob Farbe in der Liste ist
  const isColorInList = (color) => {
    if (!color) return false;
    return CAR_COLORS.some(c => c.value === color);
  };

  // Handler für Dropdown mit manueller Option
  const handleDropdownChange = (field, value, setShowCustom) => {
    if (value === '_other') {
      setShowCustom(true);
      handleChange(field, '');
    } else {
      setShowCustom(false);
      handleChange(field, value);
    }
  };

  // Handler für Marken-Wechsel (setzt Modell zurück)
  const handleBrandChange = (value) => {
    if (value === '_other') {
      setShowCustomBrand(true);
      handleChange('brand', '');
      handleChange('model', '');
      setShowCustomModel(true);
    } else {
      setShowCustomBrand(false);
      handleChange('brand', value);
      // Modell zurücksetzen wenn Marke wechselt
      handleChange('model', '');
      setShowCustomModel(false);
    }
  };

  // Init custom states based on existing values
  useEffect(() => {
    if (vehicle) {
      const brandInList = isValueInOptions(vehicle.brand, CAR_BRANDS);
      setShowCustomBrand(vehicle.brand && !brandInList);
      setShowCustomModel(vehicle.model && (!brandInList || !isModelForBrand(vehicle.brand, vehicle.model)));
      setShowCustomColor(vehicle.color && !isColorInList(vehicle.color));
      setShowCustomMileage(vehicle.mileage && !isValueInOptions(vehicle.mileage, MILEAGE_OPTIONS));
      setShowCustomLocation(vehicle.auctionLocation && !isValueInOptions(vehicle.auctionLocation, AUCTION_LOCATIONS));
    }
  }, [vehicle?.id]); // Only run when vehicle ID changes (initial load)

  // Photo handling
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
        setVehicle(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...newPhotos],
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Foto-Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = (photoId) => {
    const updated = (vehicle.photos || []).filter(p => p.id !== photoId);
    setVehicle(prev => ({
      ...prev,
      photos: updated,
      updatedAt: new Date().toISOString(),
    }));
    // Close lightbox if no photos left
    if (updated.length === 0) {
      setLightboxOpen(false);
    }
  };

  const handlePhotoClick = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSave = async () => {
    console.log('=== SAVE START ===');
    console.log('Vehicle to save:', vehicle);

    // Validation
    if (!vehicle.brand?.trim()) {
      alert('Bitte wähle eine Marke aus');
      return;
    }

    if (!vehicle.model?.trim()) {
      alert('Bitte wähle ein Modell aus');
      return;
    }

    if (!vehicle.startBid && !vehicle.finalBid) {
      alert('Bitte gib mindestens ein Startgebot ein');
      return;
    }

    if (!vehicle.marketPriceDE && !costDefaults?.defaultMarketPriceDE) {
      alert('Bitte gib einen Vergleichspreis DE ein');
      return;
    }

    // Warning for no photos
    if (!vehicle.photos?.length) {
      const proceed = confirm('Keine Fotos hochgeladen. Trotzdem speichern?');
      if (!proceed) return;
    }

    setSaving(true);
    try {
      // Prepare vehicle for save
      const vehicleToSave = { ...vehicle };

      // Generiere title aus brand + model für Kompatibilität
      vehicleToSave.title = `${vehicleToSave.brand} ${vehicleToSave.model}`.trim();
      console.log('Vehicle ID:', vehicleToSave.id, 'Title:', vehicleToSave.title);

      // Set finalBid = startBid if empty
      if (!vehicleToSave.finalBid && vehicleToSave.startBid) {
        vehicleToSave.finalBid = vehicleToSave.startBid;
      }

      // Use default marketPriceDE if not set
      if (!vehicleToSave.marketPriceDE && costDefaults?.defaultMarketPriceDE) {
        vehicleToSave.marketPriceDE = costDefaults.defaultMarketPriceDE;
      }

      // WICHTIG: AI-Analyse NICHT beim Speichern ausführen - das passiert später async!
      // Das Fahrzeug wird mit analysisStatus = 'pending' gespeichert falls Fotos vorhanden
      if (vehicleToSave.photos?.length > 0 && !vehicleToSave.aiDamageReport) {
        vehicleToSave.analysisStatus = 'pending';
      }

      // Save - this MUST succeed
      console.log('Calling saveVehicle...');
      await saveVehicle(vehicleToSave);
      console.log('saveVehicle completed successfully');

      // Clear draft after successful save
      if (isNew) {
        clearDraft();
      }

      // Navigate to details page
      console.log('Navigating to:', `/vehicle/${vehicleToSave.id}`);
      navigate(`/vehicle/${vehicleToSave.id}`, { replace: true });
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Speichern fehlgeschlagen: ' + error.message);
      setSaving(false);
      return; // Don't navigate on error
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle(id);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Löschen fehlgeschlagen');
    }
  };

  const handleCancel = () => {
    // Ask if user wants to keep draft (only for new with data)
    if (isNew && vehicle?.title) {
      // Draft is already auto-saved, just navigate away
    } else if (isNew) {
      clearDraft();
    }
    navigate(isNew ? '/dashboard' : `/vehicle/${id}`);
  };

  if (loading || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 pb-32">
      <Header
        title={isNew ? 'Neues Fahrzeug' : 'Bearbeiten'}
        showBack
        backTo={isNew ? '/dashboard' : `/vehicle/${id}`}
      />

      {/* Draft indicator */}
      {isNew && draftLoaded && (vehicle.brand || vehicle.title) && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-600">Entwurf wird automatisch gespeichert</span>
          <button
            onClick={() => {
              clearDraft();
              const defaults = costDefaults;
              setVehicle(createEmptyVehicle(defaults, currentUser));
            }}
            className="text-xs text-blue-600 font-medium"
          >
            Verwerfen
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Grunddaten</h2>
          <div className="space-y-3">
            {/* Marke */}
            {showCustomBrand ? (
              <div className="space-y-2">
                <Input
                  label="Marke *"
                  placeholder="z.B. Lexus, Genesis, Jaguar..."
                  value={vehicle.brand || ''}
                  onChange={(e) => handleChange('brand', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomBrand(false);
                    handleChange('brand', '');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  ← Zurück zur Auswahl
                </button>
              </div>
            ) : (
              <Select
                label="Marke *"
                value={isValueInOptions(vehicle.brand, CAR_BRANDS) ? vehicle.brand : '_other'}
                onChange={(e) => handleBrandChange(e.target.value)}
                options={CAR_BRANDS}
              />
            )}

            {/* Modell - nur anzeigen wenn Marke ausgewählt */}
            {(vehicle.brand || showCustomBrand) && (
              showCustomModel || showCustomBrand ? (
                <div className="space-y-2">
                  <Input
                    label="Modell *"
                    placeholder="z.B. ES 350, G70, F-Type..."
                    value={vehicle.model || ''}
                    onChange={(e) => handleChange('model', e.target.value)}
                  />
                  {!showCustomBrand && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomModel(false);
                        handleChange('model', '');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      ← Zurück zur Auswahl
                    </button>
                  )}
                </div>
              ) : (
                <Select
                  label="Modell *"
                  value={isModelForBrand(vehicle.brand, vehicle.model) ? vehicle.model : (vehicle.model ? '_other' : '')}
                  onChange={(e) => handleDropdownChange('model', e.target.value, setShowCustomModel)}
                  options={[
                    { value: '', label: 'Modell wählen...' },
                    ...(CAR_MODELS[vehicle.brand] || []).map(m => ({ value: m, label: m })),
                    { value: '_other', label: '➕ Anderes Modell...' },
                  ]}
                />
              )
            )}

            {/* Baujahr */}
            <Select
              label="Baujahr"
              value={vehicle.year || ''}
              onChange={(e) => handleChange('year', e.target.value)}
              options={YEAR_OPTIONS}
            />

            {/* Farb-Picker - visuelle Farbbalken */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Farbe</label>
              {showCustomColor ? (
                <div className="space-y-2">
                  <Input
                    placeholder="z.B. Türkis, Perlmutt..."
                    value={vehicle.color || ''}
                    onChange={(e) => handleChange('color', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomColor(false);
                      handleChange('color', '');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    ← Zurück zur Auswahl
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2">
                    {CAR_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleChange('color', c.value)}
                        className={`h-10 rounded-lg border-2 transition-all ${
                          vehicle.color === c.value
                            ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.value}
                      />
                    ))}
                  </div>
                  {vehicle.color && (
                    <p className="text-sm text-gray-600">Ausgewählt: <span className="font-medium">{vehicle.color}</span></p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCustomColor(true)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    ➕ Andere Farbe eingeben...
                  </button>
                </div>
              )}
            </div>

            {/* Kilometerstand */}
            {showCustomMileage ? (
              <div className="space-y-2">
                <Input
                  label="Kilometerstand"
                  placeholder="z.B. 87500"
                  type="text"
                  inputMode="numeric"
                  value={vehicle.mileage || ''}
                  onChange={(e) => handleChange('mileage', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomMileage(false);
                    handleChange('mileage', '');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  ← Zurück zur Auswahl
                </button>
              </div>
            ) : (
              <Select
                label="Kilometerstand"
                value={isValueInOptions(vehicle.mileage, MILEAGE_OPTIONS) ? vehicle.mileage : '_other'}
                onChange={(e) => handleDropdownChange('mileage', e.target.value, setShowCustomMileage)}
                options={MILEAGE_OPTIONS}
              />
            )}

            <Input
              label="VIN (Fahrgestellnummer)"
              placeholder="Optional"
              value={vehicle.vin || ''}
              onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
              maxLength={17}
            />

            {/* Auktionsort */}
            {showCustomLocation ? (
              <div className="space-y-2">
                <Input
                  label="Auktionsort"
                  placeholder="z.B. Sharjah Auto Market"
                  value={vehicle.auctionLocation || ''}
                  onChange={(e) => handleChange('auctionLocation', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomLocation(false);
                    handleChange('auctionLocation', '');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  ← Zurück zur Auswahl
                </button>
              </div>
            ) : (
              <Select
                label="Auktionsort"
                value={isValueInOptions(vehicle.auctionLocation, AUCTION_LOCATIONS) ? vehicle.auctionLocation : '_other'}
                onChange={(e) => handleDropdownChange('auctionLocation', e.target.value, setShowCustomLocation)}
                options={AUCTION_LOCATIONS}
              />
            )}

            <Select
              label="Status"
              value={vehicle.status || 'watching'}
              onChange={(e) => handleChange('status', e.target.value)}
              options={STATUS_OPTIONS}
            />

            <TextArea
              label="Notizen"
              placeholder="Zusätzliche Informationen..."
              value={vehicle.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Preise</h2>
          <div className="space-y-3">
            <Input
              label="Startgebot (AED) *"
              placeholder="0"
              type="text"
              inputMode="decimal"
              value={vehicle.startBid || ''}
              onChange={(e) => handleNumberChange('startBid', e.target.value)}
              suffix="AED"
            />

            <Input
              label="Endpreis / Kaufpreis (AED)"
              placeholder="Wird automatisch = Startgebot"
              type="text"
              inputMode="decimal"
              value={vehicle.finalBid || ''}
              onChange={(e) => handleNumberChange('finalBid', e.target.value)}
              suffix="AED"
            />

            <Input
              label="Vergleichspreis DE *"
              placeholder={costDefaults?.defaultMarketPriceDE ? `Standard: ${costDefaults.defaultMarketPriceDE}€` : '0'}
              type="text"
              inputMode="decimal"
              value={vehicle.marketPriceDE || ''}
              onChange={(e) => handleNumberChange('marketPriceDE', e.target.value)}
              suffix="€"
            />
          </div>
        </Card>

        {/* Photos Section */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">
            Schadenfotos {vehicle.photos?.length > 0 && `(${vehicle.photos.length})`}
          </h2>

          {/* Upload Buttons - Camera and Gallery */}
          <div className="flex gap-3 mb-4">
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

          {/* Photo Gallery with Swipe */}
          {vehicle.photos?.length > 0 ? (
            <ImageGallery
              photos={vehicle.photos}
              onPhotoClick={handlePhotoClick}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              Noch keine Fotos. Fotos werden für die KI-Analyse benötigt.
            </p>
          )}
        </Card>

        {/* Cost Inputs (Collapsed for new vehicles) */}
        {!isNew && (
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Kostenparameter</h2>
            <div className="space-y-3">
              <Input
                label="Transport"
                placeholder="2500"
                type="text"
                inputMode="decimal"
                value={vehicle.costInputs?.transportCost || ''}
                onChange={(e) => handleCostInputChange('transportCost', e.target.value)}
                suffix="€"
              />

              <Input
                label="TÜV/Zulassung"
                placeholder="800"
                type="text"
                inputMode="decimal"
                value={vehicle.costInputs?.tuvCost || ''}
                onChange={(e) => handleCostInputChange('tuvCost', e.target.value)}
                suffix="€"
              />

              <Input
                label="Sonstiges"
                placeholder="500"
                type="text"
                inputMode="decimal"
                value={vehicle.costInputs?.miscCost || ''}
                onChange={(e) => handleCostInputChange('miscCost', e.target.value)}
                suffix="€"
              />

              <Input
                label="Reparatur-Puffer"
                placeholder="15"
                type="text"
                inputMode="decimal"
                value={vehicle.costInputs?.repairBufferPct || ''}
                onChange={(e) => handleCostInputChange('repairBufferPct', e.target.value)}
                suffix="%"
              />
            </div>
          </Card>
        )}

        {/* Delete Button (only for existing) */}
        {!isNew && (
          <Button
            fullWidth
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
          >
            Fahrzeug löschen
          </Button>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleCancel}
          >
            Abbrechen
          </Button>
          <Button
            fullWidth
            onClick={handleSave}
            loading={saving}
          >
            {isNew ? 'Speichern' : 'Aktualisieren'}
          </Button>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      <Lightbox
        photos={vehicle.photos || []}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDelete={handleDeletePhoto}
        canDelete={true}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Fahrzeug löschen?"
      >
        <p className="text-gray-600 mb-6">
          Möchtest du "{vehicle.brand ? `${vehicle.brand} ${vehicle.model || ''}`.trim() : vehicle.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowDeleteModal(false)}
          >
            Abbrechen
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleDelete}
          >
            Löschen
          </Button>
        </div>
      </Modal>

      {/* Draft Restore Modal */}
      <Modal
        isOpen={showDraftModal}
        onClose={handleDiscardDraft}
        title="Entwurf gefunden"
      >
        <p className="text-gray-600 mb-2">
          Du hast einen ungespeicherten Entwurf:
        </p>
        <p className="font-medium text-gray-900 mb-6">
          "{pendingDraft?.brand ? `${pendingDraft.brand} ${pendingDraft.model || ''}`.trim() : (pendingDraft?.title || 'Ohne Titel')}"
          {pendingDraft?.photos?.length > 0 && ` (${pendingDraft.photos.length} Fotos)`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleDiscardDraft}
          >
            Verwerfen
          </Button>
          <Button
            fullWidth
            onClick={handleRestoreDraft}
          >
            Wiederherstellen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
