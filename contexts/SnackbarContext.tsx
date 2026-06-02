import React, { useCallback, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import createContextHook from '@nkzw/create-context-hook';

interface SnackbarState {
  visible: boolean;
  message: string;
}

export const [SnackbarProvider, useSnackbar] = createContextHook(() => {
  const [state, setState] = useState<SnackbarState>({ visible: false, message: '' });

  const showSnackbar = useCallback((message: string) => {
    console.log('[Snackbar] show:', message);
    setState({ visible: true, message });
  }, []);

  const dismissSnackbar = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return { snackbar: state, showSnackbar, dismissSnackbar };
});

export function GlobalSnackbar() {
  const { snackbar, dismissSnackbar } = useSnackbar();
  return (
    <Snackbar
      visible={snackbar.visible}
      onDismiss={dismissSnackbar}
      duration={2500}
      style={{ marginBottom: 80 }}
      testID="global-snackbar"
    >
      {snackbar.message}
    </Snackbar>
  );
}
