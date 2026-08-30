"use client";

// 送信前に確認ダイアログを出すフォーム(参加取り消し・〆切などの取り返しに注意が要る操作用)
export function ConfirmForm({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </form>
  );
}
