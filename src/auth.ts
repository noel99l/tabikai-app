import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

// Google OAuth 未設定のローカル開発時のみ、名前+メールだけの開発用ログインを有効化
const devProvider = Credentials({
  id: "dev",
  name: "開発用ログイン",
  credentials: {
    name: { label: "名前", type: "text" },
    email: { label: "メール", type: "email" },
  },
  async authorize(credentials) {
    if (process.env.NODE_ENV === "production") return null;
    const email = String(credentials?.email ?? "").trim();
    const name = String(credentials?.name ?? "").trim() || email.split("@")[0];
    if (!email) return null;
    return { id: email, email, name };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? "dev-secret-change-me",
  session: { strategy: "jwt" },
  providers: hasGoogle ? [Google] : [devProvider],
  pages: { signIn: "/login" },
  callbacks: {
    // 初回ログイン時に users テーブルへ upsert し、DB 上の userId を JWT に載せる
    async jwt({ token, account, profile, user }) {
      if (account) {
        const db = await getDb();
        const email =
          (profile?.email as string | undefined) ?? user?.email ?? token.email;
        const name =
          (profile?.name as string | undefined) ?? user?.name ?? email ?? "unknown";
        const googleSub = account.provider === "google" ? account.providerAccountId : null;
        if (email) {
          const existing = await db.query.users.findFirst({
            where: eq(schema.users.email, email),
          });
          if (existing) {
            token.userId = existing.id;
          } else {
            const [created] = await db
              .insert(schema.users)
              .values({
                email,
                name,
                googleSub,
                image: (profile?.picture as string | undefined) ?? user?.image ?? null,
              })
              .returning();
            token.userId = created.id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
