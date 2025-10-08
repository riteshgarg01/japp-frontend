import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

const mockListProductsPaged = vi.fn();
const mockGetProductImages = vi.fn();
const mockGetOrdersBySession = vi.fn();
const mockGetCart = vi.fn();
const mockSyncCart = vi.fn();

vi.mock('../../shared', () => ({
  fmt: (value) => 'Rs.' + value,
  waLink: vi.fn(() => 'https://wa.link/mock'),
  createOrder: vi.fn().mockResolvedValue({ id: 'ord-1', items: [] }),
  BRAND_NAME: 'Arohi',
  notifyOwnerByEmail: vi.fn(),
  listProductsPaged: mockListProductsPaged,
  getProductImages: mockGetProductImages,
  getOrdersBySession: mockGetOrdersBySession,
  getCart: mockGetCart,
  syncCart: mockSyncCart,
  trackEvent: vi.fn(),
  normalizeStyleTag: (value) => value,
  JEWELLERY_STYLE_OPTIONS: [],
}));

import ShopView from '../ShopView.jsx';

describe('ShopView', () => {
  const baseProducts = Array.from({ length: 3 }).map((_, idx) => ({
    id: 'prod-' + (idx + 1),
    title: 'Product ' + (idx + 1),
    description: 'Description ' + (idx + 1),
    category: 'Earrings',
    price: 1000 + idx,
    qty: 5,
    available: true,
    images: ['https://example.com/' + (idx + 1) + '.jpg'],
  }));

  beforeEach(() => {
    localStorage.clear();
    mockListProductsPaged.mockResolvedValue({ items: [], total: 0, next_offset: null });
    mockGetProductImages.mockResolvedValue({ images: [] });
    mockGetOrdersBySession.mockResolvedValue({ items: [] });
    mockGetCart.mockResolvedValue({ items: [] });
    mockSyncCart.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('requests the enlarged initial page on mount', async () => {
    render(<ShopView products={baseProducts} onOrderCreate={vi.fn()} ownerPhone="9999999999" isLoading={false} />);

    await waitFor(() => expect(mockListProductsPaged).toHaveBeenCalled());
    const params = mockListProductsPaged.mock.calls[0][0];
    expect(params.limit).toBe(24);
  });

  it('debounces search input before refetching products', async () => {
    render(<ShopView products={baseProducts} onOrderCreate={vi.fn()} ownerPhone="9999999999" isLoading={false} />);
    await waitFor(() => expect(mockListProductsPaged).toHaveBeenCalled());
    mockListProductsPaged.mockClear();

    vi.useFakeTimers();
    const input = screen.getByPlaceholderText('Search products');
    fireEvent.change(input, { target: { value: 'ring' } });

    expect(mockListProductsPaged).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(mockListProductsPaged).toHaveBeenCalledTimes(1));
    const params = mockListProductsPaged.mock.calls[0][0];
    expect(params.q).toBe('ring');
  });
});
