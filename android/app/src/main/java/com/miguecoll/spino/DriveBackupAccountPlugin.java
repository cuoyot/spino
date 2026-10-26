package com.miguecoll.spino;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.HashSet;
import java.util.Collections;

/** Archive authorization is independent of live notebook synchronization. */
@CapacitorPlugin(name="DriveBackupAccount")
public class DriveBackupAccountPlugin extends DriveNotebookPlugin {
    @Override protected SharedPreferences preferences(){return getContext().getSharedPreferences("spino-backup-drive-account",0);}
    @Override protected SharedPreferences preferencesFor(String id){
        if(id==null||!id.matches("[\\w-]{1,180}"))return preferences();
        return getContext().getSharedPreferences("spino-backup-drive-account."+id,0);
    }
    @Override protected boolean alwaysChooseAccount(){return true;}
    @Override protected boolean acceptsAccountChange(){return true;}
    @Override protected void rememberAccount(JSObject account)throws IOException {
        // Retain prior authorizations so cancelling a draft account change cannot break active backups.
        SharedPreferences prefs=preferencesFor(account.getString("id"));
        if(!prefs.edit().putString("id",account.getString("id")).putString("email",account.getString("email")).putString("name",account.getString("name")).commit())throw new IOException("Could not remember the backup account.");
        HashSet<String> ids=new HashSet<>(preferences().getStringSet("authorized",Collections.emptySet()));ids.add(account.getString("id"));
        if(!preferences().edit().putStringSet("authorized",ids).commit())throw new IOException("Could not remember the backup account.");
    }
    @Override protected boolean forgetAccounts(){
        for(String id:preferences().getStringSet("authorized",Collections.emptySet()))if(!preferencesFor(id).edit().clear().commit())return false;
        return super.forgetAccounts();
    }
}
