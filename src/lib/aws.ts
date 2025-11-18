import { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminSetUserPasswordCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminGetUserCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

// AWS Configuration
const region = process.env.AWS_REGION || 'us-east-1'
const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID || ''
const clientId = process.env.AWS_COGNITO_CLIENT_ID || ''

// Initialize AWS clients
export const cognitoClient = new CognitoIdentityProviderClient({ region })
export const dynamoClient = new DynamoDBClient({ region })
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient)

// Database Tables
const TABLES = {
  USERS: 'impecks-users',
  SUBSCRIPTIONS: 'impecks-subscriptions',
  USAGE_LOGS: 'impecks-usage-logs',
  WORKSPACES: 'impecks-workspaces',
  WORKSPACE_FILES: 'impecks-workspace-files',
  PROJECTS: 'impecks-projects'
}

// User Management
export interface User {
  id: string
  email: string
  name?: string
  role: string
  emailVerified?: boolean
  image?: string
  createdAt: string
  updatedAt: string
  subscriptionId?: string
}

export interface Subscription {
  userId: string
  plan: string
  status: string
  tokensAllowed: number
  tokensUsed: number
  tokensRemaining: number
  price: number
  currency: string
  billingCycle: string
  paystackEmail?: string
  googlePayToken?: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEnd?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface UsageLog {
  id: string
  userId: string
  tokensUsed: number
  operation: string
  endpoint: string
  requestType: string
  complexity: string
  responseTime: number
  success: boolean
  errorMessage?: string
  createdAt: string
}

export interface Workspace {
  id: string
  userId: string
  name: string
  description?: string
  isPublic: boolean
  settings?: Record<string, any>
  collaborators?: string[]
  createdAt: string
  updatedAt: string
}

export interface WorkspaceFile {
  id: string
  workspaceId: string
  name: string
  path: string
  content?: string
  size: number
  language?: string
  encoding: string
  s3Key?: string
  s3Bucket?: string
  version: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string
  type: string
  config?: Record<string, any>
  awsConfig?: Record<string, any>
  domain?: string
  lastBuildAt?: string
  lastDeployAt?: string
  buildStatus: string
  createdAt: string
  updatedAt: string
}

// Cognito Authentication Functions
export class CognitoAuthService {
  static async signUp(email: string, password: string, name?: string) {
    try {
      const username = email.toLowerCase()
      
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: name || '' },
          { Name: 'email_verified', Value: 'true' }
        ],
        MessageAction: 'SUPPRESS', // Don't send welcome email
        TemporaryPassword: password
      })

      const user = await cognitoClient.send(createUserCommand)

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        Password: password,
        Permanent: true
      })

      await cognitoClient.send(setPasswordCommand)

      // Create user record in DynamoDB
      const userRecord: User = {
        id: username,
        email,
        name,
        role: 'user',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.createUserInDB(userRecord)

      return { success: true, user: userRecord }
    } catch (error: any) {
      console.error('Cognito signUp error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to create user' 
      }
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: email.toLowerCase(),
          PASSWORD: password
        }
      })

      const response = await cognitoClient.send(command)

      if (response.AuthenticationResult) {
        // Get user from DynamoDB
        const user = await this.getUserFromDB(email.toLowerCase())
        
        return {
          success: true,
          tokens: response.AuthenticationResult,
          user
        }
      } else {
        return { success: false, error: 'Authentication failed' }
      }
    } catch (error: any) {
      console.error('Cognito signIn error:', error)
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      }
    }
  }

  static async verifyToken(token: string) {
    try {
      // For production, use aws-jwt-verify
      // For now, we'll implement a simple verification
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        return { valid: false, error: 'Token expired' }
      }

      // Get user from DynamoDB
      const user = await this.getUserFromDB(payload.username)
      
      return { valid: true, user }
    } catch (error: any) {
      console.error('Token verification error:', error)
      return { valid: false, error: 'Invalid token' }
    }
  }

  // DynamoDB Helper Functions
  private static async createUserInDB(user: User) {
    const command = new PutCommand({
      TableName: TABLES.USERS,
      Item: user
    })
    return await dynamoDocClient.send(command)
  }

  private static async getUserFromDB(userId: string): Promise<User | null> {
    const command = new GetCommand({
      TableName: TABLES.USERS,
      Key: { id: userId }
    })
    
    const result = await dynamoDocClient.send(command)
    return result.Item as User || null
  }

  static async updateUserInDB(userId: string, updates: Partial<User>) {
    const command = new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { id: userId },
      UpdateExpression: 'SET ' + Object.keys(updates).map(key => `${key} = :${key}`).join(', '),
      ExpressionAttributeValues: Object.keys(updates).reduce((acc, key) => ({
        ...acc,
        [`:${key}`]: updates[key as keyof User]
      }), {}),
      ReturnValues: 'ALL_NEW'
    })
    
    const result = await dynamoDocClient.send(command)
    return result.Attributes as User
  }
}

