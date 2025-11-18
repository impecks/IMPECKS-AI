import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import jwt from 'jsonwebtoken'

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: string
      email: string
      role: string
    }
    return decoded
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, conversationHistory = [] } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant for a modern web development platform. 
        You help users with Next.js, React, TypeScript, and general web development questions.
        Be friendly, professional, and provide practical advice. The current user is ${user.email}.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ]

    const completion = await zai.chat.completions.create({
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}