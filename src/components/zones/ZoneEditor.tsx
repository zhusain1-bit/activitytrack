import React, { useState, useEffect } from 'react';
import { MapPin, Trash2, Edit2, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocationZone, LocationCategory, CATEGORY_COLORS, Coordinates } from '../../types';
import { formatCoordinates, getGoogleMapsLink } from '../../utils/locationUtils';
import { Button, Card, CardContent, CardHeader, CardTitle, Modal, Input, Select, Badge } from '../ui';

const CATEGORIES: { value: LocationCategory; label: string }[] = [
  { value: 'Work', label: 'Work' },
  { value: 'Home', label: 'Home' },
  { value: 'Exercise', label: 'Exercise' },
  { value: 'Social', label: 'Social' },
  { value: 'Commute', label: 'Commute' },
  { value: 'Other', label: 'Other' },
];

interface ZoneFormData {
  name: string;
  lat: string;
  lng: string;
  radius: number;
  category: LocationCategory;
  activity: string;
}

const initialFormData: ZoneFormData = {
  name: '',
  lat: '',
  lng: '',
  radius: 100,
  category: 'Other',
  activity: '',
};

interface ZoneFormProps {
  zone?: LocationZone;
  onSubmit: (data: ZoneFormData) => void;
  onCancel: () => void;
}

function ZoneForm({ zone, onSubmit, onCancel }: ZoneFormProps) {
  const [formData, setFormData] = useState<ZoneFormData>(() =>
    zone
      ? {
          name: zone.name,
          lat: zone.coordinates.lat.toString(),
          lng: zone.coordinates.lng.toString(),
          radius: zone.radius,
          category: zone.category,
          activity: zone.activity,
        }
      : initialFormData
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ZoneFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ZoneFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const lat = parseFloat(formData.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.lat = 'Valid latitude required (-90 to 90)';
    }

    const lng = parseFloat(formData.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.lng = 'Valid longitude required (-180 to 180)';
    }

    if (formData.radius < 10 || formData.radius > 10000) {
      newErrors.radius = 'Radius must be between 10 and 10000 meters';
    }

    if (!formData.activity.trim()) {
      newErrors.activity = 'Activity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setErrors((prev) => ({ ...prev, lat: 'Could not get current location' }));
        }
      );
    } else {
      setErrors((prev) => ({ ...prev, lat: 'Geolocation not supported' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Zone Name"
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="e.g., Olin Hall, Home, Gym"
        error={errors.name}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitude"
          type="number"
          step="any"
          value={formData.lat}
          onChange={(e) => setFormData((prev) => ({ ...prev, lat: e.target.value }))}
          placeholder="e.g., 40.7128"
          error={errors.lat}
        />
        <Input
          label="Longitude"
          type="number"
          step="any"
          value={formData.lng}
          onChange={(e) => setFormData((prev) => ({ ...prev, lng: e.target.value }))}
          placeholder="e.g., -74.0060"
          error={errors.lng}
        />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation}>
        <MapPin className="w-4 h-4 mr-1" />
        Use Current Location
      </Button>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Radius: {formData.radius}m
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          value={formData.radius}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, radius: parseInt(e.target.value) }))
          }
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10m</span>
          <span>1000m</span>
        </div>
      </div>

      <Select
        label="Category"
        value={formData.category}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, category: value as LocationCategory }))
        }
        options={CATEGORIES}
      />

      <Input
        label="Activity"
        value={formData.activity}
        onChange={(e) => setFormData((prev) => ({ ...prev, activity: e.target.value }))}
        placeholder="e.g., Working, Relaxing, Training"
        helperText="This will appear in calendar events"
        error={errors.activity}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{zone ? 'Update Zone' : 'Add Zone'}</Button>
      </div>
    </form>
  );
}

export function ZoneEditor() {
  const { state, addZone, updateZone, deleteZone } = useApp();
  const { zones } = state;

  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<LocationZone | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAddZone = (data: ZoneFormData) => {
    addZone({
      name: data.name,
      coordinates: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
      },
      radius: data.radius,
      category: data.category,
      activity: data.activity,
    });
    setShowForm(false);
  };

  const handleUpdateZone = (data: ZoneFormData) => {
    if (!editingZone) return;
    updateZone({
      ...editingZone,
      name: data.name,
      coordinates: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
      },
      radius: data.radius,
      category: data.category,
      activity: data.activity,
      updatedAt: new Date().toISOString(),
    });
    setEditingZone(null);
  };

  const handleDelete = (id: string) => {
    deleteZone(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Location Zones</h2>
          <p className="text-sm text-muted-foreground">
            Define areas that will be automatically categorized when importing location data
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          Add Zone
        </Button>
      </div>

      {/* Zone list */}
      <div className="grid gap-4 md:grid-cols-2">
        {zones.map((zone) => {
          const colorClass = CATEGORY_COLORS[zone.category];
          return (
            <Card key={zone.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}
                  >
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{zone.name}</h3>
                      <Badge variant="secondary" size="sm">
                        {zone.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{zone.activity}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <a
                        href={getGoogleMapsLink(zone.coordinates)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline"
                      >
                        {formatCoordinates(zone.coordinates)}
                      </a>
                      <span>•</span>
                      <span>{zone.radius}m radius</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingZone(zone)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      title="Edit zone"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(zone.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete zone"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {zones.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No zones defined yet</p>
            <p className="text-sm">Add zones to automatically categorize your location data</p>
          </div>
        )}
      </div>

      {/* Add zone modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Location Zone">
        <ZoneForm onSubmit={handleAddZone} onCancel={() => setShowForm(false)} />
      </Modal>

      {/* Edit zone modal */}
      <Modal
        isOpen={!!editingZone}
        onClose={() => setEditingZone(null)}
        title="Edit Location Zone"
      >
        {editingZone && (
          <ZoneForm
            zone={editingZone}
            onSubmit={handleUpdateZone}
            onCancel={() => setEditingZone(null)}
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Zone"
        size="sm"
      >
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete this zone? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
