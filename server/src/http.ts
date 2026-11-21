import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const handleHttpError: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) return next(error)
  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message })
  } else if (error instanceof ZodError) {
    response.status(400).json({ message: 'Dữ liệu không hợp lệ.', fields: error.flatten().fieldErrors })
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    response.status(409).json({ message: 'Mã hoặc thông tin định danh đã được sử dụng.' })
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    response.status(404).json({ message: 'Không tìm thấy bản ghi.' })
  } else if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ message: 'Nội dung JSON không hợp lệ.' })
  } else {
    console.error('API error:', error instanceof Error ? error.name : 'UnknownError')
    response.status(500).json({ message: 'Máy chủ chưa xử lý được yêu cầu.' })
  }
}
