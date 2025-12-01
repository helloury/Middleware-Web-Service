# Middleware Web Service: Integração JSON/XML com Criptografia

## 1. Descrição do Projeto
Este projeto consiste no desenvolvimento de um Middleware Web Service responsável por intermediar a comunicação entre clientes externos (APIs, Mobile, Web) e um Sistema Legado simulado.

O Sistema Legado aceita apenas mensagens no formato XML, enquanto os clientes modernos utilizam JSON. O Middleware atua como uma ponte (Gateway), realizando:
* Conversão bidirecional de dados (JSON ↔ XML).
* Criptografia de dados sensíveis (CPF) garantindo confidencialidade.
* Autenticação simples via Token.

A solução foi desenvolvida seguindo a arquitetura RESTful para exposição dos endpoints.

## 2. Tecnologias Utilizadas

* Runtime: Node.js (v18+)
* Framework Web: Express.js
* Manipulação de XML: xml2js (Parser e Builder)
* Segurança/Criptografia: Crypto (Módulo nativo do Node.js - Algoritmo AES-256-CBC)
* Gerenciamento de Dependências: NPM

## 3. Passo a Passo para Execução

### Pré-requisitos
* Node.js instalado na máquina.

### Instalação
1.  Abra o terminal na pasta do projeto.
2.  Instale as dependências listadas no `package.json`:
    ```bash
    npm install
    ```

### Execução
1.  Inicie o servidor middleware:
    ```bash
    node middleware.js
    ```
2.  O servidor iniciará na porta 3000.
    > Mensagem esperada: `Middleware rodando em http://localhost:3000`

---

## 4. Documentação da API (Exemplos de Chamadas)

Autenticação: Todas as requisições devem conter o cabeçalho:
* `Authorization: Bearer 123` 

### A. Cadastrar Cliente
* URL: `http://localhost:3000/api/clientes`
* Método: `POST`
* Corpo da Requisição (JSON):

```json
{
  "nome": "João da Silva",
  "email": "joao@email.com",
  "cpf": "123.456.789-00"
}
```
### Endpoint 2: Consulta de Cliente
* **URL:** `/api/clientes/{id}`
* **Método:** `GET`
* **Descrição:** Busca o cliente no legado via XML, recebe os dados criptografados, descriptografa o CPF e retorna JSON limpo.
* **Exemplo de Chamada:**
    `http://localhost:3000/api/clientes/1`

---

## 5. Exemplos de XML 

Estes são os formatos XML que o Middleware gera e consome internamente para conversar com o Sistema Legado.

### A. XML de Requisição
*Nota: O CPF é enviado cifrado.*
```xml
<cadastro>
  <nome>João Silva</nome>
  <email>joao@teste.com</email>
  <cpf>a4f5b6... (hash criptografado)</cpf>
</cadastro>
```
### B. XML de Resposta
*Nota: O legado devolve o CPF protegido.*
```xml
<cliente>
  <id>1</id>
  <nome>João Silva</nome>
  <email>joao@teste.com</email>
  <cpf_protegido>a4f5b6... (hash criptografado)</cpf_protegido>
</cliente>
```

---

## 6. Evidências de Funcionamento
Abaixo estão as capturas de tela demonstrando o funcionamento do sistema.

### 1. Requisição de Cadastro (Sucesso)
Imagem mostrando o envio do JSON via cliente (Postman).
<img width="944" height="214" alt="Captura de tela 2025-12-01 183526" src="https://github.com/user-attachments/assets/0bca4c33-6e36-4c15-920f-867f8affeb69" />


### 2. Log do Servidor (Conversão XML)
Imagem do terminal mostrando que o Middleware converteu o dado para XML antes de enviar.
<img width="757" height="272" alt="Captura de tela 2025-12-01 183503" src="https://github.com/user-attachments/assets/f2f9eddf-6023-447a-becb-9cd32cf17f13" />


### 3. Requisição de Consulta (Descriptografia)
Imagem mostrando que o cliente recebe o dado descriptografado (CPF legível).
<img width="1121" height="133" alt="Captura de tela 2025-12-01 183824" src="https://github.com/user-attachments/assets/e23452cb-9815-4104-882d-2b090fb0e1ed" />



