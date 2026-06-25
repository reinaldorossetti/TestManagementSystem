*** Settings ***
Documentation    Suíte BDD de exemplo para validar o TMS Live Terminal.

*** Test Cases ***
Senha de acesso valida ativa fluxo principal
    Given que o usuario abriu a tela de login
    When informa credenciais validas
    Then deve acessar o sistema com sucesso

Login bloqueado apos 5 tentativas falhas
    Given que o usuario ja realizou 4 tentativas incorretas
    When erra a senha pela quinta vez consecutiva
    Then bloqueia o login e mostra o alerta temporario

*** Keywords ***
que o usuario abriu a tela de login
    Log    Tela de login aberta

informa credenciais validas
    Log    Credenciais informadas

deve acessar o sistema com sucesso
    Should Be Equal    ok    ok

que o usuario ja realizou 4 tentativas incorretas
    Log    4 tentativas

erra a senha pela quinta vez consecutiva
    Log    quinta tentativa

bloqueia o login e mostra o alerta temporario
    Should Be Equal    bloqueado    liberado    Falha proposital para validar status FAIL
