import { Package, Clock, CheckCircle2, XCircle, Truck } from 'lucide-react';

interface ActivityItem {
  id: string;
  tracking_number: string;
  status: string;
  created_at: string;
  updated_at?: string;
  sender_name?: string;
  recipient_name?: string;
  price?: number;
  last_tracking_status?: string;
  last_tracking_date?: string;
  updated_by_name?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const statusIcons: Record<string, any> = {
  pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  confirmed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-100' },
  in_transit: { icon: Truck, color: 'text-indigo-600 bg-indigo-100' },
  delivered: { icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
  cancelled: { icon: XCircle, color: 'text-red-600 bg-red-100' },
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  in_transit: 'En transit',
  delivered: 'Livré',
  cancelled: 'Annulé',
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getStatusInfo = (status: string) => {
    return statusIcons[status] || { icon: Package, color: 'text-[#6B7280] bg-[#F6F7F9]' };
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#E6E6E6] p-6">
        <p className="text-[#6B7280] text-center py-8">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E6E6E6] p-6">
      <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mb-4 text-[#1A1A1A]">Activité récente</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity) => {
          const StatusIcon = getStatusInfo(activity.status).icon;
          const statusColor = getStatusInfo(activity.status).color;
          const activityDate = activity.last_tracking_date || activity.updated_at || activity.created_at;
          
          return (
            <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-[#F6F7F9] rounded-lg transition-colors">
              <div className={`p-2 rounded-lg ${statusColor}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1A1A1A]">{activity.tracking_number}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${statusColor}`}>
                      {statusLabels[activity.status] || activity.status}
                    </span>
                  </div>
                  <span className="text-xs text-[#6B7280]">{formatDate(activityDate)}</span>
                </div>
                <div className="text-sm text-[#6B7280] space-y-1">
                  {activity.sender_name && activity.recipient_name && (
                    <p>
                      <span className="font-medium">{activity.sender_name}</span>
                      {' → '}
                      <span className="font-medium">{activity.recipient_name}</span>
                    </p>
                  )}
                  {activity.price && (
                    <p className="text-[#FF6C00] font-semibold">
                      {parseInt(activity.price.toString()).toLocaleString()} FCFA
                    </p>
                  )}
                  {activity.updated_by_name && (
                    <p className="text-xs text-[#6B7280]">
                      Mis à jour par {activity.updated_by_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

