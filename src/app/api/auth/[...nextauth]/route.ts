import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getConfig } from '@/lib/store';
import { authenticateLDAP } from '@/lib/ldap';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'LDAP',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const config = await getConfig();
        if (!config.ldap?.enabled) return null;
        const user = await authenticateLDAP(config.ldap, credentials.username, credentials.password);
        if (!user) return null;
        return { id: user.username, name: user.displayName, email: null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.username = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { username?: string }).username = token.username as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
