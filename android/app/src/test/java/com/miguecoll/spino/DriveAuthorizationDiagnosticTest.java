package com.miguecoll.spino;

import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Status;
import org.junit.Test;
import static org.junit.Assert.*;

public class DriveAuthorizationDiagnosticTest {
    @Test public void retainsGoogleFailureEvenWhenActivityReportsCancellation() {
        String message = DriveAuthorizationDiagnostic.message("RESULT", 0,
            new ApiException(new Status(10, "private account or token")), "com.miguecoll.spino");
        assertTrue(message.contains("SPINO_DRIVE_AUTH_RESULT google=10 activity=0"));
        assertTrue(message.contains("package=com.miguecoll.spino"));
        assertFalse(message.contains("private account or token"));
    }
    @Test public void missingResponseDoesNotClaimUserCancelledOrInventGoogleCause() {
        String message = DriveAuthorizationDiagnostic.message("RESULT", 0, null, "com.miguecoll.spino");
        assertTrue(message.contains("google=unknown activity=0 exception=none"));
        assertFalse(message.contains("cancelled"));
    }
    @Test public void reportsRequestFailureWithoutExposingExceptionMessage() {
        String message = DriveAuthorizationDiagnostic.message("REQUEST", null,
            new IllegalStateException("sensitive payload"), "com.miguecoll.spino.beta");
        assertTrue(message.contains("SPINO_DRIVE_AUTH_REQUEST"));
        assertTrue(message.contains("exception=IllegalStateException"));
        assertFalse(message.contains("sensitive payload"));
    }
}
