interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: '⏳ Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  PAID: { label: '✅ Pago', color: 'bg-green-100 text-green-800 border-green-300' },
  PROCESSING: { label: '📦 Processando', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  SHIPPED: { label: '🚚 Enviado', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  DELIVERED: { label: '✓ Entregue', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  CANCELLED: { label: '❌ Cancelado', color: 'bg-red-100 text-red-800 border-red-300' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-300' };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
