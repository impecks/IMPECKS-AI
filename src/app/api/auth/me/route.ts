import { NextRequest, NextResponse } from 'next/server'
import { CognitoAuthService } from '@/lib/aws'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    const result = await CognitoAuthService.verifyToken(token)

    if (result.valid && result.user) {
      return NextResponse.json({
        user: result.user
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Auth me API error:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}