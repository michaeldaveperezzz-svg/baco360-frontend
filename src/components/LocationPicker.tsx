import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetinaUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
})

interface Props {
  latitude: number
  longitude: number
  onLocationChange: (latitude: number, longitude: number) => void
}

export default function LocationPicker({ latitude, longitude, onLocationChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onLocationChangeRef = useRef(onLocationChange)
  const initialPositionRef = useRef<[number, number]>([latitude, longitude])

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange
  }, [onLocationChange])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const position: L.LatLngExpression = [latitude, longitude]
    marker.setLatLng(position)
    map.setView(position, Math.max(map.getZoom(), 16))
  }, [latitude, longitude])

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current).setView(initialPositionRef.current, 15)
    mapRef.current = map
    const tileOptions: L.TileLayerOptions = {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }
    const cartoAttribution = `${tileOptions.attribution} &copy; <a href="https://carto.com/attribution/">CARTO</a>`
    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY
    const cartoTileUrl = (style: string) =>
      `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey ?? '')}`
    const baseLayers: Record<string, L.TileLayer> = {
      'CARTO Voyager': L.tileLayer(cartoTileUrl('voyager'), {
        subdomains: 'abcd',
        maxNativeZoom: 18,
        ...tileOptions,
        attribution: cartoAttribution,
      }),
      'CARTO Light': L.tileLayer(cartoTileUrl('light_all'), {
        subdomains: 'abcd',
        maxNativeZoom: 18,
        ...tileOptions,
        attribution: cartoAttribution,
      }),
      'CARTO Dark': L.tileLayer(cartoTileUrl('dark_all'), {
        subdomains: 'abcd',
        maxNativeZoom: 18,
        ...tileOptions,
        attribution: cartoAttribution,
      }),
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileOptions),
      Satellite: L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 19,
          maxZoom: 20,
          attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        },
      ),
    }
    baseLayers['CARTO Voyager'].addTo(map)
    L.control.layers(baseLayers, undefined, { position: 'topright' }).addTo(map)

    const marker = L.marker(initialPositionRef.current, { draggable: true }).addTo(map)
    markerRef.current = marker
    const reportLocation = (position: L.LatLng) => {
      onLocationChangeRef.current(position.lat, position.lng)
    }

    marker.on('dragend', () => reportLocation(marker.getLatLng()))
    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng)
      reportLocation(event.latlng)
    })
    map.whenReady(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return <div className="location-map-wrap">
    <div ref={containerRef} className="location-map" aria-label="Choose the report location on the map" />
    <p className="location-map-hint">Click the map or drag the pin. The address will appear in the search box.</p>
  </div>
}