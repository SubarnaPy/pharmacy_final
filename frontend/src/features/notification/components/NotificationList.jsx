import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markNotificationRead } from '../notificationSlice';

function NotificationList() {
  const dispatch = useDispatch();
  const { list, status, error } = useSelector(state => state.notification);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchNotifications());
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (status === 'succeeded') {
      list.forEach(notif => {
        if (!notif.read && Notification.permission === 'granted') {
          new Notification(notif.title || 'Notification', {
            body: notif.message || notif.body,
          });
        }
      });
    }
  }, [list, status]);

  const handleMarkRead = (id) => {
    dispatch(markNotificationRead(id));
  };

  if (status === 'loading') return <p>Loading notifications...</p>;
  if (status === 'failed') return <p>Error: {error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <ul className="space-y-4">
        {list.map((notif) => (
          <li
            key={notif.id}
            className={`p-4 rounded-lg shadow ${notif.read ? 'bg-gray-100' : 'bg-white'}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{notif.title || 'New Notification'}</p>
                <p className="text-gray-600">{notif.message || notif.body}</p>
              </div>
              {!notif.read && (
                <button
                  className="ml-4 text-sm text-blue-600 hover:underline"
                  onClick={() => handleMarkRead(notif.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NotificationList;
