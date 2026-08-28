"use client";

import { useRef, useState } from "react";
import { sendAnnouncement } from "@/lib/actions/notifications";
import { IconMegaphone } from "./icons";
import { Fab, Modal } from "./modal";
import { SubmitButton } from "./submit-button";
import { FormError } from "./form-error";
import { useToast } from "./toast";
import { btnCls, inputCls, labelCls } from "./ui";

// ホーム右下のアナウンスFAB。誰でも全メンバーへお知らせ+プッシュ通知を送れる。
export function AnnounceFab() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const toast = useToast();

  return (
    <>
      <Fab
        onClick={() => setOpen(true)}
        label="全体アナウンスを送る"
        icon={<IconMegaphone className="h-6 w-6" />}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="全体アナウンス">
        <p className="mx-0.5 mb-2 text-[12px] text-muted">
          全メンバーへお知らせ+プッシュ通知を送信します(誰でも送信できます)。
        </p>
        <form
          action={async (formData) => {
            if (submitting.current) return;
            submitting.current = true;
            setError(null);
            try {
              await sendAnnouncement(formData);
              toast.show("アナウンスを送信しました");
              setOpen(false);
            } catch {
              setError("送信に失敗しました。時間をおいて再度お試しください。");
            } finally {
              submitting.current = false;
            }
          }}
        >
          <label className={labelCls} htmlFor="announce-body">メッセージ</label>
          <textarea
            className={`${inputCls} min-h-24 resize-none`}
            id="announce-body"
            name="body"
            required
            maxLength={200}
            placeholder="夕食が完成しました!大広間へどうぞ"
          />
          <FormError message={error} />
          <SubmitButton className={`${btnCls} mt-3 w-full py-3.5`}>
            全員に送信する
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
