import { z } from 'zod';

/**
 * Caracteres estritamente proibidos por motivos de segurança e injeção:
 * aspas simples ('), aspas duplas ("), igual (=), acento agudo (´), crase (`).
 */
export const FORBIDDEN_PASSWORD_CHARS = ["'", '"', '=', '´', '`'];

/**
 * Conjunto de caracteres especiais permitidos (excluindo os proibidos):
 * ! @ # $ % ^ & * ( ) _ + - [ ] { } | ; : , . < > ?
 */
export const ALLOWED_SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-[\]{}|;:,.<>?]/;

/**
 * Top senhas vulneráveis e comuns bloqueadas preventivamente.
 */
export const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'admin123',
  'qwerty12345',
  'pass@1234567',
  'tester@12345',
  'analyst@12345',
  'master@12345',
  'qaexecution123',
]);

/**
 * Schema estrito de Senha Forte em conformidade com NIST SP 800-63B e requisitos do TMS:
 * - Mínimo de 12 e máximo de 128 caracteres;
 * - Pelo menos 1 letra maiúscula [A-Z];
 * - Pelo menos 1 letra minúscula [a-z];
 * - Pelo menos 1 número [0-9];
 * - Pelo menos 1 caractere especial permitido [!@#$%^&*()_+\-[\]{}|;:,.<>?];
 * - Proibido qualquer espaçamento (espaços em branco, tabs);
 * - Proibido o uso de caracteres inseguros: ', ", =, ´, `;
 * - Bloqueio contra dicionário de senhas fracas.
 */
export const strongPasswordSchema = z
  .string()
  .min(12, 'A senha deve conter no mínimo 12 caracteres.')
  .max(128, 'A senha não pode exceder 128 caracteres.')
  .refine((val) => !/\s/.test(val), {
    message: 'A senha não pode conter espaçamentos ou espaços em branco.',
  })
  .refine(
    (val) => !FORBIDDEN_PASSWORD_CHARS.some((char) => val.includes(char)),
    {
      message: 'Caracteres proibidos: aspas simples (\'), aspas duplas ("), igual (=), acento agudo (´) e crase (`) não são permitidos.',
    }
  )
  .refine((val) => /[A-Z]/.test(val), {
    message: 'A senha deve conter ao menos 1 letra maiúscula (A-Z).',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'A senha deve conter ao menos 1 letra minúscula (a-z).',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'A senha deve conter ao menos 1 dígito numérico (0-9).',
  })
  .refine((val) => ALLOWED_SPECIAL_CHARS_REGEX.test(val), {
    message: 'A senha deve conter ao menos 1 caractere especial permitido (!@#$%^&*()_+-=[]{}|;:,.<>?).',
  })
  .refine((val) => !COMMON_WEAK_PASSWORDS.has(val.toLowerCase()), {
    message: 'Esta senha é muito comum e insegura. Escolha uma combinação mais complexa.',
  });

export const userRoleEnum = z.enum(['admin', 'analyst', 'tester']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const userStatusEnum = z.enum(['ACTIVE', 'BLOCKED', 'PENDING']);
export type UserStatus = z.infer<typeof userStatusEnum>;

/**
 * Validação do formulário de Cadastro de Usuário (Register).
 */
export const registerInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'O nome deve conter ao menos 3 caracteres.')
      .max(100, 'O nome não pode exceder 100 caracteres.'),
    email: z
      .string()
      .trim()
      .email('E-mail corporativo inválido.')
      .max(120, 'E-mail muito longo.')
      .toLowerCase(),
    role: userRoleEnum.default('tester'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'A confirmação de senha não confere.',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      const emailPrefix = data.email.split('@')[0]?.toLowerCase() ?? '';
      const nameParts = data.name.toLowerCase().split(/\s+/);
      const pass = data.password.toLowerCase();

      // Impede prefixo do email se tiver 3+ caracteres
      if (emailPrefix.length >= 3 && pass.includes(emailPrefix)) {
        return false;
      }

      // Impede primeiro ou último nome se tiver 3+ caracteres
      return !nameParts.some((part) => part.length >= 3 && pass.includes(part));
    },
    {
      message: 'A senha não pode conter seu nome, sobrenome ou parte do seu e-mail.',
      path: ['password'],
    }
  );

export type RegisterInput = z.infer<typeof registerInputSchema>;

/**
 * Validação do formulário de Autenticação (Login).
 */
export const loginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email('E-mail corporativo inválido.')
    .toLowerCase(),
  password: z.string().min(1, 'A senha é obrigatória.'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * Validação para rota de desbloqueio pelo admin.
 */
export const unlockUserInputSchema = z.object({
  targetUserId: z.string().min(1, 'ID do usuário obrigatório.'),
});
