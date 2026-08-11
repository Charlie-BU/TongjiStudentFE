import { useEffect, useState } from "react";
import { tongjiStudentService } from "../../services/tongji-student";

const TONGJI_ACCESS_TOKEN_KEY = "tongji-access-token";

type OauthCallbackProps = {
  onComplete?: () => void;
  onFail?: () => void;
};

type OauthCallbackParams = {
  code: string | null;
  state: string | null;
};

type OauthTokenResponse = Awaited<ReturnType<typeof tongjiStudentService.TongjiOauthTokenPOST>>;

const pendingTokenExchanges = new Map<string, Promise<OauthTokenResponse>>();

function returnToApp(): void {
  window.location.replace("/");
}

// OauthCallback 消费独立认证页转回的 code/state，并在换取 Token 后返回应用首页。
export function OauthCallback({ onComplete = returnToApp, onFail = returnToApp }: OauthCallbackProps) {
  const [callbackParams] = useState<OauthCallbackParams>(getOauthCallbackParams);
  const { code, state } = callbackParams;
  const [status, setStatus] = useState(
    code && state ? "正在完成登录…" : "登录回调参数缺失，请重新发起认证。",
  );

  useEffect(() => {
    window.history.replaceState(null, "", "/oauth/callback");

    if (!code || !state) {
      onFail();
      return;
    }

    let isActive = true;
    void exchangeToken(code, state)
      .then((response) => {
        if (!isActive) {
          return;
        }
        if (!response.access_token) {
          setStatus("登录失败，请重新发起认证。");
          onFail();
          return;
        }

        window.localStorage.setItem(TONGJI_ACCESS_TOKEN_KEY, response.access_token);
        onComplete();
      })
      .catch(() => {
        if (isActive) {
          setStatus("登录失败，请重新发起认证。");
          onFail();
        }
      });

    return () => {
      isActive = false;
    };
  }, [code, onComplete, onFail, state]);

  return <main aria-live="polite">{status}</main>;
}

function getOauthCallbackParams(): OauthCallbackParams {
  const params = new URLSearchParams(window.location.search);
  return { code: params.get("code"), state: params.get("state") };
}

function exchangeToken(code: string, state: string): Promise<OauthTokenResponse> {
  const key = JSON.stringify([code, state]);
  const existingRequest = pendingTokenExchanges.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const request = tongjiStudentService.TongjiOauthTokenPOST({ code, state });
  pendingTokenExchanges.set(key, request);
  void request.then(
    () => pendingTokenExchanges.delete(key),
    () => pendingTokenExchanges.delete(key),
  );
  return request;
}
