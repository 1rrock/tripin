/** 어드민 서버 액션 공통 결과. 클라이언트 폼·토스트가 같이 쓴다. */
export interface ActionResult {
  ok?: string;
  error?: string;
}
