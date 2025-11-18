import OpenAI from 'openai'

// OpenRouter Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Initialize OpenAI client for OpenRouter compatibility
const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'X-Title': 'IMPECKS-AI'
  },
  dangerouslyAllowBrowser: true // Only for development
})

// Available Models
export const AI_MODELS = {
  GLM4_6: 'zhipuai/glm-4-6b',
  GLM4_9B: 'zhipuai/glm-4-9b-chat',
  CLAUDE3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  GPT4_TURBO: 'openai/gpt-4-turbo',
  GPT4O: 'openai/gpt-4o',
  GEMINI_PRO: 'google/gemini-pro',
  MISTRAL_LARGE: 'mistralai/mistral-large'
}

// Default model for IMPECKS-AI
const DEFAULT_MODEL = AI_MODELS.GLM4_6

// OpenRouter API Functions
export class OpenRouterService {
  static async chatCompletion(messages: Array<{role: string; content: string}>, options: {
    model?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
  } = {}) {
    try {
      const response = await openrouter.chat.completions.create({
        model: options.model || DEFAULT_MODEL,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        stream: options.stream || false
      })

      return {
        success: true,
        data: response,
        content: response.choices[0]?.message?.content || '',
        usage: response.usage
      }
    } catch (error: any) {
      console.error('OpenRouter API Error:', error)
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      }
    }
  }

  static async codeGeneration(prompt: string, context: string = '', language: string = 'javascript', options: {
    model?: string
    temperature?: number
    max_tokens?: number
  } = {}) {
    const enhancedPrompt = `You are an expert software engineer and AI coding assistant. Generate high-quality, production-ready code based on the following request.

Language: ${language}
Context: ${context}
Request: ${prompt}

Requirements:
- Write clean, maintainable, and well-documented code
- Follow best practices and coding standards
- Include error handling where appropriate
- Use modern syntax and features
- Add comments for complex logic
- Ensure the code is complete and functional

Generate only the code without explanations unless specifically requested.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer and AI coding assistant. You generate clean, efficient, and production-ready code.'
      },
      {
        role: 'user',
        content: enhancedPrompt
      }
    ]

    return await this.chatCompletion(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature || 0.3, // Lower temperature for code generation
      max_tokens: options.max_tokens || 4000
    })
  }

  static async codeRefactoring(code: string, instruction: string, language: string = 'javascript', options: {
    model?: string
    temperature?: number
    max_tokens?: number
  } = {}) {
    const refactoringPrompt = `You are an expert software engineer specializing in code refactoring and optimization. 

Language: ${language}
Current Code:
\`\`\`${language}
${code}
\`\`\`

Refactoring Instruction: ${instruction}

Requirements:
- Maintain the original functionality
- Improve code quality, readability, and performance
- Follow best practices and design patterns
- Add appropriate comments for changes
- Ensure the refactored code is complete and functional

Provide the refactored code only, without explanations unless specifically requested.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer specializing in code refactoring, optimization, and best practices.'
      },
      {
        role: 'user',
        content: refactoringPrompt
      }
    ]

    return await this.chatCompletion(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature || 0.2, // Very low temperature for refactoring
      max_tokens: options.max_tokens || 4000
    })
  }

  static async bugDetection(code: string, language: string = 'javascript', options: {
    model?: string
    temperature?: number
    max_tokens?: number
  } = {}) {
    const bugPrompt = `You are an expert software engineer specializing in bug detection and code analysis.

Language: ${language}
Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Analyze the code for:
- Syntax errors
- Logic errors
- Performance issues
- Security vulnerabilities
- Best practices violations
- Potential runtime errors

Provide a detailed analysis with:
1. List of identified issues
2. Severity level (Critical/High/Medium/Low)
3. Line numbers where issues occur
4. Suggested fixes for each issue
5. Improved version of the code with fixes applied

Be thorough and provide actionable feedback.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer specializing in code analysis, bug detection, and security auditing.'
      },
      {
        role: 'user',
        content: bugPrompt
      }
    ]

    return await this.chatCompletion(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature || 0.4,
      max_tokens: options.max_tokens || 3000
    })
  }

  static async documentationGeneration(code: string, language: string = 'javascript', options: {
    model?: string
    temperature?: number
    max_tokens?: number
  } = {}) {
    const docPrompt = `You are an expert technical writer and software engineer. Generate comprehensive documentation for the following code.

Language: ${language}
Code:
\`\`\`${language}
${code}
\`\`\`

Generate documentation that includes:
1. Overview/Purpose of the code
2. Function/method descriptions with parameters
3. Return value explanations
4. Usage examples
5. Important notes or considerations
6. Dependencies or requirements

Format the documentation in Markdown with proper headings, code examples, and clear explanations.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class technical writer and software engineer specializing in code documentation and API documentation.'
      },
      {
        role: 'user',
        content: docPrompt
      }
    ]

    return await this.chatCompletion(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature || 0.5,
      max_tokens: options.max_tokens || 2500
    })
  }

  static async performanceOptimization(code: string, language: string = 'javascript', options: {
    model?: string
    temperature?: number
    max_tokens?: number
  } = {}) {
    const optimizationPrompt = `You are an expert software engineer specializing in performance optimization.

Language: ${language}
Code to optimize:
\`\`\`${language}
${code}
\`\`\`

Analyze and optimize the code for:
- Time complexity improvements
- Space complexity reductions
- Algorithm efficiency
- Memory usage optimization
- Caching opportunities
- Parallel processing potential
- Database query optimization (if applicable)

Provide:
1. Analysis of current performance bottlenecks
2. Specific optimization recommendations
3. Optimized version of the code
4. Performance improvement estimates
5. Trade-offs and considerations

Focus on practical optimizations that maintain code readability.`

    const messages = [
      {
        role: 'system',
        content: 'You are a world-class software engineer specializing in performance optimization, algorithm analysis, and system efficiency.'
      },
      {
        role: 'user',
        content: optimizationPrompt
      }
    ]

    return await this.chatCompletion(messages, {
      model: options.model || DEFAULT_MODEL,
      temperature: options.temperature || 0.3,
      max_tokens: options.max_tokens || 3500
    })
  }

  static async getModelInfo(model?: string) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          models: data.data
        }
      } else {
        throw new Error('Failed to fetch model information')
      }
    } catch (error: any) {
      console.error('OpenRouter Model Info Error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async getUsageStats() {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/usage`, {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          usage: data.data
        }
      } else {
        throw new Error('Failed to fetch usage statistics')
      }
    } catch (error: any) {
      console.error('OpenRouter Usage Stats Error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export {
  openrouter,
  OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL,
  AI_MODELS,
  DEFAULT_MODEL
}