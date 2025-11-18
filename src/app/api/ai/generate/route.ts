import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { prompt, language, context = '', userId, operation = 'code_generation', model } = await request.json()

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
    const estimatedTokens = Math.ceil((prompt + context).length / 4)
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Make request to OpenRouter for code generation
    const completion = await OpenRouterService.codeGeneration(prompt, context, language, {
      model: model,
      temperature: 0.3,
      max_tokens: 4000
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error')
    }

    const responseTime = Date.now() - startTime
    const generatedCode = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, operation, actualTokensUsed, {
        endpoint: '/api/ai/generate',
        requestType: 'code_generation',
        complexity: actualTokensUsed > 2000 ? 'complex' : actualTokensUsed > 1000 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown'
      })
    ])

    return NextResponse.json({
      code: generatedCode,
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
    console.error('Code Generation API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'code_generation', 0, {
          endpoint: '/api/ai/generate',
          requestType: 'code_generation',
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
      { error: 'Failed to generate code', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { code, instruction, language, userId, operation = 'refactoring', model } = await request.json()

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
    const estimatedTokens = Math.ceil((code + instruction).length / 4)
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Make request to OpenRouter for code refactoring
    const completion = await OpenRouterService.codeRefactoring(code, instruction, language, {
      model: model,
      temperature: 0.2,
      max_tokens: 4000
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error')
    }

    const responseTime = Date.now() - startTime
    const refactoredCode = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, operation, actualTokensUsed, {
        endpoint: '/api/ai/generate',
        requestType: 'refactoring',
        complexity: actualTokensUsed > 2000 ? 'complex' : actualTokensUsed > 1000 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown'
      })
    ])

    return NextResponse.json({
      code: refactoredCode,
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
    console.error('Code Refactoring API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'refactoring', 0, {
          endpoint: '/api/ai/generate',
          requestType: 'refactoring',
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
      { error: 'Failed to refactor code', details: error.message },
      { status: 500 }
    )
  }
}