import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/shared/store/authStore'

function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [userId, setUserId] = useState('kdy987')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function appendNum(n: string) {
    if (password.length >= 4) return
    setPassword((p) => p + n)
    setLoginError('')
  }
  function backspace() { setPassword((p) => p.slice(0, -1)) }
  function clearPw() { setPassword(''); setLoginError('') }

  async function handleLogin() {
    if (password.length === 0) return
    setIsLoading(true)
    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string; userNm: string }>('/auth/login', {
        userId,
        userPw: password,
      })
      setTokens(res.accessToken, res.refreshToken, userId, res.userNm)
      navigate('/')
    } catch {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setPassword('')
    } finally {
      setIsLoading(false)
    }
  }

  const isReady = password.length > 0 && !isLoading

  return (
    <div className="bg-gray-100 min-h-screen flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-md">
        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-2xl font-bold text-center mb-4">PCMS</h3>

          {/* 에러 */}
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <span>⚠️</span><span>{loginError}</span>
            </div>
          )}

          {/* 아이디 */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">👤 사용자 아이디</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 disabled:opacity-50"
            />
          </div>

          {/* 비밀번호 */}
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">🔒 비밀번호</label>
            <div className="flex">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                readOnly
                placeholder="••••"
                className="flex-1 h-11 px-4 border border-gray-300 rounded-l-lg text-center text-xl font-bold tracking-[8px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                className="w-11 h-11 border border-l-0 border-gray-300 rounded-r-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* 숫자 키패드 - 3열 */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => appendNum(String(n))}
                  disabled={isLoading || password.length >= 4}
                  className="h-14 rounded-xl text-xl font-bold text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all"
                  style={{ backgroundColor: '#a8d8f0' }}
                >
                  {n}
                </button>
              ))}
              {/* 백스페이스 */}
              <button
                type="button"
                onClick={backspace}
                disabled={isLoading || password.length === 0}
                className="h-14 rounded-xl text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all"
                style={{ backgroundColor: '#ffd699', color: '#6b5200' }}
              >
                ⌫
              </button>
              {/* 0 */}
              <button
                type="button"
                onClick={() => appendNum('0')}
                disabled={isLoading || password.length >= 4}
                className="h-14 rounded-xl text-xl font-bold text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all"
                style={{ backgroundColor: '#a8d8f0' }}
              >
                0
              </button>
              {/* 클리어 */}
              <button
                type="button"
                onClick={clearPw}
                disabled={isLoading || password.length === 0}
                className="h-14 rounded-xl text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all"
                style={{ backgroundColor: '#ffb3ba', color: '#6b1a1f' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleLogin}
              disabled={!isReady}
              className={`w-full h-12 rounded-xl text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isReady
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-200 animate-pulse'
                  : 'bg-blue-500'
              }`}
            >
              {isLoading ? '⏳ 로그인 중...' : '🔑 로그인'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">© 2025 KimDoYoung 모든 권리 보유.</p>
      </div>
    </div>
  )
}

export default LoginPage
