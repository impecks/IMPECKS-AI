import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, operation = 'chat' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Get user and subscription info
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check subscription limits
    const subscription = user.subscription
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
      db.subscription.update({
        where: { userId },
        data: {
          tokensUsed: subscription.tokensUsed + actualTokensUsed,
          tokensRemaining: subscription.tokensAllowed - (subscription.tokensUsed + actualTokensUsed)
        }
      }),

      // Log usage
      db.usageLog.create({
        data: {
          userId,
          tokensUsed: actualTokensUsed,
          operation,
          endpoint: '/api/ai/chat',
          requestType: 'chat',
          complexity: actualTokensUsed > 1000 ? 'complex' : actualTokensUsed > 500 ? 'medium' : 'simple',
          responseTime,
          success: true
        }
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
        await db.usageLog.create({
          data: {
            userId: request.body.userId,
            tokensUsed: 0,
            operation: request.body.operation || 'chat',
            endpoint: '/api/ai/chat',
            requestType: 'chat',
            complexity: 'simple',
            responseTime: 0,
            success: false,
            errorMessage: error.message
          }
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
    const subscription = await db.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get usage statistics
    const usageStats = await db.usageLog.groupBy({
      by: ['operation'],
      where: {
        userId,
        createdAt: {
          gte: new Date(subscription.currentPeriodStart)
        }
      },
      _count: {
        id: true
      },
      _sum: {
        tokensUsed: true
      }
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