// Render the Hanon YDP piano into velocity-layer samples for Web Audio playback.
#define TSF_IMPLEMENTATION
#include "tsf.h"
#include <stdio.h>
int main(int argc, char **argv) {
  if (argc != 3) return 1;
  tsf *font = tsf_load_filename(argv[1]);
  if (!font) return 2;
  tsf_set_output(font, TSF_MONO, 32000, -8);
  short buffer[32000]; char path[1024];
  for (int key=21; key<=108; key++) for (int velocity=40; velocity<=120; velocity+=40) {
    snprintf(path,sizeof(path),"%s/%d-%d.pcm",argv[2],key,velocity);
    FILE *out=fopen(path,"wb"); if (!out) return 3;
    tsf_reset(font); tsf_note_on(font,0,key,velocity/127.f);
    for (int second=0; second<12; second++) { tsf_render_short(font,buffer,32000,0); fwrite(buffer,sizeof(short),32000,out); }
    fclose(out);
  }
  tsf_close(font); return 0;
}
