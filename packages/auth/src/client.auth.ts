import {
  type AdminPasswordLoginRequest,
  type AuthGoogleExchangeRequest,
  type AuthLoginRequest,
  type AuthLogoutRequest,
  type AuthMeResponse,
  type AuthRefreshRequest,
  type AuthSessionResponse,
  type StudentGoogleExchangeRequest,
  type StudentPasswordLoginRequest,
  type StudentRegistrationRequest,
  type StudentRegistrationResponse,
  type TeacherGoogleExchangeRequest,
  type TeacherPasswordLoginRequest,
  type TeacherRegistrationRequest,
  type TeacherRegistrationResponse,
  adminPasswordLoginRequestSchema,
  authMeResponseSchema,
  authOperationSuccessSchema,
  authSessionResponseSchema,
  studentGoogleExchangeRequestSchema,
  studentPasswordLoginRequestSchema,
  studentRegistrationRequestSchema,
  studentRegistrationResponseSchema,
  teacherGoogleExchangeRequestSchema,
  teacherPasswordLoginRequestSchema,
  teacherRegistrationRequestSchema,
  teacherRegistrationResponseSchema,
} from "@attendease/contracts"

import { type AuthApiRequest, buildGoogleExchangeRequest } from "./client.core"

export function buildAuthClientAuthMethods(request: AuthApiRequest) {
  const login = (payload: AuthLoginRequest): Promise<AuthSessionResponse> =>
    request("/auth/login", {
      method: "POST",
      payload,
      parse: authSessionResponseSchema.parse,
    })

  const exchangeGoogleIdentity = (
    payload: AuthGoogleExchangeRequest,
  ): Promise<AuthSessionResponse> =>
    request("/auth/google/exchange", {
      method: "POST",
      payload: buildGoogleExchangeRequest(payload),
      parse: authSessionResponseSchema.parse,
    })

  const refresh = (payload: AuthRefreshRequest): Promise<AuthSessionResponse> =>
    request("/auth/refresh", {
      method: "POST",
      payload,
      parse: authSessionResponseSchema.parse,
    })

  const logout = async (token: string, payload: AuthLogoutRequest = {}): Promise<void> => {
    await request("/auth/logout", {
      method: "POST",
      token,
      payload,
      parse: authOperationSuccessSchema.parse,
    })
  }

  const me = (token: string): Promise<AuthMeResponse> =>
    request("/auth/me", {
      method: "GET",
      token,
      parse: authMeResponseSchema.parse,
    })

  return {
    login,
    loginStudent(payload: StudentPasswordLoginRequest): Promise<AuthSessionResponse> {
      return login(studentPasswordLoginRequestSchema.parse(payload))
    },
    loginTeacher(payload: TeacherPasswordLoginRequest): Promise<AuthSessionResponse> {
      return login(teacherPasswordLoginRequestSchema.parse(payload))
    },
    loginAdmin(payload: AdminPasswordLoginRequest): Promise<AuthSessionResponse> {
      return login(adminPasswordLoginRequestSchema.parse(payload))
    },
    registerStudentAccount(
      payload: StudentRegistrationRequest,
    ): Promise<StudentRegistrationResponse> {
      return request("/auth/register/student", {
        method: "POST",
        payload: studentRegistrationRequestSchema.parse(payload),
        parse: studentRegistrationResponseSchema.parse,
      })
    },
    registerTeacherAccount(
      payload: TeacherRegistrationRequest,
    ): Promise<TeacherRegistrationResponse> {
      return request("/auth/register/teacher", {
        method: "POST",
        payload: teacherRegistrationRequestSchema.parse(payload),
        parse: teacherRegistrationResponseSchema.parse,
      })
    },
    exchangeGoogleIdentity,
    exchangeStudentGoogleIdentity(
      payload: StudentGoogleExchangeRequest,
    ): Promise<AuthSessionResponse> {
      return exchangeGoogleIdentity(studentGoogleExchangeRequestSchema.parse(payload))
    },
    exchangeTeacherGoogleIdentity(
      payload: TeacherGoogleExchangeRequest,
    ): Promise<AuthSessionResponse> {
      return exchangeGoogleIdentity(teacherGoogleExchangeRequestSchema.parse(payload))
    },
    refresh,
    logout,
    me,
  }
}
