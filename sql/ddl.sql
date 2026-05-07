-- 1. 상위 테이블인 image_folders를 먼저 생성합니다.
CREATE TABLE IF NOT EXISTS  image_folders (
    id SERIAL PRIMARY KEY,
    folder_name TEXT NOT NULL,
    last_load_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

-- 2. image_files 테이블을 생성합니다.
CREATE TABLE IF NOT EXISTS image_files (
    id SERIAL PRIMARY KEY,
    org_name TEXT NOT NULL,
    hash_code TEXT NOT NULL,
    seq INTEGER NOT NULL, -- folder 안에서의 순서
    folder_id INTEGER, 
    image_format TEXT NOT NULL,
    image_width INTEGER NOT NULL,
    image_height INTEGER NOT NULL,
    image_mode TEXT NOT NULL,
    color_palette TEXT, -- 인덱싱된 이미지가 아닐 경우 NULL일 수 있음
    camera_manufacturer TEXT,
    camera_model TEXT,
    capture_date_time TIMESTAMP WITHOUT TIME ZONE, -- 혹은 타임존 포함 시 WITH TIME ZONE
    shutter_speed DOUBLE PRECISION, -- REAL보다 정밀도가 높은 DOUBLE PRECISION 권장
    aperture_value DOUBLE PRECISION,
    iso_speed INTEGER,
    focal_length DOUBLE PRECISION,
    gps_latitude DOUBLE PRECISION, -- 위도
    gps_longitude DOUBLE PRECISION, -- 경도
    image_orientation TEXT, -- 가로, 세로 등의 방향
    note text,
    file_size BIGINT NOT NULL,
    CONSTRAINT fk_folder
        FOREIGN KEY (folder_id) 
        REFERENCES image_folders(id)
        ON DELETE SET NULL -- 폴더 삭제 시 파일 정보는 유지하도록 설정 (선택 사항)
);

-- 3. 검색 성능 향상을 위한 인덱스 추가 (추천)
CREATE INDEX IF NOT EXISTS idx_image_files_folder_id ON image_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_image_files_hash_code ON image_files(hash_code);


CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,           -- 사용자 식별자 (FK 권장)
    token_value VARCHAR(512) NOT NULL, -- JWT Refresh Token 문자열
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,     -- 만료 시간 (Redis의 TTL 역할)
    revoked BOOLEAN DEFAULT FALSE,      -- 보안 사고 시 즉시 무효화용
    
    -- 조회 성능 최적화 및 유니크 제약
    CONSTRAINT uk_refresh_token_value UNIQUE (token_value)
);

-- 인덱스 설정 (조회 속도 향상)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);


-- cms.users definition

-- Drop table

-- DROP TABLE cms.users;

CREATE TABLE IF NOT EXISTS sofia.users (
    id bigserial NOT NULL,
    user_id varchar(50) NOT NULL,
    user_pw varchar(200) NOT NULL,
    user_nm varchar(100) NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_user_id_key UNIQUE (user_id)
);

INSERT INTO sofia.users(user_id, user_pw, user_nm) VALUES('kdy987', 'kalpa987!', 'KimDoYoung');