import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, operation = 'chat' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get user's subscription
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 403 })
    }

    const subscription = subscriptionResult.item

    // Check token limits
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, 100) // Estimate 100 tokens
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Calculate tokens needed (simplified estimation)
    const estimatedTokens = messages.reduce((total: number, msg: any) => {
      return total + Math.ceil(msg.content.length / 4)
    }, 0)

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

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, estimatedTokens),

      // Log usage
      UsageService.logUsage(userId, operation, estimatedTokens, {
        endpoint: '/api/ai/chat',
        requestType: 'chat',
        complexity: estimatedTokens > 1000 ? 'complex' : estimatedTokens > 500 ? 'medium' : 'simple',
        responseTime,
        success: true
      })
    ])

    return NextResponse.json({
      content: responseContent,
      usage: {
        tokensUsed: estimatedTokens,
        tokensRemaining: subscription.tokensRemaining - estimatedTokens,
        responseTime
      }
    })

  } catch (error: any) {
    console.error('AI Chat API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'chat', 0, {
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
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const subscription = subscriptionResult.item

    // Get usage statistics
    const usageResult = await UsageService.getUsageStats(userId)
    
    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        tokensAllowed: subscription.tokensAllowed,
        tokensUsed: subscription.tokensUsed,
        tokensRemaining: subscription.tokensRemaining,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage: usageResult.success ? usageResult.items : []
    })

  } catch (error: any) {
    console.error('Usage Stats Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}