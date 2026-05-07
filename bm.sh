#!/usr/bin/env bash
#============================================================================
# bm.sh - Backend 개발용 관리 스크립트
#
# 사용법:  ./bm.sh [명령어]
# 예시:    ./bm.sh run
#============================================================================

set -euo pipefail

VERSION="0.0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
GRADLEW="$BACKEND_DIR/gradlew"

# ── 색상 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── 유틸리티 함수 ─────────────────────────────────────────────────────────
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
header()  { echo -e "\n${CYAN}${BOLD}══ $* ══${NC}\n"; }

# 한글 등 멀티바이트(3byte/2col) 문자를 포함한 표시 너비 계산
visual_width() {
    local str="$1"
    local bytes=${#str}
    local chars
    chars=$(printf '%s' "$str" | wc -m)
    local cjk=$(( (bytes - chars) / 2 ))
    echo $(( chars + cjk ))
}

# 지정한 표시 너비로 우측 공백 패딩
pad_visual() {
    local str="$1"
    local width="$2"
    local vw
    vw=$(visual_width "$str")
    local pad=$(( width - vw ))
    [[ $pad -lt 0 ]] && pad=0
    printf '%s%*s' "$str" "$pad" ""
}

print_banner() {
    echo -e ""
    echo -e "${CYAN}${BOLD}  ██████╗  ██████╗███╗   ███╗███████╗     ██████╗ ███╗   ███╗${NC}"
    echo -e "${CYAN}${BOLD}  ██╔══██╗██╔════╝████╗ ████║██╔════╝     ██╔══██╗████╗ ████║${NC}"
    echo -e "${CYAN}${BOLD}  ██████╔╝██║     ██╔████╔██║███████╗ ─── ██████╔╝██╔████╔██║${NC}"
    echo -e "${CYAN}${BOLD}  ██╔═══╝ ██║     ██║╚██╔╝██║╚════██║     ██╔══██╗██║╚██╔╝██║${NC}"
    echo -e "${CYAN}${BOLD}  ██║     ╚██████╗██║ ╚═╝ ██║███████║     ██████╔╝██║ ╚═╝ ██║${NC}"
    echo -e "${CYAN}${BOLD}  ╚═╝      ╚═════╝╚═╝     ╚═╝╚══════╝     ╚═════╝ ╚═╝     ╚═╝${NC}"
    echo -e ""
    echo -e "  ${DIM}Backend Manager${NC}  ${BOLD}v${VERSION}${NC}  ${DIM}│${NC}  mode: ${YELLOW}${BOLD}${SOFIA_MODE:-}${NC}"
    echo -e "  ${DIM}──────────────────────────────────────────────────────────${NC}"
    echo -e ""
}

resolve_mode() {
    if [[ -n "${SOFIA_MODE:-}" ]]; then
        return
    fi

    local modes=()
    for f in "$SCRIPT_DIR"/.env.*; do
        [[ -f "$f" ]] || continue
        local name="${f##*/.env.}"
        [[ "$name" == "example" ]] && continue
        modes+=("$name")
    done

    if [[ ${#modes[@]} -eq 0 ]]; then
        # Create a default .env.local if none exists
        echo "SOFIA_MODE=local" > "$SCRIPT_DIR/.env.local"
        modes+=("local")
    fi

    if [[ ${#modes[@]} -eq 1 ]]; then
        export SOFIA_MODE="${modes[0]}"
        return
    fi

    echo -e "\n${BOLD}SOFIA_MODE 환경변수가 설정되지 않았습니다.${NC}"
    echo -e "사용할 모드를 선택하세요:\n"
    local i=1
    for m in "${modes[@]}"; do
        echo -e "  ${GREEN}${i})${NC} ${m}"
        ((i++))
    done
    echo ""
    read -rp "번호 입력 (기본: 1): " choice
    choice="${choice:-1}"

    if [[ "$choice" -lt 1 || "$choice" -gt ${#modes[@]} ]] 2>/dev/null; then
        error "잘못된 선택입니다."
        exit 1
    fi

    export SOFIA_MODE="${modes[$((choice-1))]}"
    info "모드 설정: ${SOFIA_MODE}"
}

load_env() {
    local env_file="$SCRIPT_DIR/.env.${SOFIA_MODE}"
    local backend_env_file="$BACKEND_DIR/.env.${SOFIA_MODE}"
    local loaded=false

    if [[ -f "$env_file" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
        info "환경변수 로드 완료 ($env_file)"
        loaded=true
    fi

    if [[ -f "$backend_env_file" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$backend_env_file"
        set +a
        info "환경변수 로드 완료 ($backend_env_file)"
        loaded=true
    fi

    if [[ "$loaded" == false ]]; then
        error "환경변수 파일을 찾을 수 없습니다: $env_file 또는 $backend_env_file"
        exit 1
    fi
}

check_java() {
    if ! command -v java &>/dev/null; then
        error "Java가 설치되어 있지 않습니다."
        exit 1
    fi
}

# ── 명령어 함수 ──────────────────────────────────────────────────────────
do_run() {
    header "Run - 개발 서버 실행 (mode: ${SOFIA_MODE})"
    load_env
    if [[ ! -f "$GRADLEW" ]]; then
        warn "gradlew를 찾을 수 없습니다. 프로젝트 루트에서 gradle wrapper를 실행해 주세요."
        # Attempt to run system gradle if available
        if command -v gradle &>/dev/null; then
            info "시스템 gradle로 wrapper 생성 시도 중..."
            (cd "$BACKEND_DIR" && gradle wrapper)
        fi
    fi

    if [[ -f "$GRADLEW" ]]; then
        chmod +x "$GRADLEW"
        info "서버 시작 중... (Ctrl+C 로 종료)"
        info "Health check: curl http://localhost:8585/pcms/health"
        echo ""
        "$GRADLEW" -p "$BACKEND_DIR" bootRun --args="--spring.profiles.active=${SOFIA_MODE}"
    else
        error "gradlew 실행 파일이 없습니다."
    fi
}

do_compile() {
    header "Compile - 소스 컴파일"
    load_env
    "$GRADLEW" -p "$BACKEND_DIR" classes
    info "컴파일 완료."
}

do_build() {
    header "Build - 전체 빌드 (컴파일 + 테스트 + JAR/WAR)"
    load_env
    "$GRADLEW" -p "$BACKEND_DIR" clean build -x test
    info "전체 빌드 완료."
}

do_war() {
    header "WAR - 배포용 WAR 파일 생성"
    load_env
    "$GRADLEW" -p "$BACKEND_DIR" clean bootWar
}

do_test() {
    header "Test - 전체 테스트 실행"
    load_env
    "$GRADLEW" -p "$BACKEND_DIR" test
}

do_clean() {
    header "Clean - 빌드 캐시 삭제"
    "$GRADLEW" -p "$BACKEND_DIR" clean
    info "빌드 캐시가 삭제되었습니다."
}

do_status() {
    header "Status - 애플리케이션 상태 확인"
    info "현재 모드: ${SOFIA_MODE}"
    if pgrep -f "bootRun" > /dev/null; then
        info "애플리케이션이 실행 중입니다."
    else
        warn "애플리케이션이 실행되지 않고 있습니다."
    fi
}

print_menu() {
    local items=(
        "run:개발 서버 실행"
        "compile:소스 컴파일"
        "build:전체 빌드"
        "war:WAR 파일 생성"
        "test:테스트 실행"
        "clean:빌드 캐시 삭제"
        "status:상태 확인"
    )

    echo -e "  ${BOLD}명령어${NC}"
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"

    local total=${#items[@]}
    for ((i=0; i<total; i+=2)); do
        printf "  "
        for ((j=0; j<2 && i+j<total; j++)); do
            local idx=$((i+j))
            local num=$((idx+1))
            local cmd="${items[$idx]%%:*}"
            local desc="${items[$idx]#*:}"
            printf "${GREEN}${BOLD}%d)${NC} ${YELLOW}%-7s${NC} ${DIM}%s${NC}  " \
                "$num" "$cmd" "$(pad_visual "$desc" 20)"
        done
        printf "\n"
    done

    echo -e ""
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"
    echo -e "  ${YELLOW}q)${NC} 종료"
    echo -e ""
}

main() {
    check_java
    resolve_mode

    if [[ $# -eq 0 ]]; then
        print_banner
        print_menu

        local cmds=("run" "compile" "build" "war" "test" "clean" "status")

        read -rp "  번호를 입력하세요: " choice
        echo ""

        if [[ "$choice" == "q" || "$choice" == "Q" ]]; then
            info "종료합니다."
            exit 0
        fi

        if ! [[ "$choice" =~ ^[0-9]+$ ]] || [[ "$choice" -lt 1 || "$choice" -gt ${#cmds[@]} ]]; then
            error "잘못된 입력입니다: $choice"
            exit 1
        fi

        local cmd="${cmds[$((choice-1))]}"
    else
        local cmd="$1"
        shift
    fi

    case "$cmd" in
        run)        do_run ;;
        compile)    do_compile ;;
        build)      do_build ;;
        war)        do_war ;;
        test)       do_test ;;
        clean)      do_clean ;;
        status)     do_status ;;
        help)
            print_banner
            print_menu
            ;;
        *)
            error "알 수 없는 명령어: $cmd"
            exit 1
            ;;
    esac
}

main "$@"
