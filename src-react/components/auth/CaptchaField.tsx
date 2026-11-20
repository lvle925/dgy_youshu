import { RefreshCw } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CaptchaChallenge = {
  provider: "image" | "turnstile";
  siteKey: string;
  id: string;
  image: string;
  expiresIn: number;
};

export function CaptchaField({
  challenge,
  answer,
  token,
  disabled,
  onAnswerChange,
  onTokenChange,
  onRefresh,
}: {
  challenge: CaptchaChallenge | null;
  answer: string;
  token: string;
  disabled: boolean;
  onAnswerChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onRefresh: () => void;
}) {
  if (challenge?.provider === "turnstile") {
    return (
      <div className="captcha-turnstile-wrap" aria-label="Cloudflare 人机验证">
        <Turnstile
          key={challenge.id}
          siteKey={challenge.siteKey}
          options={{ theme: "light", language: "zh-CN", action: "login" }}
          onSuccess={onTokenChange}
          onExpire={() => onTokenChange("")}
          onError={() => onTokenChange("")}
        />
        {!token && <span className="captcha-hint">完成人机验证后即可继续</span>}
      </div>
    );
  }

  return (
    <div className="captcha-image-wrap">
      <div className="captcha-row">
        <Input
          id="captcha"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={4}
          minLength={4}
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value.toUpperCase())}
          placeholder="输入右侧 4 位字符"
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="captcha-image"
          onClick={onRefresh}
          disabled={disabled || !challenge}
          aria-label="刷新验证码"
          title="看不清？点击换一张"
        >
          {challenge?.image ? (
            <img src={challenge.image} alt="4 位随机验证码，点击可刷新" width={188} height={60} />
          ) : (
            <span>验证码加载中</span>
          )}
          <RefreshCw aria-hidden="true" />
        </button>
      </div>
      <span className="captcha-hint">验证码绑定当前会话，5 分钟内有效，只能使用一次</span>
    </div>
  );
}
