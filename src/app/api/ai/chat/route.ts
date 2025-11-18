import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService } from '@/lib/aws'
import { CognitoAuthService } from '@/lib/aws'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, operation = 'chat' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get user and subscription info
    const user = await CognitoAuthService['getUserFromDB'](userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subscription = await DynamoDBService.getSubscription(userId)
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 403 })
    }

    if (subscription.tokensUsed >= subscription.tokensAllowed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensUsed: subscription.tokensUsed,
        tokensAllowed: subscription.tokensAllowed
      }, { status: 429 })
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Calculate tokens needed (simplified estimation)
    const estimatedTokens = messages.reduce((total: number, msg: any) => {
      return total + Math.ceil(msg.content.length / 4)
    }, 0)

    // Check if user has enough tokens
    if (subscription.tokensUsed + estimatedTokens > subscription.tokensAllowed) {
      return NextResponse.json({ 
        error: 'Insufficient tokens for this request',
        tokensUsed: subscription.tokensUsed,
        tokensAllowed: subscription.tokensAllowed,
        tokensNeeded: estimatedTokens
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Make request to GLM 4.6
    const completion = await zai.chat.completions.create({
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 2000
    })

    const responseTime = Date.now() - startTime
    const responseContent = completion.choices[0]?.message?.content || ''

    // Calculate actual tokens used
    const actualTokensUsed = estimatedTokens

    // Update usage
    await Promise.all([
      // Update subscription token usage
      DynamoDBService.updateSubscription(userId, {
        tokensUsed: subscription.tokensUsed + actualTokensUsed,
        tokensRemaining: subscription.tokensAllowed - (subscription.tokensUsed + actualTokensUsed)
      }),

      // Log usage
      DynamoDBService.createUsageLog({
        id: `${userId}_${Date.now()}`,
        userId,
        tokensUsed: actualTokensUsed,
        operation,
        endpoint: '/api/ai/chat',
        requestType: 'chat',
        complexity: actualTokensUsed > 1000 ? 'complex' : actualTokensUsed > 500 ? 'medium' : 'simple',
        responseTime,
        success: true
      })
    ])

    return NextResponse.json({
      content: responseContent,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensAllowed - (subscription.tokensUsed + actualTokensUsed),
        responseTime
      }
    })

  } catch (error: any) {
    console.error('AI Chat API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await DynamoDBService.createUsageLog({
          id: `${request.body.userId}_${Date.now()}`,
          userId: request.body.userId,
          tokensUsed: 0,
          operation: request.body.operation || 'chat',
          endpoint: '/api/ai/chat',
          requestType: 'chat',
          complexity: 'simple',
          responseTime: 0,
          success: false,
          errorMessage: error.message
        })
      } catch (logError) {
        console.error('Failed to log usage error:', logError)
      }
    }

    return NextResponse.json(
      { error: 'Failed to process AI request', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's subscription info
    const subscription = await DynamoDBService.getSubscription(userId)

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get usage statistics
    const usageLogs = await DynamoDBService.getUsageLogs(userId)

    const usageStats = usageLogs.reduce((acc: any, log) => {
      const key = log.operation
      if (!acc[key]) {
        acc[key] = { count: 0, tokensUsed: 0, avgResponseTime: 0, responseTimes: [] }
      }
      acc[key].count++
      acc[key].tokensUsed += log.tokensUsed
      acc[key].responseTimes.push(log.responseTime)
      return acc
    }, {})

    // Calculate averages
    Object.keys(usageStats).forEach(key => {
      const stats = usageStats[key]
      stats.avgResponseTime = stats.responseTimes.reduce((a: number, b: number) => a + b, 0) / stats.responseTimes.length
      delete stats.responseTimes
    })

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        tokensAllowed: subscription.tokensAllowed,
        tokensUsed: subscription.tokensUsed,
        tokensRemaining: subscription.tokensRemaining,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage: usageStats
    })

  } catch (error: any) {
    console.error('Usage Stats Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}