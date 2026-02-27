// src/dashboard/pages/home/hooks/useHomeData.js

import { useOverview } from '../../../../hooks/useOverview';

export function useHomeData() {
  const { homeData, loading, error, refetch } = useOverview();
  return { data: homeData, loading, error, refetch };
}