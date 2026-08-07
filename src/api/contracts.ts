export type SessionPersistence = 'durable' | 'ephemeral'
export type MessageRole = 'user' | 'assistant' | 'tool'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'failed'

export interface ApiErrorPayload {
  error: string
}

export interface PingResponse {
  message: string
}

export interface OAuthTokenRequest {
  code: string
  state: string
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface CreateSessionResponse {
  session_id: string
  persistence: SessionPersistence
}

export interface ToolCallFunction {
  name: string
  arguments: string
}

export interface ToolCall {
  id: string
  type?: string
  function: ToolCallFunction
}

export interface SessionMessage {
  id: string
  session_id: string
  run_id: string
  sequence: number
  role: MessageRole
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tool_name?: string
  reasoning_content?: string
  response_id?: string
  response_cache_expires_at?: number
  created_at: string
}

export interface SessionMessagesResponse {
  messages: SessionMessage[]
}

export interface TaskItem {
  id: string
  desc: string
  status: TaskStatus
}

export interface TaskPlan {
  session_id: string
  revision: number
  tasks: TaskItem[]
  updated_at: string
}

export interface SessionTaskPlanResponse {
  plan: TaskPlan | null
}

export interface RunStartedData {
  message: string
}

export interface AgentStatusData {
  phase: string
  message: string
}

export interface AssistantTextData {
  text: string
}

export interface ToolCallStartedData {
  call_id: string
  tool: string
  display_name: string
  arguments: string
}

export interface ToolCallCompletedData {
  call_id: string
  tool: string
  duration_ms: number
  result: string
}

export interface ToolCallFailedData {
  call_id: string
  tool: string
  duration_ms: number
  code: string
  message: string
}

export interface TaskPlanUpdatedData {
  action: string
  revision: number
  tasks: TaskItem[]
}

export interface RunCompletedData {
  duration_ms: number
}

export interface RunFailedData {
  code: string
  message: string
}

export interface AgentEventEnvelope<TType extends string, TData> {
  type: TType
  run_id: string
  session_id?: string
  seq: number
  occurred_at: string
  data: TData
}

export type AgentEvent =
  | AgentEventEnvelope<'run.started', RunStartedData>
  | AgentEventEnvelope<'agent.status', AgentStatusData>
  | AgentEventEnvelope<'assistant.reasoning', AssistantTextData>
  | AgentEventEnvelope<'assistant.delta', AssistantTextData>
  | AgentEventEnvelope<'tool.call.started', ToolCallStartedData>
  | AgentEventEnvelope<'tool.call.completed', ToolCallCompletedData>
  | AgentEventEnvelope<'tool.call.failed', ToolCallFailedData>
  | AgentEventEnvelope<'task_plan.updated', TaskPlanUpdatedData>
  | AgentEventEnvelope<'run.completed', RunCompletedData>
  | AgentEventEnvelope<'run.failed', RunFailedData>

export type AgentEventType = AgentEvent['type']

export interface SendMessageRequest {
  message: string
}
