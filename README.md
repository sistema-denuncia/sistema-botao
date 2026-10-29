# Sistema do botão de emergência

O cadastro, login e acionamento usam a API e o banco MySQL do projeto
`sistema-policia`.

## Configuração local

1. Inicie o MySQL e o backend policial conforme as instruções do projeto
   `sistema-policia`.
2. Copie `.env.example` para `.env` e mantenha `POLICIA_API_KEY` igual ao valor
   de `POLICIA_API_KEY` no `.env` do backend policial. Configure
   `POLICIA_SERVER_URL` para a URL desse backend e troque `SESSION_SECRET` por
   um segredo aleatório longo.
3. Instale e inicie o botão:

   ```powershell
   npm install
   npm start
   ```

4. Acesse `http://localhost:3000/cadastro`, crie uma conta e depois entre em
   `http://localhost:3000/login`.

Se a porta 3000 já estiver ocupada, `npm start` tenta a próxima porta livre e
mostra o endereço correto no terminal. Para escolher uma porta específica,
defina `PORT` no `.env`; nesse caso, o servidor informa um erro se ela já
estiver em uso.

O cadastro grava nome, CPF, data de nascimento e e-mail na tabela `usuarios`.
A senha é armazenada com hash scrypt. O login cria uma sessão assinada em
cookie HttpOnly; o acionamento usa o ID do usuário autenticado, não um
identificador gerado no navegador.

O botão não inicia ocorrências sem sessão válida, chave de integração e backend
policial acessível. `/api/saude` informa se a integração está configurada.
