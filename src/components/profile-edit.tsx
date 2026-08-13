"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Modal } from "./modal";
import { ProfileForm } from "./profile-form";

export function ProfileEditButton({
  name,
  emoji,
}: {
  name: string;
  emoji: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary"
      >
        編集
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="プロフィールを編集">
        <ProfileForm
          action={async (formData) => {
            const res = await updateProfile(formData);
            if (!res?.error) setOpen(false);
            return res;
          }}
          defaultName={name}
          defaultEmoji={emoji}
          submitLabel="保存する"
        />
      </Modal>
    </>
  );
}