// DynamoDB Service Class
export class DynamoDBService {
  // Subscription Management
  static async createSubscription(subscription: Omit<Subscription, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const item: Subscription = {
      ...subscription,
      createdAt: now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Item: item
    })

    await dynamoDocClient.send(command)
    return item
  }

  static async getSubscription(userId: string): Promise<Subscription | null> {
    const command = new GetCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { userId }
    })

    const result = await dynamoDocClient.send(command)
    return result.Item as Subscription || null
  }

  static async updateSubscription(userId: string, updates: Partial<Subscription>) {
    const command = new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { userId },
      UpdateExpression: 'SET ' + Object.keys(updates).map(key => `${key} = :${key}`).join(', '),
      ExpressionAttributeValues: Object.keys(updates).reduce((acc, key) => ({
        ...acc,
        [`:${key}`]: updates[key as keyof Subscription]
      }), {}),
      ReturnValues: 'ALL_NEW'
    })

    const result = await dynamoDocClient.send(command)
    return result.Attributes as Subscription
  }

  // Usage Logs
  static async createUsageLog(log: Omit<UsageLog, 'createdAt'>) {
    const item: UsageLog = {
      ...log,
      createdAt: new Date().toISOString()
    }

    const command = new PutCommand({
      TableName: TABLES.USAGE_LOGS,
      Item: item
    })

    await dynamoDocClient.send(command)
    return item
  }

  static async getUsageLogs(userId: string, limit = 50) {
    const command = new QueryCommand({
      TableName: TABLES.USAGE_LOGS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: limit,
      ScanIndexForward: false // Sort by descending (most recent first)
    })

    const result = await dynamoDocClient.send(command)
    return result.Items as UsageLog[]
  }

  // Workspace Management
  static async createWorkspace(workspace: Omit<Workspace, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const item: Workspace = {
      ...workspace,
      createdAt: now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: TABLES.WORKSPACES,
      Item: item
    })

    await dynamoDocClient.send(command)
    return item
  }

  static async getWorkspaces(userId: string) {
    const command = new QueryCommand({
      TableName: TABLES.WORKSPACES,
      IndexName: 'userId-index', // You need to create this GSI
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })

    const result = await dynamoDocClient.send(command)
    return result.Items as Workspace[]
  }

  // File Management
  static async createWorkspaceFile(file: Omit<WorkspaceFile, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const item: WorkspaceFile = {
      ...file,
      createdAt: now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: TABLES.WORKSPACE_FILES,
      Item: item
    })

    await dynamoDocClient.send(command)
    return item
  }

  static async getWorkspaceFiles(workspaceId: string) {
    const command = new QueryCommand({
      TableName: TABLES.WORKSPACE_FILES,
      IndexName: 'workspaceId-index', // You need to create this GSI
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: {
        ':workspaceId': workspaceId
      }
    })

    const result = await dynamoDocClient.send(command)
    return result.Items as WorkspaceFile[]
  }

  // Project Management
  static async createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    const item: Project = {
      ...project,
      createdAt: now,
      updatedAt: now
    }

    const command = new PutCommand({
      TableName: TABLES.PROJECTS,
      Item: item
    })

    await dynamoDocClient.send(command)
    return item
  }

  static async getProjects(workspaceId: string) {
    const command = new QueryCommand({
      TableName: TABLES.PROJECTS,
      IndexName: 'workspaceId-index', // You need to create this GSI
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: {
        ':workspaceId': workspaceId
      }
    })

    const result = await dynamoDocClient.send(command)
    return result.Items as Project[]
  }
}

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    tokensAllowed: 150,
    price: 0,
    features: ['150 daily requests', 'Slow rate limit', 'Educational use only']
  },
  basic: {
    tokensAllowed: 25000,
    price: 6,
    features: ['25,000 monthly tokens', 'Standard speed', 'Small coding tasks']
  },
  starter: {
    tokensAllowed: 60000,
    price: 15,
    features: ['60,000 monthly tokens', 'Medium-sized refactors', 'Test automation']
  },
  pro: {
    tokensAllowed: 150000,
    price: 25,
    features: ['150,000 tokens', 'Multi-file edits', 'Fast inference']
  },
  developer: {
    tokensAllowed: 400000,
    price: 50,
    features: ['400,000 tokens', 'Large codebase support', 'Batch editing']
  },
  team: {
    tokensAllowed: 1000000,
    price: 99,
    features: ['1 million tokens', 'Team collaboration', 'Priority rate limit']
  },
  enterprise: {
    tokensAllowed: 5000000,
    price: 299,
    features: ['5 million tokens', 'Highest speed', 'SLA guarantee']
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS