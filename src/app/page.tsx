'use client';
import React, { useState, useRef, useEffect } from 'react';
import { searchCities } from './CityDataBase';

interface ForecastData {
  date: string;
  temp: number;
  condition: string;
}

interface CityData {
  name: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  forecast?: ForecastData[];
}

const WeatherComparison = () => {
  const [cities, setCities] = useState<CityData[]>([]);
  const [newCity, setNewCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCelsius, setIsCelsius] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  const celsiusToFahrenheit = (celsius: number) => Math.round((celsius * 9/5) + 32);
  const formatTemperature = (celsius: number) => {
    const temp = isCelsius ? celsius : celsiusToFahrenheit(celsius);
    return `${temp}°${isCelsius ? 'C' : 'F'}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSuggestions = (input: string) => {
    return searchCities(input);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewCity(value);
    setSuggestions(getSuggestions(value));
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (city: string) => {
    setNewCity(city);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const fetchWeatherData = async (city: string) => {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!currentResponse.ok) {
      throw new Error('City not found');
    }

    const currentData = await currentResponse.json();

    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!forecastResponse.ok) {
      throw new Error('Forecast data not available');
    }

    const forecastData = await forecastResponse.json();

    const processedForecasts: ForecastData[] = [];
    const seenDates = new Set();

    for (const item of forecastData.list) {
      const date = new Date(item.dt * 1000);
      const dateStr = date.toISOString().split('T')[0];

      if (!seenDates.has(dateStr) && date.getDate() !== new Date().getDate()) {
        seenDates.add(dateStr);
        processedForecasts.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main,
        });

        if (processedForecasts.length === 5) break;
      }
    }

    return {
      temp: Math.round(currentData.main.temp),
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6),
      condition: currentData.weather[0].main,
      forecast: processedForecasts
    };
  };

  const addCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newCity.trim() && !cities.find(c => c.name.toLowerCase() === newCity.toLowerCase())) {
      setLoading(true);
      try {
        const weatherData = await fetchWeatherData(newCity);
        setCities([...cities, { name: newCity, ...weatherData }]);
        setNewCity('');
        setSuggestions([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeCity = (cityName: string) => {
    setCities(cities.filter(city => city.name !== cityName));
  };

  return (
    <div className="max-w-6xl mx-auto p-5 relative">
      <button
        onClick={() => setIsCelsius(!isCelsius)}
        className="absolute top-2 left-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-300 text-blue-950 rounded-lg hover:from-blue-500 hover:to-blue-400 transition-colors font-semibold text-sm"
      >
        {isCelsius ? '°C' : '°F'}
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-100">Weather</h1>
        <div className="relative" ref={searchRef}>
          <form onSubmit={addCity} className="flex justify-center gap-2">
            <div className="relative w-64">
              <input
                type="text"
                value={newCity}
                onChange={handleInputChange}
                placeholder="Enter city name"
                className="w-full px-4 py-2 border bg-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                  {suggestions.map((city, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 cursor-pointer hover:bg-blue-50 text-left"
                      onClick={() => handleSuggestionClick(city)}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-300 text-blue rounded-lg hover:from-blue-500 hover:to-blue-400 transition-colors text-blue-950 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Add City'}
            </button>
          </form>
        </div>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map(city => (
          <div key={city.name} className="bg-white rounded-lg shadow-md p-6 relative">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl"
              onClick={() => removeCity(city.name)}
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4">{city.name}</h2>
            <div className="space-y-3">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Current Weather</h3>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Temperature:</span>
                  <span>{formatTemperature(city.temp)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Condition:</span>
                  <span>{city.condition}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Humidity:</span>
                  <span>{city.humidity}%</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-gray-600">Wind:</span>
                  <span>{city.windSpeed} km/h</span>
                </div>
              </div>

              {city.forecast && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-3">5-Day Forecast</h3>
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-5 gap-2 text-sm min-w-full">
                      {city.forecast.map((day, index) => (
                        <div 
                          key={index} 
                          className="text-center p-3 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors"
                        >
                          <div className="font-medium text-blue-800">{day.date}</div>
                          <div className="text-lg font-bold text-blue-900">
                            {formatTemperature(day.temp)}
                          </div>
                          <div className="text-blue-700">{day.condition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherComparison;