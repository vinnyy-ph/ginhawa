import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationRoot, useNotifications } from './notification-provider';

let sseOptions: { onmessage?: (ev: { event: string; data: string }) => void } = {};
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn((_url: string, opts: typeof sseOptions) => {
    sseOptions = opts;
    return new Promise(() => {});
  }),
}));

const toast = vi.fn();
vi.mock('sonner', () => ({ toast: (...a: unknown[]) => toast(...a) }));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { accessToken: 'tok' } } }),
}));

const seed = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiRequest: (...a: unknown[]) => seed(...a),
}));

function Probe() {
  const { notifications, unreadCount } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <ul>{notifications.map((n) => <li key={n.id}>{n.title}</li>)}</ul>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    sseOptions = {};
    toast.mockClear();
    seed.mockReset();
  });

  it('toasts and lists a pushed notification, deduped against the seed', async () => {
    seed.mockResolvedValue([
      { id: 'n-1', userId: 'u', type: 'GENERAL', title: 'Seeded', message: 'm', createdAt: '', readAt: '2020-01-01' },
    ]);

    render(<NotificationRoot><Probe /></NotificationRoot>);

    await waitFor(() => expect(screen.getByText('Seeded')).toBeInTheDocument());
    expect(screen.getByTestId('count').textContent).toBe('0');

    sseOptions.onmessage?.({ event: 'notification', data: JSON.stringify({ id: 'n-1', userId: 'u', type: 'GENERAL', title: 'Seeded', message: 'm', createdAt: '', readAt: '2020-01-01' }) });
    sseOptions.onmessage?.({ event: 'notification', data: JSON.stringify({ id: 'n-2', userId: 'u', type: 'APPOINTMENT_BOOKED', title: 'Booked', message: 'm2', createdAt: '', readAt: null }) });

    await waitFor(() => expect(screen.getByText('Booked')).toBeInTheDocument());
    expect(screen.getAllByText('Seeded')).toHaveLength(1);
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(toast).toHaveBeenCalledWith('Booked', { description: 'm2' });
  });

  it('ignores heartbeat ping events', () => {
    seed.mockResolvedValue([]);
    render(<NotificationRoot><Probe /></NotificationRoot>);
    sseOptions.onmessage?.({ event: 'ping', data: 'ping' });
    expect(toast).not.toHaveBeenCalled();
  });
});
