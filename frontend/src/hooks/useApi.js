/**
 * Custom hook genérico para consumir la API del backend.
 * Maneja estados de carga, error y datos de forma declarativa.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

export function useFetch(endpoint, params = null, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0);

  // Clave estable para detectar cambios de params sin usar JSON.stringify en deps
  const paramsKey = params ? JSON.stringify(params) : null;

  useEffect(() => {
    let cancelled = false;

    async function doFetch() {
      setLoading(true);
      setError(null);
      try {
        // Filtrar parámetros nulos/undefined para no enviarlos al backend
        const cleanParams = params
          ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
          : null;
        const response = await apiClient.get(endpoint, { params: cleanParams });
        if (!cancelled) setData(response.data);
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.detail || err.message || 'Error desconocido';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doFetch();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, fetchKey, ...deps]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return { data, loading, error, refetch };
}
