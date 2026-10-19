import { test, expect } from '@playwright/test';

test.describe('Autenticação e Governança API - Regra das 3 Tentativas e Senha Forte', () => {
  const uniqueId = Date.now();
  const testUser = {
    name: `Analista Teste ${uniqueId}`,
    email: `qa.tester.${uniqueId}@tms.local`,
    validPassword: `Forte@QA2026#Valida${uniqueId.toString().slice(-4)}`,
    wrongPassword: 'SenhaIncorreta@123',
  };

  test('TC-API-01: Deve rejeitar cadastro com senha menor que 12 caracteres', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: testUser.name,
        email: testUser.email,
        role: 'tester',
        password: 'Curta@123',
        confirmPassword: 'Curta@123',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Dados inválidos');
  });

  test('TC-API-02: Deve rejeitar cadastro com caracteres proibidos (aspas, igual, crase, agudo)', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: testUser.name,
        email: testUser.email,
        role: 'tester',
        password: 'SenhaForte123!=\'teste',
        confirmPassword: 'SenhaForte123!=\'teste',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('Caracteres proibidos');
  });

  test('TC-API-03: Deve rejeitar cadastro com espaços na senha', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: testUser.name,
        email: testUser.email,
        role: 'tester',
        password: 'Senha Forte Com Espaco@123',
        confirmPassword: 'Senha Forte Com Espaco@123',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('espaçamentos');
  });

  test('TC-API-04: Deve cadastrar usuário com sucesso quando senha cumprir todas as regras', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: testUser.name,
        email: testUser.email,
        role: 'tester',
        password: testUser.validPassword,
        confirmPassword: testUser.validPassword,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.email).toBe(testUser.email);
    expect(body.data.role).toBe('tester');
    expect(body.data.status).toBe('ACTIVE');
  });

  test('TC-API-05: Ciclo de 3 tentativas com bloqueio estrito e desbloqueio por Admin', async ({ request }) => {
    // 1ª Tentativa com senha errada -> 401, tentativas restantes = 2
    const attempt1 = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.wrongPassword,
      },
    });
    expect(attempt1.status()).toBe(401);
    const body1 = await attempt1.json();
    expect(body1.error).toContain('Tentativa 1 de 3');
    expect(body1.details?.attemptsLeft).toBe(2);

    // 2ª Tentativa com senha errada -> 401, tentativas restantes = 1
    const attempt2 = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.wrongPassword,
      },
    });
    expect(attempt2.status()).toBe(401);
    const body2 = await attempt2.json();
    expect(body2.error).toContain('Tentativa 2 de 3');
    expect(body2.details?.attemptsLeft).toBe(1);

    // 3ª Tentativa com senha errada -> 423 Locked!
    const attempt3 = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.wrongPassword,
      },
    });
    expect(attempt3.status()).toBe(423);
    const body3 = await attempt3.json();
    expect(body3.error).toContain('Conta bloqueada por excesso de tentativas');

    // 4ª Tentativa (mesmo com a senha CORRETA) -> Deve continuar bloqueada!
    const attemptLockedWithValidPass = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.validPassword,
      },
    });
    expect(attemptLockedWithValidPass.status()).toBe(423);

    // Login com o Administrador inicial (seed)
    const adminLogin = await request.post('/api/auth/login', {
      data: {
        email: 'admin@tms.local',
        password: 'Admin@QA2026!Secure',
      },
    });
    expect(adminLogin.status()).toBe(200);

    // Admin consulta usuários e localiza o usuário bloqueado
    const usersListRes = await request.get('/api/admin/users');
    expect(usersListRes.status()).toBe(200);
    const usersList = await usersListRes.json();
    const target = usersList.data.find((u: { email: string }) => u.email === testUser.email);
    expect(target).toBeDefined();
    expect(target.status).toBe('BLOCKED');
    expect(target.failedAttempts).toBe(3);

    // Admin efetua o desbloqueio exclusivo
    const unlockRes = await request.post(`/api/admin/users/${target.id}/unlock`);
    expect(unlockRes.status()).toBe(200);
    const unlockBody = await unlockRes.json();
    expect(unlockBody.data.user.status).toBe('ACTIVE');
    expect(unlockBody.data.user.failedAttempts).toBe(0);

    // Usuário agora desbloqueado realiza login com sucesso!
    const userLoginAfterUnlock = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.validPassword,
      },
    });
    expect(userLoginAfterUnlock.status()).toBe(200);
    const userBody = await userLoginAfterUnlock.json();
    expect(userBody.data.user.email).toBe(testUser.email);
    expect(userBody.data.user.status).toBe('ACTIVE');
  });
});
