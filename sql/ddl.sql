-- 1. 상위 테이블인 image_folders를 먼저 생성합니다.
CREATE TABLE image_folders (
    id SERIAL PRIMARY KEY,
    folder_name TEXT NOT NULL,
    last_load_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

-- 2. image_files 테이블을 생성합니다.
CREATE TABLE image_files (
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
    CONSTRAINT fk_folder
        FOREIGN KEY (folder_id) 
        REFERENCES image_folders(id)
        ON DELETE SET NULL -- 폴더 삭제 시 파일 정보는 유지하도록 설정 (선택 사항)
);

-- 3. 검색 성능 향상을 위한 인덱스 추가 (추천)
CREATE INDEX idx_image_files_folder_id ON image_files(folder_id);
CREATE INDEX idx_image_files_hash_code ON image_files(hash_code);