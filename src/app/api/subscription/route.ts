import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBService, SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/aws'
import { CognitoAuthService } from '@/lib/aws'

export async function POST(request: NextRequest) {
  try {
    const { userId, plan, billingCycle = 'monthly', paymentMethod } = await request.json()

    if (!userId || !plan) {
      return NextResponse.json({ error: 'User ID and plan are required' }, { status: 400 })
    }

    if (!SUBSCRIPTION_PLANS[plan as SubscriptionPlan]) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Verify user exists
    const user = await CognitoAuthService['getUserFromDB'](userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as SubscriptionPlan]
    const price = billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price

    // Calculate period dates
    const now = new Date()
    const currentPeriodStart = now.toISOString()
    const currentPeriodEnd = new Date(now.setMonth(now.getMonth() + (billingCycle === 'yearly' ? 12 : 1))).toISOString()

    // Create subscription
    const subscription = await DynamoDBService.createSubscription({
      userId,
      plan,
      status: 'active',
      tokensAllowed: planConfig.tokensAllowed,
      tokensUsed: 0,
      tokensRemaining: planConfig.tokensAllowed,
      price,
      currency: 'USD',
      billingCycle,
      paystackEmail: paymentMethod?.type === 'paystack' ? paymentMethod.email : null,
      googlePayToken: paymentMethod?.type === 'google_pay' ? paymentMethod.token : null,
      currentPeriodStart,
      currentPeriodEnd
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
    const subscription = await DynamoDBService.getSubscription(userId)

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get usage statistics
    const usageLogs = await DynamoDBService.getUsageLogs(userId, 100)

    // Calculate usage statistics
    const usageStats = usageLogs.reduce((acc: any, log) => {
      const key = `${log.operation}_${log.requestType}`
      if (!acc[key]) {
        acc[key] = { count: 0, tokensUsed: 0, avgResponseTime: 0, responseTimes: [] }
      }
      acc[key].count++
      acc[key].tokensUsed += log.tokensUsed
      acc[key].responseTimes.push(log.responseTime)
      return acc
    }, {})

    // Calculate averages
    Object.keys(usageStats).forEach(key => {
      const stats = usageStats[key]
      stats.avgResponseTime = stats.responseTimes.reduce((a: number, b: number) => a + b, 0) / stats.responseTimes.length
      delete stats.responseTimes
    })

    return NextResponse.json({
      subscription: {
        ...subscription,
        planConfig: SUBSCRIPTION_PLANS[subscription.plan as SubscriptionPlan]
      },
      usageStats,
      recentUsage: usageLogs.slice(0, 50),
      isNearLimit: subscription.tokensUsed / subscription.tokensAllowed > 0.8,
      daysRemaining: Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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

    const subscription = await DynamoDBService.getSubscription(userId)

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'cancel':
        updateData = {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
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

    const updatedSubscription = await DynamoDBService.updateSubscription(userId, updateData)

    return NextResponse.json({ subscription: updatedSubscription })

  } catch (error: any) {
    console.error('Subscription Update Error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
      { status: 500 }
    )
  }
}