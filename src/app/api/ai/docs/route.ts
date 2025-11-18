import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { code, language, userId, operation = 'documentation', model } = await request.json()

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
    const estimatedTokens = Math.ceil(code.length / 4)
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Make request to OpenRouter for documentation generation
    const completion = await OpenRouterService.documentationGeneration(code, language, {
      model: model,
      temperature: 0.5,
      max_tokens: 2500
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error')
    }

    const responseTime = Date.now() - startTime
    const documentation = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, operation, actualTokensUsed, {
        endpoint: '/api/ai/docs',
        requestType: 'documentation',
        complexity: actualTokensUsed > 1250 ? 'complex' : actualTokensUsed > 625 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown'
      })
    ])

    return NextResponse.json({
      documentation,
      language,
      model: completion.data?.model,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensRemaining - actualTokensUsed,
        responseTime,
        modelUsage: completion.usage
      }
    })

  } catch (error: any) {
    console.error('Documentation API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'documentation', 0, {
          endpoint: '/api/ai/docs',
          requestType: 'documentation',
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
      { error: 'Failed to generate documentation', details: error.message },
      { status: 500 }
    )
  }
}