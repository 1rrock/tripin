/**
 * 인제스트 공용 — YouTube 영상 메타를 **API 키 없이** 받아온다 (InnerTube).
 *
 * 왜 있나:
 *   `.env.local` 의 `YOUTUBE_API_KEY` 는 HTTP 리퍼러 제한이 걸려 있어 서버사이드
 *   호출이 403 이다 (`Requests from referer <empty> are blocked`). 그 바람에
 *   `parse-description.mjs`·`probe-channel.mjs` 처럼 Data API 를 쓰는 도구가
 *   전부 멈춰 있었다 — **설명란 기반 인제스트 경로 전체가 막혀 있었다는 뜻이다.**
 *   `fetch-transcript.mjs` 가 쓰는 InnerTube 는 키가 필요 없으므로 같은 길을 쓴다.
 *
 * 반환 모양은 Data API `videos.list(part=snippet,contentDetails)` 와 **일부러 똑같이**
 * 맞춰 두었다. 호출부가 `it.snippet.description` 처럼 쓰던 것을 그대로 둘 수 있다.
 *
 * ⛔ 조회수·구독자수는 요청도 반환도 하지 않는다 (YouTube API §III.E.2).
 * ⛔ 로컬(어드민 머신) 전용. 서비스 서버에서 돌리지 않는다.
 */

const WEB = {
  ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  context: { client: { clientName: "WEB", clientVersion: "2.20240701.00.00", hl: "ko", gl: "KR" } },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function player(client, videoId) {
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": client.ua },
    body: JSON.stringify({ context: client.context, videoId, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!res.ok) throw new Error(`player ${res.status}`);
  return res.json();
}

/**
 * 영상 메타. Data API `videos.list` 와 같은 모양으로 돌려준다.
 *
 * @param {string[]} videoIds
 * @param {{ delayMs?: number, onItem?: (id: string, ok: boolean) => void }} [opt]
 * @returns {Promise<Array<{id:string, snippet:{title:string,description:string,publishedAt:string|null,channelId:string|null}, contentDetails:{duration:string|null}}>>}
 */
export async function fetchVideoItems(videoIds, opt = {}) {
  const delayMs = opt.delayMs ?? 1200;
  const items = [];
  for (const [i, id] of videoIds.entries()) {
    try {
      // WEB 클라이언트라야 microformat.publishDate 가 온다. IOS 는 안 준다.
      const d = await player(WEB, id);
      const vd = d?.videoDetails;
      if (!vd) throw new Error(`videoDetails 없음 (${d?.playabilityStatus?.status ?? "?"})`);
      const micro = d?.microformat?.playerMicroformatRenderer;
      const secs = Number(vd.lengthSeconds);
      items.push({
        id,
        snippet: {
          title: vd.title ?? "",
          description: vd.shortDescription ?? "",
          publishedAt: micro?.publishDate ?? null,
          channelId: vd.channelId ?? null,
        },
        // 아래쪽 durationSec() 이 ISO8601 을 기대한다 — PT{n}S 로 맞춰 준다
        contentDetails: { duration: Number.isFinite(secs) && secs > 0 ? `PT${secs}S` : null },
      });
      opt.onItem?.(id, true);
    } catch (err) {
      // 재시도하지 않는다 (fetch-transcript.mjs 와 같은 규칙) — 다음 영상으로
      console.error(`  ✖ ${id}: ${err.message}`);
      opt.onItem?.(id, false);
    }
    if (i < videoIds.length - 1) await sleep(delayMs);
  }
  return items;
}

/**
 * 채널 업로드 목록 — `[{videoId, title}]`.
 *
 * ⚠️ 요즘 browse 응답은 `videoRenderer` 가 아니라 **`lockupViewModel`** 이다
 *    (`contentId` + `metadata.lockupMetadataViewModel.title.content`).
 *    옛 파서를 그대로 쓰면 조용히 0건이 나온다 — 2026-08-21 확인.
 */
export async function fetchChannelUploads(channelId, max = 400) {
  /** InnerTube 웹 공개 키. 사용자 자격증명이 아니라 클라이언트 상수다. */
  const ITKEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  const walk = (o, pred, out = []) => {
    if (!o || typeof o !== "object") return out;
    if (pred(o)) out.push(o);
    for (const v of Object.values(o)) walk(v, pred, out);
    return out;
  };
  const browse = async (body) =>
    (await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${ITKEY}&prettyPrint=false`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": WEB.ua },
      body: JSON.stringify({ context: WEB.context, ...body }),
    })).json();

  const out = [];
  const seen = new Set();
  let tok = null;
  for (let page = 0; page < 40; page++) {
    const r = await browse(tok ? { continuation: tok } : { browseId: channelId, params: "EgZ2aWRlb3PyBgQKAjoA" });
    let added = 0;
    for (const l of walk(r, (o) => o.lockupViewModel).map((o) => o.lockupViewModel)) {
      if (!l.contentId || seen.has(l.contentId)) continue;
      seen.add(l.contentId);
      out.push({ videoId: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content ?? "" });
      added++;
      if (out.length >= max) return out;
    }
    const next = walk(r, (o) => o.continuationItemRenderer)
      .map((o) => o.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token)
      .filter(Boolean)
      .find((t) => t && t !== tok);
    if (!next || added === 0) break;
    tok = next;
    await sleep(700);
  }
  return out;
}
