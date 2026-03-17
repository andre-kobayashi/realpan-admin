'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
export default function ViewOrderPJPage() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/dashboard/orders-pj/${params.id}/edit`);
  }, [router, params.id]);
  return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
}
