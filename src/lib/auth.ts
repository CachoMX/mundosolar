import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            permissions: true
          }
        })

        if (!user) {
          return null
        }

        // In a real app, you'd compare hashed passwords
        // For now, we'll assume passwords are hashed with bcrypt
        // const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        
        // Temporary: direct comparison (remove in production)
        const isPasswordValid = credentials.password === "admin123" // Replace with proper password hashing
        
        if (!isPasswordValid) {
          return null
        }

        if (!user.isActive) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          employeeId: user.employeeId,
          department: user.department,
          permissions: user.permissions
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.employeeId = user.employeeId
        token.department = user.department
        token.permissions = user.permissions
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as any
        session.user.employeeId = token.employeeId as string
        session.user.department = token.department as string
        session.user.permissions = token.permissions as any[]
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/signin", // Redirect to signin on error
  },
  debug: process.env.NODE_ENV === "development",
}

// Utility function to check permissions
export function hasPermission(
  userPermissions: any[],
  resource: string,
  action: string
): boolean {
  const permission = userPermissions.find(p => p.resource === resource)
  return permission?.actions.includes(action) || false
}

// Role-based access control
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

// Admin check
export function isAdmin(userRole: string): boolean {
  return userRole === "ADMIN"
}