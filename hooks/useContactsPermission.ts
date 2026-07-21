import { useCallback, useState } from 'react';
import {
  ContactsPermissionStatus,
  getContactsPermissionStatus,
  requestContactsPermission,
} from '@/api/services/contactsService';

// Never auto-requests on mount — only when the caller invokes request(),
// which should happen in direct response to a user tap (e.g. "Import from Contacts").
export function useContactsPermission() {
  const [status, setStatus] = useState<ContactsPermissionStatus>('undetermined');

  const checkStatus = useCallback(async () => {
    const current = await getContactsPermissionStatus();
    setStatus(current);
    return current;
  }, []);

  const request = useCallback(async () => {
    const result = await requestContactsPermission();
    setStatus(result);
    return result;
  }, []);

  return {
    status,
    canAsk: status !== 'granted',
    checkStatus,
    request,
  };
}
