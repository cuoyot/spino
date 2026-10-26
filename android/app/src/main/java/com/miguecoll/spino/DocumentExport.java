package com.miguecoll.spino;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/** A document is saved only when every byte and both stream closures succeed. */
final class DocumentExport {
    interface Destination { OutputStream open() throws IOException; }
    static long write(InputStream input, Destination target, long expected) throws IOException {
        try (InputStream source=input; OutputStream destination=target.open()) {
            if (source==null || destination==null || expected<1) throw new IOException("The file destination is unavailable.");
            byte[] buffer=new byte[64*1024]; long written=0; int count;
            while ((count=source.read(buffer))!=-1) {
                if (Thread.currentThread().isInterrupted()) throw new IOException("File saving interrupted.");
                if (written+count>expected) throw new IOException("The prepared file changed. Prepare it again.");
                destination.write(buffer,0,count); written+=count;
            }
            if (written!=expected) throw new IOException("The prepared file is incomplete. Prepare it again.");
            destination.flush();
            return written;
        }
    }
}
