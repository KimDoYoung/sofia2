# jskn Tomcat 컨테이너에 GPU(NVENC) 붙이기

## 1. 배경

슬라이드쇼 동영상 생성(`SlideShowService`)은 `ProcessBuilder`로 `ffmpeg`를 직접 실행하며, GPU(`h264_nvenc`)를 먼저 시도하고 실패하면 CPU(`libx264`)로 자동 폴백한다. jskn 서버에 배포한 뒤 처음엔 컨테이너 안에 ffmpeg 자체가 없어서 실패했고, `apt-get install ffmpeg`로 우선 해결했지만 다음 두 가지 한계가 있었다.

- Ubuntu apt의 ffmpeg(`6.1.1-3ubuntu5`)는 **nvenc가 빌드에 포함돼 있지 않음** (`ffmpeg -version`의 configure 목록에 `--enable-nvenc`/`--enable-cuda` 없음).
- jskn_tomcat 컨테이너가 **호스트 GPU를 아예 못 봄** (docker-compose에 GPU 관련 설정 자체가 없었음).

jskn 서버엔 실제로 `NVIDIA GeForce GTX 1050`(파스칼 세대, NVENC 지원 칩)이 있는 걸 확인했으므로, 제대로 세팅하면 CPU 인코딩보다 훨씬 빠르게 슬라이드쇼를 만들 수 있다.

**앱(Java) 코드는 수정할 필요 없음** — 이미 GPU 우선 시도 + CPU 폴백 구조라, GPU가 정상적으로 잡히기만 하면 자동으로 GPU 경로를 쓴다.

## 2. 바뀐 파일

이미 로컬(`~/다운로드/apps/tomcat/Dockerfile`, `~/다운로드/docker-compose.yml`)에 반영해둔 내용. 서버(`/data/docker/`)로 옮겨서 적용하면 된다.

### 2-1. `apps/tomcat/Dockerfile`

Ubuntu apt ffmpeg 대신 **nvenc가 포함된 BtbN 정적 빌드(GPL)**로 교체한다. 정적 빌드라 libx264도 그대로 들어있어서 GPU가 안 잡혀도 CPU 폴백은 계속 동작한다.

```dockerfile
FROM tomcat:11.0-jdk21-temurin-noble

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl xz-utils ca-certificates && \
    curl -fL -o /tmp/ffmpeg.tar.xz \
        https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz && \
    mkdir -p /tmp/ffmpeg-extract && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg-extract --strip-components=1 && \
    cp /tmp/ffmpeg-extract/bin/ffmpeg /usr/local/bin/ffmpeg && \
    cp /tmp/ffmpeg-extract/bin/ffprobe /usr/local/bin/ffprobe && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe && \
    rm -rf /tmp/ffmpeg.tar.xz /tmp/ffmpeg-extract && \
    apt-get purge -y curl xz-utils && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
```

### 2-2. `docker-compose.yml`의 `tomcat` 서비스

GPU 리소스 예약 + nvidia 관련 환경변수 추가:

```yaml
  tomcat:
    build:
      context: ./apps/tomcat
      dockerfile: Dockerfile
    image: jskn_tomcat_img
    container_name: jskn_tomcat
    restart: always
    ports:
      - "8080:8080"
    user: "1000:1000"
    # GPU(NVENC) 인코딩용 - host에 nvidia-container-toolkit 설치 후에만 동작
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - SPRING_PROFILES_ACTIVE=jskn
      - SOFIA_MODE=jskn
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,video,utility
    # (이하 env_file, volumes 등 기존 항목 동일)
```

## 3. 작업 순서

### 3-1. Host(jskn)에 NVIDIA Container Toolkit 설치

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 3-2. Toolkit이 제대로 동작하는지 테스트 컨테이너로 확인

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

`nvidia-smi` 결과(GTX 1050 정보)가 정상 출력되면 통과. 여기서 안 되면 4단계 트러블슈팅으로.

### 3-3. Dockerfile / docker-compose.yml 서버 반영 후 재빌드

```bash
cd /data/docker
docker compose build tomcat
docker compose up -d tomcat
```

기존 webapps/logs는 host 볼륨 마운트라 컨테이너를 새로 빌드/기동해도 그대로 유지된다 — sofia WAR를 다시 배포할 필요 없음.

### 3-4. 컨테이너 안에서 최종 확인

```bash
docker exec jskn_tomcat nvidia-smi
docker exec jskn_tomcat ffmpeg -encoders 2>&1 | grep nvenc
```

- 첫 번째 명령: 컨테이너 안에서도 GTX 1050이 보이면 GPU 패스스루 성공.
- 두 번째 명령: `h264_nvenc` 등이 목록에 뜨면 ffmpeg가 nvenc를 지원하는 빌드로 잘 교체됨.

### 3-5. 실제 슬라이드쇼 생성 테스트

앱에서 슬라이드쇼를 생성해보고, 백엔드 로그에 "GPU NVENC encoding failed... falling back to CPU" 경고가 **더 이상 안 뜨는지**, 그리고 생성 시간이 눈에 띄게 빨라졌는지 확인한다.

## 4. 트러블슈팅 힌트

- **3-2 테스트 컨테이너에서부터 실패**: `nvidia-ctk runtime configure` 이후 docker 재시작을 안 했거나, host 드라이버(`nvidia-smi`가 host에서는 되는지)를 다시 확인. `/etc/docker/daemon.json`에 `nvidia` 런타임이 등록됐는지 확인 (`cat /etc/docker/daemon.json`).
- **`docker compose up`은 되는데 컨테이너 안에서 GPU가 안 보임**: `deploy.resources.reservations.devices`는 Docker Compose v2(`docker compose`, 하이픈 없는 버전) 기준으로 동작한다. `docker compose version`으로 v2인지 확인. 구버전 `docker-compose`(v1, 하이픈 있는)라면 `runtime: nvidia` 필드 방식으로 바꿔야 할 수 있음.
- **`ffmpeg -encoders`에 nvenc가 안 뜸**: BtbN 릴리스 다운로드가 빌드 도중 실패했을 가능성 — `docker compose build tomcat --no-cache`로 재시도하고 빌드 로그에서 curl/tar 단계 에러 확인.
- **GTX 1050 특성**: 소비자용 카드라 동시 NVENC 세션이 2~3개로 제한되지만, 개인 서버에서 한 번에 하나씩 슬라이드쇼를 만드는 용도라 문제 없음.

## 5. 되돌리기 (문제 생기면)

GPU 세팅이 꼬여서 당장 롤백해야 하면, `docker-compose.yml`의 `deploy:` 블록과 `NVIDIA_*` 환경변수만 지우고 `docker compose up -d tomcat`으로 재기동하면 된다. `Dockerfile`은 nvenc 빌드에도 libx264가 포함돼 있어서 그대로 둬도 CPU 폴백으로 계속 동작한다.
