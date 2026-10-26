package com.miguecoll.spino;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

@RunWith(AndroidJUnit4.class)
public class BackupAccountIsolationInstrumentedTest {
    private final Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    private class Notebook extends DriveNotebookPlugin { @Override public Context getContext(){return context;} }
    private final String selector="review-backup-selector-"+UUID.randomUUID();
    private class Backups extends DriveBackupAccountPlugin { @Override public Context getContext(){return context;} @Override protected SharedPreferences preferences(){return context.getSharedPreferences(selector,0);} }
    private class Archives extends DriveArchivePlugin { @Override public Context getContext(){return context;} }
    @Test public void archiveAccountsAndTransfersAreIsolatedFromNotebookAuthorization() throws Exception {
        Notebook notebook=new Notebook();Backups backups=new Backups();Archives archives=new Archives();
        Map<String,?> before=new HashMap<>(notebook.preferences().getAll());
        String a="review-archive-A-"+UUID.randomUUID(),b="review-archive-B-"+UUID.randomUUID();
        try {
            assertTrue(backups.alwaysChooseAccount());assertTrue(backups.acceptsAccountChange());assertFalse(notebook.alwaysChooseAccount());assertFalse(notebook.acceptsAccountChange());
            backups.rememberAccount(new JSObject().put("id",a).put("email","archive-a@example.invalid").put("name","Synthetic archive A"));
            backups.rememberAccount(new JSObject().put("id",b).put("email","archive-b@example.invalid").put("name","Synthetic archive B"));
            SharedPreferences accountA=backups.preferencesFor(a),accountB=backups.preferencesFor(b);
            assertEquals(a,accountA.getString("id",""));assertEquals(b,accountB.getString("id",""));
            assertEquals(a,archives.accountPreferences(a).getString("id",""));assertEquals(b,archives.accountPreferences(b).getString("id",""));
            assertNull(backups.authorizationRequest(true,accountA).getAccount());
            assertEquals("archive-a@example.invalid",backups.authorizationRequest(false,accountA).getAccount().name);
            assertEquals("archive-b@example.invalid",backups.authorizationRequest(false,accountB).getAccount().name);
            assertTrue(backups.forgetAccounts());assertEquals("",archives.accountPreferences(a).getString("id",""));assertEquals("",archives.accountPreferences(b).getString("id",""));
            assertEquals("spino-drive-archives",archives.transferCacheName());assertEquals("spino-drive-archives",archives.transferStateName());
            assertTrue("Notebook credentials must remain unchanged",before.equals(notebook.preferences().getAll()));
        } finally {
            context.deleteSharedPreferences(selector);context.deleteSharedPreferences("spino-backup-drive-account."+a);context.deleteSharedPreferences("spino-backup-drive-account."+b);
            notebook.handleOnDestroy();backups.handleOnDestroy();archives.handleOnDestroy();
        }
    }
}
