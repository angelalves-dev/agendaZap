
const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const mensagem = document.getElementById("mensagemLogin");
const btnEnviar = document.getElementById("btnEnviar");
const btnAlternar = document.getElementById("btnAlternar");
const subtitulo = document.getElementById("subtitulo");
const textoAlternativo = document.getElementById("textoAlternativo");

let modo = "login";

function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;
    mensagem.className = "mensagem-login";

    if (tipo) {
        mensagem.classList.add(tipo);
    }
}

btnAlternar.addEventListener("click", function () {
    modo = modo === "login" ? "cadastro" : "login";

    mensagem.textContent = "";
    mensagem.className = "mensagem-login";

    if (modo === "cadastro") {
        subtitulo.textContent = "Crie sua conta no AgendaZap";
        btnEnviar.textContent = "Criar conta";
        textoAlternativo.textContent = "Já tem uma conta?";
        btnAlternar.textContent = "Entrar";
        senhaInput.setAttribute("autocomplete", "new-password");
    } else {
        subtitulo.textContent = "Acesso do administrador";
        btnEnviar.textContent = "Entrar";
        textoAlternativo.textContent = "Ainda não tem conta?";
        btnAlternar.textContent = "Criar conta";
        senhaInput.setAttribute("autocomplete", "current-password");
    }
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (senha.length < 6) {
        mostrarMensagem(
            "A senha precisa ter pelo menos 6 caracteres.",
            "erro-login"
        );
        return;
    }

    btnEnviar.disabled = true;

    try {
        if (modo === "cadastro") {
            btnEnviar.textContent = "Criando conta...";
            mostrarMensagem("Criando sua conta...");

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: senha
            });

            if (error) {
                console.error("Erro no cadastro:", error);
                mostrarMensagem(
                    "Não foi possível criar a conta. " + error.message,
                    "erro-login"
                );
                return;
            }

            if (data.session) {
                mostrarMensagem(
                    "Conta criada! Entrando no AgendaZap...",
                    "sucesso-login"
                );

                window.location.href = "painel.html";
                return;
            }

            mostrarMensagem(
                "Cadastro iniciado! Confira seu e-mail e confirme a conta antes de entrar.",
                "sucesso-login"
            );

        } else {
            btnEnviar.textContent = "Entrando...";
            mostrarMensagem("Entrando...");

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

            if (error) {
                console.error("Erro no login:", error);
                mostrarMensagem(
                    "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
                    "erro-login"
                );
                return;
            }

            if (data.user) {
                mostrarMensagem(
                    "Login realizado! Entrando no painel...",
                    "sucesso-login"
                );

                window.location.href = "painel.html";
            }
        }

    } catch (erro) {
        console.error("Erro inesperado:", erro);

        mostrarMensagem(
            "Ocorreu um erro inesperado. Tente novamente.",
            "erro-login"
        );

    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent =
            modo === "cadastro" ? "Criar conta" : "Entrar";
    }
});
