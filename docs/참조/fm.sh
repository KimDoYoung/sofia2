#!/usr/bin/env bash
#============================================================================
# fm.sh - Frontend 개발용 관리 스크립트
#
# 사용법:  ./fm.sh [명령어]
# 예시:    ./fm.sh dev
#============================================================================

set -euo pipefail

VERSION="0.0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

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
    local mode="${PCMS_MODE:-development}"
    echo -e ""
    echo -e "${MAGENTA}${BOLD}  ██████╗  ██████╗███╗   ███╗███████╗     ███████╗███╗   ███╗${NC}"
    echo -e "${MAGENTA}${BOLD}  ██╔══██╗██╔════╝████╗ ████║██╔════╝     ██╔════╝████╗ ████║${NC}"
    echo -e "${MAGENTA}${BOLD}  ██████╔╝██║     ██╔████╔██║███████╗ ─── █████╗  ██╔████╔██║${NC}"
    echo -e "${MAGENTA}${BOLD}  ██╔═══╝ ██║     ██║╚██╔╝██║╚════██║     ██╔══╝  ██║╚██╔╝██║${NC}"
    echo -e "${MAGENTA}${BOLD}  ██║     ╚██████╗██║ ╚═╝ ██║███████║     ██║     ██║ ╚═╝ ██║${NC}"
    echo -e "${MAGENTA}${BOLD}  ╚═╝      ╚═════╝╚═╝     ╚═╝╚══════╝     ╚═╝     ╚═╝     ╚═╝${NC}"
    echo -e ""
    echo -e "  ${DIM}Frontend Manager${NC}  ${BOLD}v${VERSION}${NC}  ${DIM}│${NC}  mode: ${YELLOW}${BOLD}${mode}${NC}"
    echo -e "  ${DIM}──────────────────────────────────────────────────────────${NC}"
    echo -e ""
}

check_node() {
    if ! command -v node &>/dev/null; then
        error "Node.js가 설치되어 있지 않습니다."
        exit 1
    fi
    if ! command -v npm &>/dev/null; then
        error "NPM이 설치되어 있지 않습니다."
        exit 1
    fi
    info "Node $(node -v) / NPM $(npm -v)"
}

# ── 명령어 함수 ──────────────────────────────────────────────────────────
do_dev() {
    header "Dev - 개발 서버 실행"
    cd "$FRONTEND_DIR" || exit
    local mode="${PCMS_MODE:-development}"
    info "개발 서버 시작 (http://localhost:5173) mode=${mode}"
    npm run dev -- --mode "$mode"
}

do_test() {
    header "Test - 단위 테스트 실행"
    cd "$FRONTEND_DIR" || exit
    npm run test
}

do_build() {
    header "Build - 프로덕션 빌드"
    cd "$FRONTEND_DIR" || exit
    local mode="${PCMS_MODE:-production}"
    info "빌드 시작... mode=${mode}"
    npm run build -- --mode "$mode"
    if [[ -d "dist" ]]; then
        info "빌드 완료: dist/"
    else
        error "빌드 실패."
        exit 1
    fi
}

do_preview() {
    header "Preview - 빌드 결과물 미리보기"
    cd "$FRONTEND_DIR" || exit
    if [[ ! -d "dist" ]]; then
        warn "dist 폴더가 없습니다. 먼저 build를 실행합니다."
        do_build
    fi
    npm run preview
}

do_install() {
    header "Install - 의존성 패키지 설치"
    cd "$FRONTEND_DIR" || exit
    npm install
    info "패키지 설치 완료."
}

do_lint() {
    header "Lint - 코드 스타일 검사"
    cd "$FRONTEND_DIR" || exit
    npm run lint
}

do_clean() {
    header "Clean - 빌드 결과물 및 캐시 삭제"
    cd "$FRONTEND_DIR" || exit
    rm -rf dist
    rm -rf node_modules/.vite
    info "dist 폴더와 Vite 캐시 삭제 완료."
}

print_menu() {
    local items=(
        "dev:개발 서버 실행"
        "test:단위 테스트 실행"
        "build:프로덕션 빌드"
        "preview:빌드 미리보기"
        "install:패키지 설치"
        "lint:코드 스타일 검사"
        "clean:빌드/캐시 삭제"
    )

    echo -e "  ${BOLD}명령어${NC}"
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"

    local total=${#items[@]}
    for ((i=0; i<total; i+=3)); do
        printf "  "
        for ((j=0; j<3 && i+j<total; j++)); do
            local idx=$((i+j))
            local num=$((idx+1))
            local cmd="${items[$idx]%%:*}"
            local desc="${items[$idx]#*:}"
            printf "${GREEN}${BOLD}%d)${NC} ${YELLOW}%-7s${NC} ${DIM}%s${NC}  " \
                "$num" "$cmd" "$(pad_visual "$desc" 16)"
        done
        printf "\n"
    done

    echo -e ""
    echo -e "  ${DIM}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄${NC}"
    echo -e "  ${YELLOW}q)${NC} 종료"
    echo -e ""
}

# ── 메인 함수 ──────────────────────────────────────────────────────────────
main() {
    check_node

    if [[ $# -eq 0 ]]; then
        print_banner
        print_menu

        local cmds=("dev" "test" "build" "preview" "install" "lint" "clean")

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
        dev|run)  do_dev     ;;
        test)     do_test    ;;
        build)    do_build   ;;
        preview)  do_preview ;;
        install)  do_install ;;
        lint)     do_lint    ;;
        clean)    do_clean   ;;
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
