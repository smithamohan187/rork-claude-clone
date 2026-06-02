import React, { useCallback, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export const [SideDrawerProvider, useSideDrawer] = createContextHook(() => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { isOpen, open, close, toggle };
});
