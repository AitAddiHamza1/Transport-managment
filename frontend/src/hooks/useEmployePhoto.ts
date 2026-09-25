import { useState, useEffect } from 'react';
import { employesApi } from '../features/employes/employesApi';

/**
 * Custom hook to fetch an employee profile photo using the authenticated Axios client,
 * convert the returned Blob into an Object URL, and handle URL cleanup (URL.revokeObjectURL)
 * when unmounting or when the photo/employee changes.
 */
export function useEmployePhoto(
  id?: number | null,
  hasPhoto?: boolean,
  updatedTimestamp?: string | number,
): { photoUrl: string | null; loading: boolean; error: boolean } {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!id || !hasPhoto) {
      setPhotoUrl(null);
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    let createdUrl: string | null = null;

    setLoading(true);
    setError(false);

    employesApi
      .getPhotoBlob(id)
      .then((blob) => {
        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setPhotoUrl(createdUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPhotoUrl(null);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [id, hasPhoto, updatedTimestamp]);

  return { photoUrl, loading, error };
}
