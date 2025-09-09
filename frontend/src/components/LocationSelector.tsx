import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    IconButton,
    Tooltip,
    InputAdornment,
    Autocomplete,
    Chip,
} from '@mui/material';
import {
    LocationOn,
    Search,
    MyLocation,
    Clear,
    Map,
    School,
} from '@mui/icons-material';
// Funções utilitárias para coordenadas (movidas do mapUtils removido)
function extractCoordinatesFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const cleanUrl = decodeURIComponent(url.trim());
    
    if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('goo.gl/maps')) {
      return null;
    }
    
    // Formato @lat,lng,zoom
    const atMatch = cleanUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (validateCoordinates(lat, lng)) {
        return { lat, lng };
      }
    }

    // Formato ll=lat,lng
    const llMatch = cleanUrl.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (validateCoordinates(lat, lng)) {
        return { lat, lng };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function validateCoordinates(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

interface LocationSelectorProps {
    value?: string;
    onChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
    placeholder?: string;
    label?: string;
    helperText?: string;
    disabled?: boolean;
}

interface SearchResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: string;
}

declare global {
    interface Window {
        L: any;
    }
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
    value = '',
    onChange,
    placeholder = 'Cole aqui a URL do Google Maps ou pesquise um endereço',
    label = 'Localização',
    helperText,
    disabled = false,
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoadingMaps, setIsLoadingMaps] = useState(false);
    const [mapsError, setMapsError] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Carregar Leaflet CSS e JS
    useEffect(() => {
        if (!window.L && !isLoadingMaps) {
            loadLeafletAPI();
        }
    }, []);

    // Atualizar coordenadas quando o valor muda
    useEffect(() => {
        if (inputValue && inputValue !== value) {
            const coords = extractCoordinatesFromGoogleMapsUrl(inputValue);
            if (coords) {
                setCoordinates(coords);
                setMapsError(null);
                if (mapInstance.current) {
                    updateMapLocation(coords);
                }
            } else if (inputValue.includes('maps.app.goo.gl') || inputValue.includes('goo.gl/maps')) {
                setMapsError('URL encurtada detectada. Para obter coordenadas, abra o link no navegador e copie a URL completa da barra de endereços.');
            } else if (inputValue.includes('maps.google') && !coords) {
                setMapsError('URL do Google Maps não contém coordenadas válidas.');
            } else {
                setMapsError(null);
            }
        }
    }, [inputValue, value]);

    const loadLeafletAPI = () => {
        setIsLoadingMaps(true);
        setMapsError(null);

        // Carregar CSS do Leaflet
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Carregar JS do Leaflet
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.async = true;

        script.onload = () => {
            setIsLoadingMaps(false);
        };

        script.onerror = () => {
            setIsLoadingMaps(false);
            setMapsError('Erro ao carregar mapa. Verifique sua conexão.');
        };

        document.head.appendChild(script);
    };

    const initializeMap = () => {
        if (!window.L || !mapRef.current) return;

        const defaultCenter = coordinates || { lat: -14.235, lng: -51.9253 }; // Centro do Brasil

        mapInstance.current = window.L.map(mapRef.current).setView(
            [defaultCenter.lat, defaultCenter.lng],
            coordinates ? 15 : 4
        );

        // Adicionar camada do OpenStreetMap
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(mapInstance.current);

        // Adicionar marcador se há coordenadas
        if (coordinates) {
            updateMapLocation(coordinates);
        }

        // Listener para cliques no mapa
        mapInstance.current.on('click', (event: any) => {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;
            const newCoords = { lat, lng };

            setCoordinates(newCoords);
            updateMapLocation(newCoords);

            // Gerar URL do Google Maps para compatibilidade
            const mapsUrl = `https://maps.google.com/@${lat},${lng},15z`;
            setInputValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            onChange(mapsUrl, newCoords);
        });
    };

    const updateMapLocation = (coords: { lat: number; lng: number }) => {
        if (!mapInstance.current) return;

        // Remover marcador anterior
        if (markerInstance.current) {
            mapInstance.current.removeLayer(markerInstance.current);
        }

        // Adicionar novo marcador
        markerInstance.current = window.L.marker([coords.lat, coords.lng])
            .addTo(mapInstance.current)
            .bindPopup('Localização selecionada')
            .openPopup();

        // Centralizar mapa
        mapInstance.current.setView([coords.lat, coords.lng], 15);
    };

    const expandShortenedUrl = async (shortUrl: string) => {
        try {
            setMapsError('Expandindo URL encurtada...');

            // Tentar expandir a URL usando um serviço de expansão
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(shortUrl)}`);

            if (response.ok) {
                const data = await response.json();
                const expandedUrl = data.contents;

                // Tentar extrair coordenadas da URL expandida
                const coords = extractCoordinatesFromGoogleMapsUrl(expandedUrl);
                if (coords) {
                    setCoordinates(coords);
                    setMapsError(null);
                    onChange(expandedUrl, coords);
                    if (mapInstance.current) {
                        updateMapLocation(coords);
                    }
                    return true;
                }
            }
        } catch (error) {
            console.error('Erro ao expandir URL:', error);
        }

        setMapsError('URL encurtada detectada. Siga os passos: 1) Abra este link no navegador, 2) Copie a URL completa da barra de endereços, 3) Cole aqui novamente.');
        return false;
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setInputValue(newValue);

        // Se for uma URL encurtada do Google Maps, tentar expandir
        if (newValue.includes('maps.app.goo.gl') || newValue.includes('goo.gl/maps')) {
            expandShortenedUrl(newValue);
        }
        // Se for uma URL do Google Maps normal, processar imediatamente
        else if (newValue.includes('maps.google')) {
            const coords = extractCoordinatesFromGoogleMapsUrl(newValue);
            if (coords) {
                setCoordinates(coords);
                setMapsError(null);
                onChange(newValue, coords);
                if (mapInstance.current) {
                    updateMapLocation(coords);
                }
            }
        } else if (newValue.length > 3) {
            // Debounce da busca
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }

            searchTimeout.current = setTimeout(() => {
                searchPlaces(newValue);
            }, 500);
        } else {
            setSearchResults([]);
            setSearchOpen(false);
        }
    };

    const searchPlaces = async (query: string) => {
        setIsSearching(true);
        setSearchOpen(true);

        try {
            let allResults: SearchResult[] = [];
            console.log(`🔍 Iniciando busca otimizada para: "${query}"`);

            // Busca 1: Busca específica para escolas usando amenity=school
            if (query.toLowerCase().includes('escola') || query.toLowerCase().includes('municipal') || query.toLowerCase().includes('estadual') || query.toLowerCase().includes('colégio')) {
                console.log('🏫 Busca específica para escolas');
                const schoolResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=1&extratags=1&layer=poi&amenity=school`
                );

                if (schoolResponse.ok) {
                    const schoolResults: SearchResult[] = await schoolResponse.json();
                    allResults = [...allResults, ...schoolResults];
                    console.log(`📚 Encontradas ${schoolResults.length} escolas específicas`);
                }
            }

            // Busca 2: Busca estruturada usando amenity parameter
            if (allResults.length < 3) {
                console.log('🔍 Busca estruturada com amenity');
                const structuredResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&amenity=${encodeURIComponent(query)}&countrycodes=br&limit=3&addressdetails=1&extratags=1&layer=poi`
                );

                if (structuredResponse.ok) {
                    const structuredResults: SearchResult[] = await structuredResponse.json();
                    allResults = [...allResults, ...structuredResults];
                    console.log(`🏢 Encontrados ${structuredResults.length} estabelecimentos`);
                }
            }

            // Busca 3: Busca por categoria usando múltiplos tipos educacionais
            if (allResults.length < 3 && (query.toLowerCase().includes('escola') || query.toLowerCase().includes('colégio'))) {
                console.log('📖 Busca por categoria educacional');
                const categoryResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=3&addressdetails=1&extratags=1&layer=poi&featureType=settlement`
                );

                if (categoryResponse.ok) {
                    const categoryResults: SearchResult[] = await categoryResponse.json();
                    // Filtrar apenas resultados educacionais
                    const educationalResults = categoryResults.filter(result =>
                        result.class === 'amenity' &&
                        ['school', 'college', 'university', 'kindergarten'].includes(result.type)
                    );
                    allResults = [...allResults, ...educationalResults];
                    console.log(`🎓 Encontradas ${educationalResults.length} instituições educacionais`);
                }
            }

            // Busca 4: Busca geral otimizada com dedupe
            if (allResults.length < 3) {
                console.log('🌐 Busca geral otimizada');
                const generalResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=1&extratags=1&layer=address,poi&dedupe=1`
                );

                if (generalResponse.ok) {
                    const generalResults: SearchResult[] = await generalResponse.json();
                    allResults = [...allResults, ...generalResults];
                    console.log(`📍 Encontrados ${generalResults.length} locais gerais`);
                }
            }

            // Busca 5: Fallback com termos mais amplos
            if (allResults.length === 0) {
                console.log('🔄 Busca fallback com termos amplos');
                const words = query.split(' ');
                const broadQuery = words.length > 2 ? words.slice(0, 2).join(' ') : query;

                const fallbackResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broadQuery)}&countrycodes=br&limit=5&addressdetails=1&layer=address,poi,natural,manmade`
                );

                if (fallbackResponse.ok) {
                    const fallbackResults: SearchResult[] = await fallbackResponse.json();
                    allResults = [...allResults, ...fallbackResults];
                    console.log(`🎯 Encontrados ${fallbackResults.length} resultados amplos`);
                }
            }

            // Processar e otimizar resultados
            const processedResults = allResults
                .filter((result, index, self) =>
                    // Remover duplicatas baseado no place_id
                    index === self.findIndex(r => r.place_id === result.place_id)
                )
                .map(result => ({
                    ...result,
                    // Adicionar score de relevância para escolas
                    relevance_score: calculateRelevanceScore(result, query)
                }))
                .sort((a, b) => b.relevance_score - a.relevance_score) // Ordenar por relevância
                .slice(0, 5); // Limitar a 5 melhores resultados

            setSearchResults(processedResults);
            console.log(`✅ Total de ${processedResults.length} resultados únicos processados`);

        } catch (error) {
            console.error('Erro na busca:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Função para calcular score de relevância
    const calculateRelevanceScore = (result: any, query: string): number => {
        let score = 0;
        const queryLower = query.toLowerCase();
        const displayName = result.display_name?.toLowerCase() || '';

        // Bonus para escolas
        if (result.class === 'amenity' && result.type === 'school') score += 50;
        if (displayName.includes('escola')) score += 30;
        if (displayName.includes('colégio')) score += 25;
        if (displayName.includes('municipal')) score += 20;
        if (displayName.includes('estadual')) score += 15;

        // Bonus para correspondência exata de palavras
        const queryWords = queryLower.split(' ');
        queryWords.forEach(word => {
            if (word.length > 2 && displayName.includes(word)) {
                score += 10;
            }
        });

        // Bonus para importância do lugar
        if (result.importance) score += result.importance * 10;

        // Penalty para lugares muito genéricos
        if (displayName.includes('brasil') && !queryLower.includes('brasil')) score -= 10;

        return score;
    };

    const selectPlace = (result: SearchResult) => {
        const coords = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
        };

        setCoordinates(coords);
        setSearchResults([]);
        setSearchOpen(false);

        // Gerar URL do Google Maps para compatibilidade
        const mapsUrl = `https://maps.google.com/@${coords.lat},${coords.lng},15z`;
        setInputValue(result.display_name);
        onChange(mapsUrl, coords);

        if (mapInstance.current) {
            updateMapLocation(coords);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMapsError('Geolocalização não suportada pelo navegador.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                setCoordinates(coords);
                setMapsError(null);

                // Gerar URL do Google Maps
                const mapsUrl = `https://maps.google.com/@${coords.lat},${coords.lng},15z`;
                setInputValue('Localização atual');
                onChange(mapsUrl, coords);

                if (mapInstance.current) {
                    updateMapLocation(coords);
                }
            },
            (error) => {
                setMapsError('Erro ao obter localização atual. Verifique as permissões.');
            }
        );
    };

    const clearLocation = () => {
        setInputValue('');
        setCoordinates(null);
        setSearchResults([]);
        setSearchOpen(false);
        setMapsError(null);
        onChange('');

        if (markerInstance.current && mapInstance.current) {
            mapInstance.current.removeLayer(markerInstance.current);
            markerInstance.current = null;
        }
    };

    const toggleMap = () => {
        setShowMap(!showMap);
        if (!showMap && window.L && !mapInstance.current) {
            setTimeout(initializeMap, 100);
        }
    };

    return (
        <Box>
            <TextField
                fullWidth
                label={label}
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                disabled={disabled}
                helperText={helperText}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <LocationOn sx={{ color: '#9ca3af' }} />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {inputValue && (
                                    <Tooltip title="Limpar">
                                        <IconButton size="small" onClick={clearLocation}>
                                            <Clear fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Tooltip title="Usar localização atual">
                                    <IconButton size="small" onClick={getCurrentLocation}>
                                        <MyLocation fontSize="small" />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Mostrar/ocultar mapa">
                                    <IconButton size="small" onClick={toggleMap}>
                                        <Map fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </InputAdornment>
                    ),
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                    },
                }}
            />

            {/* Mensagem quando não encontra resultados */}
            {searchOpen && isSearching === false && searchResults.length === 0 && inputValue.length > 3 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Nenhum resultado encontrado para "{inputValue}"
                    </Typography>
                    <Typography variant="caption">
                        Tente:
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, pl: 2, fontSize: '0.75rem' }}>
                        <li>Termos mais gerais (ex: "José Salomão" em vez de nome completo)</li>
                        <li>Apenas o nome da cidade ou bairro</li>
                        <li>Usar o mapa interativo clicando no ícone de mapa</li>
                        <li>Usar sua localização atual se estiver no local</li>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                                const cityQuery = inputValue.split(' ').slice(-2).join(' '); // Pegar últimas 2 palavras
                                if (cityQuery !== inputValue) {
                                    setInputValue(cityQuery);
                                    searchPlaces(cityQuery);
                                }
                            }}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            Buscar só cidade/bairro
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={toggleMap}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            Abrir mapa
                        </Button>
                    </Box>
                </Alert>
            )}

            {/* Resultados da busca */}
            {searchOpen && searchResults.length > 0 && (
                <Paper
                    sx={{
                        mt: 1,
                        maxHeight: 200,
                        overflow: 'auto',
                        border: '1px solid #e5e7eb',
                        position: 'relative',
                        zIndex: 1000,
                    }}
                >
                    {searchResults.map((result, index) => (
                        <Box
                            key={result.place_id}
                            sx={{
                                p: 2,
                                cursor: 'pointer',
                                borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                                '&:hover': {
                                    bgcolor: '#f9fafb',
                                },
                            }}
                            onClick={() => selectPlace(result)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                {/* Ícone baseado no tipo */}
                                {result.class === 'amenity' && result.type === 'school' && (
                                    <School sx={{ fontSize: 16, color: '#059669' }} />
                                )}
                                {result.class === 'place' && (
                                    <LocationOn sx={{ fontSize: 16, color: '#6b7280' }} />
                                )}

                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {result.display_name.split(',')[0]}
                                </Typography>

                                {/* Badge para escolas */}
                                {result.class === 'amenity' && result.type === 'school' && (
                                    <Chip
                                        label="Escola"
                                        size="small"
                                        sx={{
                                            height: 16,
                                            fontSize: '0.65rem',
                                            bgcolor: '#dcfce7',
                                            color: '#059669'
                                        }}
                                    />
                                )}
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {result.display_name.split(',').slice(1).join(',').trim()}
                            </Typography>

                            {/* Score de relevância (apenas em desenvolvimento) */}
                            {process.env.NODE_ENV === 'development' && result.relevance_score && (
                                <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.6rem' }}>
                                    Score: {result.relevance_score.toFixed(1)}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Paper>
            )}

            {/* Loading da busca */}
            {isSearching && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                        Buscando endereços...
                    </Typography>
                </Box>
            )}

            {/* Coordenadas encontradas */}
            {coordinates && (
                <Alert
                    severity="success"
                    sx={{ mt: 1 }}
                    icon={<LocationOn />}
                >
                    <Typography variant="body2">
                        Coordenadas: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                    </Typography>
                </Alert>
            )}

            {/* Erro */}
            {mapsError && (
                <Alert
                    severity={mapsError.includes('URL encurtada') ? 'warning' : 'error'}
                    sx={{ mt: 1 }}
                    action={
                        mapsError.includes('URL encurtada') && inputValue.includes('goo.gl') ? (
                            <Button
                                size="small"
                                onClick={() => window.open(inputValue, '_blank')}
                                sx={{ color: 'inherit' }}
                            >
                                Abrir Link
                            </Button>
                        ) : null
                    }
                >
                    {mapsError}
                </Alert>
            )}

            {/* Loading do mapa */}
            {isLoadingMaps && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                        Carregando mapa...
                    </Typography>
                </Box>
            )}

            {/* Mapa */}
            {showMap && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Clique no mapa para selecionar a localização
                    </Typography>
                    <Box
                        ref={mapRef}
                        sx={{
                            width: '100%',
                            height: 300,
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                        }}
                    />
                </Box>
            )}

            {/* Instruções */}
            {!coordinates && !mapsError && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        💡 Dicas:
                    </Typography>
                    <Box component="ul" sx={{ mt: 0.5, pl: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
                        <li>Digite o nome da escola ou endereço (ex: "Escola Municipal José Salomão")</li>
                        <li>Cole uma URL completa do Google Maps (não use links encurtados)</li>
                        <li>Use sua localização atual ou clique no mapa</li>
                        <li>Para URLs do Google Maps: abra o link, copie a URL da barra de endereços</li>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default LocationSelector;