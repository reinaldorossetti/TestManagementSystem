*** Settings ***
Documentation     Feature: login_tests
...               Testes de login no Swag Labs (https://www.saucedemo.com/) escritos em
...               estilo BDD (Gherkin) com Robot Framework + Browser Library (Playwright).
...               Após o login, o nome do usuário autenticado é validado pelo cookie
...               `session-username` que o saucedemo grava no navegador.
Library           Browser
Suite Setup       Abrir o navegador no Swag Labs
Suite Teardown    Fechar o navegador
Test Tags         Login_Feature

*** Variables ***
${URL}            https://www.saucedemo.com/
${SENHA}          secret_sauce

*** Test Cases ***
Cenário: CT01 - Login valido com standard_user autentica e exibe a area de produtos
    [Tags]    LT01
    [Documentation]    Cenário positivo: usuário padrão acessa o catálogo.
    Given que o usuario esta na tela de login
    When realiza login com o usuario "standard_user" e a senha valida
    Then deve acessar a area de produtos
    And o nome do usuario autenticado deve ser "standard_user"

Cenário: CT02 - Login bloqueado com locked_out_user exibe mensagem de erro
    [Tags]    LT02
    [Documentation]    Cenário negativo: usuário bloqueado não autentica.
    Given que o usuario esta na tela de login
    When realiza login com o usuario "locked_out_user" e a senha valida
    Then deve exibir o alerta de usuario bloqueado

Cenário: CT03 - Login valido com problem_user autentica e exibe a area de produtos
    [Tags]    LT03
    [Documentation]    Usuário com problemas visuais ainda autentica com sucesso.
    Given que o usuario esta na tela de login
    When realiza login com o usuario "problem_user" e a senha valida
    Then deve acessar a area de produtos
    And o nome do usuario autenticado deve ser "problem_user"

Cenário: CT04 - Login valido com performance_glitch_user autentica e exibe a area de produtos
    [Tags]    LT04
    [Documentation]    Usuário lento autentica (pode demorar mais para carregar).
    Given que o usuario esta na tela de login
    When realiza login com o usuario "performance_glitch_user" e a senha valida
    Then deve acessar a area de produtos
    And o nome do usuario autenticado deve ser "performance_glitch_user"

Cenário: CT05 - Login valido com error_user autentica e exibe a area de produtos
    [Tags]    LT05
    [Documentation]    Usuário com erros funcionais ainda autentica com sucesso.
    Given que o usuario esta na tela de login
    When realiza login com o usuario "error_user" e a senha valida
    Then deve acessar a area de produtos
    And o nome do usuario autenticado deve ser "error_user"

Cenário: CT06 - Login valido com visual_user autentica e exibe a area de produtos
    [Tags]    LT06
    [Documentation]    Usuário com glitches visuais ainda autentica com sucesso.
    Given que o usuario esta na tela de login
    When realiza login com o usuario "visual_user" e a senha valida
    Then deve acessar a area de produtos
    And o nome do usuario autenticado deve ser "visual_user"

*** Keywords ***
Abrir o navegador no Swag Labs
    New Browser    chromium    headless=True
    New Context    viewport={'width': 1366, 'height': 768}

Fechar o navegador
    Close Browser    ALL

Capturar evidencia visual
    [Arguments]    ${momento}
    Take Screenshot    ${momento}

que o usuario esta na tela de login
    New Page    ${URL}
    Wait For Elements State    id=user-name    visible    timeout=15s

realiza login com o usuario "${usuario}" e a senha valida
    Fill Text    id=user-name    ${usuario}
    Fill Text    id=password     ${SENHA}
    Click        id=login-button
    Capturar evidencia visual    when-${usuario}

deve acessar a area de produtos
    Wait For Elements State    css=.title    visible    timeout=15s
    Get Text    css=.title    ==    Products
    Get Url     *=    inventory.html
    Capturar evidencia visual    then-produtos

o nome do usuario autenticado deve ser "${usuario}"
    ${cookie}=    Get Cookie    session-username
    Should Be Equal    ${cookie.value}    ${usuario}
    ...    msg=O nome do usuário autenticado não confere com o esperado.
    Capturar evidencia visual    then-usuario-${usuario}

deve exibir o alerta de usuario bloqueado
    Wait For Elements State    css=[data-test="error"]    visible    timeout=15s
    Get Text    css=[data-test="error"]    *=    locked out
    Capturar evidencia visual    then-bloqueado
