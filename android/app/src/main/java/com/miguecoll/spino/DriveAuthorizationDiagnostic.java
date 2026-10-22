package com.miguecoll.spino;

import com.google.android.gms.common.api.ApiException;

/** Safe diagnostics for screenshots: never include tokens, account names or Intent extras. */
final class DriveAuthorizationDiagnostic {
    static String message(String stage, Integer activityResult, Exception error, String packageName) {
        String status = error instanceof ApiException
            ? Integer.toString(((ApiException) error).getStatusCode()) : "unknown";
        return "Google Drive authorization did not complete. [SPINO_DRIVE_AUTH_" + stage
            + " google=" + status
            + " activity=" + (activityResult == null ? "none" : activityResult)
            + " exception=" + (error == null ? "none" : error.getClass().getSimpleName())
            + " package=" + packageName + "]";
    }
}
