import { MessageToUser, UserMessageTypes } from '../../shared/types'

declare global {
  function request(data: UserMessageTypes): void
  function request(data: UserMessageTypes, awaitResponse: true): Promise<MessageToUser>

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  export interface WebSocket { request: typeof request }
}
