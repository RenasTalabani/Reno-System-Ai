import { buildASTSchema, parse } from 'graphql'

const typeDefs = `
  scalar DateTime
  scalar JSON

  type Query {
    _version: String!
    me: User
    users(filter: UserFilter, limit: Int, cursor: String): UserConnection!
    user(id: ID!): User
    companies: [Company!]!
    company(id: ID!): Company
    branches(companyId: ID!): [Branch!]!
    departments(companyId: ID): [Department!]!
    teams(departmentId: ID): [Team!]!
    roles: [Role!]!
    role(id: ID!): Role
    permissions: [Permission!]!
    auditLogs(filter: AuditLogFilter, limit: Int, cursor: String): AuditLogConnection!
    notifications(unreadOnly: Boolean): [Notification!]!
    settings(module: String): [Setting!]!
    branding: Branding
    featureFlags: [FeatureFlag!]!
  }

  type Mutation {
    # Auth
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    refreshToken(token: String!): AuthPayload!
    setupMfa: MfaSetupPayload!
    verifyMfa(code: String!): Boolean!
    disableMfa(code: String!): Boolean!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    forgotPassword(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!

    # Users
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    suspendUser(id: ID!): User!
    activateUser(id: ID!): User!
    deleteUser(id: ID!): Boolean!
    inviteUser(input: InviteUserInput!): User!
    assignRole(userId: ID!, roleId: ID!): Boolean!
    revokeRole(userId: ID!, roleId: ID!): Boolean!

    # Org Structure
    createCompany(input: CreateCompanyInput!): Company!
    updateCompany(id: ID!, input: UpdateCompanyInput!): Company!
    createBranch(input: CreateBranchInput!): Branch!
    updateBranch(id: ID!, input: UpdateBranchInput!): Branch!
    createDepartment(input: CreateDepartmentInput!): Department!
    updateDepartment(id: ID!, input: UpdateDepartmentInput!): Department!
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: ID!, input: UpdateTeamInput!): Team!

    # Roles & Permissions
    createRole(input: CreateRoleInput!): Role!
    updateRole(id: ID!, input: UpdateRoleInput!): Role!
    deleteRole(id: ID!): Boolean!
    updateRolePermissions(roleId: ID!, permissionIds: [ID!]!): Role!

    # Settings & Branding
    updateSettings(module: String!, key: String!, value: JSON!): Setting!
    updateBranding(input: UpdateBrandingInput!): Branding!

    # Notifications
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Boolean!
  }

  type Subscription {
    notificationReceived: Notification!
    userStatusChanged(tenantId: ID!): User!
  }

  # ─── Auth ──────────────────────────────────────────────────────────────────

  type AuthPayload {
    accessToken: String!
    refreshToken: String
    user: User!
    expiresIn: Int!
    mfaRequired: Boolean
    tempToken: String
  }

  type MfaSetupPayload {
    secret: String!
    qrCodeDataUrl: String!
    backupCodes: [String!]!
  }

  input LoginInput {
    email: String!
    password: String!
    tenantSlug: String!
  }

  # ─── Users ─────────────────────────────────────────────────────────────────

  type User {
    id: ID!
    email: String!
    status: String!
    emailVerified: Boolean!
    mfaEnabled: Boolean!
    locale: String!
    timezone: String
    createdAt: DateTime!
    updatedAt: DateTime!
    profile: UserProfile
    memberships: [UserMembership!]!
    roles: [Role!]!
    lastLoginAt: DateTime
    isActive: Boolean!
  }

  type UserProfile {
    id: ID!
    firstName: String!
    lastName: String!
    displayName: String
    avatarUrl: String
    dateOfBirth: DateTime
    gender: String
    bio: String
  }

  type UserMembership {
    id: ID!
    company: Company!
    branch: Branch
    department: Department
    team: Team
    jobTitle: String
    employeeId: String
    isPrimary: Boolean!
  }

  type UserConnection {
    nodes: [User!]!
    total: Int!
    nextCursor: String
  }

  input UserFilter {
    status: String
    departmentId: ID
    branchId: ID
    search: String
  }

  input CreateUserInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    companyId: ID!
    branchId: ID
    departmentId: ID
    teamId: ID
    jobTitle: String
    roleIds: [ID!]
    locale: String
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    displayName: String
    phone: String
    locale: String
    timezone: String
    jobTitle: String
    departmentId: ID
    teamId: ID
  }

  input InviteUserInput {
    email: String!
    firstName: String!
    lastName: String!
    companyId: ID!
    roleIds: [ID!]!
  }

  # ─── Org Structure ─────────────────────────────────────────────────────────

  type Company {
    id: ID!
    name: String!
    legalName: String
    logoUrl: String
    currency: String!
    timezone: String!
    dateFormat: String!
    isActive: Boolean!
    createdAt: DateTime!
    branches: [Branch!]!
    departments: [Department!]!
  }

  type Branch {
    id: ID!
    name: String!
    code: String
    branchType: String
    address: JSON
    isActive: Boolean!
    createdAt: DateTime!
  }

  type Department {
    id: ID!
    name: String!
    code: String
    description: String
    parent: Department
    children: [Department!]!
    teams: [Team!]!
    isActive: Boolean!
    createdAt: DateTime!
  }

  type Team {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    createdAt: DateTime!
  }

  input CreateCompanyInput {
    name: String!
    legalName: String
    currency: String
    timezone: String
  }

  input UpdateCompanyInput {
    name: String
    legalName: String
    currency: String
    timezone: String
    dateFormat: String
    fiscalYearStart: Int
    address: JSON
    contact: JSON
  }

  input CreateBranchInput {
    companyId: ID!
    name: String!
    code: String
    branchType: String
    address: JSON
  }

  input UpdateBranchInput {
    name: String
    code: String
    branchType: String
    address: JSON
    managerId: ID
  }

  input CreateDepartmentInput {
    companyId: ID!
    branchId: ID
    parentId: ID
    name: String!
    code: String
    description: String
  }

  input UpdateDepartmentInput {
    name: String
    code: String
    description: String
    parentId: ID
    headId: ID
  }

  input CreateTeamInput {
    departmentId: ID
    name: String!
    description: String
    leadId: ID
  }

  input UpdateTeamInput {
    name: String
    description: String
    leadId: ID
    departmentId: ID
  }

  # ─── Roles & Permissions ───────────────────────────────────────────────────

  type Role {
    id: ID!
    name: String!
    slug: String!
    description: String
    isSystem: Boolean!
    color: String
    scope: String!
    isActive: Boolean!
    createdAt: DateTime!
    permissions: [Permission!]!
  }

  type Permission {
    id: ID!
    module: String!
    resource: String!
    action: String!
    scope: String!
    description: String
  }

  input CreateRoleInput {
    name: String!
    slug: String!
    description: String
    color: String
    scope: String
  }

  input UpdateRoleInput {
    name: String
    description: String
    color: String
    scope: String
  }

  # ─── Settings & Branding ──────────────────────────────────────────────────

  type Setting {
    id: ID!
    module: String!
    key: String!
    value: JSON!
    dataType: String!
    description: String
  }

  type Branding {
    id: ID!
    appName: String
    logoUrl: String
    logoDarkUrl: String
    faviconUrl: String
    primaryColor: String
    secondaryColor: String
    accentColor: String
    fontFamily: String
    theme: String
    customCss: String
    customDomain: String
  }

  input UpdateBrandingInput {
    appName: String
    primaryColor: String
    secondaryColor: String
    accentColor: String
    fontFamily: String
    theme: String
    customCss: String
  }

  # ─── Audit Logs ────────────────────────────────────────────────────────────

  type AuditLog {
    id: ID!
    action: String!
    module: String!
    entityType: String!
    entityId: ID
    oldValues: JSON
    newValues: JSON
    ipAddress: String
    occurredAt: DateTime!
    user: User
  }

  type AuditLogConnection {
    nodes: [AuditLog!]!
    total: Int!
    nextCursor: String
  }

  input AuditLogFilter {
    module: String
    entityType: String
    entityId: ID
    userId: ID
    from: DateTime
    to: DateTime
  }

  # ─── Notifications ─────────────────────────────────────────────────────────

  type Notification {
    id: ID!
    type: String!
    title: String!
    body: String
    data: JSON
    channel: String!
    readAt: DateTime
    createdAt: DateTime!
  }

  # ─── Feature Flags ─────────────────────────────────────────────────────────

  type FeatureFlag {
    id: ID!
    module: String!
    feature: String!
    enabled: Boolean!
  }
`

export async function buildSchema() {
  return buildASTSchema(parse(typeDefs))
}
