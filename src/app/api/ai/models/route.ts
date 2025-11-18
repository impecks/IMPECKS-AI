import { NextRequest, NextResponse } from 'next/server'
import { OpenRouterService, AI_MODELS } from '@/lib/openrouter'

export async function GET(request: NextRequest) {
  try {
    // Get available models from OpenRouter
    const modelInfo = await OpenRouterService.getModelInfo()
    
    if (!modelInfo.success) {
      return NextResponse.json(
        { error: 'Failed to fetch model information', details: modelInfo.error },
        { status: 500 }
      )
    }

    // Filter and categorize models
    const availableModels = modelInfo.models.filter((model: any) => 
      model.id && (model.id.includes('glm') || 
      model.id.includes('claude') || 
      model.id.includes('gpt') || 
      model.id.includes('gemini') ||
      model.id.includes('mistral'))
    )

    const categorizedModels = {
      chat: availableModels.filter((model: any) => 
        model.id.includes('chat') || model.id.includes('instruct')
      ),
      code: availableModels.filter((model: any) => 
        model.id.includes('code') || 
        model.id.includes('deepseek') ||
        model.id.includes('codellama')
      ),
      reasoning: availableModels.filter((model: any) => 
        model.id.includes('claude') || 
        model.id.includes('o1') ||
        model.id.includes('reasoning')
      ),
      multimodal: availableModels.filter((model: any) => 
        model.id.includes('vision') || 
        model.id.includes('image') ||
        model.id.includes('multimodal')
      )
    }

    // Model capabilities and pricing
    const modelDetails = availableModels.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      pricing: model.pricing,
      context_length: model.context_length,
      top_provider: model.top_provider,
      architecture: model.architecture,
      modality: model.modality,
      category: model.id.includes('glm') ? 'chat' : 
               model.id.includes('claude') ? 'reasoning' :
               model.id.includes('gpt') ? 'chat' :
               model.id.includes('gemini') ? 'multimodal' : 'general'
    }))

    return NextResponse.json({
      success: true,
      models: modelDetails,
      categories: categorizedModels,
      defaultModels: {
        chat: AI_MODELS.GLM4_6,
        code: AI_MODELS.GLM4_6,
        reasoning: AI_MODELS.CLAUDE3_5_SONNET,
        multimodal: AI_MODELS.GEMINI_PRO
      },
      totalModels: availableModels.length
    })

  } catch (error: any) {
    console.error('Models API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json()

    if (!model) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    // Get specific model information
    const modelInfo = await OpenRouterService.getModelInfo()
    
    if (!modelInfo.success) {
      return NextResponse.json(
        { error: 'Failed to fetch model information', details: modelInfo.error },
        { status: 500 }
      )
    }

    const specificModel = modelInfo.models.find((m: any) => m.id === model)
    
    if (!specificModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      model: {
        id: specificModel.id,
        name: specificModel.name,
        description: specificModel.description,
        pricing: specificModel.pricing,
        context_length: specificModel.context_length,
        top_provider: specificModel.top_provider,
        architecture: specificModel.architecture,
        modality: specificModel.modality,
        capabilities: specificModel.capabilities
      }
    })

  } catch (error: any) {
    console.error('Model Details API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model details', details: error.message },
      { status: 500 }
    )
  }
}