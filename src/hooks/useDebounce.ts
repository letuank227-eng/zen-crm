import { useState, useEffect } from 'react';

/**
 * Hook tùy chỉnh trì hoãn cập nhật giá trị (Debounce)
 * Giúp giảm 80-90% số lượng request tìm kiếm dồn dập về server khi người dùng gõ phím.
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
