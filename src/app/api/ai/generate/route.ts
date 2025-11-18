import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { prompt, language, context = '', userId, operation = 'code_generation' } = await request.json()

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

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    const startTime = Date.now()

    // Create enhanced prompt for code generation
    const enhancedPrompt = `You are an expert software engineer and AI coding assistant. Generate high-quality, production-ready code based on the following request.

Language: ${language}
Context: ${context}
Request: ${prompt}

Requirements:
- Write clean, maintainable, and well-documented code
- Follow best practices and coding standards
- Include error handling where appropriate
- Use modern syntax and features
- Add comments for complex logic
- Ensure the code is complete and functional

Generate only the code without explanations unless specifically requested.`

    // Make request to GLM 4.6
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a world-class software engineer and AI coding assistant. You generate clean, efficient, and production-ready code.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })

    const responseTime = Date.now() - startTime
    const generatedCode = completion.choices[0]?.message?.content || ''

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, estimatedTokens),

      // Log usage
      UsageService.logUsage(userId, operation, estimatedTokens, {
        endpoint: '/api/ai/generate',
        requestType: 'code_generation',
        complexity: estimatedTokens > 2000 ? 'complex' : estimatedTokens > 1000 ? 'medium' : 'simple',
        responseTime,
        success: true
      })
    ])

    return NextResponse.json({
      code: generatedCode,
      language,
      usage: {
        tokensUsed: estimatedTokens,
        tokensRemaining: subscription.tokensRemaining - estimatedTokens,
        responseTime
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
    const { code, instruction, language, userId, operation = 'refactoring' } = await request.json()

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

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    const startTime = Date.now()

    // Create refactoring prompt
    const refactoringPrompt = `You are an expert software engineer specializing in code refactoring and optimization. 

Language: ${language}
Current Code:
\`\`\`${language}
${code}
\`\`\`

Refactoring Instruction: ${instruction}

Requirements:
- Maintain the original functionality
- Improve code quality, readability, and performance
- Follow best practices and design patterns
- Add appropriate comments for changes
- Ensure the refactored code is complete and functional

Provide the refactored code only, without explanations unless specifically requested.`

    // Make request to GLM 4.6
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a world-class software engineer specializing in code refactoring, optimization, and best practices.'
        },
        {
          role: 'user',
          content: refactoringPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    })

    const responseTime = Date.now() - startTime
    const refactoredCode = completion.choices[0]?.message?.content || ''

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, estimatedTokens),

      // Log usage
      UsageService.logUsage(userId, operation, estimatedTokens, {
        endpoint: '/api/ai/generate',
        requestType: 'refactoring',
        complexity: estimatedTokens > 2000 ? 'complex' : estimatedTokens > 1000 ? 'medium' : 'simple',
        responseTime,
        success: true
      })
    ])

    return NextResponse.json({
      code: refactoredCode,
      language,
      usage: {
        tokensUsed: estimatedTokens,
        tokensRemaining: subscription.tokensRemaining - estimatedTokens,
        responseTime
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