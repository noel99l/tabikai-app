import { redirect } from "next/navigation";

// 承認は費用タブに統合された。古い通知リンク(/approvals)からの遷移用に残す
export default function ApprovalsRedirect() {
  redirect("/expenses?tab=approvals");
}
