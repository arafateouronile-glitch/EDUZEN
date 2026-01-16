'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react'
interface LocationPickerProps {
  onLocationChange?: (location: { latitude: number; longitude: number; accuracy: number; address?: string }) => void
  required?: boolean
  sessionLocation?: { latitude: number; longitude: number; radius?: number }
}

export function LocationPicker({ onLocationChange, required = false, sessionLocation }: LocationPickerProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [address, setAddress] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  // Demander la géolocalisation au chargement si requise
  useEffect(() => {
    if (required) {
      requestLocation()
    }
  }, [required])

  // Calculer la distance si on a la localisation de la session
  useEffect(() => {
    if (location && sessionLocation?.latitude && sessionLocation?.longitude) {
      const dist = calculateDistance(
        sessionLocation.latitude,
        sessionLocation.longitude,
        location.latitude,
        location.longitude
      )
      setDistance(dist)

      if (sessionLocation.radius && dist > sessionLocation.radius) {
        setError(`Vous êtes trop loin (${Math.round(dist)}m, maximum: ${sessionLocation.radius}m)`)
      } else {
        setError(null)
      }
    }
  }, [location, sessionLocation])

  const requestLocation = async () => {
    setIsLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par votre navigateur')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setLocation(loc)

        // Récupérer l'adresse
        try {
          const response = await fetch(
            `/api/geolocation/reverse-geocode?latitude=${loc.latitude}&longitude=${loc.longitude}`
          )
          if (response.ok) {
            const data = await response.json()
            setAddress(data.address || '')
            onLocationChange?.({ ...loc, address: data.address })
          } else {
            onLocationChange?.(loc)
          }
        } catch (err) {
          onLocationChange?.(loc)
        }

        setIsLoading(false)
      },
      (error) => {
        setError(`Erreur de géolocalisation: ${error.message}`)
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance en mètres
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Géolocalisation {required && '*'}</Label>
        {location && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Localisation capturée</span>
          </div>
        )}
      </div>

      {location ? (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Précision: {Math.round(location.accuracy)}m
                {distance !== null && sessionLocation && (
                  <span className="ml-2">
                    • Distance: {Math.round(distance)}m
                    {sessionLocation.radius && (
                      <span className={distance > sessionLocation.radius ? 'text-red-600' : 'text-green-600'}>
                        {' '}
                        ({distance > sessionLocation.radius ? 'hors zone' : 'dans la zone'})
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            disabled={isLoading}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isLoading ? 'Mise à jour...' : 'Mettre à jour la localisation'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={isLoading}
            className="w-full"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isLoading ? 'Récupération de la localisation...' : 'Capturer ma localisation'}
          </Button>
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
