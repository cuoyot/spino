package com.miguecoll.spino;

import com.google.android.gms.auth.api.identity.AuthorizationResult;
import java.util.Arrays;
import org.junit.Test;
import static org.junit.Assert.*;

public class DriveMediaAuthorizationTest {
    private static final String DRIVE_FILE="https://www.googleapis.com/auth/drive.file";

    private AuthorizationResult result(String token,String... scopes){
        return new AuthorizationResult(null,token,null,Arrays.asList(scopes),null,null,null);
    }

    @Test public void acceptsGrantedDriveFileScopeFromGoogleResult(){
        assertTrue(DriveMediaPlugin.hasDrivePermission(result("synthetic-token",DRIVE_FILE)));
        assertTrue(DriveMediaPlugin.hasDrivePermission(result("synthetic-token","openid",DRIVE_FILE)));
    }

    @Test public void rejectsMissingOrDifferentDrivePermission(){
        assertFalse(DriveMediaPlugin.hasDrivePermission(result("synthetic-token")));
        assertFalse(DriveMediaPlugin.hasDrivePermission(result("synthetic-token","openid")));
        assertFalse(DriveMediaPlugin.hasDrivePermission(result("synthetic-token",DRIVE_FILE+".other")));
    }

    @Test public void rejectsMissingAccessTokenEvenWithGrantedPermission(){
        assertFalse(DriveMediaPlugin.hasDrivePermission(result(null,DRIVE_FILE)));
        assertFalse(DriveMediaPlugin.hasDrivePermission(result("",DRIVE_FILE)));
    }
}
