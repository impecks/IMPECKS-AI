import { CognitoIdentityProviderClient, AdminInitiateAuthCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand, AdminGetUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand as DocQueryCommand, ScanCommand as DocScanCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
}

// Cognito Configuration
const cognitoClient = new CognitoIdentityProviderClient(awsConfig)
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID || ''
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID || ''

// DynamoDB Configuration
const dynamoClient = new DynamoDBClient(awsConfig)
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// S3 Configuration
const s3Client = new S3Client(awsConfig)
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'impecks-ai-workspaces'

// Database Table Names
const TABLES = {
  USERS: 'impecks-users',
  SUBSCRIPTIONS: 'impecks-subscriptions',
  WORKSPACES: 'impecks-workspaces',
  WORKSPACE_FILES: 'impecks-workspace-files',
  PROJECTS: 'impecks-projects',
  USAGE_LOGS: 'impecks-usage-logs'
}

// Subscription Plans
const SUBSCRIPTION_PLANS = {
  free: { tokensAllowed: 150, price: 0 },
  basic: { tokensAllowed: 25000, price: 6 },
  starter: { tokensAllowed: 60000, price: 15 },
  pro: { tokensAllowed: 150000, price: 25 },
  developer: { tokensAllowed: 400000, price: 50 },
  team: { tokensAllowed: 1000000, price: 99 },
  enterprise: { tokensAllowed: 5000000, price: 299 }
}

// Cognito Authentication Functions
export class CognitoAuthService {
  static async signUp(email: string, password: string, name?: string) {
    try {
      const command = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: name || email.split('@')[0] },
          { Name: 'email_verified', Value: 'true' }
        ],
        MessageAction: 'SUPPRESS' // Don't send welcome email
      })

      const result = await cognitoClient.send(command)
      
      // Set temporary password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: password,
        Permanent: true
      })

      await cognitoClient.send(setPasswordCommand)

      // Create user record in DynamoDB
      await this.createUserInDB(email, name)

      return { success: true, user: result.User }
    } catch (error: any) {
      console.error('Cognito signup error:', error)
      return { success: false, error: error.message }
    }
  }

  static async signIn(email: string, password: string) {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      })

      const result = await cognitoClient.send(command)
      
      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return { 
          success: false, 
          challenge: 'NEW_PASSWORD_REQUIRED',
          session: result.Session 
        }
      }

      return { 
        success: true, 
        tokens: {
          idToken: result.AuthenticationResult?.IdToken,
          accessToken: result.AuthenticationResult?.AccessToken,
          refreshToken: result.AuthenticationResult?.RefreshToken
        }
      }
    } catch (error: any) {
      console.error('Cognito signin error:', error)
      return { success: false, error: error.message }
    }
  }

  static async getUserFromToken(token: string) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        AccessToken: token
      })

      const result = await cognitoClient.send(command)
      return { success: true, user: result }
    } catch (error: any) {
      console.error('Cognito get user error:', error)
      return { success: false, error: error.message }
    }
  }

  static async updateUserAttributes(email: string, attributes: Record<string, string>) {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value
      }))

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: userAttributes
      })

      await cognitoClient.send(command)
      return { success: true }
    } catch (error: any) {
      console.error('Cognito update user error:', error)
      return { success: false, error: error.message }
    }
  }

  static async deleteUser(email: string) {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      })

      await cognitoClient.send(command)
      return { success: true }
    } catch (error: any) {
      console.error('Cognito delete user error:', error)
      return { success: false, error: error.message }
    }
  }

  private static async createUserInDB(email: string, name?: string) {
    const user = {
      userId: email,
      email,
      name: name || email.split('@')[0],
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const command = new PutCommand({
      TableName: TABLES.USERS,
      Item: user
    })

    await docClient.send(command)
  }
}

// DynamoDB Database Functions
export class DynamoDBService {
  static async getItem(tableName: string, key: Record<string, any>) {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key
      })

      const result = await docClient.send(command)
      return { success: true, item: result.Item }
    } catch (error: any) {
      console.error('DynamoDB get item error:', error)
      return { success: false, error: error.message }
    }
  }

  static async putItem(tableName: string, item: Record<string, any>) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item
      })

      await docClient.send(command)
      return { success: true }
    } catch (error: any) {
      console.error('DynamoDB put item error:', error)
      return { success: false, error: error.message }
    }
  }

  static async updateItem(tableName: string, key: Record<string, any>, updateExpression: string, expressionAttributeValues: Record<string, any>) {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      })

      const result = await docClient.send(command)
      return { success: true, item: result.Attributes }
    } catch (error: any) {
      console.error('DynamoDB update item error:', error)
      return { success: false, error: error.message }
    }
  }

  static async query(tableName: string, keyConditionExpression: string, expressionAttributeValues?: Record<string, any>) {
    try {
      const command = new DocQueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
      })

      const result = await docClient.send(command)
      return { success: true, items: result.Items }
    } catch (error: any) {
      console.error('DynamoDB query error:', error)
      return { success: false, error: error.message }
    }
  }

  static async scan(tableName: string, filterExpression?: string, expressionAttributeValues?: Record<string, any>) {
    try {
      const command = new DocScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
      })

      const result = await docClient.send(command)
      return { success: true, items: result.Items }
    } catch (error: any) {
      console.error('DynamoDB scan error:', error)
      return { success: false, error: error.message }
    }
  }

  static async deleteItem(tableName: string, key: Record<string, any>) {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key
      })

      await docClient.send(command)
      return { success: true }
    } catch (error: any) {
      console.error('DynamoDB delete item error:', error)
      return { success: false, error: error.message }
    }
  }
}

