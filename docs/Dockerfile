FROM tomcat:11.0-jdk21-temurin-noble

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl xz-utils ca-certificates fonts-nanum fontconfig && \
    curl -fL -o /tmp/ffmpeg.tar.xz \
        https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz && \
    mkdir -p /tmp/ffmpeg-extract && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg-extract --strip-components=1 && \
    cp /tmp/ffmpeg-extract/bin/ffmpeg /usr/local/bin/ffmpeg && \
    cp /tmp/ffmpeg-extract/bin/ffprobe /usr/local/bin/ffprobe && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe && \
    rm -rf /tmp/ffmpeg.tar.xz /tmp/ffmpeg-extract && \
    fc-cache -f && \
    apt-get purge -y curl xz-utils && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
