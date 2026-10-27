# Local video fixture

A silent, three-second HLS sample generated with FFmpeg: a pink rectangle on a zinc background. No downloaded footage, user data, or external media services. Used only by the component playground and browser tests; not shipped in the library package.

Regenerate from the kit root:

```sh
ffmpeg -f lavfi -i 'color=c=0x18181b:s=480x270:r=24:d=3,drawbox=x=100:y=85:w=280:h=100:color=0xdb2777:t=fill' \
  -an -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -g 24 \
  -hls_time 1 -hls_list_size 0 \
  -hls_segment_filename 'static/playground/video/sample-%02d.ts' \
  -f hls static/playground/video/sample.m3u8
```

The player has controls, `preload="none"`, and no autoplay. Select the Video attachment to mount it; playback is started by the user. The unavailable-source toggle exercises the fallback link without contacting an external server.
