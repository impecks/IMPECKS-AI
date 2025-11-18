import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { code, language, userId, model, options = {} } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Get user's subscription
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 403 })
    }

    const subscription = subscriptionResult.item

    // Calculate tokens needed
    const inputText = `Analyze the following ${language || 'javascript'} code for bugs, security vulnerabilities, and performance issues:\n\n${code}\n\nPlease provide:\n1. List of identified bugs and issues\n2. Security vulnerabilities analysis\n3. Performance bottlenecks\n4. Code quality assessment\n5. Best practices violations\n6. Specific line numbers for each issue\n7. Recommended fixes with code examples\n8. Overall code quality score`
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

    // Create comprehensive bug detection prompt
    const bugDetectionPrompt = `You are an expert software engineer and security analyst specializing in code analysis, bug detection, and vulnerability assessment.

TASK: Analyze the provided code for bugs, security issues, performance problems, and code quality issues.

LANGUAGE: ${language || 'javascript'}

CODE TO ANALYZE:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

ANALYSIS REQUIREMENTS:
1. **BUG DETECTION**: Identify syntax errors, logic errors, runtime errors, null/undefined issues, type errors
2. **SECURITY ANALYSIS**: Find XSS, SQL injection, CSRF, authentication bypasses, data exposure, input validation issues
3. **PERFORMANCE ANALYSIS**: Identify inefficient algorithms, memory leaks, unnecessary computations, blocking operations
4. **CODE QUALITY**: Assess naming conventions, code structure, maintainability, documentation, error handling
5. **BEST PRACTICES**: Check for proper use of language features, design patterns, error handling, input validation
6. **DEPENDENCIES**: Identify outdated or vulnerable dependencies if applicable

OUTPUT FORMAT:
1. **CRITICAL ISSUES**: Security vulnerabilities and critical bugs (High Priority)
2. **WARNINGS**: Performance issues and code quality problems (Medium Priority)
3. **SUGGESTIONS**: Improvements and best practices (Low Priority)
4. **CODE QUALITY SCORE**: Overall assessment (0-100)
5. **FIXED CODE**: Corrected version of the code with all issues resolved
6. **EXPLANATION**: Detailed explanation of each issue and fix applied

For each issue provide:
- Line number (if applicable)
- Severity level (Critical/High/Medium/Low)
- Issue description
- Security impact (for security issues)
- Performance impact (for performance issues)
- Recommended fix with code example
- Prevention measures

Focus on providing actionable, specific feedback with concrete code improvements.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer, security expert, and code analyst. You provide comprehensive bug detection, security analysis, and performance optimization with detailed explanations and concrete fixes.'
      },
      {
        role: 'user',
        content: bugDetectionPrompt
      }
    ]

    // Make request to OpenRouter for advanced bug detection
    const completion = await OpenRouterService.chatCompletion(messages, {
      model: model || 'zhipuai/glm-4-6b',
      temperature: options.temperature || 0.1, // Very low temperature for consistent analysis
      max_tokens: options.max_tokens || 8000 // Allow for comprehensive analysis
    })

    if (!completion.success) {
      throw new Error(completion.error || 'OpenRouter API error during bug detection')
    }

    const responseTime = Date.now() - startTime
    const analysisResult = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Parse the bug detection result
    const parsedResult = parseBugDetectionResponse(analysisResult)

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, 'bug_detection', actualTokensUsed, {
        endpoint: '/api/bug-detect',
        requestType: 'bug_detection',
        complexity: actualTokensUsed > 4000 ? 'complex' : actualTokensUsed > 2000 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown',
        language: language || 'javascript',
        codeLength: code.length,
        issuesFound: parsedResult.totalIssues
      })
    ])

    return NextResponse.json({
      success: true,
      originalCode: code,
      analysis: parsedResult,
      fixedCode: parsedResult.fixedCode,
      criticalIssues: parsedResult.criticalIssues,
      warnings: parsedResult.warnings,
      suggestions: parsedResult.suggestions,
      codeQualityScore: parsedResult.codeQualityScore,
      securityIssues: parsedResult.securityIssues,
      performanceIssues: parsedResult.performanceIssues,
      model: completion.data?.model,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensRemaining - actualTokensUsed,
        responseTime,
        modelUsage: completion.usage
      },
      metadata: {
        language: language || 'javascript',
        codeLength: code.length,
        analysisComplexity: actualTokensUsed > 4000 ? 'complex' : actualTokensUsed > 2000 ? 'medium' : 'simple',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Bug Detection API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'bug_detection', 0, {
          endpoint: '/api/bug-detect',
          requestType: 'bug_detection',
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
      { error: 'Failed to analyze code for bugs', details: error.message },
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

    // Get user's bug detection history
    const usageResult = await UsageService.getUsageStats(userId)
    
    if (!usageResult.success) {
      return NextResponse.json({ error: 'Failed to fetch bug detection history' }, { status: 500 })
    }

    // Filter for bug detection operations
    const bugDetectionHistory = usageResult.items?.filter((item: any) => 
      item.operation === 'bug_detection'
    ).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 50) // Last 50 bug detection operations

    return NextResponse.json({
      success: true,
      history: bugDetectionHistory,
      totalBugDetectionOperations: bugDetectionHistory.length
    })

  } catch (error: any) {
    console.error('Bug Detection History Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bug detection history', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to parse bug detection response
function parseBugDetectionResponse(response: string) {
  try {
    // Extract code blocks
    const codeBlocks = response.match(/```[\w]*\n([\s\S]*?)\n```/g)
    const fixedCode = codeBlocks ? codeBlocks[codeBlocks.length - 1][1] : ''

    // Extract sections
    const criticalMatch = response.match(/(?:CRITICAL ISSUES|SECURITY VULNERABILITIES)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const warningsMatch = response.match(/(?:WARNINGS|ISSUES)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const suggestionsMatch = response.match(/(?:SUGGESTIONS|RECOMMENDATIONS)[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const scoreMatch = response.match(/(?:CODE QUALITY SCORE|QUALITY SCORE)[:\s]*([0-9]+)/mi)

    const criticalIssues = criticalMatch ? parseIssues(criticalMatch[1]) : []
    const warnings = warningsMatch ? parseIssues(warningsMatch[1]) : []
    const suggestions = suggestionsMatch ? parseIssues(suggestionsMatch[1]) : []
    const codeQualityScore = scoreMatch ? parseInt(scoreMatch[1]) : 75

    // Categorize issues
    const securityIssues = criticalIssues.filter(issue => 
      issue.toLowerCase().includes('security') || 
      issue.toLowerCase().includes('xss') || 
      issue.toLowerCase().includes('injection') ||
      issue.toLowerCase().includes('vulnerability')
    )

    const performanceIssues = warnings.filter(issue => 
      issue.toLowerCase().includes('performance') || 
      issue.toLowerCase().includes('optimization') ||
      issue.toLowerCase().includes('memory') ||
      issue.toLowerCase().includes('algorithm')
    )

    return {
      fixedCode: fixedCode.trim(),
      criticalIssues,
      warnings,
      suggestions,
      codeQualityScore,
      securityIssues,
      performanceIssues,
      totalIssues: criticalIssues.length + warnings.length + suggestions.length,
      analysis: response
    }
  } catch (error) {
    console.error('Error parsing bug detection response:', error)
    return {
      fixedCode: '',
      criticalIssues: ['Error parsing analysis results'],
      warnings: ['Please try again with a smaller code sample'],
      suggestions: ['Check code formatting and syntax'],
      codeQualityScore: 50,
      securityIssues: [],
      performanceIssues: [],
      totalIssues: 3,
      analysis: response
    }
  }
}

// Helper function to parse issues from text
function parseIssues(text: string): string[] {
  if (!text) return []
  
  // Split by common delimiters and clean up
  const issues = text
    .split(/\n\d+\.|\n-|\n\*|\n•/)
    .map(issue => issue.trim())
    .filter(issue => issue.length > 0)
    .filter(issue => !issue.match(/^(Critical|Warning|Suggestion):?$/i))
  
  return issues
}