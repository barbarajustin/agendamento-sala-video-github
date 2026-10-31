# Agendamento da Sala de Vídeo

Aplicação web (HTML5, CSS3 e JavaScript) para agendar a sala de vídeo da escola, com login Google (Firebase Authentication) e dados no Cloud Firestore.

## Perfis

| Ação | Usuário | Administrador |
|---|---|---|
| Agendar | sim | sim |
| Editar | só os próprios | todos |
| Excluir | não | sim |

Sábado e domingo não podem ser agendados.

## Estrutura

```
agendamento-sala-video/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── firebase-config.js
├── firestore.rules
├── firebase.json
├── .gitignore
└── README.md
```

## Configuração

1. Crie um projeto no [Console do Firebase](https://console.firebase.google.com) e adicione um app Web.
2. Cole os dados do app em `js/firebase-config.js`.
3. Em **Authentication**, ative o provedor **Google**.
4. Em **Firestore Database**, crie o banco e publique `firestore.rules` (aba Regras, ou `firebase deploy --only firestore:rules`).
5. Em **Authentication > Configurações > Domínios autorizados**, adicione o domínio onde o site ficará (por exemplo `seu-usuario.github.io`).
6. Para criar o primeiro administrador: entre uma vez no site, abra a coleção `users` no Firestore e mude o campo `role` do seu documento de `user` para `admin`.

## Executar localmente

O projeto usa módulos ES, então não abre via `file://`. Use um servidor local:

```
python3 -m http.server 8000
```

Acesse http://localhost:8000.

## Publicar no GitHub Pages

1. Envie os arquivos para um repositório no GitHub.
2. Em **Settings > Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. Adicione `seu-usuario.github.io` aos domínios autorizados do Firebase (passo 5).

Também é possível publicar com o Firebase Hosting: `firebase deploy`.
