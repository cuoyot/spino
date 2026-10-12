import { Capacitor } from '@capacitor/core';

export const supportsWifiOnly = () => Capacitor.getPlatform() !== 'ios';
export const effectiveWifiOnly = preference => supportsWifiOnly() && !!preference;
