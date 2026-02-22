// src/dashboard/pages/home/hooks/useHomeData.js

import { useState, useEffect, useRef } from 'react';
import DashboardService from '../../../../services/dashboard.service';

export function useHomeData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchedRef = useRef(false);

    const fetchData = async () => {
        // Prevent duplicate fetches
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        try {
            setLoading(true);
            setError(null);

            const result = await DashboardService.getHomeData();

            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error || 'Failed to load data');
            }
        } catch (err) {
            console.error('useHomeData error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Reset on unmount so it fetches again next time
        return () => {
            fetchedRef.current = false;
        };
    }, []);

    const refetch = () => {
        fetchedRef.current = false;
        fetchData();
    };

    return {
        data,
        loading,
        error,
        refetch
    };
}