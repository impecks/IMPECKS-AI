import { NextRequest, NextResponse } from 'next/server'
import { CognitoAuthService } from '@/lib/aws'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await CognitoAuthService.signIn(email, password)

    if (result.success) {
      // Set HTTP-only cookie with the token
      const response = NextResponse.json({
        message: 'Login successful',
        user: result.user
      })

      response.cookies.set('auth-token', result.tokens!.IdToken!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 // 1 hour
      })

      return response
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}