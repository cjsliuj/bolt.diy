import { useState, useEffect } from 'react';
import { checkForUpdates, acknowledgeUpdate } from '~/lib/api/updates';

const LAST_ACKNOWLEDGED_VERSION_KEY = 'bolt_last_acknowledged_version';

export const useUpdateCheck = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);
  const [lastAcknowledgedVersion, setLastAcknowledgedVersion] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_ACKNOWLEDGED_VERSION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const checkUpdate = async () => {
      setUpdateCheckError(null);
      try {
        const result = await checkForUpdates();
        if (result.error) {
          setUpdateCheckError(result.error.message);
          setHasUpdate(false);
          setCurrentVersion('unknown');
        } else {
          setCurrentVersion(result.version);
          setHasUpdate(result.available && result.version !== lastAcknowledgedVersion);
        }
      } catch (error) {
        setUpdateCheckError(error instanceof Error ? error.message : 'Unknown error');
        setHasUpdate(false);
        setCurrentVersion('unknown');
      }
    };

    // checkUpdate(); // Temporarily disabled
    // const interval = setInterval(checkUpdate, 30 * 60 * 1000); // Temporarily disabled

    // return () => clearInterval(interval); // Corresponding cleanup also disabled
    return () => {}; // Return an empty function for cleanup as interval is disabled
  }, [lastAcknowledgedVersion]);

  const handleAcknowledgeUpdate = async () => {
    try {
      const result = await checkForUpdates();
      if (result.error) {
        return;
      }
      
      await acknowledgeUpdate(result.version);

      try {
        localStorage.setItem(LAST_ACKNOWLEDGED_VERSION_KEY, result.version);
      } catch (error) {
        // ... existing code ...
      }

      setLastAcknowledgedVersion(result.version);
      setHasUpdate(false);
      setUpdateCheckError(null);
    } catch (error) {
      // ... existing code ...
    }
  };

  return { hasUpdate, currentVersion, acknowledgeUpdate: handleAcknowledgeUpdate, updateCheckError };
};
