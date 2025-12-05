import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      employeeId?: string
      department?: string
      permissions: Permission[]
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: Role
    employeeId?: string
    department?: string
    permissions: Permission[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
    employeeId?: string
    department?: string
    permissions: Permission[]
  }
}

interface Permission {
  id: string
  resource: string
  actions: string[]
}