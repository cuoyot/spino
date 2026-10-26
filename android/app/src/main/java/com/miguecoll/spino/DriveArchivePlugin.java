package com.miguecoll.spino;

import android.content.SharedPreferences;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Archive bytes, credentials and transfer cache never use the notebook media session. */
@CapacitorPlugin(name="DriveArchive")
public class DriveArchivePlugin extends DriveMediaPlugin {
    @Override protected SharedPreferences accountPreferences(String id){
        String safe=id!=null&&id.matches("[\\w-]{1,180}")?id:"unconnected";
        return getContext().getSharedPreferences("spino-backup-drive-account."+safe,0);
    }
    @Override protected String transferCacheName(){return "spino-drive-archives";}
    @Override protected String transferStateName(){return "spino-drive-archives";}
    @PluginMethod public void useBackupAccount(PluginCall call){super.useNotebookAccount(call);}
}
