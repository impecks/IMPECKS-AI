import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { code, instruction, language, userId, model, options = {} } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    if (!code || !instruction) {
      return NextResponse.json({ error: 'Code and instruction are required' }, { status: 400 })
    }

    // Get user's subscription
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 403 })
    }

    const subscription = subscriptionResult.item

    // Calculate tokens needed
    const inputText = `Refactor the following ${language || 'javascript'} code:\n\n${code}\n\nInstruction: ${instruction}\n\nPlease provide:\n1. Refactored code with improvements\n2. Explanation of changes made\n3. Performance optimizations applied\n4. Any breaking changes noted`
    const estimatedTokens = Math.ceil(inputText.length / 4)

    // Check token limits
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Create enhanced refactoring prompt
    const refactoringPrompt = `You are an expert software engineer specializing in code refactoring, optimization, and modern best practices.

TASK: Refactor the provided code according to the instruction.

LANGUAGE: ${language || 'javascript'}

ORIGINAL CODE:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

REFACTORING INSTRUCTION: ${instruction}

REQUIREMENTS:
1. Maintain the original functionality completely
2. Improve code quality, readability, and maintainability
3. Apply modern best practices and design patterns
4. Optimize for performance where possible
5. Add proper error handling and validation
6. Include comprehensive comments for complex logic
7. Follow language-specific conventions and style guides
8. Ensure the refactored code is production-ready

ANALYSIS REQUIRED:
- Identify code smells and anti-patterns
- Suggest architectural improvements
- Optimize algorithms and data structures
- Enhance error handling and edge cases
- Improve naming conventions and code organization
- Add type safety where applicable
- Consider security implications

OUTPUT FORMAT:
1. **REFACTORED CODE**: Complete, working refactored code
2. **CHANGES MADE**: Detailed list of improvements
3. **PERFORMANCE IMPROVEMENTS**: Specific optimizations applied
4. **BREAKING CHANGES**: Any API or interface changes
5. **RECOMMENDATIONS**: Additional improvements for future consideration

Focus on producing clean, efficient, and maintainable code that follows industry standards.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer and architect specializing in code refactoring, optimization, and modern development practices. You provide comprehensive refactoring solutions with detailed explanations and performance optimizations.'
      },
      {
        role: 'user',
        content: refactoringPrompt
      }
    ]

    // Make request to OpenRouter for advanced refactoring
    const completion = await OpenRouterService.chatCompletion(messages, {
      model: model || 'zhipuai/glm-4-6b',
      temperature: options.temperature || 0.2, // Lower temperature for consistent refactoring
      max_tokens: options.max_tokens || 6000 // Allow for comprehensive analysis
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error during refactoring')
    }

    const responseTime = Date.now() - startTime
    const refactoringResult = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Parse the refactoring result
    const parsedResult = parseRefactoringResponse(refactoringResult)

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, 'auto_refactor', actualTokensUsed, {
        endpoint: '/api/refactor',
        requestType: 'auto_refactor',
        complexity: actualTokensUsed > 3000 ? 'complex' : actualTokensUsed > 1500 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown',
        language: language || 'javascript',
        originalCodeLength: code.length,
        refactoredCodeLength: parsedResult.refactoredCode?.length || 0
      })
    ])

    return NextResponse.json({
      success: true,
      originalCode: code,
      refactoredCode: parsedResult.refactoredCode,
      changesMade: parsedResult.changesMade,
      performanceImprovements: parsedResult.performanceImprovements,
      breakingChanges: parsedResult.breakingChanges,
      recommendations: parsedResult.recommendations,
      analysis: parsedResult.analysis,
      model: completion.data?.model,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensRemaining - actualTokensUsed,
        responseTime,
        modelUsage: completion.usage
      },
      metadata: {
        language: language || 'javascript',
        originalLength: code.length,
        refactoredLength: parsedResult.refactoredCode?.length || 0,
        improvementScore: calculateImprovementScore(code, parsedResult.refactoredCode)
      }
    })

  } catch (error: any) {
    console.error('Auto-Refactor API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'auto_refactor', 0, {
          endpoint: '/api/refactor',
          requestType: 'auto_refactor',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's refactoring history
    const usageResult = await UsageService.getUsageStats(userId)
    
    if (!usageResult.success) {
      return NextResponse.json({ error: 'Failed to fetch refactoring history' }, { status: 500 })
    }

    // Filter for refactoring operations
    const refactoringHistory = usageResult.items?.filter((item: any) => 
      item.operation === 'auto_refactor'
    ).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 50) // Last 50 refactoring operations

    return NextResponse.json({
      success: true,
      history: refactoringHistory,
      totalRefactoringOperations: refactoringHistory.length
    })

  } catch (error: any) {
    console.error('Refactor History Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refactoring history', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to parse refactoring response
function parseRefactoringResponse(response: string) {
  try {
    // Try to extract structured information from the AI response
    const refactoredCodeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/g)
    const refactoredCode = refactoredCodeMatch ? refactoredCodeMatch[refactoredCodeMatch.length - 1][1] : response

    // Extract sections
    const changesMatch = response.match(/(?:CHANGES MADE|IMPROVEMENTS)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const performanceMatch = response.match(/(?:PERFORMANCE IMPROVEMENTS|OPTIMIZATIONS)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const breakingMatch = response.match(/(?:BREAKING CHANGES|API CHANGES)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const recommendationsMatch = response.match(/(?:RECOMMENDATIONS|FUTURE CONSIDERATIONS)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)

    return {
      refactoredCode: refactoredCode.trim(),
      changesMade: changesMatch ? changesMatch[1].trim() : 'Code refactored with improved structure and readability',
      performanceImprovements: performanceMatch ? performanceMatch[1].trim() : 'General performance improvements applied',
      breakingChanges: breakingMatch ? breakingMatch[1].trim() : 'No breaking changes',
      recommendations: recommendationsMatch ? recommendationsMatch[1].trim() : 'Consider adding unit tests and documentation',
      analysis: response
    }
  } catch (error) {
    console.error('Error parsing refactoring response:', error)
    return {
      refactoredCode: response,
      changesMade: 'Code refactored with improved structure',
      performanceImprovements: 'Performance optimizations applied',
      breakingChanges: 'No breaking changes detected',
      recommendations: 'Review and test the refactored code',
      analysis: response
    }
  }
}

// Helper function to calculate improvement score
function calculateImprovementScore(originalCode: string, refactoredCode: string) {
  if (!originalCode || !refactoredCode) return 0

  const originalLines = originalCode.split('\n').length
  const refactoredLines = refactoredCode.split('\n').length
  
  // Simple scoring based on various factors
  let score = 50 // Base score
  
  // Length optimization (not too short, not too long)
  if (refactoredLines < originalLines * 0.8) score += 10
  else if (refactoredLines > originalLines * 1.2) score -= 10
  
  // Comments and documentation
  const commentRatio = (refactoredCode.match(/\/\//g) || []).length / refactoredLines
  if (commentRatio > 0.1 && commentRatio < 0.3) score += 15
  
  // Error handling
  if (refactoredCode.includes('try') && refactoredCode.includes('catch')) score += 10
  
  // Modern syntax (ES6+, async/await, etc.)
  if (refactoredCode.includes('const') && refactoredCode.includes('let')) score += 5
  if (refactoredCode.includes('async') || refactoredCode.includes('await')) score += 5
  
  return Math.min(100, Math.max(0, score))
}