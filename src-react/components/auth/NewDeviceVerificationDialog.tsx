import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function NewDeviceVerificationDialog({
  open,
  onOpenChange,
  phone,
  demoCode,
  onVerify,
  onResend,
  onChangePassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  demoCode?: string;
  onVerify: (code: string, trustDevice: boolean) => Promise<void>;
  onResend: () => Promise<string | undefined>;
  onChangePassword: () => void;
}) {
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || seconds <= 0) return;
    const timer = window.setTimeout(
      () => setSeconds((current) => current - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [open, seconds]);
  useEffect(() => {
    if (open) {
      setCode(demoCode ?? "");
      setSeconds(60);
    }
  }, [demoCode, open]);
  async function resend() {
    try {
      const nextDemoCode = await onResend();
      if (nextDemoCode) setCode(nextDemoCode);
      setSeconds(60);
      toast.success("验证码已重新发送");
    } catch {
      toast.error("验证码发送失败，请稍后重试");
    }
  }
  async function verify() {
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入 6 位短信验证码");
      return;
    }
    setBusy(true);
    try {
      await onVerify(code, trustDevice);
    } catch {
      toast.error("验证失败，请检查验证码后重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="device-verification-dialog">
        <DialogHeader>
          <span className="device-verification-icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <DialogTitle>新设备验证</DialogTitle>
          <DialogDescription>
            验证码已发送至 {phone}，请在下方输入
          </DialogDescription>
        </DialogHeader>
        {demoCode && <div className="device-demo-code">本机演示验证码 <strong>{demoCode}</strong></div>}
        <label className="device-code-label" htmlFor="device-code">
          短信验证码
        </label>
        <div className="device-code-row">
          <Input
            id="device-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="请输入 6 位验证码"
          />
          <Button
            type="button"
            variant="ghost"
            disabled={seconds > 0}
            onClick={() => void resend()}
          >
            {seconds > 0 ? `${seconds} 秒后重新发送` : "重新发送"}
          </Button>
        </div>
        <label className="device-trust-option">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(event) => setTrustDevice(event.target.checked)}
          />
          <span>
            <strong>信任此设备</strong>
            <small>验证后 90 天内本设备无需再次验证</small>
          </span>
        </label>
        <div className="device-security-note">
          <Smartphone aria-hidden="true" />
          <button type="button" onClick={onChangePassword}>
            不是本人操作？请尽快修改密码。
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={busy || code.length !== 6}
            onClick={() => void verify()}
          >
            {busy ? "正在验证…" : "验证并继续"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
