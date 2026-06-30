# Critérios de Aceite — Login Feature

## Objetivo

Validar o fluxo de autenticação do cliente no aplicativo TMS Device.

## Regras

1. O usuário deve informar CPF e senha válidos.
2. Após login bem-sucedido, o dashboard principal é exibido.
3. Tentativas inválidas exibem mensagem de erro sem expor dados sensíveis.

## Cenários cobertos

- CT01 — Login com credenciais válidas
- CT02 — Login com senha inválida
- CT03 — Bloqueio após múltiplas tentativas
