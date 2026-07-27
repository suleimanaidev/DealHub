import type { Notification } from '../../types/notification';

interface Props {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'LEAD_ASSIGNED':
      return '👤';
    case 'DEAL_CREATED':
      return '💰';
    case 'DEAL_STAGE_CHANGED':
      return '🔄';
    case 'TASK_ASSIGNED':
    case 'TASK_DUE':
      return '✅';
    case 'MEETING_SCHEDULED':
      return '📅';
    case 'INVITATION':
      return '📧';
    default:
      return '🔔';
  }
}

export default function NotificationItem({ notification, onMarkRead, onDelete }: Props) {
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification.id);
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
            {notification.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{notification.message}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.isRead && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
              className="p-1 text-gray-400 hover:text-blue-500 rounded"
              title="Mark as read"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
