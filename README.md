# Academic Portfolio 초안

[Academic Pages](https://github.com/academicpages/academicpages.github.io) 기반의 한국어 개인 이력·연구 포트폴리오입니다.

## 현재 반영된 정보

- 이름: 이의상 (Uisang Lee)
- 소속: 서울대학교 전기정보공학부 석박사통합과정
- GitHub: `uisanglee`
- 이력서: `files/Uisang_Lee_Resume.pdf`
- 대표 논문: *BugSweeper* (AAAI 2026 Oral)

프로필 사진을 추가하려면 `images/profile-placeholder.svg`를 사진 파일로 교체하고 `_config.yml`의 `author.avatar`를 수정합니다.

## 로컬 실행

```bash
bundle install
bundle exec jekyll serve -l -H localhost
```

브라우저에서 `http://localhost:4000`을 엽니다. Docker를 사용할 경우 기존 `docker-compose.yaml` 설정도 이용할 수 있습니다.

## GitHub Pages 배포

1. GitHub에서 `uisanglee.github.io` 이름의 공개 저장소를 만듭니다.
2. 이 폴더를 해당 저장소의 `main` 브랜치로 push합니다.
3. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
4. `.github/workflows/jekyll.yml`이 자동으로 빌드하고 배포합니다.

프로젝트 사이트(`USERNAME.github.io/REPOSITORY`)라면 `_config.yml`의 `url`은 `https://USERNAME.github.io`, `baseurl`은 `/REPOSITORY`, `repository`는 `USERNAME/REPOSITORY`로 설정하세요.
