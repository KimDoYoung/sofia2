#!/bin/bash
# pcms-react 배포 스크립트 — ./deploy/deploy.sh
set -e

JSKN="kdy987@jskn.iptime.org"
REMOTE_WEBAPPS="/data/docker/apps/tomcat/webapps"
PROJECT_ROOT="$(cd "$(dirname "$0")/." && pwd)"
STATIC_DIR="$PROJECT_ROOT/backend/src/main/resources/static"

echo "=== pcms 배포 절차 ==="
echo ""
echo "  [1/4] 프론트엔드 빌드          (npm run build)"
echo "  [2/4] React dist → static 복사  ($STATIC_DIR)"
echo "  [3/4] 백엔드 WAR 빌드           (gradlew war -x test)"
echo "  [4/4] jskn Tomcat으로 전송      ($JSKN:$REMOTE_WEBAPPS/pcms.war)"
echo ""
read -r -p "배포를 진행하시겠습니까? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "배포를 취소했습니다."
  exit 0
fi

echo ""
echo "=== pcms 배포 시작 ==="

# 1. 프론트엔드 빌드
echo "[1/4] 프론트엔드 빌드..."
cd "$PROJECT_ROOT/frontend"
npm run build

# 2. dist → backend/src/main/resources/static 복사
echo "[2/4] React dist → Spring Boot static 복사..."
rm -rf "$STATIC_DIR"
cp -r "$PROJECT_ROOT/frontend/dist" "$STATIC_DIR"

# 3. 백엔드 WAR 빌드
echo "[3/4] 백엔드 WAR 빌드 (React 포함)..."
cd "$PROJECT_ROOT/backend"
./gradlew war -x test

WAR_FILE=$(ls build/libs/*.war 2>/dev/null | head -1)
if [ -z "$WAR_FILE" ]; then
  echo "ERROR: WAR 파일을 찾을 수 없습니다."
  exit 1
fi
echo "  WAR: $WAR_FILE"

# 4. jskn Tomcat webapps로 전송
echo "[4/4] jskn으로 전송..."
sftp -P 2020 "$JSKN" <<EOF
put $WAR_FILE $REMOTE_WEBAPPS/pcms.war
EOF

echo ""
echo "=== 배포 완료 ==="
echo "접속: http://jskn.iptime.org/pcms/"
echo "API:  http://jskn.iptime.org/pcms/health"
