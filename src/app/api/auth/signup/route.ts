import { NextRequest, NextResponse } from 'next/server'
import { CognitoAuthService } from '@/lib/aws'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await CognitoAuthService.signUp(email, password, name)

    if (result.success) {
      return NextResponse.json({
        message: 'User created successfully',
        user: result.user
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}