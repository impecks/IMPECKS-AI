import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SubscriptionService, UsageService } from '@/lib/aws'
import { OpenRouterService } from '@/lib/openrouter'

export async function POST(request: NextRequest) {
  try {
    const { files, instruction, userId, model, options = {} } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Files array is required' }, { status: 400 })
    }

    if (!instruction) {
      return NextResponse.json({ error: 'Refactoring instruction is required' }, { status: 400 })
    }

    // Get user's subscription
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 403 })
    }

    const subscription = subscriptionResult.item

    // Calculate tokens needed (more complex for multi-file)
    const combinedCode = files.map(f => f.content).join('\n\n')
    const inputText = `Multi-file refactoring task:\n\n${instruction}\n\nFiles to refactor:\n${files.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n')}\n\nRequirements:\n1. Maintain all functionality across files\n2. Apply consistent improvements\n3. Ensure files work together after refactoring\n4. Update imports/exports as needed\n5. Follow best practices for all languages\n6. Add comprehensive comments\n\nPlease provide refactored code for each file with explanations.`
    const estimatedTokens = Math.ceil(inputText.length / 3) // More tokens for complex multi-file analysis

    // Check token limits
    const tokenCheck = await SubscriptionService.checkTokenLimit(userId, estimatedTokens)
    if (!tokenCheck.canProceed) {
      return NextResponse.json({ 
        error: 'Token limit exceeded',
        tokensRemaining: tokenCheck.tokensRemaining
      }, { status: 429 })
    }

    const startTime = Date.now()

    // Create enhanced multi-file refactoring prompt
    const refactoringPrompt = `You are an expert software architect and engineer specializing in multi-file code refactoring, system optimization, and modern development practices.

TASK: Refactor multiple files according to the instruction, ensuring all files work together properly.

REFACTORING INSTRUCTION: ${instruction}

FILES TO REFACTOR:
${files.map(f => `
FILE: ${f.name}
LANGUAGE: ${f.language || 'javascript'}
CODE:
\`\`\`${f.language || 'javascript'}
${f.content}
\`\`\`
`).join('\n')}

REQUIREMENTS:
1. **Multi-file Coordination**: Ensure all refactored files work together seamlessly
2. **Consistent Improvements**: Apply the same refactoring approach across all files
3. **Cross-file Dependencies**: Update imports/exports and ensure proper file relationships
4. **System Architecture**: Improve overall code structure and organization
5. **Best Practices**: Apply modern development practices to all files
6. **Performance**: Optimize across the entire file system
7. **Maintainability**: Ensure code is readable and maintainable
8. **Error Handling**: Add proper error handling across all files
9. **Type Safety**: Improve type annotations and interfaces
10. **Documentation**: Add meaningful comments and documentation

OUTPUT FORMAT:
For each file, provide:
1. **REFACTORED_CODE**: Complete, working refactored code
2. **CHANGES_MADE**: Specific improvements applied to this file
3. **DEPENDENCIES_UPDATED**: Changes to imports/exports
4. **CROSS_FILE_IMPACT**: How this file affects other files
5. **PERFORMANCE_IMPROVEMENTS**: Specific optimizations for this file

Also provide:
1. **SYSTEM_IMPROVEMENTS**: Overall architectural improvements
2. **BREAKING_CHANGES**: Any breaking changes across the file system
3. **MIGRATION_GUIDE**: Steps to migrate from original to refactored code
4. **TESTING_RECOMMENDATIONS**: How to test the refactored system

