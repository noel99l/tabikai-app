import { AppHeader } from "@/components/app-header";
import { ApprovalsContent } from "@/components/approvals-content";
import { ExpensesTabs } from "@/components/expenses-tabs";

// 費用タブの「承認」。独立ルートにすることで遷移時に loading.tsx の
// スケルトンが表示される(クエリ切替だとローディングが出ないため)
export default function ExpenseApprovalsPage() {
  return (
    <>
      <AppHeader title="費用" />
      <ExpensesTabs active="approvals" />
      <ApprovalsContent />
    </>
  );
}
