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
    default:
      return m.account.errGeneric;
  }
}
