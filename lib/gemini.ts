import { GoogleGenerativeAI, GenerativeModel, Content, FunctionDeclarationsTool, SchemaType, FunctionDeclaration } from '@google/generative-ai';

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model configuration
const MODEL_NAME = 'gemini-1.5-flash';

// Get the generative model instance
export function getGeminiModel(): GenerativeModel {
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

// System prompts for different user roles
export const SYSTEM_PROMPTS = {
  tenant: `You are Nex, the AI assistant for Next Level Rentals tenant portal. You are helpful, professional, and concise.

You help tenants with:
- Checking rent balance and payment history
- Understanding their lease terms and renewal dates
- Submitting and tracking maintenance requests
- Answering questions about their property and unit

Guidelines:
- Be friendly but professional
- Give concise, actionable answers
- When a tenant wants to take an action (submit maintenance, check balance), use the appropriate function
- If you cannot help with something, offer to connect them with human support
- Never share information about other tenants
- For payment issues or disputes, recommend escalating to human support

The tenant's current data is provided in the context. Use this to give personalized answers.`,

  admin: `You are Nex, the AI assistant for Next Level Rentals admin dashboard. You are data-driven, professional, and efficient.

You help property managers with:
- Portfolio analytics and collection rates
- Tenant information and payment status
- Maintenance request management
- Financial insights and reporting

Guidelines:
- Provide data-driven, actionable insights
- Be concise and focus on key metrics
- When asked about specific tenants or properties, use the appropriate function to get details
- For complex financial decisions, recommend consulting with the property owner
- Prioritize urgent maintenance and overdue payments in responses

The portfolio overview is provided in the context. Use functions to get specific details.`,

  'super-admin': `You are Nex, the AI assistant for Next Level Rentals. You have full system access as a super-admin.

You can help with:
- All tenant and admin capabilities
- System-wide reporting and analytics
- Cross-property insights
- User management questions

Be thorough, accurate, and professional. You have access to all data in the system.`
};

// Convert chat history to Gemini format
export function formatChatHistory(messages: { role: string; content: string }[]): Content[] {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}

// Build the function declarations for Gemini
export function buildFunctionDeclarations(role: 'tenant' | 'admin' | 'super-admin'): FunctionDeclarationsTool {
  const tenantFunctions = [
    {
      name: 'submit_maintenance_request',
      description: 'Submit a new maintenance request for the tenant\'s unit',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Brief summary of the issue (e.g., "Leaky faucet", "AC not working")'
          },
          description: {
            type: SchemaType.STRING,
            description: 'Detailed description of the maintenance issue'
          },
          priority: {
            type: SchemaType.STRING,
            description: 'Priority level of the request',
            enum: ['low', 'medium', 'high', 'urgent']
          },
          category: {
            type: SchemaType.STRING,
            description: 'Category of the maintenance issue',
            enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other']
          }
        },
        required: ['title', 'description', 'priority', 'category']
      }
    },
    {
      name: 'check_payment_status',
      description: 'Get the current rent payment status, balance due, and recent payment history'
    },
    {
      name: 'get_lease_details',
      description: 'Get lease terms, start/end dates, and renewal information'
    },
    {
      name: 'get_payment_history',
      description: 'Get detailed payment history for the tenant',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          months: {
            type: SchemaType.NUMBER,
            description: 'Number of months of history to retrieve (default: 6)'
          }
        }
      }
    },
    {
      name: 'escalate_to_human',
      description: 'Connect the tenant with human support for issues the AI cannot resolve',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of why human support is needed'
          }
        },
        required: ['reason']
      }
    }
  ];

  const adminFunctions = [
    {
      name: 'get_portfolio_summary',
      description: 'Get overall portfolio statistics including properties, tenants, and collection rates'
    },
    {
      name: 'get_overdue_tenants',
      description: 'Get a list of tenants with overdue rent payments'
    },
    {
      name: 'get_tenant_details',
      description: 'Get detailed information about a specific tenant',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          tenantId: {
            type: SchemaType.STRING,
            description: 'The tenant\'s user ID'
          },
          tenantName: {
            type: SchemaType.STRING,
            description: 'Search for tenant by name (if ID is not known)'
          }
        }
      }
    },
    {
      name: 'get_maintenance_queue',
      description: 'Get maintenance requests, optionally filtered by priority or status',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          priority: {
            type: SchemaType.STRING,
            description: 'Filter by priority level',
            enum: ['urgent', 'high', 'medium', 'low']
          },
          status: {
            type: SchemaType.STRING,
            description: 'Filter by status',
            enum: ['submitted', 'in_progress', 'completed', 'cancelled']
          }
        }
      }
    },
    {
      name: 'get_property_rent_status',
      description: 'Get rent payment status for all properties or a specific property',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          propertyId: {
            type: SchemaType.STRING,
            description: 'Specific property ID (optional - omit for all properties)'
          }
        }
      }
    }
  ];

  // Build function list based on role
  // Using the Gemini SDK's expected function declaration format
  let functions: FunctionDeclaration[] = [];

  if (role === 'tenant') {
    functions = tenantFunctions as FunctionDeclaration[];
  } else if (role === 'admin' || role === 'super-admin') {
    // Admins get admin functions plus escalation
    const adminEscalation: FunctionDeclaration = {
      name: 'escalate_to_human',
      description: 'Mark this conversation for follow-up by a team member',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          reason: {
            type: SchemaType.STRING,
            description: 'Note about why this needs follow-up'
          }
        },
        required: ['reason']
      }
    };
    functions = [...(adminFunctions as FunctionDeclaration[]), adminEscalation];
  }

  return {
    functionDeclarations: functions
  };
}

// Generate a chat response with function calling support
export async function generateChatResponse(
  systemPrompt: string,
  context: string,
  history: Content[],
  userMessage: string,
  functions: FunctionDeclarationsTool
): Promise<{
  text: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}> {
  const model = getGeminiModel();

  // Build the full prompt with context
  const fullSystemPrompt = `${systemPrompt}\n\nCurrent context:\n${context}`;

  // Create the chat session
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: `System: ${fullSystemPrompt}` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I\'m Nex, ready to help. How can I assist you today?' }]
      },
      ...history
    ],
    tools: [functions]
  });

  // Send the user message
  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  // Check for function calls
  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const fc = functionCalls[0];
    return {
      text: response.text() || '',
      functionCall: {
        name: fc.name,
        args: fc.args as Record<string, unknown>
      }
    };
  }

  return {
    text: response.text()
  };
}

// Generate response after function execution
export async function generateFunctionResultResponse(
  systemPrompt: string,
  context: string,
  history: Content[],
  functionName: string,
  functionResult: string
): Promise<string> {
  const model = getGeminiModel();

  const fullSystemPrompt = `${systemPrompt}\n\nCurrent context:\n${context}`;

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: `System: ${fullSystemPrompt}` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I\'m Nex, ready to help.' }]
      },
      ...history
    ]
  });

  // Send the function result as context for the response
  const result = await chat.sendMessage(
    `The ${functionName} function was executed. Here is the result:\n\n${functionResult}\n\nPlease provide a natural, helpful response to the user based on this result.`
  );

  return result.response.text();
}