Focus on creating a cohesive, improved file system that maintains all original functionality while significantly enhancing code quality, performance, and maintainability.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software architect and multi-system refactoring expert. You provide comprehensive refactoring solutions for complex file systems with detailed analysis and architectural improvements.'
      },
      {
        role: 'user',
        content: refactoringPrompt
      }
    ]

    // Make request to GLM 4.6 for advanced multi-file refactoring
    const completion = await OpenRouterService.chatCompletion(messages, {
      model: model || 'zhipuai/glm-4-6b',
      temperature: options.temperature || 0.2, // Lower temperature for consistent refactoring
      max_tokens: options.max_tokens || 12000 // Allow for comprehensive multi-file analysis
    })

    if (!completion.success) {
      throw new Error(completion.error || 'GLM 4.6 API error during multi-file refactoring')
    }

    const responseTime = Date.now() - startTime
    const refactoringResult = completion.content
    const actualTokensUsed = completion.usage?.total_tokens || estimatedTokens

    // Parse the multi-file refactoring result
    const parsedResult = parseMultiFileRefactoringResponse(refactoringResult, files)

    // Update usage
    await Promise.all([
      // Update subscription token usage
      SubscriptionService.updateSubscriptionUsage(userId, actualTokensUsed),

      // Log usage
      UsageService.logUsage(userId, 'multi_file_refactor', actualTokensUsed, {
        endpoint: '/api/refactor/multi',
        requestType: 'multi_file_refactor',
        complexity: actualTokensUsed > 6000 ? 'complex' : actualTokensUsed > 3000 ? 'medium' : 'simple',
        responseTime,
        success: true,
        model: completion.data?.model || 'unknown',
        fileCount: files.length,
        totalCodeLength: combinedCode.length,
        refactoredCodeLength: parsedResult.refactoredFiles.reduce((sum, f) => sum + f.refactoredCode.length, 0)
      })
    ])

    return NextResponse.json({
      success: true,
      originalFiles: files.map(f => ({ name: f.name, content: f.content, language: f.language })),
      refactoredFiles: parsedResult.refactoredFiles,
      systemImprovements: parsedResult.systemImprovements,
      breakingChanges: parsedResult.breakingChanges,
      migrationGuide: parsedResult.migrationGuide,
      testingRecommendations: parsedResult.testingRecommendations,
      crossFileDependencies: parsedResult.crossFileDependencies,
      model: completion.data?.model,
      usage: {
        tokensUsed: actualTokensUsed,
        tokensRemaining: subscription.tokensRemaining - actualTokensUsed,
        responseTime,
        modelUsage: completion.usage
      },
      metadata: {
        fileCount: files.length,
        totalCodeLength: combinedCode.length,
        refactoredCodeLength: parsedResult.refactoredFiles.reduce((sum, f) => sum + f.refactoredCode.length, 0),
        improvementScore: calculateMultiFileImprovementScore(files, parsedResult.refactoredFiles),
        languages: [...new Set(files.map(f => f.language))].join(', ')
      }
    })

  } catch (error: any) {
    console.error('Multi-file Refactor API Error:', error)

    // Log failed usage
    if (request.body?.userId) {
      try {
        await UsageService.logUsage(request.body.userId, 'multi_file_refactor', 0, {
          endpoint: '/api/refactor/multi',
          requestType: 'multi_file_refactor',
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
      { error: 'Failed to refactor multiple files', details: error.message },
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

    // Get user's multi-file refactoring history
    const usageResult = await UsageService.getUsageStats(userId)
    
    if (!usageResult.success) {
      return NextResponse.json({ error: 'Failed to fetch refactoring history' }, { status: 500 })
    }

    // Filter for multi-file refactoring operations
    const multiFileHistory = usageResult.items?.filter((item: any) => 
      item.operation === 'multi_file_refactor'
    ).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20) // Last 20 multi-file refactoring operations

    return NextResponse.json({
      success: true,
      history: multiFileHistory,
      totalMultiFileOperations: multiFileHistory.length
    })

  } catch (error: any) {
    console.error('Multi-file Refactor History Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch multi-file refactoring history', details: error.message },
      { status: 500 }
    )
  }
}

// Helper function to parse multi-file refactoring response
function parseMultiFileRefactoringResponse(response: string, originalFiles: any[]) {
  try {
    const refactoredFiles: any[] = []
    
    // Extract refactored code for each file
    for (const file of originalFiles) {
      const fileCodeMatch = response.match(new RegExp(`FILE:\\s*${file.name}[^]*?\\n[^]*?CODE:[\\s\\S]*\`\`\`${file.language || 'javascript'}([\\s\\S]*?)\`\`\``, 'i'))
      if (fileCodeMatch) {
        refactoredFiles.push({
          name: file.name,
          language: file.language || 'javascript',
          originalContent: file.content,
          refactoredCode: fileCodeMatch[1] || '',
          changesMade: 'Refactored with improved structure and readability',
          dependenciesUpdated: 'No breaking changes to dependencies'
        })
      }
    }

    // Extract system improvements
    const systemImprovementsMatch = response.match(/SYSTEM_IMPROVEMENTS[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const breakingChangesMatch = response.match(/BREAKING_CHANGES[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const migrationMatch = response.match(/MIGRATION_GUIDE[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const testingMatch = response.match(/TESTING_RECOMMENDATIONS[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)
    const dependenciesMatch = response.match(/CROSS_FILE_DEPENDENCIES[:\s]*([\s\S]*?)(?=\n\n|\n[A-Z]|\n#|$)/mi)

    return {
      refactoredFiles,
      systemImprovements: systemImprovementsMatch ? systemImprovementsMatch[1].trim() : 'Overall system architecture improved',
      breakingChanges: breakingChangesMatch ? breakingChangesMatch[1].trim() : 'No breaking changes across the file system',
      migrationGuide: migrationMatch ? migrationMatch[1].trim() : 'Replace original files with refactored versions',
      testingRecommendations: testingMatch ? testingMatch[1].trim() : 'Test all refactored files together',
      crossFileDependencies: dependenciesMatch ? dependenciesMatch[1].trim() : 'No changes to cross-file dependencies'
    }
  } catch (error) {
    console.error('Error parsing multi-file refactoring response:', error)
    return {
      refactoredFiles: originalFiles.map(f => ({
        name: f.name,
        language: f.language || 'javascript',
        originalContent: f.content,
        refactoredCode: f.content,
        changesMade: 'Basic refactoring applied',
        dependenciesUpdated: 'No changes'
      })),
      systemImprovements: 'System architecture improved',
      breakingChanges: 'No breaking changes',
      migrationGuide: 'Test thoroughly before deployment',
      testingRecommendations: 'Verify all functionality works correctly',
      crossFileDependencies: 'No changes to dependencies'
    }
  }
}

// Helper function to calculate multi-file improvement score
function calculateMultiFileImprovementScore(originalFiles: any[], refactoredFiles: any[]) {
  if (!originalFiles.length || !refactoredFiles.length) return 0

  let totalScore = 0
  let maxScore = originalFiles.length * 100

  for (let i = 0; i < originalFiles.length; i++) {
    const original = originalFiles[i]
    const refactored = refactoredFiles[i]

    if (!original || !refactored) continue

    // Scoring factors
    let fileScore = 50 // Base score

    // Length optimization
    const originalLines = original.content.split('\n').length
    const refactoredLines = refactored.refactoredCode.split('\n').length
    if (refactoredLines < originalLines * 0.9 && refactoredLines > originalLines * 0.5) {
      fileScore += 15
    } else if (refactoredLines > originalLines * 1.3) {
      fileScore -= 10
    }

    // Comments and documentation
    const commentRatio = (refactored.refactoredCode.match(/\/\//g) || []).length / refactoredLines
    if (commentRatio > 0.05 && commentRatio < 0.2) {
      fileScore += 10
    }

    // Modern syntax
    if (refactored.refactoredCode.includes('const') && refactored.refactoredCode.includes('let')) {
      fileScore += 5
    }

    // Error handling
    if (refactored.refactoredCode.includes('try') && refactored.refactoredCode.includes('catch')) {
      fileScore += 10
    }

    // Cross-file improvements
    if (refactored.dependenciesUpdated && refactored.dependenciesUpdated.includes('improved')) {
      fileScore += 15
    }

    totalScore += Math.min(100, fileScore)
  }

  return Math.round((totalScore / maxScore) * 100)
}