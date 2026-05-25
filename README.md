# 🍷 Wine Library — Web SPA

정적 SPA. `wines.json` 을 그리드/검색/필터로 보여주고, 새 와인을 사진과 함께 추가할 수 있다.

## 📂 구조
```
03_Web/
├── index.html
├── css/style.css
├── js/app.js
├── data/wines.json            ← 04_Scripts/export_to_web.py 로 생성
└── photos/
    ├── thumbs/                ← 자동 복사됨 (~127장, ~1MB)
    └── full/                  ← 옵션 (원본, ~600MB — git 제외 권장)
```

## 🖥️ 로컬에서 보기

```bash
# 워크스페이스 루트에서
cd ~/Downloads/Personal/Wine_Library/03_Web
python3 -m http.server 8765
# → 브라우저에서 http://localhost:8765
```

## 🔁 데이터 갱신
엑셀(`02_Excel/Wine_Library.xlsx`) 수정 후:
```bash
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 \
  ~/Downloads/Personal/Wine_Library/04_Scripts/export_to_web.py
```

## ☁️ 호스팅 (3가지 옵션)

### 옵션 A. GitHub Pages (무료, 추천)
1. `gh repo create wine-library --private --source 03_Web`
2. 푸시 후 Settings → Pages → branch `main` / folder `/`
3. URL: `https://<USERNAME>.github.io/wine-library/`
4. 비공개 저장소는 GH Pages 사용에 GitHub Pro 필요. Public 으로 하되 `wines.json` 안에 민감정보 없는지 확인.

### 옵션 B. Vercel (무료, 더 빠름)
1. https://vercel.com 가입 → "Import Project"
2. GitHub repo 선택 또는 `03_Web` 폴더 드래그업로드
3. 자동 배포 URL 제공 (`*.vercel.app`)

### 옵션 C. 자체 NAS / 폰 핫스팟용
```bash
# Mac에서 LAN 공유 (집/사무실 와이파이 안에서만)
cd ~/Downloads/Personal/Wine_Library/03_Web
python3 -m http.server 8765 --bind 0.0.0.0
# Mac IP 확인: ifconfig | grep "inet "
# 폰에서 http://<MAC_IP>:8765 접속
```

## ✨ 기능

| 기능 | 설명 |
|---|---|
| **그리드** | 카드 형식, 썸네일 + 와인명 + 생산자 + 지역 + 평점 + 날짜 |
| **검색** | Lunr.js 풀텍스트 (와인명·생산자·산지·품종·메모·WWGC 노트) |
| **필터** | 국가, 빈티지 범위, 평점, 출처 (WWGC만/사진보유/전체) |
| **정렬** | 마신 날짜·와인명·빈티지·국가 |
| **디테일** | 카드 클릭 → 모달 (사진 + 메타데이터 + WWGC 노트·스토리) |
| **추가** | 📷 사진 업로드 → EXIF 자동 파싱 → 별점 + 메모 + 저장 |
| **저장 위치** | 브라우저 localStorage (영구화는 "JSON 내보내기" 버튼) |

## 📱 모바일

- responsive layout — 폰에서 카드 그리드 자동 압축
- 사진 업로드 시 `capture="environment"` → 카메라 즉시 호출
- 폰에서 와인 라벨 사진 찍어 그 자리에서 등록 가능

## 🔒 사용자 추가 영구화 워크플로

1. 폰/PC에서 와인 추가 → 자동으로 브라우저 localStorage 저장
2. 주기적으로 "JSON 내보내기" 버튼 → `user_wines_YYYY-MM-DD.json` 다운로드
3. 워크스페이스로 옮긴 후 `manual_overrides.json` 에 추가 → `process_takeout.py` 재실행 → 엑셀 업데이트 → `export_to_web.py` 재실행 → 서버 데이터 영구 반영

(자동화하려면 별도 서버사이드 컴포넌트 필요 — 현재는 정적 SPA.)
