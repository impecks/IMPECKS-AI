import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionService, DynamoDBService } from '@/lib/aws'

const SUBSCRIPTION_PLANS = {
  free: { tokensAllowed: 150, price: 0 },
  basic: { tokensAllowed: 25000, price: 6 },
  starter: { tokensAllowed: 60000, price: 15 },
  pro: { tokensAllowed: 150000, price: 25 },
  developer: { tokensAllowed: 400000, price: 50 },
  team: { tokensAllowed: 1000000, price: 99 },
  enterprise: { tokensAllowed: 5000000, price: 299 }
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

    // Create subscription using AWS DynamoDB
    const result = await SubscriptionService.createSubscription(userId, plan, billingCycle)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create subscription', details: result.error },
        { status: 500 }
      )
    }

    const planConfig = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]

    return NextResponse.json({
      subscription: {
        userId,
        plan,
        status: 'active',
        tokensAllowed: planConfig.tokensAllowed,
        tokensUsed: 0,
        tokensRemaining: planConfig.tokensAllowed,
        price: billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price,
        billingCycle
      },
      plan: {
        name: plan,
        price: billingCycle === 'yearly' ? planConfig.price * 10 : planConfig.price,
        tokensAllowed: planConfig.tokensAllowed
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

    // Get user's subscription from DynamoDB
    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const subscription = subscriptionResult.item

    return NextResponse.json({
      subscription: {
        ...subscription,
        planConfig: SUBSCRIPTION_PLANS[subscription.plan as keyof typeof SUBSCRIPTION_PLANS]
      }
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

    const subscriptionResult = await SubscriptionService.getSubscription(userId)
    if (!subscriptionResult.success) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    let updateExpression = ''
    let expressionAttributeValues: any = {}

    switch (action) {
      case 'cancel':
        updateExpression = 'SET #status = :status, cancelledAt = :cancelledAt'
        expressionAttributeValues = {
          ':status': 'cancelled',
          ':cancelledAt': new Date().toISOString()
        }
        break

      case 'resume':
        updateExpression = 'SET #status = :status, cancelledAt = :cancelledAt'
        expressionAttributeValues = {
          ':status': 'active',
          ':cancelledAt': null
        }
        break

      case 'reset_usage':
        updateExpression = 'SET tokensUsed = :tokensUsed, tokensRemaining = :tokensRemaining'
        expressionAttributeValues = {
          ':tokensUsed': 0,
          ':tokensRemaining': subscriptionResult.item.tokensAllowed
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await DynamoDBService.updateItem(
      'impecks-subscriptions',
      { userId },
      updateExpression,
      expressionAttributeValues
    )

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update subscription', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ subscription: result.item })

  } catch (error: any) {
    console.error('Subscription Update Error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
      { status: 500 }
    )
  }
}