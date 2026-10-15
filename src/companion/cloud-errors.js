// Older installed bridges report provider failures with one generic code.
export function cloudErrorCode(error) {
  if (/No content provider/i.test(error.message || '')) return 'PROVIDER_UNAVAILABLE';
  if (/permission denial|permission denied|permission revoked|SecurityException/i.test(error.message || '')) return 'PERMISSION_REQUIRED';
  return error.code || '';
}

export const needsCloudRelink = state => ['PROVIDER_UNAVAILABLE', 'PERMISSION_REQUIRED', 'FILE_UNAVAILABLE'].includes(state.errorCode || cloudErrorCode({ message: state.error }));
