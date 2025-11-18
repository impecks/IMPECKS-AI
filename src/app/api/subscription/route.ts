import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SUBSCRIPTION_PLANS = {
  free: {
    tokensAllowed: 150,
    price: 0,
    features: ['150 daily requests', 'Slow rate limit', 'Educational use only']
  },
  basic: {
    tokensAllowed: 25000,
    price: 6,
    features: ['25,000 monthly tokens', 'Standard speed', 'Small coding tasks']
  },
  starter: {
    tokensAllowed: 60000,
    price: 15,
    features: ['60,000 monthly tokens', 'Medium-sized refactors', 'Test automation']
  },
  pro: {
    tokensAllowed: 150000,
    price: 25,
    features: ['150,000 tokens', 'Multi-file edits', 'Fast inference']
  },
  developer: {
    tokensAllowed: 400000,
    price: 50,
    features: ['400,000 tokens', 'Large codebase support', 'Batch editing']
  },
  team: {
    tokensAllowed: 1000000,
    price: 99,
    features: ['1 million tokens', 'Team collaboration', 'Priority rate limit']
  },
  enterprise: {
    tokensAllowed: 5000000,
    price: 299,
    features: ['5 million tokens', 'Highest speed', 'SLA guarantee']
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, plan, billingCycle = 'monthly', paymentMethod } = await request.json()

    if (!userId || !plan) {
      return NextResponse.json({ error: 'User ID and plan are required' }, { status: 400 })
    }

    if (!SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]
    const price = billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price // 2 months free for yearly

    // Calculate period dates
    const now = new Date()
    const currentPeriodStart = now
    const currentPeriodEnd = new Date(now.setMonth(now.getMonth() + (billingCycle === 'yearly' ? 12 : 1)))

    // Create or update subscription
    const subscription = await db.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'active',
        tokensAllowed: planConfig.tokensAllowed,
        tokensUsed: 0,
        tokensRemaining: planConfig.tokensAllowed,
        price,
        billingCycle,
        currentPeriodStart,
        currentPeriodEnd,
        paystackEmail: paymentMethod?.type === 'paystack' ? paymentMethod.email : null,
        googlePayToken: paymentMethod?.type === 'google_pay' ? paymentMethod.token : null,
        cancelledAt: null,
        updatedAt: new Date()
      },
      create: {
        userId,
        plan,
        status: 'active',
        tokensAllowed: planConfig.tokensAllowed,
        tokensUsed: 0,
        tokensRemaining: planConfig.tokensAllowed,
        price,
        billingCycle,
        currentPeriodStart,
        currentPeriodEnd,
        paystackEmail: paymentMethod?.type === 'paystack' ? paymentMethod.email : null,
        googlePayToken: paymentMethod?.type === 'google_pay' ? paymentMethod.token : null
      }
    })

    return NextResponse.json({
      subscription,
      plan: {
        name: plan,
        price,
        tokensAllowed: planConfig.tokensAllowed,
        features: planConfig.features
      }
    })

  } catch (error: any) {
    console.error('Subscription Creation Error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
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

    // Get user's subscription
    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get usage statistics
    const usageStats = await db.usageLog.groupBy({
      by: ['operation', 'requestType', 'complexity'],
      where: {
        userId,
        createdAt: {
          gte: subscription.currentPeriodStart
        }
      },
      _count: {
        id: true
      },
      _sum: {
        tokensUsed: true
      },
      _avg: {
        responseTime: true
      }
    })

    // Get recent usage logs
    const recentUsage = await db.usageLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
      select: {
        id: true,
        operation: true,
        requestType: true,
        tokensUsed: true,
        responseTime: true,
        success: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      subscription: {
        ...subscription,
        planConfig: SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS]
      },
      usageStats,
      recentUsage,
      isNearLimit: subscription.tokensUsed / subscription.tokensAllowed > 0.8,
      daysRemaining: Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    })

  } catch (error: any) {
    console.error('Subscription Fetch Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 })
    }

    const subscription = await db.subscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'cancel':
        updateData = {
          status: 'cancelled',
          cancelledAt: new Date()
        }
        break

      case 'resume':
        if (subscription.status !== 'cancelled') {
          return NextResponse.json({ error: 'Subscription is not cancelled' }, { status: 400 })
        }
        updateData = {
          status: 'active',
          cancelledAt: null
        }
        break

      case 'reset_usage':
        updateData = {
          tokensUsed: 0,
          tokensRemaining: subscription.tokensAllowed
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updatedSubscription = await db.subscription.update({
      where: { userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ subscription: updatedSubscription })

  } catch (error: any) {
    console.error('Subscription Update Error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
      { status: 500 }
    )
  }
}

// Webhook handler for payment providers
export async function PATCH(request: NextRequest) {
  try {
    const { provider, eventType, data } = await request.json()

    console.log(`Webhook received from ${provider}:`, eventType, data)

    switch (provider) {
      case 'paystack':
        return await handlePaystackWebhook(eventType, data)
      
      case 'google_pay':
        return await handleGooglePayWebhook(eventType, data)
      
      default:
        return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Webhook Error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error.message },
      { status: 500 }
    )
  }
}

async function handlePaystackWebhook(eventType: string, data: any) {
  switch (eventType) {
    case 'charge.success':
      // Find subscription by customer email
      const subscription = await db.subscription.findFirst({
        where: { paystackEmail: data.customer.email }
      })

      if (subscription) {
        await db.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            updatedAt: new Date()
          }
        })
      }
      break

    case 'subscription.disable':
    case 'subscription.not_renew':
      // Handle subscription cancellation
      const cancelledSub = await db.subscription.findFirst({
        where: { paystackEmail: data.customer.email }
      })

      if (cancelledSub) {
        await db.subscription.update({
          where: { id: cancelledSub.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
      break
  }

  return NextResponse.json({ success: true })
}

async function handleGooglePayWebhook(eventType: string, data: any) {
  // Similar logic for Google Pay webhooks
  return NextResponse.json({ success: true })
}