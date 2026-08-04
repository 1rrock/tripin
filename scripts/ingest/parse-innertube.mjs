#!/usr/bin/env node
/**
 * YouTube 채널 페이지 InnerTube JSON 덤프 → 영상 목록 추출.
 *
 * 사용: node scripts/ingest/parse-innertube.mjs <dump.json>
 * 출력: [{ youtubeVideoId, title, durationText }] JSON (stdout)
 *
 * 덤프 어디에 있든 lockupViewModel(contentType=VIDEO)을 재귀 탐색한다.
 * 쇼츠(60초 이하로 보이는 것)는 caller 가 durationText 로 걸러낸다.
 */
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("사용: node scripts/ingest/parse-innertube.mjs <dump.json>");
  process.exit(1);
}

const root = JSON.parse(readFileSync(file, "utf8"));
const videos = new Map();

function walk(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item);
    return;
  }
  const lockup = node.lockupViewModel;
  if (lockup?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" && lockup.contentId) {
    const title = lockup.metadata?.lockupMetadataViewModel?.title?.content ?? "";
    // 썸네일 오버레이에서 재생시간 배지 탐색
    let durationText = null;
    const overlays = lockup.contentImage?.thumbnailViewModel?.overlays ?? [];
    for (const ov of overlays) {
      const badges = ov.thumbnailBottomOverlayViewModel?.badges ?? [];
      for (const b of badges) {
        if (b.thumbnailBadgeViewModel?.text) durationText = b.thumbnailBadgeViewModel.text;
      }
    }
    if (!videos.has(lockup.contentId)) {
      videos.set(lockup.contentId, { youtubeVideoId: lockup.contentId, title, durationText });
    }
  }
  for (const value of Object.values(node)) walk(value);
}

walk(root);
console.log(JSON.stringify([...videos.values()], null, 2));
console.error(`추출: ${videos.size}개 영상`);
