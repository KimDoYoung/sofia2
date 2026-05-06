import { create } from 'zustand'

export type StatusType = 'info' | 'error' | 'success' | 'warning'

interface StatusState {
  message: string
  type: StatusType
  setMessage: (msg: string, type?: StatusType) => void
}

export const useStatusStore = create<StatusState>((set) => ({
  message: '서버에 안정적으로 연결되었습니다. 실시간 시세 데이터 스트리밍 중입니다.',
  type: 'info',
  setMessage: (message, type = 'info') => set({ message, type })
}))

/**
 * React 컴포넌트 외부(API Interceptor, WebSocket 등)에서도 
 * 상태바 메시지를 변경할 수 있게 해주는 전역 함수입니다.
 */
export const setStatusMessage = (msg: string, type: StatusType = 'info') => {
  useStatusStore.getState().setMessage(msg, type)
}
