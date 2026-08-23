import type { Messages } from "@/shared/i18n/messages/ko";

/** 구글 콜백이 URL·sessionStorage 로 남긴 코드를 문구로 바꾼다. */
export function authErrorText(code: string, m: Messages): string {
  switch (code) {
    case "identity_already_exists":
      return m.account.errAlreadyLinked;
    case "access_denied":
      return m.account.errDenied;
    case "missing_code":
      return m.account.errMissing;
    case "not_linked":
      return m.account.errNotLinked;
    /* 로그인 자체는 **성공**했고 익명 계정의 저장분을 옮기다 실패한 경우다.
       default(errGeneric = "로그인하지 못했어요")로 떨어뜨리면 화면이 거짓말을 한다.
       auth/callback 이 이때 MERGE_COOKIE 를 남기므로 다시 로그인하면 한 번 더 시도한다. */
    case "merge_failed":
      return m.account.errMergeFailed;
    default:
      return m.account.errGeneric;
  }
}
