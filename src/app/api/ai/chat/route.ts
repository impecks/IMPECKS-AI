import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, operation = 'chat', model } = await request.json()

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
    const estimatedTokens = messages.reduce((total: number, msg: any) => {
      return total + Math.ceil(msg.content.length / 4)
    }, 0)

    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Make request to OpenRouter
    const completion = await OpenRouterService.chatCompletion(messages, {
      model: model,
      temperature: 0.7,
      max_tokens: 2000
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error')
    }

    const responseTime = Date.now() - startTime
    const responseContent = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, operation, actualTokensUsed, {
        endpoint: '/api/ai/chat',
        requestType: 'chat',
        complexity: actualTokensUsed > 1000 ? 'complex' : actualTokensUsed > 500 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown'
      })
    ])

    return NextResponse.json({
      content: responseContent,
      model: completion.data?.model,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensRemaining - actualTokensUsed,
        responseTime,
        modelUsage: completion.usage
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
    
    // Get OpenRouter usage stats
    const openrouterUsage = await OpenRouterService.getUsageStats()
    
    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        tokensAllowed: subscription.tokensAllowed,
        tokensUsed: subscription.tokensUsed,
        tokensRemaining: subscription.tokensRemaining,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage: usageResult.success ? usageResult.items : [],
      openrouterUsage: openrouterUsage.success ? openrouterUsage.usage : null
    })

  } catch (error: any) {
    console.error('Usage Stats Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}