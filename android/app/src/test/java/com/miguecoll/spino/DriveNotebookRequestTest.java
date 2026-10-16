package com.miguecoll.spino;
import org.junit.Test;
import static org.junit.Assert.*;
public class DriveNotebookRequestTest {
    @Test public void acceptsOnlyRelativeDriveNotebookRoutes(){
        assertTrue(DriveNotebookPlugin.validPath("/drive/v3/files?q=synthetic"));
        assertTrue(DriveNotebookPlugin.validPath("/drive/v3/files/synthetic-file?alt=media"));
        assertTrue(DriveNotebookPlugin.validPath("/upload/drive/v3/files/synthetic-file?uploadType=media"));
        assertTrue(DriveNotebookPlugin.validPath("/drive/v2/files/synthetic-file?fields=id,etag,properties"));
        assertTrue(DriveNotebookPlugin.validPath("/drive/v2/files/synthetic-file?alt=media"));
        assertTrue(DriveNotebookPlugin.validPath("/upload/drive/v2/files/synthetic-file?uploadType=media"));
    }
    @Test public void rejectsRedirectsTraversalAndNonDriveRoutes(){
        for(String path:new String[]{null,"https://evil.example/drive/v3/files","//evil.example/drive/v3/files","/drive/v3/files/../about","/drive/v3/files/%2e%2e","/drive/v3/files/id#fragment","/drive/v3/files/id\r\nX-Test:1","/oauth2/v1/userinfo","/drive/v2/files","/drive/v2/about","/drive/v2/files/id/permissions","/drive/v2/files/%2e%2e"})assertFalse(path,DriveNotebookPlugin.validPath(path));
    }
}