// S3 Storage Functions
export class S3Service {
  static async uploadFile(key: string, body: Buffer | string, contentType: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType
      })

      await s3Client.send(command)
      return { success: true, key }
    } catch (error: any) {
      console.error('S3 upload error:', error)
      return { success: false, error: error.message }
    }
  }

  static async getFile(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      })

      const result = await s3Client.send(command)
      return { success: true, data: result.Body }
    } catch (error: any) {
      console.error('S3 get file error:', error)
      return { success: false, error: error.message }
    }
  }

  static async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      })

      await s3Client.send(command)
      return { success: true }
    } catch (error: any) {
      console.error('S3 delete file error:', error)
      return { success: false, error: error.message }
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      })

      const url = await getSignedUrl(s3Client, command, { expiresIn })
      return { success: true, url }
    } catch (error: any) {
      console.error('S3 signed URL error:', error)
      return { success: false, error: error.message }
    }
  }

  static async listFiles(prefix: string) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix
      })

      const result = await s3Client.send(command)
      return { success: true, files: result.Contents }
    } catch (error: any) {
      console.error('S3 list files error:', error)
      return { success: false, error: error.message }
    }
  }
}

// Subscription Management
export class SubscriptionService {
  static async createSubscription(userId: string, plan: string, billingCycle: string = 'monthly') {
    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]
    if (!planConfig) {
      return { success: false, error: 'Invalid subscription plan' }
    }

    const price = billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price
    const now = new Date()
    const currentPeriodEnd = new Date(now.setMonth(now.getMonth() + (billingCycle === 'yearly' ? 12 : 1)))

    const subscription = {
      userId,
      plan,
      status: 'active',
      tokensAllowed: planConfig.tokensAllowed,
      tokensUsed: 0,
      tokensRemaining: planConfig.tokensAllowed,
      price,
      billingCycle,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return await DynamoDBService.putItem(TABLES.SUBSCRIPTIONS, subscription)
  }

  static async getSubscription(userId: string) {
    return await DynamoDBService.getItem(TABLES.SUBSCRIPTIONS, { userId })
  }

  static async updateSubscriptionUsage(userId: string, tokensUsed: number) {
    const subscription = await this.getSubscription(userId)
    if (!subscription.success) {
      return { success: false, error: 'Subscription not found' }
    }

    const newTokensUsed = (subscription.item.tokensUsed || 0) + tokensUsed
    const tokensRemaining = Math.max(0, subscription.item.tokensAllowed - newTokensUsed)

    return await DynamoDBService.updateItem(
      TABLES.SUBSCRIPTIONS,
      { userId },
      'SET tokensUsed = :tokensUsed, tokensRemaining = :tokensRemaining, updatedAt = :updatedAt',
      {
        ':tokensUsed': newTokensUsed,
        ':tokensRemaining': tokensRemaining,
        ':updatedAt': new Date().toISOString()
      }
    )
  }

  static async checkTokenLimit(userId: string, tokensNeeded: number) {
    const subscription = await this.getSubscription(userId)
    if (!subscription.success) {
      return { canProceed: false, error: 'No subscription found' }
    }

    const tokensRemaining = subscription.item.tokensRemaining || 0
    return {
      canProceed: tokensRemaining >= tokensNeeded,
      tokensRemaining,
      tokensNeeded
    }
  }
}

// Usage Logging
export class UsageService {
  static async logUsage(userId: string, operation: string, tokensUsed: number, metadata: Record<string, any> = {}) {
    const logEntry = {
      id: `${userId}-${Date.now()}`,
      userId,
      tokensUsed,
      operation,
      endpoint: metadata.endpoint || '',
      requestType: metadata.requestType || 'unknown',
      complexity: metadata.complexity || 'simple',
      responseTime: metadata.responseTime || 0,
      success: metadata.success !== false,
      errorMessage: metadata.errorMessage || null,
      createdAt: new Date().toISOString()
    }

    return await DynamoDBService.putItem(TABLES.USAGE_LOGS, logEntry)
  }

  static async getUsageStats(userId: string, startDate?: string) {
    const filterExpression = startDate 
      ? 'userId = :userId AND createdAt >= :startDate'
      : 'userId = :userId'

    const expressionAttributeValues: any = { ':userId': userId }
    if (startDate) {
      expressionAttributeValues[':startDate'] = startDate
    }

    return await DynamoDBService.scan(TABLES.USAGE_LOGS, filterExpression, expressionAttributeValues)
  }
}

export {
  awsConfig,
  TABLES,
  SUBSCRIPTION_PLANS,
  cognitoClient,
  docClient,
  s3Client,
  USER_POOL_ID,
  CLIENT_ID,
  S3_BUCKET
}