package com.miguecoll.spino;

import org.junit.Test;
import java.io.*;
import static org.junit.Assert.*;

public class DocumentExportTest {
    @Test public void writesExactBytesAndClosesDestinationBeforeSuccess() throws Exception {
        byte[] bytes=new byte[700003];for(int i=0;i<bytes.length;i++)bytes[i]=(byte)(i%251);
        final boolean[] closed={false};
        ByteArrayOutputStream destination=new ByteArrayOutputStream(){@Override public void close()throws IOException{closed[0]=true;super.close();}};
        assertEquals(bytes.length,DocumentExport.write(new ByteArrayInputStream(bytes),()->destination,bytes.length));
        assertTrue(closed[0]);assertArrayEquals(bytes,destination.toByteArray());
    }
    @Test public void providerFailureOnCloseIsNotReportedAsSaved() throws Exception {
        OutputStream destination=new ByteArrayOutputStream(){@Override public void close()throws IOException{throw new IOException("Provider commit failed");}};
        try{DocumentExport.write(new ByteArrayInputStream(new byte[]{1,2}),()->destination,2);fail("Closing must succeed");}
        catch(IOException error){assertEquals("Provider commit failed",error.getMessage());}
    }
    @Test public void refusesTruncatedOrExpandedPreparedFile() throws Exception {
        for(long expected:new long[]{1,3}){
            try{DocumentExport.write(new ByteArrayInputStream(new byte[]{1,2}),ByteArrayOutputStream::new,expected);fail("Length mismatch");}
            catch(IOException expectedFailure){assertTrue(expectedFailure.getMessage().contains("prepared file"));}
        }
    }
    @Test public void providerOpenFailureStillClosesPreparedInput() throws Exception {
        final boolean[] closed={false};InputStream source=new ByteArrayInputStream(new byte[]{1}){@Override public void close(){closed[0]=true;}};
        try{DocumentExport.write(source,()->{throw new IOException("Provider unavailable");},1);fail("Opening failed");}
        catch(IOException expected){assertTrue(closed[0]);}
    }
    @Test public void writeFailureCannotProduceSuccessfulByteCount() throws Exception {
        final boolean[] closed={false};OutputStream destination=new OutputStream(){public void write(int value)throws IOException{throw new IOException("Storage full");}public void close(){closed[0]=true;}};
        try{DocumentExport.write(new ByteArrayInputStream(new byte[]{1}),()->destination,1);fail("Write failed");}
        catch(IOException expected){assertEquals("Storage full",expected.getMessage());assertTrue(closed[0]);}
    }
}
