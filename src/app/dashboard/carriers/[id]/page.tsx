import { redirect } from 'next/navigation';

export default function CarrierDetailPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/carriers/${params.id}/edit`);
}
