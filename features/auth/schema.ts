import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'กรุณากรอกชื่อผู้ใช้หรืออีเมล'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
});

export type LoginInput = z.infer<typeof loginSchema>;
